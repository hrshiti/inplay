/**
 * Migrate legacy local video originals to S3.
 *
 * This is the Phase-1 half of closing the storage-audit gap: it uploads the
 * ORIGINAL local file for every video-bearing record to S3 (a new
 * `originals/{type}/{id}/...` prefix, separate from the existing HLS
 * `videos/{type}/{id}/...` prefix) and records the resulting URL on the
 * document. It NEVER deletes or modifies any local file - that is a
 * deliberately separate, later, explicitly-gated step
 * (cleanupOrphanedMedia.js --delete-verified-originals), run only after this
 * script's output has been reviewed.
 *
 * Fully automatic: one invocation scans every model that can carry a video
 * (QuickByte, ForYou, Content movies/episodes/trailers, Banner, Promotion),
 * finds every record still pointing at a local-only file, uploads it, and
 * verifies the upload before writing anything back to the database. No
 * per-file manual work is required.
 *
 * Idempotent / resumable by construction: every record already carrying the
 * new S3 field is skipped, so interrupting this script (crash, PM2 restart,
 * Ctrl+C) and simply re-running the same command later picks up exactly
 * where it left off - there is no separate checkpoint file to manage.
 *
 * Usage (from backend/):
 *   node scripts/migrateOriginalsToS3.js                  # dry run - reports what WOULD migrate
 *   node scripts/migrateOriginalsToS3.js --execute         # actually migrate
 *   node scripts/migrateOriginalsToS3.js --execute --concurrency=8
 *   node scripts/migrateOriginalsToS3.js --execute --only=quickbyte,movie   # restrict to specific types
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { S3Client, HeadObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { UPLOAD_BASE, getFilePathFromUrl } = require('../config/multerStorage');
const mediaService = require('../services/mediaService');
const { formatBytes } = require('../utils/diskSpace');

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const DRY_RUN = !EXECUTE;
const concurrencyArg = args.find(a => a.startsWith('--concurrency='));
const CONCURRENCY = concurrencyArg ? Math.max(1, parseInt(concurrencyArg.split('=')[1], 10) || 4) : 4;
const onlyArg = args.find(a => a.startsWith('--only='));
const ONLY_TYPES = onlyArg ? onlyArg.split('=')[1].split(',').map(s => s.trim()) : null;

const Content = require('../models/Content');
const QuickByte = require('../models/QuickByte');
const ForYou = require('../models/ForYou');
const Banner = require('../models/Banner');
const Promotion = require('../models/Promotion');

// Utility for exponential backoff
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

// S3 prefix map — single source of truth for the {type} segment in
// originals/{type}/{id}/{filename}. Must match what mediaService uses.
const S3_PREFIX = {
    quickbyte:         'quickbyte',
    quickbyte_episode: 'quickbyte_episode',
    foryou:            'foryou',
    banner:            'banner',
    promotion:         'promotion',
    movie:             'movie',
    trailer:           'trailer',
    episode:           'episode',
};

/**
 * Build a Map<"type/filename" → full s3Key> by listing originals/ once.
 * Prevents duplicate uploads for the 195 files already in S3 without issuing
 * a per-file HeadObject call (which would cost 195 extra round-trips).
 */
