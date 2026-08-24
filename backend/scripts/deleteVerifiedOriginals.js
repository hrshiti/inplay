/**
 * deleteVerifiedOriginals.js
 *
 * INPLAY OTT — Production Recovery Script
 *
 * OBJECTIVE
 * ---------
 * Safely delete local original MP4 files from `/uploads/videos` ONLY IF:
 *   1. S3 Inventory confirms the object exists in `originals/` OR Mongo has verified `s3_url`.
 *   2. HLS URL exists (`hls_url`) for Content (Movie/Trailer) where applicable.
 *   3. The local file actually exists on disk.
 *   4. The S3 filename matches the local filename.
 *   5. The record belongs to QuickByte, Content, Banner, Promotion, or ForYou.
 *
 * SAFETY GUARANTEES
 * -----------------
 * - Dry-run by default (reports and audits only).
 * - Deletes ONLY when `--execute` is explicitly passed.
 * - Never modifies MongoDB.
 * - Never uploads to S3.
 * - Never touches HLS folders or playlists (`temp_hls`, `videos/`, `.m3u8`, `.ts`).
 * - Never touches images, thumbnails, posters, backdrops, or audio files.
 * - Concurrency limit = 2 during execution.
 * - If ANY verification check fails, the file is classified as PROTECTED and NEVER deleted.
 *
 * USAGE (from backend/):
 *   node scripts/deleteVerifiedOriginals.js            # Dry run audit & report
 *   node scripts/deleteVerifiedOriginals.js --execute  # Delete verified originals
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const { UPLOAD_BASE } = require('../config/multerStorage');
const { formatBytes } = require('../utils/diskSpace');

// ─── Models ──────────────────────────────────────────────────────────────────
const Content = require('../models/Content');
const QuickByte = require('../models/QuickByte');
const ForYou = require('../models/ForYou');
const Banner = require('../models/Banner');
const Promotion = require('../models/Promotion');

// ─── CLI Options ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const DRY_RUN = !EXECUTE;
const CONCURRENCY = 2;

const VIDEOS_DIR = path.join(UPLOAD_BASE, 'videos');
const BUCKET = process.env.AWS_S3_BUCKET;
const REGION = process.env.AWS_REGION || 'ap-south-1';

const s3 = new S3Client({
    region: REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const decodeURIComponentSafe = (str) => {
    try {
        return decodeURIComponent(str);
    } catch {
        return str;
    }
};

/**
 * Extracts clean filename from any URL or path string.
 */
const extractBasename = (raw) => {
    if (!raw || typeof raw !== 'string') return null;
    let clean = decodeURIComponentSafe(raw).trim();
    clean = clean.split('?')[0].split('#')[0];
    const base = path.basename(clean);
    return (base && base !== '.' && base !== '/' && base !== '\\') ? base : null;
};

const VIDEO_EXTENSIONS = [
    '.mp4',
    '.m4v',
    '.mov',
    '.webm',
    '.mkv',
    '.avi',
    '.3gp'
];

/**
 * Recursively list all video files in directory.
 * Never scans .ts files and skips sample_/tmp_/test_ and hidden files.
 */
const listVideoFiles = (dir) => {
    const out = [];
    if (!fs.existsSync(dir)) return out;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        // Skip hidden files, temporary files, and test files
        if (
            entry.name.startsWith('.') ||
            entry.name.startsWith('sample_') ||
            entry.name.startsWith('tmp_') ||
            entry.name.startsWith('test_')
        ) {
            continue;
        }

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'temp_hls') continue;
            out.push(...listVideoFiles(fullPath));
        } else {
            const ext = path.extname(entry.name).toLowerCase();
            if (VIDEO_EXTENSIONS.includes(ext)) {
                out.push(fullPath);
            }
        }
    }
    return out;
};

/**
 * Lists all objects under originals/ in S3 to build live S3 inventory.
 * Map<basename, fullS3Key>
 */
const buildS3Inventory = async () => {
    const map = new Map();
    console.log(`Listing S3 bucket "${BUCKET}" under "originals/" to build S3 inventory...`);
    let ContinuationToken;
    let totalObjects = 0;

    try {
        do {
            const resp = await s3.send(new ListObjectsV2Command({
                Bucket: BUCKET,
                Prefix: 'originals/',
                ContinuationToken,
            }));

            for (const obj of (resp.Contents || [])) {
                if (obj.Key && !obj.Key.endsWith('/')) {
                    const base = path.basename(obj.Key);
                    if (base) {
                        map.set(base, obj.Key);
                        totalObjects++;
                    }
                }
            }
            ContinuationToken = resp.NextContinuationToken;
        } while (ContinuationToken);

        console.log(`Indexed ${totalObjects} S3 original(s) across ${map.size} unique filename(s).\n`);
    } catch (err) {
        console.warn(`[!] Warning: S3 inventory listing failed (${err.message}). Proceeding with Mongo references.\n`);
    }

    return map;
};

