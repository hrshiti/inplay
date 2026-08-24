/**
 * Reclaim disk space in backend/uploads.
 *
 * Three kinds of waste build up:
 *   1. Orphans   - files no database record points at (failed uploads, deleted
 *                  content, aborted transcodes).
 *   2. Sources   - original MP4s whose HLS rendition already lives on S3. These
 *                  are still referenced by `video.url`, so removing them is a
 *                  policy choice: it saves the most space but drops the direct
 *                  MP4 fallback. Opt in with --delete-transcoded-sources.
 *   3. Verified originals - the strictest, safest tier: original MP4s that have
 *                  BOTH an HLS rendition on S3 AND their own separately-migrated
 *                  copy on S3 (via migrateOriginalsToS3.js), with both verified
 *                  reachable. Opt in with --delete-verified-originals. Prefer
 *                  this over --delete-transcoded-sources once originals have
 *                  been migrated - it never deletes the last durable copy of
 *                  anything.
 *
 * This script can also be required and called in-process (see run(options)),
 * which is how server.js's scheduled cleanup job (Step 7) uses it - reusing
 * the server's already-open Mongo connection instead of opening a second one.
 * Running it directly from the CLI is unaffected and behaves exactly as before.
 *
 * Usage (from backend/):
 *   node scripts/cleanupOrphanedMedia.js                                # dry run, report only
 *   node scripts/cleanupOrphanedMedia.js --delete                       # remove orphans
 *   node scripts/cleanupOrphanedMedia.js --delete --delete-transcoded-sources
 *   node scripts/cleanupOrphanedMedia.js --delete --delete-verified-originals
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { UPLOAD_BASE } = require('../config/multerStorage');
const { formatBytes } = require('../utils/diskSpace');
const { sweepStaleTempHls } = require('../utils/tempHlsSweeper');

// Mongoose Models
const Content = require('../models/Content');
const QuickByte = require('../models/QuickByte');
const ForYou = require('../models/ForYou');
const Banner = require('../models/Banner');
const Promotion = require('../models/Promotion');

const argvOptions = () => {
    const args = process.argv.slice(2);
    return {
        dryRun: !args.includes('--delete'),
        deleteSources: args.includes('--delete-transcoded-sources'),
        deleteVerifiedOriginals: args.includes('--delete-verified-originals'),
        skipHlsCheck: args.includes('--skip-hls-check'),
        force: args.includes('--force')
    };
};

const TEMP_HLS = path.join(UPLOAD_BASE, 'temp_hls');

// Every file currently living under uploads/ (temp_hls handled separately)
const listFiles = (dir) => {
    const out = [];
    if (!fs.existsSync(dir)) return out;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (full === TEMP_HLS) continue;
        if (entry.isDirectory()) out.push(...listFiles(full));
        else out.push(full);
    }
    return out;
};

/**
 * Shared helper to normalize any media reference or filesystem path.
 * Handles:
 *   - /uploads/videos/...
 *   - uploads/videos/...
 *   - undefined/uploads/videos/...
 *   - undefinedundefined/uploads/videos/...
 *   - CloudFront HLS URLs (e.g. https://.../videos/movie/123/master.m3u8 -> videos/movie/123/master.m3u8)
 *   - S3 URLs (e.g. https://.../originals/quickbyte/123/xyz.mp4 -> originals/quickbyte/123/xyz.mp4)
 *   - Absolute disk paths (e.g. H:\inplay\backend\uploads\videos\xyz.mp4 -> videos/xyz.mp4)
 */
