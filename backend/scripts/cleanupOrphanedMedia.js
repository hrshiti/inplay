/**
 * Reclaim disk space in backend/uploads.
 *
 * Two kinds of waste build up:
 *   1. Orphans   - files no database record points at (failed uploads, deleted
 *                  content, aborted transcodes).
 *   2. Sources   - original MP4s whose HLS rendition already lives on S3. These
 *                  are still referenced by `video.url`, so removing them is a
 *                  policy choice: it saves the most space but drops the direct
 *                  MP4 fallback. Opt in with --delete-transcoded-sources.
 *
 * Usage (from backend/):
 *   node scripts/cleanupOrphanedMedia.js                            # dry run, report only
 *   node scripts/cleanupOrphanedMedia.js --delete                   # remove orphans
 *   node scripts/cleanupOrphanedMedia.js --delete --delete-transcoded-sources
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { UPLOAD_BASE } = require('../config/multerStorage');
const { formatBytes } = require('../utils/diskSpace');
const { sweepStaleTempHls } = require('../utils/tempHlsSweeper');

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--delete');
const DELETE_SOURCES = args.includes('--delete-transcoded-sources');

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

// Pull every /uploads/... path referenced anywhere in a document
const collectReferences = (value, into) => {
    if (!value) return;

    if (typeof value === 'string') {
        // matchAll, not match: a single string can hold several media paths
        // (e.g. HTML or a joined list). Missing one would delete a live file.
        for (const match of value.matchAll(/\/uploads\/[^\s"'?,)\]]+/g)) {
            into.add(path.join(UPLOAD_BASE, match[0].replace('/uploads/', '').replace(/\//g, path.sep)));
        }
        return;
    }
    if (Array.isArray(value)) {
        value.forEach(v => collectReferences(v, into));
        return;
    }
    if (typeof value === 'object') {
        Object.values(value).forEach(v => collectReferences(v, into));
    }
};

// Safety brake: if almost everything looks orphaned, the script is almost
// certainly pointed at the wrong database rather than genuinely finding junk.
const MAX_ORPHAN_RATIO = 0.8;

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI);

    // Print the target loudly - deleting against the wrong DB wipes live media
    const { host, name } = mongoose.connection;
    console.log(`Database : ${name} @ ${host}`);
    console.log(`Uploads  : ${UPLOAD_BASE}`);
    console.log(`Mode     : ${DRY_RUN ? 'DRY RUN (nothing deleted)' : 'DELETE'}`);
    console.log('Check the database above is the one this uploads folder belongs to.\n');

    // Read every collection generically so new models are covered automatically
    const collections = await mongoose.connection.db.listCollections().toArray();
    const referenced = new Set();

    for (const { name } of collections) {
        const docs = await mongoose.connection.db.collection(name).find({}).toArray();
        docs.forEach(doc => collectReferences(doc, referenced));
    }
    console.log(`Scanned ${collections.length} collections - ${referenced.size} referenced media paths\n`);

    const onDisk = listFiles(UPLOAD_BASE);
    const orphans = onDisk.filter(f => !referenced.has(f));

    let orphanBytes = 0;
    orphans.forEach(f => {
        try { orphanBytes += fs.statSync(f).size; } catch { /* gone */ }
    });

    console.log(`Files on disk : ${onDisk.length}`);
    console.log(`Orphaned      : ${orphans.length} (${formatBytes(orphanBytes)})`);

    orphans.slice(0, 20).forEach(f => console.log(`  - ${path.relative(UPLOAD_BASE, f)}`));
    if (orphans.length > 20) console.log(`  ... and ${orphans.length - 20} more`);

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

    if (!DRY_RUN && (!looksWrong || args.includes('--force'))) {
        let freed = 0;
        for (const f of orphans) {
            try {
                freed += fs.statSync(f).size;
                fs.unlinkSync(f);
            } catch (error) {
                console.error(`  failed to delete ${f}: ${error.message}`);
            }
        }
        console.log(`\nDeleted ${orphans.length} orphaned files, freed ${formatBytes(freed)}`);
    }

    // Source MP4s that already have an HLS rendition on S3
    if (DELETE_SOURCES) {
        const QuickByte = require('../models/QuickByte');
        const quickBytes = await QuickByte.find({}).lean();
        const sources = [];

        for (const qb of quickBytes) {
            const candidates = [qb.video, ...(qb.episodes || [])];
            for (const media of candidates) {
                // Only when HLS exists - it is the only remaining copy otherwise
                if (media?.hls_url && media?.url?.startsWith('/uploads/')) {
                    const abs = path.join(UPLOAD_BASE, media.url.replace('/uploads/', '').replace(/\//g, path.sep));
                    if (fs.existsSync(abs)) sources.push(abs);
                }
            }
        }

        let sourceBytes = 0;
        sources.forEach(f => {
            try { sourceBytes += fs.statSync(f).size; } catch { /* gone */ }
        });

        console.log(`\nTranscoded sources with HLS on S3: ${sources.length} (${formatBytes(sourceBytes)})`);

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
            console.log(`Deleted ${sources.length} source files, freed ${formatBytes(freed)}`);
        }
    }

    // Abandoned transcode folders
    console.log('\nStale transcode folders:');
    sweepStaleTempHls({ maxAgeHours: 6, dryRun: DRY_RUN });

    await mongoose.disconnect();
    if (DRY_RUN) console.log('\nDry run - re-run with --delete to actually remove these files.');
};

run().catch(error => {
    console.error('Cleanup failed:', error);
    process.exit(1);
});