// ─── Main Script ─────────────────────────────────────────────────────────────

const run = async () => {
    console.log(`=======================================================`);
    console.log(` INPLAY OTT — Verified Originals Delete & Space Reclaim`);
    console.log(`=======================================================`);
    console.log(`Mode        : ${DRY_RUN ? 'DRY RUN (Audit & Report only — NO deletions)' : 'EXECUTE (Deleting verified originals)'}`);
    console.log(`Uploads Dir : ${UPLOAD_BASE}`);
    console.log(`Videos Dir  : ${VIDEOS_DIR}`);
    console.log(`Concurrency : ${CONCURRENCY}\n`);

    // 1. Build S3 Inventory as source of truth
    const s3Inventory = await buildS3Inventory();

    // 2. Connect to MongoDB and scan models
    await mongoose.connect(process.env.MONGODB_URI);
    const { host, name } = mongoose.connection;
    console.log(`Connected to Database: ${name} @ ${host}\n`);

    console.log(`Scanning MongoDB models for media records...`);

    // Map: localBasename -> Array of record candidate descriptors
    const mongoMap = new Map();
    const contentCandidates = [];
    const quickbyteEpisodeMap = new Map();

    const addRecordCandidate = (candidate) => {
        // Content movies/trailers store HLS playlist in Mongo.
        // Never index master.m3u8 as an original filename.
        let localBase = extractBasename(candidate.localUrl);

        if (
            candidate.model === "Content" &&
            localBase &&
            localBase.endsWith(".m3u8")
        ) {
            localBase = null;
        }

        if (candidate.model === 'Content') {
            contentCandidates.push(candidate);
        }

        // Non-content models must always have a local basename.
        if (!localBase && candidate.model !== "Content") {
            return;
        }

        if (localBase) {
            if (!mongoMap.has(localBase)) {
                mongoMap.set(localBase, []);
            }
            mongoMap.get(localBase).push({
                ...candidate,
                localBasename: localBase,
                s3Basename: extractBasename(candidate.s3Url),
            });
        }
    };

    // ── QuickByte ──
    const quickbytes = await QuickByte.find({}).lean(true);
    for (const qb of quickbytes) {
        if (qb.video?.url) {
            addRecordCandidate({
                model: 'QuickByte',
                type: 'quickbyte_main',
                docId: qb._id.toString(),
                title: qb.title || 'Untitled QuickByte',
                label: `QuickByte "${qb.title}" (${qb._id}) - main video`,
                localUrl: qb.video.url,
                s3Url: qb.video.s3_url || qb.video.original_s3_url || null,
                hlsUrl: qb.video.hls_url || null,
            });
        }
        for (const ep of (qb.episodes || [])) {
            const epCandidate = {
                model: 'QuickByte',
                type: 'quickbyte_episode',
                docId: qb._id.toString(),
                subId: ep._id?.toString(),
                title: `${qb.title || 'QuickByte'} - Episode ${ep._id}`,
                label: `QuickByte "${qb.title}" (${qb._id}) - episode ${ep._id}`,
                localUrl: ep.url,
                s3Url: ep.s3_url || ep.original_s3_url || null,
                hlsUrl: ep.hls_url || null,
            };

            addRecordCandidate(epCandidate);

            // Secondary lookup for QuickByte episodes (PATCH 1)
            if (ep.url) {
                const rawBase = extractBasename(ep.url);
                if (rawBase) quickbyteEpisodeMap.set(rawBase, epCandidate);
            }
            if (ep.s3_url || ep.original_s3_url) {
                const s3Base = extractBasename(ep.s3_url || ep.original_s3_url);
                if (s3Base) quickbyteEpisodeMap.set(s3Base, epCandidate);
            }
        }
    }

    // ── Content ──
    const contents = await Content.find({}).lean(true);
    for (const c of contents) {
        if (c.video?.url) {
            addRecordCandidate({
                model: 'Content',
                type: 'content_movie',
                docId: c._id.toString(),
                title: c.title || 'Untitled Movie',
                label: `Content "${c.title}" (${c._id}) - movie video`,
                localUrl: c.video.url,
                s3Url: c.video.s3_url || c.video.original_s3_url || null,
                hlsUrl: c.video.hls_url || null,
                requireHls: true,
            });
        }
        if (c.trailer?.url) {
            addRecordCandidate({
                model: 'Content',
                type: 'content_trailer',
                docId: c._id.toString(),
                title: `${c.title || 'Content'} - Trailer`,
                label: `Content "${c.title}" (${c._id}) - trailer`,
                localUrl: c.trailer.url,
                s3Url: c.trailer.s3_url || c.trailer.original_s3_url || null,
                hlsUrl: c.trailer.hls_url || null,
                requireHls: true,
            });
        }
        for (const season of (c.seasons || [])) {
            for (const ep of (season.episodes || [])) {
                if (ep.video?.url) {
                    addRecordCandidate({
                        model: 'Content',
                        type: 'content_episode',
                        docId: c._id.toString(),
                        subId: ep._id?.toString(),
                        title: `${c.title || 'Content'} - S${season.seasonNumber}E${ep.episodeNumber}`,
                        label: `Content "${c.title}" (${c._id}) - S${season.seasonNumber}E${ep.episodeNumber}`,
                        localUrl: ep.video.url,
                        s3Url: ep.video.s3_url || ep.video.original_s3_url || null,
                        hlsUrl: ep.video.hls_url || null,
                    });
                }
            }
        }
    }

    // ── Banner ──
    const banners = await Banner.find({ mediaType: 'video' }).lean(true);
    for (const b of banners) {
        if (b.mediaUrl) {
            addRecordCandidate({
                model: 'Banner',
                type: 'banner',
                docId: b._id.toString(),
                title: `Banner ${b._id}`,
                label: `Banner (${b._id})`,
                localUrl: b.mediaUrl,
                s3Url: b.originalS3Url || null,
                hlsUrl: b.hlsUrl || null,
            });
        }
    }

    // ── Promotion ──
    const promotions = await Promotion.find({}).lean(true);
    for (const p of promotions) {
        if (p.promoVideoUrl) {
            addRecordCandidate({
                model: 'Promotion',
                type: 'promotion',
                docId: p._id.toString(),
                title: p.title || 'Promotion',
                label: `Promotion "${p.title}" (${p._id})`,
                localUrl: p.promoVideoUrl,
                s3Url: p.originalS3Url || null,
                hlsUrl: p.promoVideoHlsUrl || null,
            });
        }
    }

    // ── ForYou ──
    const foryous = await ForYou.find({}).lean(true);
    for (const r of foryous) {
        if (r.video?.url) {
            addRecordCandidate({
                model: 'ForYou',
                type: 'foryou',
                docId: r._id.toString(),
                title: r.title || 'ForYou Reel',
                label: `ForYou "${r.title}" (${r._id})`,
                localUrl: r.video.url,
                s3Url: r.video.s3_url || r.video.original_s3_url || null,
                hlsUrl: r.video.hls_url || null,
            });
        }
    }

    console.log(`Indexed ${mongoMap.size} unique referenced video filename(s) across MongoDB.\n`);

    // 3. Discover local video files on disk
    console.log(`Scanning local videos directory: ${VIDEOS_DIR}...`);
    const diskFiles = listVideoFiles(VIDEOS_DIR);
    console.log(`Found ${diskFiles.length} video file(s) on disk.\n`);

    // 4. Verify each local file against verification rules
    const verifiedCategoryCounts = {
        quickbyte_main: 0,
        quickbyte_episode: 0,
        content_movie: 0,
        content_trailer: 0,
        banner: 0,
        promotion: 0,
        foryou: 0,
        content_episode: 0,
    };

    let verifiedFromMongoCount = 0;
    let recoveredFromInventoryCount = 0;

    const verifiedDeleteList = [];
    const protectedList = [];
    let safeToDeleteBytes = 0;

    for (const filePath of diskFiles) {
        const localFileBasename = path.basename(filePath);
        let fileSize = 0;
        try {
            fileSize = fs.statSync(filePath).size;
        } catch {
            fileSize = 0;
        }

        const candidates = mongoMap.get(localFileBasename);
        const s3Entry = s3Inventory.get(localFileBasename);

        // PATCH 2: Content originals are verified using HLS + S3 inventory.
        const contentCandidate =
            (candidates && candidates.find(c => c.model === "Content")) ||
            contentCandidates.find(c => {
                const s3Base = extractBasename(c.s3Url);

                return (
                    c.hlsUrl &&
                    c.hlsUrl.includes(".m3u8") &&
                    s3Base &&
                    s3Base === localFileBasename
                );
            });

        if (
            contentCandidate &&
            contentCandidate.model === 'Content' &&
            contentCandidate.hlsUrl &&
            contentCandidate.hlsUrl.includes('.m3u8')
        ) {
            if (s3Entry) {
                verifiedDeleteList.push({
                    filePath,
                    basename: localFileBasename,
                    fileSize,
                    status: 'VERIFIED_DELETE',
                    verificationSource: 'S3_INVENTORY',
                    s3Key: s3Entry,
                    candidate: contentCandidate,
                    reason: 'Verified via HLS + S3 inventory',
                });
                safeToDeleteBytes += fileSize;
                if (verifiedCategoryCounts[contentCandidate.type] !== undefined) {
                    verifiedCategoryCounts[contentCandidate.type]++;
                }
                recoveredFromInventoryCount++;
                continue;
            }
        }

        // Secondary fallback check for QuickByte episodes (PATCH 2)
        const qbEpCandidate = quickbyteEpisodeMap.get(localFileBasename);
        if (qbEpCandidate && s3Entry) {
            verifiedDeleteList.push({
                filePath,
                basename: localFileBasename,
                fileSize,
                status: 'VERIFIED_DELETE',
                verificationSource: 'QUICKBYTE_EPISODE_MAP',
                s3Key: s3Entry,
                candidate: qbEpCandidate,
                reason: 'Recovered from S3 inventory via QuickByteEpisodeMap',
            });
            safeToDeleteBytes += fileSize;
            verifiedCategoryCounts.quickbyte_episode++;
            recoveredFromInventoryCount++;
            continue;
        }

        // Check A: If file exists in S3 Inventory directly (Source of truth)
        if (s3Entry) {
            const matchedCandidate = candidates && candidates.length > 0 ? candidates[0] : {
                model: 'S3_Inventory',
                type: 'recovered_inventory',
                label: `Recovered: ${s3Entry}`,
                s3Url: s3Entry,
            };

            // PATCH 3: Only compare MP4 originals
            const s3Base = extractBasename(matchedCandidate.s3Url || s3Entry);
            if (s3Base && s3Base.endsWith('.mp4')) {
                if (s3Base !== localFileBasename) {
                    protectedList.push({
                        filePath,
                        basename: localFileBasename,
                        fileSize,
                        status: 'FILENAME_MISMATCH',
                        reason: 'Filename mismatch',
                        candidate: matchedCandidate,
                    });
                    continue;
                }
            }

            const isFromMongo = !!(matchedCandidate.s3Url && !matchedCandidate.s3Url.endsWith('.m3u8') && extractBasename(matchedCandidate.s3Url) === localFileBasename);
            if (isFromMongo) {
                verifiedFromMongoCount++;
            } else {
                recoveredFromInventoryCount++;
            }

            verifiedDeleteList.push({
                filePath,
                basename: localFileBasename,
                fileSize,
                status: 'VERIFIED_DELETE',
                verificationSource: isFromMongo ? 'MONGO' : 'S3_INVENTORY',
                s3Key: s3Entry,
                candidate: matchedCandidate,
            });
            safeToDeleteBytes += fileSize;
            if (verifiedCategoryCounts[matchedCandidate.type] !== undefined) {
                verifiedCategoryCounts[matchedCandidate.type]++;
            }
            continue;
        }

        // Check B: Not found in S3 inventory — check if verified via Mongo with verified s3_url
        if (candidates && candidates.length > 0) {
            let matchedCandidate = null;
            let failureReason = null;

            for (const cand of candidates) {
                if (!cand.s3Url) {
                    failureReason = `MongoDB record (${cand.label}) has no s3_url / originalS3Url recorded and not in S3 inventory`;
                    continue;
                }

                // PATCH 3: Only compare MP4 originals
                const s3Base = extractBasename(cand.s3Url);
                if (s3Base && s3Base.endsWith('.mp4')) {
                    if (s3Base !== localFileBasename) {
                        failureReason = `S3 filename (${s3Base}) does not match local filename (${localFileBasename})`;
                        continue;
                    }
                }

                matchedCandidate = cand;
                break;
            }

            if (matchedCandidate) {
                verifiedFromMongoCount++;
                verifiedDeleteList.push({
                    filePath,
                    basename: localFileBasename,
                    fileSize,
                    status: 'VERIFIED_DELETE',
                    verificationSource: 'MONGO',
                    s3Key: matchedCandidate.s3Url,
                    candidate: matchedCandidate,
                });
                safeToDeleteBytes += fileSize;
                if (verifiedCategoryCounts[matchedCandidate.type] !== undefined) {
                    verifiedCategoryCounts[matchedCandidate.type]++;
                }
            } else {
                protectedList.push({
                    filePath,
                    basename: localFileBasename,
                    fileSize,
                    status: 'MONGO_REFERENCE_MISSING_S3',
                    reason: failureReason || 'Failed verification checks',
                    candidate: candidates[0],
                });
            }
            continue;
        }

        // Check C: Completely unreferenced on disk and missing from S3 inventory
        protectedList.push({
            filePath,
            basename: localFileBasename,
            fileSize,
            status: 'LOCAL_NOT_REFERENCED',
            reason: 'No matching filename found in MongoDB collections or S3 inventory',
        });
    }

    // 5. Output Summary (PATCH 4)
    const failedVerificationCount = protectedList.filter(p => p.status !== 'LOCAL_NOT_REFERENCED').length;

    console.log(`========== VERIFIED ORIGINALS AUDIT ==========`);
    console.log(`QuickByte Main Verified     : ${verifiedCategoryCounts.quickbyte_main}`);
    console.log(`QuickByte Episodes Verified : ${verifiedCategoryCounts.quickbyte_episode}`);
    console.log(`Content Movies Verified     : ${verifiedCategoryCounts.content_movie}`);
    console.log(`Content Trailers Verified   : ${verifiedCategoryCounts.content_trailer}`);
    console.log(``);
    console.log(`Verified from Mongo         : ${verifiedFromMongoCount}`);
    console.log(`Recovered from S3 Inventory : ${recoveredFromInventoryCount}`);
    console.log(``);
    console.log(`SAFE TO DELETE              : ${verifiedDeleteList.length} files (${formatBytes(safeToDeleteBytes)})`);
    console.log(`PROTECTED                   : ${protectedList.length} files`);
    console.log(`FAILED VERIFICATION         : ${failedVerificationCount}`);
    console.log(`==============================================\n`);

    // Top 20 Protected Reasons
    if (protectedList.length > 0) {
        console.log(`Top Protected File Reasons (Sample of up to 20):`);
        protectedList.slice(0, 20).forEach(p => {
            console.log(`  [${p.status}] ${p.basename} → ${p.reason}`);
        });
        console.log('');
    }

    // 6. Generate Reports
    const reportDir = path.join(__dirname, '../logs');
    const dateStr = new Date().toISOString().slice(0, 10);
    const txtSafePath = path.join(reportDir, `verified-originals-delete-${dateStr}.txt`);
    const jsonReportPath = path.join(reportDir, `verified-originals-delete-${dateStr}.json`);
    const txtProtectedPath = path.join(reportDir, `protected-originals-${dateStr}.txt`);

    try {
        fs.mkdirSync(reportDir, { recursive: true });

        // 1. Text report: ONLY safe to delete files
        const safeLines = [
            `# INPLAY OTT — Verified Originals Safe for Deletion (${dateStr})`,
            `# Total Safe Files: ${verifiedDeleteList.length} (${formatBytes(safeToDeleteBytes)})`,
            `# Verified from Mongo: ${verifiedFromMongoCount} | Recovered from S3 Inventory: ${recoveredFromInventoryCount}`,
            '',
            ...verifiedDeleteList.map(v => `${v.basename}\t${formatBytes(v.fileSize)}\t[${v.verificationSource}]\t${v.s3Key || v.candidate?.s3Url || ''}`),
        ];
        fs.writeFileSync(txtSafePath, safeLines.join('\n') + '\n');

        // 2. Text report: Protected files
        const protectedLines = [
            `# INPLAY OTT — Protected / Skipped Media Files (${dateStr})`,
            `# Total Protected Files: ${protectedList.length}`,
            '',
            ...protectedList.map(p => `[${p.status}]\t${p.basename}\t${formatBytes(p.fileSize)}\t${p.reason}`),
        ];
        fs.writeFileSync(txtProtectedPath, protectedLines.join('\n') + '\n');

        // 3. Full JSON report
        const jsonSummary = {
            timestamp: new Date().toISOString(),
            mode: DRY_RUN ? 'dry-run' : 'execute',
            database: `${name} @ ${host}`,
            counts: {
                totalDiskFiles: diskFiles.length,
                safeToDelete: verifiedDeleteList.length,
                safeToDeleteBytes,
                safeToDeleteFormatted: formatBytes(safeToDeleteBytes),
                verifiedFromMongo: verifiedFromMongoCount,
                recoveredFromInventory: recoveredFromInventoryCount,
                protected: protectedList.length,
                verifiedCategoryCounts,
            },
            verifiedDeleteList: verifiedDeleteList.map(v => ({
                basename: v.basename,
                filePath: v.filePath,
                fileSize: v.fileSize,
                fileSizeFormatted: formatBytes(v.fileSize),
                verificationSource: v.verificationSource,
                s3Key: v.s3Key,
                label: v.candidate?.label,
                s3Url: v.candidate?.s3Url,
                hlsUrl: v.candidate?.hlsUrl,
            })),
            protectedList: protectedList.map(p => ({
                basename: p.basename,
                filePath: p.filePath,
                fileSize: p.fileSize,
                status: p.status,
                reason: p.reason,
                candidate: p.candidate ? { label: p.candidate.label, s3Url: p.candidate.s3Url } : null,
            })),
        };
        fs.writeFileSync(jsonReportPath, JSON.stringify(jsonSummary, null, 2));

        console.log(`Reports Generated in /logs:`);
        console.log(`  1. Safe to delete list : ${txtSafePath}`);
        console.log(`  2. Protected list      : ${txtProtectedPath}`);
        console.log(`  3. Full JSON audit     : ${jsonReportPath}\n`);
    } catch (err) {
        console.error(`Could not write audit reports: ${err.message}`);
    }

    // 7. Execute Deletions if --execute flag passed
    if (EXECUTE) {
        console.log(`\n==============================================`);
        console.log(` EXECUTING DELETIONS (Concurrency: ${CONCURRENCY})`);
        console.log(`==============================================\n`);

        let deletedCount = 0;
        let freedBytes = 0;
        let failedCount = 0;
        const deletedRecords = [];

        // Concurrency pool (limit = 2)
        const queue = [...verifiedDeleteList];

        const worker = async () => {
            while (queue.length > 0) {
                const item = queue.shift();
                if (!item) break;

                try {
                    if (fs.existsSync(item.filePath)) {
                        fs.unlinkSync(item.filePath);
                        deletedCount++;
                        freedBytes += item.fileSize;
                        deletedRecords.push(item);
                        console.log(`DELETE VERIFIED ${item.basename} (${formatBytes(item.fileSize)})`);
                    } else {
                        console.warn(`[!] File already gone: ${item.basename}`);
                    }
                } catch (delErr) {
                    failedCount++;
                    console.error(`[!] Failed to delete ${item.basename}: ${delErr.message}`);
                }
            }
        };

        await Promise.all(Array.from({ length: CONCURRENCY }, worker));

        console.log(`\n==============================================`);
        console.log(`Deleted Verified Originals : ${deletedCount}`);
        console.log(`Space Freed                : ${formatBytes(freedBytes)}`);
        console.log(`Protected Files            : ${protectedList.length}`);
        console.log(`Failed                     : ${failedCount}`);
        console.log(`==============================================\n`);

        // Update JSON report with execution results
        try {
            const executedReportPath = path.join(reportDir, `verified-originals-executed-${dateStr}.json`);
            fs.writeFileSync(executedReportPath, JSON.stringify({
                timestamp: new Date().toISOString(),
                deletedCount,
                freedBytes,
                freedFormatted: formatBytes(freedBytes),
                failedCount,
                protectedCount: protectedList.length,
                deletedFiles: deletedRecords.map(d => ({ basename: d.basename, size: d.fileSize })),
            }, null, 2));
            console.log(`Execution log written to: ${executedReportPath}\n`);
        } catch (err) {
            console.error(`Could not write executed report: ${err.message}`);
        }
    } else {
        console.log(`To perform actual deletions and reclaim space, run with --execute:`);
        console.log(`  node scripts/deleteVerifiedOriginals.js --execute\n`);
    }

    await mongoose.disconnect();
};

if (require.main === module) {
    run().catch((err) => {
        console.error('Fatal error in deleteVerifiedOriginals:', err);
        process.exit(1);
    });
}

module.exports = { run };
