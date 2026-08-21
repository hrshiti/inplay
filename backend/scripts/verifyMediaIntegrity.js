/**
 * Read-only integrity check across the whole media pipeline for every
 * video-bearing record: does the DB record's local file still exist, is its
 * HLS playlist actually reachable, is its S3 original (if migrated) actually
 * reachable and roughly the right size, and (optionally, slower) does the
 * locally-measured duration match what the database says.
 *
 * This never deletes or modifies anything - it is the companion tool to run
 * BEFORE ever trusting cleanupOrphanedMedia.js's --delete-verified-originals
 * mode, and after migrateOriginalsToS3.js, to confirm the migration is
 * trustworthy before any local file is removed.
 *
 * Usage (from backend/):
 *   node scripts/verifyMediaIntegrity.js                    # fast pass: existence + HEAD checks only
 *   node scripts/verifyMediaIntegrity.js --check-duration    # also re-extract local duration and compare (slower)
 *   node scripts/verifyMediaIntegrity.js --only=quickbyte,movie
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { UPLOAD_BASE, getFilePathFromUrl } = require('../config/multerStorage');
const { formatBytes } = require('../utils/diskSpace');

const args = process.argv.slice(2);
const CHECK_DURATION = args.includes('--check-duration');
const onlyArg = args.find(a => a.startsWith('--only='));
const ONLY_TYPES = onlyArg ? onlyArg.split('=')[1].split(',').map(s => s.trim()) : null;
const CONCURRENCY = 8;
// Duration comparisons allow this much drift (container/keyframe rounding) before flagging a mismatch
const DURATION_TOLERANCE_SECONDS = 3;
// Original-on-S3 should be byte-identical to the local file; allow a small
// tolerance for any transport/encoding metadata differences that are not a
// real integrity problem
const SIZE_TOLERANCE_RATIO = 0.02;

const Content = require('../models/Content');
const QuickByte = require('../models/QuickByte');
const ForYou = require('../models/ForYou');
const Banner = require('../models/Banner');
const Promotion = require('../models/Promotion');

const collectRecords = async () => {
    const records = [];
    const wantsType = (type) => !ONLY_TYPES || ONLY_TYPES.includes(type);

    if (wantsType('quickbyte')) {
        const quickBytes = await QuickByte.find({}).lean();
        for (const qb of quickBytes) {
            if (qb.video?.url) {
                records.push({ label: `QuickByte "${qb.title}" (${qb._id}) - main`, dbId: qb._id, type: 'quickbyte', localUrl: qb.video.url, hlsUrl: qb.video.hls_url, s3Url: qb.video.s3_url, dbDuration: qb.video.duration });
            }
            (qb.episodes || []).forEach(ep => {
                if (ep.url) records.push({ label: `QuickByte "${qb.title}" (${qb._id}) - episode ${ep._id}`, dbId: ep._id, type: 'quickbyte_episode', localUrl: ep.url, hlsUrl: ep.hls_url, s3Url: ep.s3_url, dbDuration: ep.duration });
            });
        }
    }

    if (wantsType('foryou')) {
        const reels = await ForYou.find({}).lean();
        for (const reel of reels) {
            if (reel.video?.url) records.push({ label: `ForYou "${reel.title}" (${reel._id})`, dbId: reel._id, type: 'foryou', localUrl: reel.video.url, hlsUrl: reel.video.hls_url, s3Url: reel.video.s3_url, dbDuration: reel.video.duration });
        }
    }

    if (wantsType('movie') || wantsType('episode') || wantsType('trailer')) {
        const contentItems = await Content.find({}).lean();
        for (const c of contentItems) {
            if (wantsType('movie') && c.video?.url) records.push({ label: `Content "${c.title}" (${c._id}) - main`, dbId: c._id, type: 'movie', localUrl: c.video.url, hlsUrl: c.video.hls_url, s3Url: c.video.s3_url, dbDuration: c.video.duration });
            if (wantsType('trailer') && c.trailer?.url) records.push({ label: `Content "${c.title}" (${c._id}) - trailer`, dbId: c._id, type: 'trailer', localUrl: c.trailer.url, hlsUrl: null, s3Url: c.trailer.s3_url, dbDuration: c.trailer.duration });
            if (wantsType('episode')) {
                (c.seasons || []).forEach(season => {
                    (season.episodes || []).forEach(ep => {
                        if (ep.video?.url) records.push({ label: `Content "${c.title}" (${c._id}) - S${season.seasonNumber}E${ep.episodeNumber} (${ep._id})`, dbId: ep._id, type: 'episode', localUrl: ep.video.url, hlsUrl: ep.video.hls_url, s3Url: ep.video.s3_url, dbDuration: ep.duration });
                    });
                });
            }
        }
    }

    if (wantsType('banner')) {
        const banners = await Banner.find({ mediaType: 'video' }).lean();
        for (const b of banners) {
            if (b.mediaUrl) records.push({ label: `Banner (${b._id})`, dbId: b._id, type: 'banner', localUrl: b.mediaUrl, hlsUrl: b.hlsUrl, s3Url: b.originalS3Url, dbDuration: null });
        }
    }

    if (wantsType('promotion')) {
        const promotions = await Promotion.find({}).lean();
        for (const p of promotions) {
            if (p.promoVideoUrl && p.promoVideoUrl.startsWith('/uploads')) records.push({ label: `Promotion "${p.title}" (${p._id})`, dbId: p._id, type: 'promotion', localUrl: p.promoVideoUrl, hlsUrl: p.hls_url, s3Url: p.originalS3Url, dbDuration: null });
        }
    }

    return records;
};

const headCheck = async (url) => {
    if (!url || typeof fetch !== 'function') return { reachable: null, sizeBytes: null };
    try {
        const response = await fetch(url, { method: 'HEAD' });
        const len = response.headers.get('content-length');
        return { reachable: response.ok, sizeBytes: len ? parseInt(len, 10) : null };
    } catch {
        return { reachable: false, sizeBytes: null };
    }
};

const getLocalDuration = async (localPath) => {
    try {
        const mm = require('music-metadata');
        const metadata = await mm.parseFile(localPath);
        return Math.round(metadata?.format?.duration || 0);
    } catch {
        return null;
    }
};

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const { host, name } = mongoose.connection;
    console.log(`Database    : ${name} @ ${host}`);
    console.log(`Duration check: ${CHECK_DURATION ? 'ENABLED (slower)' : 'disabled (pass --check-duration to enable)'}`);
    if (ONLY_TYPES) console.log(`Restricted to types: ${ONLY_TYPES.join(', ')}`);
    console.log('\nThis script makes no changes. Scanning...\n');

    const records = await collectRecords();
    console.log(`Found ${records.length} video-bearing field(s) to check.\n`);

    const findings = { clean: 0, issues: [] };
    const queue = [...records];
    let processed = 0;

    const worker = async () => {
        while (queue.length > 0) {
            const rec = queue.shift();
            processed++;
            const localPath = getFilePathFromUrl(rec.localUrl);
            const localExists = !!(localPath && fs.existsSync(localPath));
            const localSize = localExists ? fs.statSync(localPath).size : null;

            const [hlsCheck, s3Check] = await Promise.all([
                headCheck(rec.hlsUrl),
                headCheck(rec.s3Url)
            ]);

            const problems = [];
            if (!localExists) problems.push('LOCAL FILE MISSING (DB record points at a file that no longer exists on disk)');
            if (rec.hlsUrl && hlsCheck.reachable === false) problems.push('HLS playlist not reachable');
            if (rec.s3Url && s3Check.reachable === false) problems.push('S3 original not reachable');
            if (rec.s3Url && s3Check.reachable && localSize && s3Check.sizeBytes) {
                const ratio = Math.abs(localSize - s3Check.sizeBytes) / localSize;
                if (ratio > SIZE_TOLERANCE_RATIO) {
                    problems.push(`S3 original size mismatch (local ${formatBytes(localSize)} vs S3 ${formatBytes(s3Check.sizeBytes)})`);
                }
            }
            if (localExists && localSize === 0) problems.push('local file is 0 bytes');

            if (CHECK_DURATION && localExists && rec.dbDuration) {
                const localDuration = await getLocalDuration(localPath);
                if (localDuration !== null && Math.abs(localDuration - rec.dbDuration) > DURATION_TOLERANCE_SECONDS) {
                    problems.push(`duration mismatch (DB says ${rec.dbDuration}s, local file is ${localDuration}s)`);
                }
            }

            if (problems.length > 0) {
                findings.issues.push({ ...rec, problems, localExists, localSize, hlsReachable: hlsCheck.reachable, s3Reachable: s3Check.reachable });
                console.log(`[${processed}/${records.length}] ISSUE  ${rec.label}: ${problems.join('; ')}`);
            } else {
                findings.clean++;
                if (processed % 25 === 0) console.log(`[${processed}/${records.length}] ... ${findings.clean} clean so far`);
            }
        }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    console.log(`\nClean records : ${findings.clean}`);
    console.log(`Records with issues : ${findings.issues.length}`);

    const reportDir = path.join(__dirname, '../logs');
    const reportPath = path.join(reportDir, `verify-media-integrity-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`);
    try {
        fs.mkdirSync(reportDir, { recursive: true });
        const lines = [
            `Media integrity report - ${new Date().toISOString()}`,
            `Database: ${name} @ ${host}`,
            `Checked: ${records.length}, Clean: ${findings.clean}, Issues: ${findings.issues.length}`,
            '',
            ...findings.issues.map(i => `${i.label}\t${i.problems.join('; ')}`)
        ];
        fs.writeFileSync(reportPath, lines.join('\n') + '\n');
        console.log(`\nFull report written to: ${reportPath}`);
    } catch (error) {
        console.error(`Could not write report: ${error.message}`);
    }

    await mongoose.disconnect();
};

if (require.main === module) {
    run().catch(error => {
        console.error('Verification failed:', error);
        process.exit(1);
    });
}

module.exports = { collectRecords, run };
