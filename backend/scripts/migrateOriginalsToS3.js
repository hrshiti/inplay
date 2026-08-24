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
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');
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

const generateS3Url = (s3Key) => {
    const cloudFrontUrl = process.env.CLOUDFRONT_URL;
    if (cloudFrontUrl) {
        return `${cloudFrontUrl.replace(/\/$/, '')}/${s3Key.replace(/^\//, '')}`;
    }
    return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${s3Key}`;
};

// One work item = one video-bearing field somewhere in the database.
// `apply` writes the verified S3 URL back to the exact right place once
// uploadOriginalToS3 has confirmed (via S3 HEAD, inside mediaService) that
// the object actually exists.
const collectWorkItems = async () => {
    const items = [];

    const wantsType = (type) => !ONLY_TYPES || ONLY_TYPES.includes(type);

    if (wantsType('quickbyte')) {
        const quickBytes = await QuickByte.find({}).lean(false);
        for (const qb of quickBytes) {
            if (qb.video?.url) {
                if (!qb.video.original_s3_url) {
                    items.push({
                        label: `QuickByte "${qb.title}" (${qb._id}) - main video`,
                        localPath: getFilePathFromUrl(qb.video.url),
                        id: qb._id, type: 'quickbyte',
                        alreadyMigrated: false,
                        apply: async (url) => QuickByte.updateOne({ _id: qb._id }, { $set: { 'video.original_s3_url': url } })
                    });
                } else {
                    items.push({ label: `QuickByte "${qb.title}" (${qb._id}) - main video`, alreadyMigrated: true });
                }
            }
            (qb.episodes || []).forEach(ep => {
                if (ep.url) {
                    if (!ep.original_s3_url) {
                        items.push({
                            label: `QuickByte "${qb.title}" (${qb._id}) - episode ${ep._id}`,
                            localPath: getFilePathFromUrl(ep.url),
                            id: ep._id, type: 'quickbyte_episode',
                            alreadyMigrated: false,
                            apply: async (url) => QuickByte.updateOne(
                                { _id: qb._id, 'episodes._id': ep._id },
                                { $set: { 'episodes.$.original_s3_url': url } }
                            )
                        });
                    } else {
                        items.push({ label: `QuickByte "${qb.title}" (${qb._id}) - episode ${ep._id}`, alreadyMigrated: true });
                    }
                }
            });
        }
    }

    if (wantsType('foryou')) {
        const reels = await ForYou.find({}).lean(false);
        for (const reel of reels) {
            if (reel.video?.url) {
                if (!reel.video.original_s3_url) {
                    items.push({
                        label: `ForYou "${reel.title}" (${reel._id})`,
                        localPath: getFilePathFromUrl(reel.video.url),
                        id: reel._id, type: 'foryou',
                        alreadyMigrated: false,
                        apply: async (url) => ForYou.updateOne({ _id: reel._id }, { $set: { 'video.original_s3_url': url } })
                    });
                } else {
                    items.push({ label: `ForYou "${reel.title}" (${reel._id})`, alreadyMigrated: true });
                }
            }
        }
    }

    if (wantsType('movie') || wantsType('episode') || wantsType('trailer')) {
        const contentItems = await Content.find({}).lean(false);
        for (const c of contentItems) {
            if (wantsType('movie') && c.video?.url) {
                if (!c.video.original_s3_url) {
                    items.push({
                        label: `Content "${c.title}" (${c._id}) - main video`,
                        localPath: getFilePathFromUrl(c.video.url),
                        id: c._id, type: 'movie',
                        alreadyMigrated: false,
                        apply: async (url) => Content.updateOne({ _id: c._id }, { $set: { 'video.original_s3_url': url } })
                    });
                } else {
                    items.push({ label: `Content "${c.title}" (${c._id}) - main video`, alreadyMigrated: true });
                }
            }
            if (wantsType('trailer') && c.trailer?.url) {
                if (!c.trailer.original_s3_url) {
                    items.push({
                        label: `Content "${c.title}" (${c._id}) - trailer`,
                        localPath: getFilePathFromUrl(c.trailer.url),
                        id: c._id, type: 'trailer',
                        alreadyMigrated: false,
                        apply: async (url) => Content.updateOne({ _id: c._id }, { $set: { 'trailer.original_s3_url': url } })
                    });
                } else {
                    items.push({ label: `Content "${c.title}" (${c._id}) - trailer`, alreadyMigrated: true });
                }
            }
            if (wantsType('episode')) {
                (c.seasons || []).forEach(season => {
                    (season.episodes || []).forEach(ep => {
                        if (ep.video?.url) {
                            if (!ep.video.original_s3_url) {
                                items.push({
                                    label: `Content "${c.title}" (${c._id}) - S${season.seasonNumber}E${ep.episodeNumber} (${ep._id})`,
                                    localPath: getFilePathFromUrl(ep.video.url),
                                    id: ep._id, type: 'episode',
                                    alreadyMigrated: false,
                                    apply: async (url) => Content.updateOne(
                                        { _id: c._id },
                                        { $set: { 'seasons.$[s].episodes.$[e].video.original_s3_url': url } },
                                        { arrayFilters: [{ 's._id': season._id }, { 'e._id': ep._id }] }
                                    )
                                });
                            } else {
                                items.push({ label: `Content "${c.title}" (${c._id}) - S${season.seasonNumber}E${ep.episodeNumber} (${ep._id})`, alreadyMigrated: true });
                            }
                        }
                    });
                });
            }
        }
    }

    if (wantsType('banner')) {
        const banners = await Banner.find({ mediaType: 'video' }).lean(false);
        for (const b of banners) {
            if (b.mediaUrl) {
                if (!b.originalS3Url) {
                    items.push({
                        label: `Banner (${b._id})`,
                        localPath: getFilePathFromUrl(b.mediaUrl),
                        id: b._id, type: 'banner',
                        alreadyMigrated: false,
                        apply: async (url) => Banner.updateOne({ _id: b._id }, { $set: { originalS3Url: url } })
                    });
                } else {
                    items.push({ label: `Banner (${b._id})`, alreadyMigrated: true });
                }
            }
        }
    }

    if (wantsType('promotion')) {
        const promotions = await Promotion.find({}).lean(false);
        for (const p of promotions) {
            if (p.promoVideoUrl && p.promoVideoUrl.startsWith('/uploads')) {
                if (!p.originalS3Url) {
                    items.push({
                        label: `Promotion "${p.title}" (${p._id})`,
                        localPath: getFilePathFromUrl(p.promoVideoUrl),
                        id: p._id, type: 'promotion',
                        alreadyMigrated: false,
                        apply: async (url) => Promotion.updateOne({ _id: p._id }, { $set: { originalS3Url: url } })
                    });
                } else {
                    items.push({ label: `Promotion "${p.title}" (${p._id})`, alreadyMigrated: true });
                }
            }
        }
    }

    // Only items whose local file actually exists are migratable - anything
    // else is either already-orphaned (cleanupOrphanedMedia.js's job) or a
    // record that never had a local original in the first place.
    // We also preserve `alreadyMigrated` items so they can be logged cleanly as skipped.
    return items.filter(item => item.alreadyMigrated || (item.localPath && fs.existsSync(item.localPath)));
};

const run = async () => {
    let isShuttingDown = false;
    process.on('SIGINT', () => {
        console.log('\n[!] Caught SIGINT. Stopping further processing (generating final report and exiting gracefully)...');
        isShuttingDown = true;
    });

    await mongoose.connect(process.env.MONGODB_URI);
    const { host, name } = mongoose.connection;
    console.log(`Database    : ${name} @ ${host}`);
    console.log(`Uploads     : ${UPLOAD_BASE}`);
    console.log(`Mode        : ${DRY_RUN ? 'DRY RUN (no uploads, no DB writes)' : 'EXECUTE'}`);
    console.log(`Concurrency : ${CONCURRENCY}`);
    if (ONLY_TYPES) console.log(`Restricted to types: ${ONLY_TYPES.join(', ')}`);
    console.log('');

    console.log('Scanning for legacy local-only videos...');
    const items = await collectWorkItems();
    console.log(`Found ${items.length} file(s) overall to process.\n`);

    if (items.length === 0) {
        console.log('Nothing to migrate.');
        await mongoose.disconnect();
        return;
    }

    let totalBytes = 0;
    items.forEach(i => {
        if (!i.alreadyMigrated) {
            try { totalBytes += fs.statSync(i.localPath).size; } catch { /* gone */ }
        }
    });
    console.log(`Total size to upload (excluding skipped): ${formatBytes(totalBytes)}\n`);

    const results = { uploaded: [], skipped: [], failed: [] };

    if (DRY_RUN) {
        items.forEach(i => {
            if (i.alreadyMigrated) {
                console.log(`  would skip   : ${i.label}`);
            } else {
                console.log(`  would migrate: ${i.label}`);
            }
        });
        console.log('\nDry run - re-run with --execute to actually upload these originals to S3.');
        await mongoose.disconnect();
        return;
    }

    const queue = [...items];
    let processed = 0;

    const worker = async () => {
        while (queue.length > 0 && !isShuttingDown) {
            const item = queue.shift();
            processed++;
            const progress = `[${processed}/${items.length}]`;

            // 1. If already migrated in Mongo, skip.
            if (item.alreadyMigrated) {
                results.skipped.push(item);
                console.log(`${progress} Already Migrated (Mongo) → Skipped`);
                continue;
            }

            // 2. Derive expected S3 key
            const filename = path.basename(item.localPath);
            const s3Key = `originals/${item.type}/${item.id}/${filename}`;

            // 3. Use AWS SDK HeadObjectCommand to check whether that object already exists.
            let objectExistsInS3 = false;
            try {
                await s3Client.send(new HeadObjectCommand({
                    Bucket: process.env.AWS_S3_BUCKET,
                    Key: s3Key
                }));
                objectExistsInS3 = true;
            } catch (err) {
                if (err.name !== 'NotFound' && err.$metadata?.httpStatusCode !== 404) {
                    console.error(`${progress} S3 HeadObject error for ${item.label}: ${err.message}`);
                }
            }

            // 4. If object exists in S3 (previous script uploaded it but failed Mongo write)
            if (objectExistsInS3) {
                const url = generateS3Url(s3Key);
                try {
                    await item.apply(url);
                    results.skipped.push({ ...item, url });
                    console.log(`${progress} Already in S3 → DB updated & Skipped upload`);
                } catch (dbError) {
                    results.failed.push({ ...item, reason: `Mongo update failed: ${dbError.message}` });
                    console.log(`${progress} FAIL ${item.label} - Mongo update failed: ${dbError.message}`);
                }
                continue;
            }

            console.log(`${progress} Uploading ${item.label}`);

            // Local File Safety Check
            if (!fs.existsSync(item.localPath)) {
                results.failed.push({ ...item, reason: "Local file missing" });
                console.log(`${progress} FAIL ${item.label} - Local file missing`);
                continue;
            }

            // 5. Retry Logic & Upload Original
            let attempt = 1;
            const maxAttempts = 3;
            let url = null;
            let lastError = null;

            while (attempt <= maxAttempts) {
                if (attempt > 1) {
                    console.log(`${progress} Retry ${attempt}/${maxAttempts}`);
                    await sleep(Math.pow(2, attempt) * 1000); // Exponential backoff
                }
                
                try {
                    // Always use existing robust logic inside mediaService
                    url = await mediaService.uploadOriginalToS3(item.localPath, item.id, item.type);
                    if (url) break; // Success
                    throw new Error('uploadOriginalToS3 returned null without throwing');
                } catch (error) {
                    lastError = error;
                    if (attempt === maxAttempts) {
                        break;
                    }
                    attempt++;
                }
            }

            if (url) {
                try {
                    // Mongo update happens ONLY after upload succeeds
                    await item.apply(url);
                    results.uploaded.push({ ...item, url });
                    console.log(`${progress} Uploaded Successfully`);
                } catch (dbError) {
                    results.failed.push({ ...item, reason: `Mongo update failed: ${dbError.message}` });
                    console.log(`${progress} FAIL ${item.label} - Mongo update failed: ${dbError.message}`);
                }
            } else {
                results.failed.push({ ...item, reason: lastError.message });
                console.log(`${progress} FAIL ${item.label} - ${lastError.message}`);
            }
        }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    console.log(`\nTotal Found    : ${items.length}`);
    console.log(`Processed      : ${processed}`);
    console.log(`Uploaded       : ${results.uploaded.length}`);
    console.log(`Skipped        : ${results.skipped.length}`);
    console.log(`Failed         : ${results.failed.length}`);
    const remaining = items.length - results.skipped.length - results.uploaded.length;
    console.log(`Total Remaining: ${remaining}`);

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
            totalFound: items.length,
            uploaded: results.uploaded.length,
            skipped: results.skipped.length,
            failed: results.failed.length,
            timestamp: new Date().toISOString(),
            failures: results.failed
        };
        fs.writeFileSync(jsonReportPath, JSON.stringify(summary, null, 2));

        // Output Traditional TXT Report
        const lines = [
            `Migration report - ${new Date().toISOString()}`,
            `Database: ${name} @ ${host}`,
            `Total Found: ${items.length}, Processed: ${processed}, Uploaded: ${results.uploaded.length}, Skipped: ${results.skipped.length}, Failed: ${results.failed.length}`,
            '',
            '=== SUCCEEDED ===',
            ...results.uploaded.map(r => `${r.label}\t${r.url}`),
            '',
            '=== FAILED (local file kept, needs investigation, safe to re-run) ===',
            ...results.failed.map(r => `${r.label}\t${r.reason}`)
        ];
        fs.writeFileSync(txtReportPath, lines.join('\n') + '\n');
        
        console.log(`\nFull TXT report written to: ${txtReportPath}`);
        console.log(`Summary JSON report written to: ${jsonReportPath}`);
    } catch (error) {
        console.error(`Could not write migration reports: ${error.message}`);
    }

    if (results.failed.length > 0) {
        console.log('\nSome files failed to migrate - their local originals were NOT touched. Re-running this script later will retry only the failed/remaining ones.');
    }
    console.log('\nLocal files were NOT deleted by this script. Run scripts/verifyMediaIntegrity.js next, then scripts/cleanupOrphanedMedia.js --delete-verified-originals only once you are satisfied.');

    await mongoose.disconnect();
};

if (require.main === module) {
    run().catch(error => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
}

module.exports = { collectWorkItems, run };
