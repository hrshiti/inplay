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
                if (!qb.video.s3_url) {
                    items.push({
                        label: `QuickByte "${qb.title}" (${qb._id}) - main video`,
                        title: qb.title,
                        originalUrl: qb.video.url,
                        localPath: getFilePathFromUrl(normalizeVideoUrl(qb.video.url)),
                        id: qb._id, type: 'quickbyte',
                        alreadyMigrated: false,
                        apply: async (url) => QuickByte.updateOne({ _id: qb._id }, { $set: { 'video.s3_url': url } })
                    });
                } else {
                    items.push({ label: `QuickByte "${qb.title}" (${qb._id}) - main video`, title: qb.title, alreadyMigrated: true });
                }
            }
            (qb.episodes || []).forEach(ep => {
                if (ep.url) {
                    if (!ep.s3_url) {
                        items.push({
                            label: `QuickByte "${qb.title}" (${qb._id}) - episode ${ep._id}`,
                            title: qb.title,
                            originalUrl: ep.url,
                            localPath: getFilePathFromUrl(normalizeVideoUrl(ep.url)),
                            id: ep._id, type: 'quickbyte_episode',
                            alreadyMigrated: false,
                            apply: async (url) => QuickByte.updateOne(
                                { _id: qb._id, 'episodes._id': ep._id },
                                { $set: { 'episodes.$.s3_url': url } }
                            )
                        });
                    } else {
                        items.push({ label: `QuickByte "${qb.title}" (${qb._id}) - episode ${ep._id}`, title: qb.title, alreadyMigrated: true });
                    }
                }
            });
        }
    }

    if (wantsType('foryou')) {
        const reels = await ForYou.find({}).lean(false);
        for (const reel of reels) {
            if (reel.video?.url) {
                if (!reel.video.s3_url) {
                    items.push({
                        label: `ForYou "${reel.title}" (${reel._id})`,
                        title: reel.title,
                        originalUrl: reel.video.url,
                        localPath: getFilePathFromUrl(normalizeVideoUrl(reel.video.url)),
                        id: reel._id, type: 'foryou',
                        alreadyMigrated: false,
                        apply: async (url) => ForYou.updateOne({ _id: reel._id }, { $set: { 'video.s3_url': url } })
                    });
                } else {
                    items.push({ label: `ForYou "${reel.title}" (${reel._id})`, title: reel.title, alreadyMigrated: true });
                }
            }
        }
    }

    if (wantsType('movie') || wantsType('episode') || wantsType('trailer')) {
        const contentItems = await Content.find({}).lean(false);
        for (const c of contentItems) {
            if (wantsType('movie') && c.video?.url) {
                if (!c.video.s3_url) {
                    items.push({
                        label: `Content "${c.title}" (${c._id}) - main video`,
                        title: c.title,
                        originalUrl: c.video.url,
                        localPath: getFilePathFromUrl(normalizeVideoUrl(c.video.url)),
                        id: c._id, type: 'movie',
                        alreadyMigrated: false,
                        apply: async (url) => Content.updateOne({ _id: c._id }, { $set: { 'video.s3_url': url } })
                    });
                } else {
                    items.push({ label: `Content "${c.title}" (${c._id}) - main video`, title: c.title, alreadyMigrated: true });
                }
            }
            if (wantsType('trailer') && c.trailer?.url) {
                if (!c.trailer.s3_url) {
                    items.push({
                        label: `Content "${c.title}" (${c._id}) - trailer`,
                        title: c.title,
                        originalUrl: c.trailer.url,
                        localPath: getFilePathFromUrl(normalizeVideoUrl(c.trailer.url)),
                        id: c._id, type: 'trailer',
                        alreadyMigrated: false,
                        apply: async (url) => Content.updateOne({ _id: c._id }, { $set: { 'trailer.s3_url': url } })
                    });
                } else {
                    items.push({ label: `Content "${c.title}" (${c._id}) - trailer`, title: c.title, alreadyMigrated: true });
                }
            }
            if (wantsType('episode')) {
                (c.seasons || []).forEach(season => {
                    (season.episodes || []).forEach(ep => {
                        if (ep.video?.url) {
                            if (!ep.video.s3_url) {
                                items.push({
                                    label: `Content "${c.title}" (${c._id}) - S${season.seasonNumber}E${ep.episodeNumber} (${ep._id})`,
                                    title: c.title,
                                    originalUrl: ep.video.url,
                                    localPath: getFilePathFromUrl(normalizeVideoUrl(ep.video.url)),
                                    id: ep._id, type: 'episode',
                                    alreadyMigrated: false,
                                    apply: async (url) => Content.updateOne(
                                        { _id: c._id },
                                        { $set: { 'seasons.$[s].episodes.$[e].video.s3_url': url } },
                                        { arrayFilters: [{ 's._id': season._id }, { 'e._id': ep._id }] }
                                    )
                                });
                            } else {
                                items.push({ label: `Content "${c.title}" (${c._id}) - S${season.seasonNumber}E${ep.episodeNumber} (${ep._id})`, title: c.title, alreadyMigrated: true });
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
                // Already migrated — schema field is set
                if (b.originalS3Url) {
                    items.push({ label: `Banner (${b._id})`, title: `Banner ${b._id}`, alreadyMigrated: true });
                    continue;
                }
                const normalizedBanner = normalizeVideoUrl(b.mediaUrl);
                if (!normalizedBanner) {
                    // URL is CloudFront/HLS/non-local — treat as HLS-only, not a failure
                    items.push({
                        label: `Banner (${b._id})`,
                        title: `Banner ${b._id}`,
                        originalUrl: b.mediaUrl,
                        isHlsOnly: true
                    });
                } else {
                    items.push({
                        label: `Banner (${b._id})`,
                        title: `Banner ${b._id}`,
                        originalUrl: b.mediaUrl,
                        localPath: getFilePathFromUrl(normalizedBanner),
                        id: b._id, type: 'banner',
                        alreadyMigrated: false,
                        apply: async (url) => Banner.updateOne({ _id: b._id }, { $set: { originalS3Url: url } })
                    });
                }
            }
        }
    }

    if (wantsType('promotion')) {
        const promotions = await Promotion.find({}).lean(false);
        for (const p of promotions) {
            if (p.promoVideoUrl) {
                // Already migrated — schema field is set
                if (p.originalS3Url) {
                    items.push({ label: `Promotion "${p.title}" (${p._id})`, title: p.title, alreadyMigrated: true });
                    continue;
                }
                const normalizedPromo = normalizeVideoUrl(p.promoVideoUrl);
                if (!normalizedPromo) {
                    // CloudFront/HLS URL — treat as HLS-only, not a failure
                    items.push({
                        label: `Promotion "${p.title}" (${p._id})`,
                        title: p.title,
                        originalUrl: p.promoVideoUrl,
                        isHlsOnly: true
                    });
                } else {
                    items.push({
                        label: `Promotion "${p.title}" (${p._id})`,
                        title: p.title,
                        originalUrl: p.promoVideoUrl,
                        localPath: getFilePathFromUrl(normalizedPromo),
                        id: p._id, type: 'promotion',
                        alreadyMigrated: false,
                        apply: async (url) => Promotion.updateOne({ _id: p._id }, { $set: { originalS3Url: url } })
                    });
                }
            }
        }
    }

    // Mark HLS items (catch-all for any model whose originalUrl slipped through)
    items.forEach(item => {
        if (!item.isHlsOnly && item.originalUrl && typeof item.originalUrl === 'string' && item.originalUrl.includes('.m3u8')) {
            item.isHlsOnly = true;
        }
    });

    // Fix 1: Return ALL items. The worker decides what to do with each one.
    // Missing-file records must appear in the report — do NOT silently drop them here.
    return items;
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
        if (!i.alreadyMigrated && !i.isHlsOnly && i.localPath) {
            try { totalBytes += fs.statSync(i.localPath).size; } catch { /* gone */ }
        }
    });
    console.log(`Total size to upload (excluding skipped): ${formatBytes(totalBytes)}\n`);

    const results = { uploaded: [], skipped: [], failed: [], skippedHls: [], mongoUpdated: [] };

    if (DRY_RUN) {
        items.forEach(i => {
            if (i.alreadyMigrated) {
                console.log(`  would skip   : ${i.label}`);
            } else if (i.isHlsOnly) {
                console.log(`  would skip HLS: ${i.label}`);
            } else {
                console.log(`  would migrate: ${i.label}`);
            }
        });
        console.log('\nDry run - re-run with --execute to actually upload these originals to S3.');
        await mongoose.disconnect();
        return;
    }

    // Fix 5: Atomic index pointer prevents duplicate processing under concurrency
    // and survives SIGINT cleanly without a shared mutable array.
    let cursor = 0;
    let processed = 0;

    const worker = async () => {
        while (!isShuttingDown) {
            // Atomically claim the next item
            const idx = cursor++;
            if (idx >= items.length) break;

            const item = items[idx];
            const itemNum = ++processed;
            const progress = `[${itemNum}/${items.length}]`;
            const displayTitle = item.title || item.label;

            // 1. If already migrated in Mongo, skip.
            if (item.alreadyMigrated) {
                results.skipped.push(item);
                console.log(`${progress} SKIP (Already Migrated) → ${displayTitle}`);
                continue;
            }

            // 2. If HLS-only, skip.
            if (item.isHlsOnly) {
                results.skippedHls.push(item);
                console.log(`${progress} SKIP (Already HLS) → ${displayTitle}`);
                continue;
            }

            // Fix 1: Local file check is here in the worker, not in collectWorkItems.
            // Missing records are counted and reported — never silently dropped.
            if (!item.localPath || !fs.existsSync(item.localPath)) {
                results.failed.push({ ...item, reason: 'Local file missing' });
                console.log(`${progress} ISSUE → Local file missing → ${displayTitle}`);
                continue;
            }

            // 3. Derive expected S3 key (same structure mediaService uses)
            const filename = path.basename(item.localPath);
            const s3Key = `originals/${item.type}/${item.id}/${filename}`;

            // 4. HeadObject — detect files already on S3 from a previous interrupted run
            let objectExistsInS3 = false;
            try {
                await s3Client.send(new HeadObjectCommand({
                    Bucket: process.env.AWS_S3_BUCKET,
                    Key: s3Key
                }));
                objectExistsInS3 = true;
            } catch (err) {
                // 404 / NotFound is expected — anything else is a real AWS error
                if (err.name !== 'NotFound' && err.$metadata?.httpStatusCode !== 404) {
                    console.error(`${progress} S3 HeadObject error for ${item.label}: ${err.message}`);
                }
            }

            // 5. Fix 4: Object already exists — repair Mongo using generateS3Url (HeadObject repair path only)
            if (objectExistsInS3) {
                const url = generateS3Url(s3Key);
                try {
                    await item.apply(url);
                    results.mongoUpdated.push({ ...item, url });
                    console.log(`${progress} S3 EXISTS → Mongo Updated → ${displayTitle}`);
                } catch (dbError) {
                    results.failed.push({ ...item, reason: `Mongo update failed: ${dbError.message}` });
                    console.log(`${progress} ISSUE → Mongo update failed: ${dbError.message} → ${displayTitle}`);
                }
                continue;
            }

            console.log(`${progress} UPLOADING → ${displayTitle}`);

            // 6. Fix 4: Fresh uploads — mediaService is the source of truth for the returned URL.
            //    Do NOT build the URL manually here; mediaService constructs and returns it.
            let attempt = 1;
            const maxAttempts = 4; // 1 initial + 3 retries
            let uploadedUrl = null;
            let lastError = null;

            while (attempt <= maxAttempts) {
                if (attempt > 1) {
                    const delay = Math.pow(2, attempt - 1) * 1000; // 2s, 4s, 8s
                    console.log(`${progress} Retry ${attempt - 1}/3 → ${displayTitle}`);
                    await sleep(delay);
                }

                try {
                    uploadedUrl = await mediaService.uploadOriginalToS3(item.localPath, item.id, item.type);
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
                    console.log(`${progress} SUCCESS → ${displayTitle}`);
                } catch (dbError) {
                    results.failed.push({ ...item, reason: `Mongo update failed: ${dbError.message}` });
                    console.log(`${progress} ISSUE → Mongo update failed: ${dbError.message} → ${displayTitle}`);
                }
            } else {
                results.failed.push({ ...item, reason: lastError ? lastError.message : 'Unknown upload error' });
                console.log(`${progress} ISSUE → ${lastError ? lastError.message : 'Unknown upload error'} → ${displayTitle}`);
            }
        }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    // Summary Report
    console.log(`\n========== MIGRATION SUMMARY ==========`);
    console.log(`Already Migrated : ${results.skipped.length}`);
    console.log(`Mongo Updated    : ${results.mongoUpdated.length}`);
    console.log(`Uploaded         : ${results.uploaded.length}`);
    console.log(`Skipped HLS      : ${results.skippedHls.length}`);
    console.log(`Failed           : ${results.failed.length}`);
    console.log(`Total Processed  : ${processed}`);
    console.log(`\n`);

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
            skippedHls: results.skippedHls.length,
            mongoUpdated: results.mongoUpdated.length,
            failed: results.failed.length,
            timestamp: new Date().toISOString(),
            failures: results.failed
        };
        fs.writeFileSync(jsonReportPath, JSON.stringify(summary, null, 2));

        // Output Traditional TXT Report
        const lines = [
            `Migration report - ${new Date().toISOString()}`,
            `Database: ${name} @ ${host}`,
            `Total Found: ${items.length}, Processed: ${processed}, Uploaded: ${results.uploaded.length}, Skipped: ${results.skipped.length}, Skipped HLS: ${results.skippedHls.length}, Mongo Updated: ${results.mongoUpdated.length}, Failed: ${results.failed.length}`,
            '',
            '=== SUCCEEDED ===',
            ...results.uploaded.map(r => `${r.label}\t${r.url}`),
            '',
            '=== FAILED (local file kept, needs investigation, safe to re-run) ===',
            ...results.failed.map(r => `${r.label}\t${r.reason}`)
        ];
        fs.writeFileSync(txtReportPath, lines.join('\n') + '\n');
        
        console.log(`Full TXT report written to: ${txtReportPath}`);
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
