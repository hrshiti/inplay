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
            if (qb.video?.url && !qb.video.s3_url) {
                items.push({
                    label: `QuickByte "${qb.title}" (${qb._id}) - main video`,
                    localPath: getFilePathFromUrl(qb.video.url),
                    id: qb._id, type: 'quickbyte',
                    apply: async (url) => QuickByte.updateOne({ _id: qb._id }, { $set: { 'video.s3_url': url } })
                });
            }
            (qb.episodes || []).forEach(ep => {
                if (ep.url && !ep.s3_url) {
                    items.push({
                        label: `QuickByte "${qb.title}" (${qb._id}) - episode ${ep._id}`,
                        localPath: getFilePathFromUrl(ep.url),
                        id: ep._id, type: 'quickbyte_episode',
                        apply: async (url) => QuickByte.updateOne(
                            { _id: qb._id, 'episodes._id': ep._id },
                            { $set: { 'episodes.$.s3_url': url } }
                        )
                    });
                }
            });
        }
    }

    if (wantsType('foryou')) {
        const reels = await ForYou.find({}).lean(false);
        for (const reel of reels) {
            if (reel.video?.url && !reel.video.s3_url) {
                items.push({
                    label: `ForYou "${reel.title}" (${reel._id})`,
                    localPath: getFilePathFromUrl(reel.video.url),
                    id: reel._id, type: 'foryou',
                    apply: async (url) => ForYou.updateOne({ _id: reel._id }, { $set: { 'video.s3_url': url } })
                });
            }
        }
    }

    if (wantsType('movie') || wantsType('episode') || wantsType('trailer')) {
        const contentItems = await Content.find({}).lean(false);
        for (const c of contentItems) {
            if (wantsType('movie') && c.video?.url && !c.video.s3_url) {
                items.push({
                    label: `Content "${c.title}" (${c._id}) - main video`,
                    localPath: getFilePathFromUrl(c.video.url),
                    id: c._id, type: 'movie',
                    apply: async (url) => Content.updateOne({ _id: c._id }, { $set: { 'video.s3_url': url } })
                });
            }
            if (wantsType('trailer') && c.trailer?.url && !c.trailer.s3_url) {
                items.push({
                    label: `Content "${c.title}" (${c._id}) - trailer`,
                    localPath: getFilePathFromUrl(c.trailer.url),
                    id: c._id, type: 'trailer',
                    apply: async (url) => Content.updateOne({ _id: c._id }, { $set: { 'trailer.s3_url': url } })
                });
            }
            if (wantsType('episode')) {
                (c.seasons || []).forEach(season => {
                    (season.episodes || []).forEach(ep => {
                        if (ep.video?.url && !ep.video.s3_url) {
                            items.push({
                                label: `Content "${c.title}" (${c._id}) - S${season.seasonNumber}E${ep.episodeNumber} (${ep._id})`,
                                localPath: getFilePathFromUrl(ep.video.url),
                                id: ep._id, type: 'episode',
                                apply: async (url) => Content.updateOne(
                                    { _id: c._id },
                                    { $set: { 'seasons.$[s].episodes.$[e].video.s3_url': url } },
                                    { arrayFilters: [{ 's._id': season._id }, { 'e._id': ep._id }] }
                                )
                            });
                        }
                    });
                });
            }
        }
    }

    if (wantsType('banner')) {
        const banners = await Banner.find({ mediaType: 'video' }).lean(false);
        for (const b of banners) {
            if (b.mediaUrl && !b.originalS3Url) {
                items.push({
                    label: `Banner (${b._id})`,
                    localPath: getFilePathFromUrl(b.mediaUrl),
                    id: b._id, type: 'banner',
                    apply: async (url) => Banner.updateOne({ _id: b._id }, { $set: { originalS3Url: url } })
                });
            }
        }
    }

    if (wantsType('promotion')) {
        const promotions = await Promotion.find({}).lean(false);
        for (const p of promotions) {
            if (p.promoVideoUrl && p.promoVideoUrl.startsWith('/uploads') && !p.originalS3Url) {
                items.push({
                    label: `Promotion "${p.title}" (${p._id})`,
                    localPath: getFilePathFromUrl(p.promoVideoUrl),
                    id: p._id, type: 'promotion',
                    apply: async (url) => Promotion.updateOne({ _id: p._id }, { $set: { originalS3Url: url } })
                });
            }
        }
    }

    // Only items whose local file actually exists are migratable - anything
    // else is either already-orphaned (cleanupOrphanedMedia.js's job) or a
    // record that never had a local original in the first place.
    return items.filter(item => item.localPath && fs.existsSync(item.localPath));
};

const run = async () => {
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
    console.log(`Found ${items.length} file(s) to migrate (already-migrated and missing-local-file records are skipped automatically).\n`);

    if (items.length === 0) {
        console.log('Nothing to migrate.');
        await mongoose.disconnect();
        return;
    }

    let totalBytes = 0;
    items.forEach(i => { try { totalBytes += fs.statSync(i.localPath).size; } catch { /* gone */ } });
    console.log(`Total size to upload: ${formatBytes(totalBytes)}\n`);

    const results = { succeeded: [], failed: [], skipped: [] };

    if (DRY_RUN) {
        items.forEach(i => console.log(`  would migrate: ${i.label}`));
        console.log('\nDry run - re-run with --execute to actually upload these originals to S3.');
        await mongoose.disconnect();
        return;
    }

    const queue = [...items];
    let processed = 0;

    const worker = async () => {
        while (queue.length > 0) {
            const item = queue.shift();
            processed++;
            const progress = `[${processed}/${items.length}]`;
            try {
                const url = await mediaService.uploadOriginalToS3(item.localPath, item.id, item.type);
                if (url) {
                    await item.apply(url);
                    results.succeeded.push({ ...item, url });
                    console.log(`${progress} OK   ${item.label}`);
                } else {
                    results.failed.push({ ...item, reason: 'upload or S3 verification failed' });
                    console.log(`${progress} FAIL ${item.label} - upload or verification failed (see mediaService log above)`);
                }
            } catch (error) {
                results.failed.push({ ...item, reason: error.message });
                console.log(`${progress} FAIL ${item.label} - ${error.message}`);
            }
        }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    console.log(`\nMigrated : ${results.succeeded.length}`);
    console.log(`Failed   : ${results.failed.length}`);

    // Full report, same convention as cleanupOrphanedMedia.js - never rely on
    // a truncated console scroll for something this consequential.
    const reportDir = path.join(__dirname, '../logs');
    const reportPath = path.join(reportDir, `migrate-originals-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`);
    try {
        fs.mkdirSync(reportDir, { recursive: true });
        const lines = [
            `Migration report - ${new Date().toISOString()}`,
            `Database: ${name} @ ${host}`,
            `Migrated: ${results.succeeded.length}, Failed: ${results.failed.length}`,
            '',
            '=== SUCCEEDED ===',
            ...results.succeeded.map(r => `${r.label}\t${r.url}`),
            '',
            '=== FAILED (local file kept, needs investigation, safe to re-run) ===',
            ...results.failed.map(r => `${r.label}\t${r.reason}`)
        ];
        fs.writeFileSync(reportPath, lines.join('\n') + '\n');
        console.log(`\nFull report written to: ${reportPath}`);
    } catch (error) {
        console.error(`Could not write migration report: ${error.message}`);
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