const buildS3Index = async () => {
    const BUCKET = process.env.AWS_S3_BUCKET;
    console.log(`Pre-scanning S3 s3://${BUCKET}/originals/ …`);
    const index = new Map(); // 'type/filename' → full s3Key
    let ContinuationToken;
    let total = 0;
    do {
        const res = await s3Client.send(new ListObjectsV2Command({
            Bucket: BUCKET,
            Prefix: 'originals/',
            ContinuationToken,
        }));
        for (const obj of (res.Contents || [])) {
            const key      = obj.Key;
            const parts    = key.split('/');
            const type     = parts[1] || 'unknown';
            const basename = path.basename(key);
            const mapKey   = `${type}/${basename}`;
            if (!index.has(mapKey)) index.set(mapKey, key);
            total++;
        }
        ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (ContinuationToken);
    console.log(`  → ${total} S3 objects indexed (keyed by type/filename).\n`);
    return index;
};

const generateS3Url = (s3Key) => {
    const cloudFrontUrl = process.env.CLOUDFRONT_URL;
    if (cloudFrontUrl) {
        return `${cloudFrontUrl.replace(/\/$/, '')}/${s3Key.replace(/^\//, '')}`;
    }
    return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${s3Key}`;
};

// Helper to normalize legacy URLs before resolving filesystem paths.
// Handles every known malformed pattern and always returns /uploads/... or null.
const normalizeVideoUrl = (url) => {
    if (!url || typeof url !== 'string') return null;

    // CloudFront HLS URL (master.m3u8) -> signal caller to treat as HLS-only
    if (url.includes('.m3u8')) return null;

    // Also skip any other CloudFront/S3 URLs that are not /uploads/ local paths
    // (e.g. already-migrated originals pointing at CloudFront)
    if (url.startsWith('http') && !url.includes('/uploads/')) return null;

    let normalized = url;

    // Strip full http(s)://domain prefix, keep only the path
    if (normalized.startsWith('http')) {
        try {
            normalized = new URL(normalized).pathname;
        } catch (e) {
            // malformed absolute URL - fall through to uploads search below
        }
    }

    // Find the /uploads/ anchor regardless of what garbage precedes it.
    // Handles: undefined/uploads/..., undefinedundefined/uploads/...,
    //          //uploads/..., uploads/... (no leading slash), etc.
    const uploadsIndex = normalized.indexOf('uploads/');
    if (uploadsIndex !== -1) {
        normalized = '/' + normalized.substring(uploadsIndex);
    } else {
        // No uploads/ segment found — cannot resolve to a local path
        return null;
    }

    return normalized;
};

// collectWorkItems now accepts the pre-built S3 index so it can classify
// every record into exactly one bucket without issuing any extra AWS calls.
//
// Returned object:
//   alreadyMigrated  – Mongo s3_url / original_s3_url already set → skip
//   mongoNeedsUpdate – file exists in S3, Mongo field missing     → patch only
//   toUpload         – neither in Mongo nor in S3                 → upload
//   localMissing     – local file absent and not in S3            → report only
//   hlsOnly          – HLS / CloudFront URL                       → skip
const collectWorkItems = async (s3Index) => {
    const buckets = {
        alreadyMigrated:  [],
        mongoNeedsUpdate: [],
        toUpload:         [],
        localMissing:     [],
        hlsOnly:          [],
    };

    const wantsType = (type) => !ONLY_TYPES || ONLY_TYPES.includes(type);

    // ── helper: classify one video field into the right bucket ─────────────
    const classify = ({ label, title, id, rawUrl, localPath, s3Type, apply }) => {
        // HLS / non-local URL?
        const normalizedUrl = normalizeVideoUrl(rawUrl);
        if (!normalizedUrl) {
            buckets.hlsOnly.push({ label, title, id, originalUrl: rawUrl, isHlsOnly: true });
            return;
        }
        const resolvedPath = localPath || getFilePathFromUrl(normalizedUrl);
        const filename     = resolvedPath ? path.basename(resolvedPath) : null;
        const mapKey       = filename ? `${s3Type}/${filename}` : null;
        const s3Key        = mapKey ? s3Index.get(mapKey) : null;

        if (s3Key) {
            // File exists in S3 — just needs Mongo patched.
            const url = generateS3Url(s3Key);
            buckets.mongoNeedsUpdate.push({ label, title, id, originalUrl: rawUrl, resolvedPath, s3Type, url, apply });
        } else if (resolvedPath && fs.existsSync(resolvedPath)) {
            // File on disk but not in S3 — must upload.
            buckets.toUpload.push({
                label, title, id,
                originalUrl: rawUrl,
                localPath: resolvedPath,
                s3Type,
                alreadyMigrated: false,
                apply,
            });
        } else {
            // Not in S3, not on disk — orphan.
            buckets.localMissing.push({ label, title, id, originalUrl: rawUrl, resolvedPath });
        }
    };

    // ── QuickByte ─────────────────────────────────────────────────────────
    if (wantsType('quickbyte')) {
        const quickBytes = await QuickByte.find({}).lean(false);
        for (const qb of quickBytes) {
            if (qb.video?.url) {
                if (qb.video.s3_url || qb.video.original_s3_url) {
                    buckets.alreadyMigrated.push({ label: `QuickByte "${qb.title}" (${qb._id}) - main video`, title: qb.title });
                } else {
                    classify({
                        label:    `QuickByte "${qb.title}" (${qb._id}) - main video`,
                        title:    qb.title,
                        id:       qb._id,
                        rawUrl:   qb.video.url,
                        localPath: getFilePathFromUrl(normalizeVideoUrl(qb.video.url)),
                        s3Type:   S3_PREFIX.quickbyte,
                        apply:    async (url) => QuickByte.updateOne({ _id: qb._id }, { $set: { 'video.s3_url': url } }),
                    });
                }
            }
            for (const ep of (qb.episodes || [])) {
                if (ep.url) {
                    if (ep.s3_url || ep.original_s3_url) {
                        buckets.alreadyMigrated.push({ label: `QuickByte "${qb.title}" (${qb._id}) - episode ${ep._id}`, title: qb.title });
                    } else {
                        classify({
                            label:    `QuickByte "${qb.title}" (${qb._id}) - episode ${ep._id}`,
                            title:    qb.title,
                            id:       ep._id,
                            rawUrl:   ep.url,
                            localPath: getFilePathFromUrl(normalizeVideoUrl(ep.url)),
                            s3Type:   S3_PREFIX.quickbyte_episode,
                            apply:    async (url) => QuickByte.updateOne(
                                { _id: qb._id, 'episodes._id': ep._id },
                                { $set: { 'episodes.$.s3_url': url } }
                            ),
                        });
                    }
                }
            }
        }
    }

    // ── ForYou ────────────────────────────────────────────────────────────
    if (wantsType('foryou')) {
        const reels = await ForYou.find({}).lean(false);
        for (const reel of reels) {
            if (reel.video?.url) {
                if (reel.video.s3_url || reel.video.original_s3_url) {
                    buckets.alreadyMigrated.push({ label: `ForYou "${reel.title}" (${reel._id})`, title: reel.title });
                } else {
                    classify({
                        label:    `ForYou "${reel.title}" (${reel._id})`,
                        title:    reel.title,
                        id:       reel._id,
                        rawUrl:   reel.video.url,
                        localPath: getFilePathFromUrl(normalizeVideoUrl(reel.video.url)),
                        s3Type:   S3_PREFIX.foryou,
                        apply:    async (url) => ForYou.updateOne({ _id: reel._id }, { $set: { 'video.s3_url': url } }),
                    });
                }
            }
        }
    }

    // ── Content (movie / trailer / episode) ───────────────────────────────
    if (wantsType('movie') || wantsType('episode') || wantsType('trailer')) {
        const contentItems = await Content.find({}).lean(false);
        for (const c of contentItems) {
            if (wantsType('movie') && c.video?.url) {
                if (c.video.s3_url || c.video.original_s3_url) {
                    buckets.alreadyMigrated.push({ label: `Content "${c.title}" (${c._id}) - main video`, title: c.title });
                } else {
                    classify({
                        label:    `Content "${c.title}" (${c._id}) - main video`,
                        title:    c.title,
                        id:       c._id,
                        rawUrl:   c.video.url,
                        localPath: getFilePathFromUrl(normalizeVideoUrl(c.video.url)),
                        s3Type:   S3_PREFIX.movie,
                        apply:    async (url) => Content.updateOne({ _id: c._id }, { $set: { 'video.s3_url': url } }),
                    });
                }
            }
            if (wantsType('trailer') && c.trailer?.url) {
                if (c.trailer.s3_url || c.trailer.original_s3_url) {
                    buckets.alreadyMigrated.push({ label: `Content "${c.title}" (${c._id}) - trailer`, title: c.title });
                } else {
                    classify({
                        label:    `Content "${c.title}" (${c._id}) - trailer`,
                        title:    c.title,
                        id:       c._id,
                        rawUrl:   c.trailer.url,
                        localPath: getFilePathFromUrl(normalizeVideoUrl(c.trailer.url)),
                        s3Type:   S3_PREFIX.trailer,
                        apply:    async (url) => Content.updateOne({ _id: c._id }, { $set: { 'trailer.s3_url': url } }),
                    });
                }
            }
            if (wantsType('episode')) {
                for (const season of (c.seasons || [])) {
                    for (const ep of (season.episodes || [])) {
                        if (ep.video?.url) {
                            if (ep.video.s3_url || ep.video.original_s3_url) {
                                buckets.alreadyMigrated.push({ label: `Content "${c.title}" (${c._id}) - S${season.seasonNumber}E${ep.episodeNumber}`, title: c.title });
                            } else {
                                classify({
                                    label:    `Content "${c.title}" (${c._id}) - S${season.seasonNumber}E${ep.episodeNumber} (${ep._id})`,
                                    title:    c.title,
                                    id:       ep._id,
                                    rawUrl:   ep.video.url,
                                    localPath: getFilePathFromUrl(normalizeVideoUrl(ep.video.url)),
                                    s3Type:   S3_PREFIX.episode,
                                    apply:    async (url) => Content.updateOne(
                                        { _id: c._id },
                                        { $set: { 'seasons.$[s].episodes.$[e].video.s3_url': url } },
                                        { arrayFilters: [{ 's._id': season._id }, { 'e._id': ep._id }] }
                                    ),
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    // ── Banner ────────────────────────────────────────────────────────────
    if (wantsType('banner')) {
        const banners = await Banner.find({ mediaType: 'video' }).lean(false);
        for (const b of banners) {
            if (b.mediaUrl) {
                if (b.originalS3Url) {
                    buckets.alreadyMigrated.push({ label: `Banner (${b._id})`, title: `Banner ${b._id}` });
                } else {
                    classify({
                        label:    `Banner (${b._id})`,
                        title:    `Banner ${b._id}`,
                        id:       b._id,
                        rawUrl:   b.mediaUrl,
                        localPath: null,
                        s3Type:   S3_PREFIX.banner,
                        apply:    async (url) => Banner.updateOne({ _id: b._id }, { $set: { originalS3Url: url } }),
                    });
                }
            }
        }
    }

    // ── Promotion ─────────────────────────────────────────────────────────
    if (wantsType('promotion')) {
        const promotions = await Promotion.find({}).lean(false);
        for (const p of promotions) {
            if (p.promoVideoUrl) {
                if (p.originalS3Url) {
                    buckets.alreadyMigrated.push({ label: `Promotion "${p.title}" (${p._id})`, title: p.title });
                } else {
                    classify({
                        label:    `Promotion "${p.title}" (${p._id})`,
                        title:    p.title,
                        id:       p._id,
                        rawUrl:   p.promoVideoUrl,
                        localPath: null,
                        s3Type:   S3_PREFIX.promotion,
                        apply:    async (url) => Promotion.updateOne({ _id: p._id }, { $set: { originalS3Url: url } }),
                    });
                }
            }
        }
    }

    return buckets;
};

const run = async () => {
    let isShuttingDown = false;

    await mongoose.connect(process.env.MONGODB_URI);
    const { host, name } = mongoose.connection;
    console.log(`Database    : ${name} @ ${host}`);
    console.log(`Uploads     : ${UPLOAD_BASE}`);
    console.log(`Mode        : ${DRY_RUN ? 'DRY RUN (no uploads, no DB writes)' : 'EXECUTE'}`);
    console.log(`Concurrency : ${CONCURRENCY}`);
    if (ONLY_TYPES) console.log(`Restricted to types: ${ONLY_TYPES.join(', ')}`);
    console.log('');

    // Build S3 index once up-front — avoids 195 individual HeadObject calls
    // for files already uploaded, and gives us a collision-safe type/filename key.
    const s3Index = await buildS3Index();

    process.on('SIGINT', () => {
        console.log('\n[!] Caught SIGINT — stopping after current items finish …');
        isShuttingDown = true;
    });

    console.log('Scanning MongoDB …');
    const buckets = await collectWorkItems(s3Index);
    const totalScanned = buckets.alreadyMigrated.length + buckets.mongoNeedsUpdate.length +
                         buckets.toUpload.length + buckets.localMissing.length + buckets.hlsOnly.length;
    console.log(`Scanned ${totalScanned} record(s):`);
    console.log(`  Already Migrated (Mongo)    : ${buckets.alreadyMigrated.length}`);
    console.log(`  S3 Exists → Mongo Needs Patch: ${buckets.mongoNeedsUpdate.length}`);
    console.log(`  Would Upload                : ${buckets.toUpload.length}`);
    console.log(`  Local Missing               : ${buckets.localMissing.length}`);
    console.log(`  HLS Only                    : ${buckets.hlsOnly.length}`);
    console.log('');

    let totalUploadBytes = 0;
    for (const i of buckets.toUpload) {
        try { totalUploadBytes += fs.statSync(i.localPath).size; } catch { /* gone */ }
    }
    console.log(`Total size to upload: ${formatBytes(totalUploadBytes)}\n`);

    const results = {
        skipped:          [...buckets.alreadyMigrated],
        s3Exists:         [],   // mongoNeedsUpdate applied during execute
        uploaded:         [],
        hlsOnly:          [...buckets.hlsOnly],
        s3Missing:        [...buckets.localMissing],
        failed:           [],
    };

    if (DRY_RUN) {
        console.log('=== DRY RUN — no uploads, no DB writes ===\n');
        if (buckets.alreadyMigrated.length) {
            console.log(`--- Already Migrated (${buckets.alreadyMigrated.length}) ---`);
            buckets.alreadyMigrated.forEach(i => console.log(`  ${i.label}`));
        }
        if (buckets.mongoNeedsUpdate.length) {
            console.log(`\n--- S3 Exists → Mongo Update Needed (${buckets.mongoNeedsUpdate.length}) ---`);
            buckets.mongoNeedsUpdate.forEach(i => console.log(`  ${i.label}`));
        }
        if (buckets.toUpload.length) {
            console.log(`\n--- Would Upload (${buckets.toUpload.length}) ---`);
            buckets.toUpload.forEach(i => console.log(`  ${i.label}`));
        }
        if (buckets.localMissing.length) {
            console.log(`\n--- Local Missing (${buckets.localMissing.length}) ---`);
            buckets.localMissing.forEach(i => console.log(`  ${i.label}`));
        }
        if (buckets.hlsOnly.length) {
            console.log(`\n--- HLS Only (${buckets.hlsOnly.length}) ---`);
            buckets.hlsOnly.forEach(i => console.log(`  ${i.label}`));
        }
        console.log('\nDry run complete — re-run with --execute to apply changes.');
        await mongoose.disconnect();
        return;
    }

    // ── Execute path ──────────────────────────────────────────────────────

    // Step 1: Apply Mongo patches for files already in S3 (no upload).
    console.log(`Patching Mongo for ${buckets.mongoNeedsUpdate.length} record(s) already in S3 …`);
    for (const item of buckets.mongoNeedsUpdate) {
        try {
            await item.apply(item.url);
            results.s3Exists.push(item);
            console.log(`  MONGO_PATCHED → ${item.label}`);
        } catch (dbErr) {
            results.failed.push({ ...item, reason: `Mongo patch failed: ${dbErr.message}` });
            console.log(`  MONGO_FAILED  → ${dbErr.message} → ${item.label}`);
        }
    }

    // Step 2: Upload only the files genuinely missing from S3.
    if (buckets.toUpload.length === 0) {
        console.log('\nNo files to upload — all originals already exist in S3.');
    } else {
        console.log(`\nUploading ${buckets.toUpload.length} file(s) missing from S3 …`);
    }

    let cursor = 0;
    let processed = 0;

    const worker = async () => {
        while (!isShuttingDown) {
            const idx = cursor++;
            if (idx >= buckets.toUpload.length) break;

            const item         = buckets.toUpload[idx];
            const itemNum      = ++processed;
            const progress     = `[${itemNum}/${buckets.toUpload.length}]`;
            const displayTitle = item.title || item.label;

            console.log(`${progress} UPLOADING → ${displayTitle}`);

            let attempt = 1;
            const maxAttempts = 4;
            let uploadedUrl = null;
            let lastError   = null;

            while (attempt <= maxAttempts) {
                if (attempt > 1) {
                    const delay = Math.pow(2, attempt - 1) * 1000;
                    console.log(`${progress} Retry ${attempt - 1}/3 → ${displayTitle}`);
                    await sleep(delay);
                }
                try {
                    uploadedUrl = await mediaService.uploadOriginalToS3(item.localPath, item.id || item.label, item.s3Type);
                    if (uploadedUrl) break;
                    throw new Error('uploadOriginalToS3 returned null without throwing');
                } catch (error) {
                    lastError = error;
                    if (attempt === maxAttempts) break;
                    attempt++;
                }
            }

            if (uploadedUrl) {
                try {
                    await item.apply(uploadedUrl);
                    results.uploaded.push({ ...item, url: uploadedUrl });
                    console.log(`${progress} UPLOADED → ${displayTitle}`);
                } catch (dbErr) {
                    results.failed.push({ ...item, reason: `Mongo update failed: ${dbErr.message}` });
                    console.log(`${progress} MONGO_FAILED → ${dbErr.message} → ${displayTitle}`);
                }
            } else {
                results.failed.push({ ...item, reason: lastError ? lastError.message : 'Unknown upload error' });
                console.log(`${progress} UPLOAD_FAILED → ${lastError ? lastError.message : 'Unknown'} → ${displayTitle}`);
            }
        }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    const totalProcessed = results.skipped.length + results.s3Exists.length +
                           results.uploaded.length + results.hlsOnly.length +
                           results.s3Missing.length + results.failed.length;

    // Summary Report
    console.log(`\n========== MIGRATION SUMMARY ==========`);
    console.log(`Already Migrated (Mongo)     : ${results.skipped.length}`);
    console.log(`S3 Exists → Mongo Updated    : ${results.s3Exists.length}`);
    console.log(`Uploaded                     : ${results.uploaded.length}`);
    console.log(`HLS Only                     : ${results.hlsOnly.length}`);
    console.log(`Local Missing                : ${results.s3Missing.length}`);
    console.log(`Failed                       : ${results.failed.length}`);
    console.log(`Total                        : ${totalProcessed}`);
    console.log('');

    if (isShuttingDown) {
        console.log('[!] Script was interrupted via SIGINT — re-run to process remaining items.');
    }

    // Full report, same convention as cleanupOrphanedMedia.js - never rely on
    // a truncated console scroll for something this consequential.
    const reportDir = path.join(__dirname, '../logs');
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    const txtReportPath = path.join(reportDir, `migrate-originals-${timestampStr}.txt`);
    const jsonReportPath = path.join(reportDir, `migration-summary-${timestampStr}.json`);

    try {
        fs.mkdirSync(reportDir, { recursive: true });
        
        // JSON Migration Summary
        const summary = {
            timestamp:        new Date().toISOString(),
            mode:             DRY_RUN ? 'dry-run' : 'execute',
            database:         `${name} @ ${host}`,
            alreadyMigrated:  results.skipped.length,
            s3ExistsMongoPatch: results.s3Exists.length,
            uploaded:         results.uploaded.length,
            hlsOnly:          results.hlsOnly.length,
            localMissing:     results.s3Missing.length,
            failed:           results.failed.length,
            total:            totalProcessed,
            uploadedDetails:    results.uploaded.map(r => ({ label: r.label, url: r.url })),
            s3ExistsDetails:    results.s3Exists.map(r => ({ label: r.label, url: r.url })),
            localMissingDetails: results.s3Missing.map(r => ({ label: r.label })),
            failures:           results.failed,
        };
        fs.writeFileSync(jsonReportPath, JSON.stringify(summary, null, 2));

        const lines = [
            `Migration report — ${new Date().toISOString()}`,
            `Mode     : ${DRY_RUN ? 'DRY RUN' : 'EXECUTE'}`,
            `Database : ${name} @ ${host}`,
            `Already Migrated: ${results.skipped.length}, S3 Exists→Mongo: ${results.s3Exists.length}, Uploaded: ${results.uploaded.length}, HLS Only: ${results.hlsOnly.length}, Local Missing: ${results.s3Missing.length}, Failed: ${results.failed.length}`,
            '',
            '=== UPLOADED ===',
            ...results.uploaded.map(r => `  ${r.label}\t${r.url}`),
            '',
            '=== S3 EXISTS → MONGO UPDATED ===',
            ...results.s3Exists.map(r => `  ${r.label}\t${r.url}`),
            '',
            '=== LOCAL FILE MISSING ===',
            ...results.s3Missing.map(r => `  ${r.label}`),
            '',
            '=== FAILED ===',
            ...results.failed.map(r => `  ${r.label}\t${r.reason}`),
        ];
        fs.writeFileSync(txtReportPath, lines.join('\n') + '\n');
        
        console.log(`Full TXT report written to: ${txtReportPath}`);
        console.log(`Summary JSON report written to: ${jsonReportPath}`);
    } catch (error) {
        console.error(`Could not write migration reports: ${error.message}`);
    }

    if (results.failed.length > 0) {
        console.log('\nSome files failed — local originals were NOT touched. Re-run to retry.');
    }
    console.log('\nLocal files were NOT deleted. Run verifyMediaIntegrity.js then cleanupOrphanedMedia.js --delete-verified-originals only after review.');

    await mongoose.disconnect();
};

if (require.main === module) {
    run().catch(error => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
}

module.exports = { collectWorkItems, buildS3Index, run };