const normalizeMediaPath = (input) => {
    if (!input || typeof input !== 'string') return null;

    let str = decodeURIComponentSafe(input).trim();

    // If it's an absolute path under UPLOAD_BASE
    if (str.startsWith(UPLOAD_BASE)) {
        return path.relative(UPLOAD_BASE, str).replace(/\\/g, '/');
    }

    // Strip http(s)://domain/ prefix if present
    if (str.startsWith('http://') || str.startsWith('https://')) {
        try {
            str = new URL(str).pathname;
        } catch {
            // keep str as-is
        }
    }

    // Strip query strings and hash fragments
    str = str.split('?')[0].split('#')[0];

    // Check for uploads/
    const uploadsIndex = str.indexOf('uploads/');
    if (uploadsIndex !== -1) {
        return str.substring(uploadsIndex + 'uploads/'.length).replace(/^\/+/, '').replace(/\\/g, '/');
    }

    // Check for originals/ (S3 URLs)
    const originalsIndex = str.indexOf('originals/');
    if (originalsIndex !== -1) {
        return str.substring(originalsIndex).replace(/\\/g, '/');
    }

    // Check for videos/ (HLS or direct video paths)
    const videosIndex = str.indexOf('videos/');
    if (videosIndex !== -1) {
        return str.substring(videosIndex).replace(/\\/g, '/');
    }

    // Check for images/ (poster/backdrop/thumbnail/avatar/banner)
    const imagesIndex = str.indexOf('images/');
    if (imagesIndex !== -1) {
        return str.substring(imagesIndex).replace(/\\/g, '/');
    }

    // Check for audio/
    const audioIndex = str.indexOf('audio/');
    if (audioIndex !== -1) {
        return str.substring(audioIndex).replace(/\\/g, '/');
    }

    return str.replace(/^\/+/, '').replace(/\\/g, '/');
};

const toAbsolute = (uploadsPath) => {
    if (!uploadsPath || typeof uploadsPath !== 'string') return null;
    if (path.isAbsolute(uploadsPath) && uploadsPath.startsWith(UPLOAD_BASE)) {
        return uploadsPath;
    }
    const normalized = normalizeMediaPath(uploadsPath);
    if (!normalized) return null;
    return path.join(UPLOAD_BASE, normalized.replace(/\//g, path.sep));
};

const registerReference = (val, into, basenames) => {
    if (!val || typeof val !== 'string') return;
    const clean = val.trim();
    if (!clean) return;

    // 1. Extract basename (filename safety net)
    const urlClean = clean.split('?')[0].split('#')[0];
    const base = path.basename(urlClean);
    if (base && base !== '.' && base !== '/' && base !== '\\') {
        basenames.add(base);
        basenames.add(decodeURIComponentSafe(base));
    }

    // 2. Normalize media path & register absolute / relative paths
    const norm = normalizeMediaPath(clean);
    if (norm) {
        const abs = toAbsolute(norm);
        if (abs) {
            into.add(abs);
            into.add(path.resolve(abs));
        }
        into.add(norm);
    }
};

/**
 * Pull every media path / filename referenced anywhere in a document.
 */
const collectReferences = (value, into, basenames) => {
    if (!value) return;

    if (typeof value === 'string') {
        registerReference(value, into, basenames);

        // Also search for any embedded uploads/ substrings
        let index = value.indexOf('uploads/');
        while (index !== -1) {
            const tail = value.slice(index);
            const candidates = [
                tail,
                tail.split(/["'?]/)[0],
                tail.split(/\s/)[0]
            ];
            for (const candidate of candidates) {
                const cleaned = candidate.trim().replace(/[),\]]+$/, '');
                if (cleaned && cleaned !== 'uploads/' && cleaned !== '/uploads/') {
                    registerReference(cleaned, into, basenames);
                }
            }
            index = value.indexOf('uploads/', index + 1);
        }
        return;
    }
    if (Array.isArray(value)) {
        value.forEach(v => collectReferences(v, into, basenames));
        return;
    }
    if (typeof value === 'object') {
        Object.values(value).forEach(v => collectReferences(v, into, basenames));
    }
};

const decodeURIComponentSafe = (input) => {
    try {
        return decodeURIComponent(input);
    } catch {
        return input; // malformed escape sequence - keep as-is
    }
};

// Safety brake: if almost everything looks orphaned, the script is almost
// certainly pointed at the wrong database rather than genuinely finding junk.
const MAX_ORPHAN_RATIO = 0.8;

// Verify a set of {absolutePath -> checkUrl} entries against live HTTP HEAD
// requests, with bounded concurrency. Returns { verified: Set<path>, unreachable: [{path, reason}] }.
const verifyReachable = async (map, concurrency = 8) => {
    const verified = new Set();
    const unreachable = [];

    if (typeof fetch !== 'function') {
        return { verified, unreachable, noFetch: true };
    }

    const queue = [...map.entries()];
    const worker = async () => {
        while (queue.length > 0) {
            const [abs, url] = queue.shift();
            try {
                const response = await fetch(url, { method: 'HEAD' });
                if (response.ok) verified.add(abs);
                else unreachable.push(`${path.basename(abs)} -> HTTP ${response.status}`);
            } catch (error) {
                unreachable.push(`${path.basename(abs)} -> ${error.message}`);
            }
        }
    };

    await Promise.all(Array.from({ length: concurrency }, worker));
    return { verified, unreachable, noFetch: false };
};

/**
 * Main entry point. Accepts an options object so this can be called
 * in-process (e.g. from server.js's scheduled job) as well as from the CLI.
 * When called with an already-open Mongo connection (mongoose.connection
 * .readyState === 1), it reuses it instead of opening/closing its own -
 * closing a connection a long-running server still needs would be wrong.
 *
 * @param {object} options
 * @param {boolean} options.dryRun - default true (safe default)
 * @param {boolean} options.deleteSources - delete-transcoded-sources mode
 * @param {boolean} options.deleteVerifiedOriginals - stricter, both-verified mode
 * @param {boolean} options.skipHlsCheck - bypass HLS verification (not advised)
 * @param {boolean} options.force - override the orphan-ratio safety brake
 * @returns {Promise<{orphansDeleted: number, orphanBytesFreed: number, sourcesDeleted: number, sourceBytesFreed: number, verifiedOriginalsDeleted: number, verifiedOriginalBytesFreed: number}>}
 */
const run = async (options = {}) => {
    const opts = { dryRun: true, deleteSources: false, deleteVerifiedOriginals: false, skipHlsCheck: false, force: false, ...options };
    const { dryRun: DRY_RUN, deleteSources: DELETE_SOURCES, deleteVerifiedOriginals: DELETE_VERIFIED_ORIGINALS, skipHlsCheck: SKIP_HLS_CHECK, force: FORCE } = opts;

    const summary = { orphansDeleted: 0, orphanBytesFreed: 0, sourcesDeleted: 0, sourceBytesFreed: 0, verifiedOriginalsDeleted: 0, verifiedOriginalBytesFreed: 0 };

    const ownsConnection = mongoose.connection.readyState !== 1;
    if (ownsConnection) await mongoose.connect(process.env.MONGODB_URI);

    // Print the target loudly - deleting against the wrong DB wipes live media
    const { host, name } = mongoose.connection;
    console.log(`Database : ${name} @ ${host}`);
    console.log(`Uploads  : ${UPLOAD_BASE}`);
    console.log(`Mode     : ${DRY_RUN ? 'DRY RUN (nothing deleted)' : 'DELETE'}`);
    console.log('Check the database above is the one this uploads folder belongs to.\n');

    // Read every collection generically so new models are covered automatically
    const collections = await mongoose.connection.db.listCollections().toArray();
    const referenced = new Set();
    const referencedBasenames = new Set();

    let qbMainCount = 0;
    let qbEpCount = 0;
    let contentCount = 0;
    let bannerCount = 0;
    let promoCount = 0;
    let foryouCount = 0;

    // 1. Explicit core model field extraction using imported Mongoose models
    try {
        const quickbytes = await QuickByte.find({}).lean(true);
        for (const qb of quickbytes) {
            if (qb.video) {
                registerReference(qb.video.url, referenced, referencedBasenames);
                registerReference(qb.video.hls_url, referenced, referencedBasenames);
                registerReference(qb.video.s3_url, referenced, referencedBasenames);
                registerReference(qb.video.original_s3_url, referenced, referencedBasenames);
                qbMainCount++;
            }
            for (const ep of (qb.episodes || [])) {
                registerReference(ep.url, referenced, referencedBasenames);
                registerReference(ep.hls_url, referenced, referencedBasenames);
                registerReference(ep.s3_url, referenced, referencedBasenames);
                registerReference(ep.original_s3_url, referenced, referencedBasenames);
                qbEpCount++;
            }
            collectReferences(qb, referenced, referencedBasenames);
        }

        const contents = await Content.find({}).lean(true);
        for (const c of contents) {
            if (c.video) {
                registerReference(c.video.url, referenced, referencedBasenames);
                registerReference(c.video.hls_url, referenced, referencedBasenames);
                registerReference(c.video.s3_url, referenced, referencedBasenames);
                registerReference(c.video.original_s3_url, referenced, referencedBasenames);
                contentCount++;
            }
            if (c.trailer) {
                registerReference(c.trailer.url, referenced, referencedBasenames);
                registerReference(c.trailer.hls_url, referenced, referencedBasenames);
                registerReference(c.trailer.s3_url, referenced, referencedBasenames);
                registerReference(c.trailer.original_s3_url, referenced, referencedBasenames);
                contentCount++;
            }
            for (const season of (c.seasons || [])) {
                for (const ep of (season.episodes || [])) {
                    if (ep.video) {
                        registerReference(ep.video.url, referenced, referencedBasenames);
                        registerReference(ep.video.hls_url, referenced, referencedBasenames);
                        registerReference(ep.video.s3_url, referenced, referencedBasenames);
                        registerReference(ep.video.original_s3_url, referenced, referencedBasenames);
                        contentCount++;
                    }
                }
            }
            collectReferences(c, referenced, referencedBasenames);
        }

        const banners = await Banner.find({}).lean(true);
        for (const b of banners) {
            registerReference(b.mediaUrl, referenced, referencedBasenames);
            registerReference(b.hlsUrl, referenced, referencedBasenames);
            registerReference(b.originalS3Url, referenced, referencedBasenames);
            bannerCount++;
            collectReferences(b, referenced, referencedBasenames);
        }

        const promos = await Promotion.find({}).lean(true);
        for (const p of promos) {
            registerReference(p.promoVideoUrl, referenced, referencedBasenames);
            registerReference(p.promoVideoHlsUrl, referenced, referencedBasenames);
            registerReference(p.originalS3Url, referenced, referencedBasenames);
            promoCount++;
            collectReferences(p, referenced, referencedBasenames);
        }

        const foryous = await ForYou.find({}).lean(true);
        for (const r of foryous) {
            if (r.video) {
                registerReference(r.video.url, referenced, referencedBasenames);
                registerReference(r.video.hls_url, referenced, referencedBasenames);
                registerReference(r.video.s3_url, referenced, referencedBasenames);
                registerReference(r.video.original_s3_url, referenced, referencedBasenames);
                foryouCount++;
            }
            collectReferences(r, referenced, referencedBasenames);
        }
    } catch (err) {
        console.warn('Model scan warning:', err.message);
    }

    // 2. Generic traversal across all collections & documents
    for (const { name: collectionName } of collections) {
        const docs = await mongoose.connection.db.collection(collectionName).find({}).toArray();
        docs.forEach(doc => collectReferences(doc, referenced, referencedBasenames));
    }

    console.log(`QuickByte Episode References Collected : ${qbEpCount}`);
    console.log(`QuickByte Main References Collected    : ${qbMainCount}`);
    console.log(`Content References Collected           : ${contentCount}`);
    console.log(`Banner References Collected            : ${bannerCount}`);
    console.log(`Promotion References Collected         : ${promoCount}`);
    console.log(`ForYou References Collected            : ${foryouCount}\n`);

    const onDisk = listFiles(UPLOAD_BASE);

    // A file is only junk when neither its full path, relative path, nor its filename is referenced anywhere.
    const isReferenced = (filePath) => {
        const abs = path.resolve(filePath);
        const rel = normalizeMediaPath(filePath);
        const base = path.basename(filePath);

        return (
            referenced.has(abs) ||
            referenced.has(filePath) ||
            (rel && referenced.has(rel)) ||
            referencedBasenames.has(base) ||
            referencedBasenames.has(decodeURIComponentSafe(base))
        );
    };

    const referenceMatchFailed = [];
    const orphans = [];

    for (const f of onDisk) {
        if (isReferenced(f)) continue;

        const base = path.basename(f);
        const rel = normalizeMediaPath(f) || '';

        // Safety check: if this is a video file (starts with video_ or under videos/ or video ext)
        // do not mark it as orphan deletion candidate; surface under REFERENCE_MATCH_FAILED
        if (base.startsWith('video_') || rel.startsWith('videos/') || /\.(mp4|m4v|mov|webm|mkv|avi|3gp|ts)$/i.test(base)) {
            referenceMatchFailed.push(f);
        } else {
            orphans.push(f);
        }
    }

    if (referenceMatchFailed.length > 0) {
        console.log(`\n⚠️  REFERENCE_MATCH_FAILED (${referenceMatchFailed.length} video file(s) protected from deletion):`);
        referenceMatchFailed.forEach(f => console.log(`     ${path.relative(UPLOAD_BASE, f)}`));
        console.log('');
    }

    // Report how many files the basename net saved
    const savedByBasename = onDisk.filter(f => !referenced.has(f) && !referenced.has(path.resolve(f)) && referencedBasenames.has(path.basename(f)));
    if (savedByBasename.length > 0) {
        console.log(`ℹ️  ${savedByBasename.length} file(s) kept by the filename safety net (path was not matched exactly):`);
        savedByBasename.slice(0, 5).forEach(f => console.log(`     ${path.relative(UPLOAD_BASE, f)}`));
        if (savedByBasename.length > 5) console.log(`     ... and ${savedByBasename.length - 5} more`);
        console.log('');
    }

    let orphanBytes = 0;
    orphans.forEach(f => {
        try { orphanBytes += fs.statSync(f).size; } catch { /* gone */ }
    });

    const protectedVideos = referenceMatchFailed.length;

    console.log(`Files on disk      : ${onDisk.length}`);
    console.log(`Still referenced   : ${onDisk.length - orphans.length - protectedVideos}`);
    console.log(`Protected videos   : ${protectedVideos}`);
    console.log(`Orphaned           : ${orphans.length} (${formatBytes(orphanBytes)})`);

    orphans.slice(0, 20).forEach(f => console.log(`  - ${path.relative(UPLOAD_BASE, f)}`));
    if (orphans.length > 20) console.log(`  ... and ${orphans.length - 20} more`);

    const reportDir = path.join(__dirname, '../logs');

    // Write protected video entries if any
    if (referenceMatchFailed.length > 0) {
        const refFailPath = path.join(reportDir, `reference-match-failed-${new Date().toISOString().slice(0, 10)}.txt`);
        try {
            fs.mkdirSync(reportDir, { recursive: true });
            const refFailLines = referenceMatchFailed.map(f => path.relative(UPLOAD_BASE, f).replace(/\\/g, '/'));
            fs.writeFileSync(refFailPath, `${refFailLines.join('\n')}\n`);
            console.log(`\nProtected video list written to: ${refFailPath}`);
        } catch (error) {
            console.error(`Could not write reference-match-failed report: ${error.message}`);
        }
    }

    // Always write the complete list somewhere reviewable - deleting 200+ files
    // off a 20-line preview is not something anyone should have to do.
    if (orphans.length > 0) {
        const reportPath = path.join(reportDir, `orphaned-media-${new Date().toISOString().slice(0, 10)}.txt`);
        try {
            fs.mkdirSync(reportDir, { recursive: true });
            // Path first, tab separated: `cut -f1` yields a clean list for tar,
            // which matters because some filenames contain spaces.
            const lines = orphans.map(f => {
                let size = 0;
                try { size = fs.statSync(f).size; } catch { /* gone */ }
                return `${path.relative(UPLOAD_BASE, f)}\t${formatBytes(size)}`;
            });
            fs.writeFileSync(reportPath, `${lines.join('\n')}\n`);
            console.log(`\nFull list written to: ${reportPath}`);
        } catch (error) {
            console.error(`Could not write the orphan list: ${error.message}`);
        }
    }

    const orphanRatio = onDisk.length > 0 ? orphans.length / onDisk.length : 0;
    const looksWrong = orphanRatio > MAX_ORPHAN_RATIO && onDisk.length > 10;

    if (looksWrong) {
        console.log(
            `\n⚠️  ABORTING: ${Math.round(orphanRatio * 100)}% of files look orphaned.\n` +
            `   That usually means this script is connected to the wrong database,\n` +
            `   not that the files are junk. Verify "${name}" is correct, then re-run\n` +
            `   with --force if you are certain.`
        );
    }

    if (!DRY_RUN && (!looksWrong || FORCE)) {
        let freed = 0;
        for (const f of orphans) {
            try {
                freed += fs.statSync(f).size;
                fs.unlinkSync(f);
            } catch (error) {
                console.error(`  failed to delete ${f}: ${error.message}`);
            }
        }
        summary.orphansDeleted = orphans.length;
        summary.orphanBytesFreed = freed;
        console.log(`\nDeleted ${orphans.length} orphaned files, freed ${formatBytes(freed)}`);
    }

    // Source MP4s that already have an HLS rendition on S3.
    // Model-agnostic: any nested object carrying both hls_url and a local url
    // qualifies, so movies, series episodes, quickbytes, reels and promos are
    // all covered without hardcoding a model list.
    if (DELETE_SOURCES) {
        const sourceMap = new Map(); // absolute path -> hls_url

        const findTranscodedSources = (value) => {
            if (!value || typeof value !== 'object') return;

            if (Array.isArray(value)) {
                value.forEach(findTranscodedSources);
                return;
            }

            if (typeof value.hls_url === 'string' && value.hls_url &&
                typeof value.url === 'string' && value.url.startsWith('/uploads/')) {
                const abs = toAbsolute(value.url);
                if (fs.existsSync(abs)) sourceMap.set(abs, value.hls_url);
            }

            Object.values(value).forEach(findTranscodedSources);
        };

        for (const { name: collectionName } of collections) {
            const docs = await mongoose.connection.db.collection(collectionName).find({}).toArray();
            docs.forEach(findTranscodedSources);
        }

        let sources = [...sourceMap.keys()];
        console.log(`\nLocal sources that claim an HLS rendition: ${sources.length}`);

        // Trust but verify: the DB says HLS exists, but deleting the only local
        // copy on the strength of a database field is not acceptable. Confirm
        // each playlist is actually reachable before removing its source.
        if (!SKIP_HLS_CHECK) {
            const { verified, unreachable, noFetch } = await verifyReachable(sourceMap);
            if (noFetch) {
                console.log('This Node build has no global fetch - re-run with --skip-hls-check to bypass verification (not advised).');
                sources = [];
            } else {
                console.log('Verifying each HLS playlist is live on S3...');
                if (unreachable.length > 0) {
                    console.log(`⚠️  ${unreachable.length} source(s) KEPT - their HLS could not be confirmed:`);
                    unreachable.slice(0, 10).forEach(u => console.log(`     ${u}`));
                    if (unreachable.length > 10) console.log(`     ... and ${unreachable.length - 10} more`);
                }
                sources = [...verified];
            }
        }

        let sourceBytes = 0;
        sources.forEach(f => {
            try { sourceBytes += fs.statSync(f).size; } catch { /* gone */ }
        });

        console.log(`Safe to remove (HLS confirmed): ${sources.length} (${formatBytes(sourceBytes)})`);

        if (!DRY_RUN) {
            let freed = 0;
            for (const f of sources) {
                try {
                    freed += fs.statSync(f).size;
                    fs.unlinkSync(f);
                } catch (error) {
                    console.error(`  failed to delete ${f}: ${error.message}`);
                }
            }
            summary.sourcesDeleted = sources.length;
            summary.sourceBytesFreed = freed;
            console.log(`Deleted ${sources.length} source files, freed ${formatBytes(freed)}`);
        }
    }

    // Stricter tier: original MP4s with BOTH an HLS rendition AND their own
    // separately-migrated copy on S3, both independently verified reachable.
    // Prefer this over --delete-transcoded-sources once migrateOriginalsToS3.js
    // has run - it never deletes the last durable copy of anything, because
    // the S3 original (not just the HLS transcode) is confirmed present first.
    if (DELETE_VERIFIED_ORIGINALS) {
        const hlsMap = new Map();   // absolute path -> hls_url
        const s3Map = new Map();    // absolute path -> s3/original url

        const findVerifiedCandidates = (value) => {
            if (!value || typeof value !== 'object') return;
            if (Array.isArray(value)) { value.forEach(findVerifiedCandidates); return; }

            const localUrl = typeof value.url === 'string' ? value.url
                : typeof value.mediaUrl === 'string' ? value.mediaUrl
                : typeof value.promoVideoUrl === 'string' ? value.promoVideoUrl
                : null;
            const hls = value.hls_url || value.hlsUrl || null;
            const s3Original = value.s3_url || value.originalS3Url || null;

            if (localUrl && localUrl.startsWith('/uploads/') && hls && s3Original) {
                const abs = toAbsolute(localUrl);
                if (fs.existsSync(abs)) {
                    hlsMap.set(abs, hls);
                    s3Map.set(abs, s3Original);
                }
            }

            Object.values(value).forEach(findVerifiedCandidates);
        };

        for (const { name: collectionName } of collections) {
            const docs = await mongoose.connection.db.collection(collectionName).find({}).toArray();
            docs.forEach(findVerifiedCandidates);
        }

        console.log(`\nLocal originals with BOTH an HLS rendition and a migrated S3 copy: ${hlsMap.size}`);

        let eligible = [];
        if (!SKIP_HLS_CHECK) {
            console.log('Verifying HLS renditions are live...');
            const hlsResult = await verifyReachable(hlsMap);
            console.log('Verifying S3 originals are live...');
            const s3Result = await verifyReachable(s3Map);

            if (hlsResult.noFetch || s3Result.noFetch) {
                console.log('This Node build has no global fetch - re-run with --skip-hls-check to bypass verification (not advised).');
            } else {
                eligible = [...hlsMap.keys()].filter(abs => hlsResult.verified.has(abs) && s3Result.verified.has(abs));
                const keptCount = hlsMap.size - eligible.length;
                if (keptCount > 0) {
                    console.log(`⚠️  ${keptCount} local original(s) KEPT - HLS and/or S3 original could not both be confirmed reachable.`);
                }
            }
        } else {
            eligible = [...hlsMap.keys()];
        }

        let verifiedBytes = 0;
        eligible.forEach(f => { try { verifiedBytes += fs.statSync(f).size; } catch { /* gone */ } });
        console.log(`Safe to remove (HLS + S3 original both confirmed): ${eligible.length} (${formatBytes(verifiedBytes)})`);

        if (!DRY_RUN) {
            let freed = 0;
            for (const f of eligible) {
                try {
                    freed += fs.statSync(f).size;
                    fs.unlinkSync(f);
                } catch (error) {
                    console.error(`  failed to delete ${f}: ${error.message}`);
                }
            }
            summary.verifiedOriginalsDeleted = eligible.length;
            summary.verifiedOriginalBytesFreed = freed;
            console.log(`Deleted ${eligible.length} verified-original files, freed ${formatBytes(freed)}`);
        }
    }

    // Abandoned transcode folders
    console.log('\nStale transcode folders:');
    sweepStaleTempHls({ maxAgeHours: 6, dryRun: DRY_RUN });

    if (ownsConnection) await mongoose.disconnect();
    if (DRY_RUN) console.log('\nDry run - re-run with --delete (and the relevant --delete-* flag) to actually remove these files.');

    return summary;
};

// Only run when executed directly, so the helpers stay importable for testing
// and for in-process use from server.js's scheduled job.
if (require.main === module) {
    run(argvOptions()).catch(error => {
        console.error('Cleanup failed:', error);
        process.exit(1);
    });
}

module.exports = { collectReferences, normalizeMediaPath, listFiles, toAbsolute, run, argvOptions };
