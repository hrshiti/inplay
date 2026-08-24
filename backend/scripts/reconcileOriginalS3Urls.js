/**
 * reconcileOriginalS3Urls.js
 *
 * PURPOSE
 * -------
 * Repair MongoDB records whose `video.s3_url` / `originalS3Url` field is
 * missing even though the original MP4 already exists in the S3 bucket under
 * the `originals/` prefix.
 *
 * This is a READ + MONGO-PATCH ONLY script.
 *   - It NEVER calls uploadOriginalToS3().
 *   - It NEVER calls handleVideoHLS().
 *   - It NEVER deletes any local file.
 *   - It NEVER overwrites an s3_url / originalS3Url that is already set.
 *   - It NEVER modifies video.url or any HLS URL.
 *
 * HOW IT WORKS
 * ------------
 * 1. List every object in s3://<bucket>/originals/ (paginated).
 * 2. Build a Map<type+filename → s3Key> to prevent cross-type filename collisions.
 * 3. For every video-bearing Mongo record:
 *    a. Detect HLS_ONLY records (video.url ends in .m3u8 or is a CloudFront HLS URL).
 *    b. Extract the filename from the local URL.
 *    c. Look up <type+filename> in the S3 map.
 *       - Found  → build a CloudFront URL, validate modifiedCount, update ONLY the s3_url field.
 *       - Missing → record as S3_MISSING, no DB write.
 * 4. Write TXT + JSON reports to backend/logs/.
 *
 * Usage (from backend/):
 *   node scripts/reconcileOriginalS3Urls.js             # dry run
 *   node scripts/reconcileOriginalS3Urls.js --execute   # write to Mongo
 */

require('dotenv').config();
const fs       = require('fs');
const path     = require('path');
const mongoose = require('mongoose');
const {
    S3Client,
    ListObjectsV2Command,
} = require('@aws-sdk/client-s3');

// ─── Models ──────────────────────────────────────────────────────────────────
const Content   = require('../models/Content');
const QuickByte = require('../models/QuickByte');
const ForYou    = require('../models/ForYou');
const Banner    = require('../models/Banner');
const Promotion = require('../models/Promotion');

// ─── Config ──────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const DRY_RUN = !EXECUTE;

const BUCKET       = process.env.AWS_S3_BUCKET;
const REGION       = process.env.AWS_REGION || 'ap-south-1';
const CF_URL       = (process.env.CLOUDFRONT_URL || '').replace(/\/$/, '');
const ORIGINALS_PREFIX = 'originals/';

// S3 prefix map — single source of truth for the {type} segment in
// originals/{type}/{id}/{filename}. Update here if the bucket layout ever
// changes for a specific model without touching any other code.
const S3_PREFIX = {
    quickbyte:         'quickbyte',
    quickbyte_episode: 'quickbyte_episode',
    foryou:            'foryou',
    banner:            'banner',
    promotion:         'promotion',
    movie:             'movie',    // originals/movie/...
    trailer:           'trailer',  // originals/trailer/...
    episode:           'episode',  // originals/episode/...
};

const s3 = new S3Client({
    region: REGION,
    credentials: {
        accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build the public URL for an S3 key (prefers CloudFront). */
const buildUrl = (s3Key) => CF_URL
    ? `${CF_URL}/${s3Key}`
    : `https://${BUCKET}.s3.${REGION}.amazonaws.com/${s3Key}`;

/**
 * Classify a URL before any filename extraction.
 * Returns:
 *   'hls_only'    – URL is an HLS master playlist (.m3u8) or CloudFront HLS URL
 *   'external'    – non-local http URL that is not an /uploads/ path
 *   'local'       – a local /uploads/… path (possibly with legacy garbage prefix)
 *   'empty'       – null / empty / non-string
 */
const classifyUrl = (url) => {
    if (!url || typeof url !== 'string' || url.trim() === '') return 'empty';
    if (url.includes('.m3u8'))                                  return 'hls_only';
    // A CloudFront / absolute URL that does NOT contain /uploads/ is HLS or
    // an already-migrated S3 original — either way, nothing to reconcile here.
    if (url.startsWith('http') && !url.includes('/uploads/'))  return 'hls_only';
    if (url.startsWith('http') && url.includes('/uploads/'))   return 'local'; // http with uploads path
    return 'local';
};

/**
 * Extract the bare filename from a local URL variant.
 * Expects classifyUrl(url) === 'local'.
 */
const filenameFromUrl = (url) => {
    const uploadsIndex = url.indexOf('uploads/');
    if (uploadsIndex === -1) return null;
    const afterUploads = url.substring(uploadsIndex); // e.g. "uploads/videos/file.mp4"
    return path.basename(afterUploads);               // e.g. "file.mp4"
};

// ─── S3 index builder ─────────────────────────────────────────────────────────

/**
 * Lists every object under `originals/` and returns a Map:
 *   "<type>/<filename>" → s3Key
 *
 * Key format:  originals/{type}/{id}/{filename}
 *   → type segment is parts[1] (e.g. "movie", "quickbyte", "episode", "banner")
 *   → filename is path.basename(key)
 *
 * Using type+filename as the map key prevents cross-type collisions when two
 * different models happen to have identically-named original files.
 */
const buildS3Index = async () => {
    console.log(`\nListing S3 objects under s3://${BUCKET}/${ORIGINALS_PREFIX} …`);

    // Map: "type/filename" → full s3Key
    const index = new Map();
    let   ContinuationToken;
    let   total = 0;

    do {
        const cmd = new ListObjectsV2Command({
            Bucket:            BUCKET,
            Prefix:            ORIGINALS_PREFIX,
            ContinuationToken,
        });
        const res = await s3.send(cmd);

        for (const obj of (res.Contents || [])) {
            const key      = obj.Key;                   // e.g. originals/movie/abc123/video_file.mp4
            const parts    = key.split('/');            // ['originals', 'movie', 'abc123', 'video_file.mp4']
            const type     = parts[1] || 'unknown';    // 'movie'
            const basename = path.basename(key);       // 'video_file.mp4'
            const mapKey   = `${type}/${basename}`;   // 'movie/video_file.mp4'

            if (!index.has(mapKey)) {
                index.set(mapKey, key);
            }
            total++;
        }

        ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (ContinuationToken);

    console.log(`  → ${total} S3 objects indexed (keyed by type/filename).\n`);
    return index;
};

// ─── Work-item collector ───────────────────────────────────────────────────────

/**
 * Returns a flat array of work items, one per video-bearing Mongo field.
 * Each item carries:
 *   label          – human-readable description
 *   title          – short display name for console lines
 *   localUrl       – the raw URL stored in Mongo (video.url / mediaUrl / …)
 *   s3Type         – the originals/{type} segment used to build the S3 map key
 *   filename       – basename extracted from localUrl (or null)
 *   urlClass       – 'local' | 'hls_only' | 'empty'
 *   alreadyDone    – true when the s3_url field is already set
 *   apply(url)     – async fn returning the updateOne() result
 */
const collectWorkItems = async () => {
    const items = [];

    // ── QuickByte main video ──────────────────────────────────────────────────
    const quickBytes = await QuickByte.find({}).lean(false);
    for (const qb of quickBytes) {
        if (qb.video?.url) {
            const cls = classifyUrl(qb.video.url);
            items.push({
                label:       `QuickByte "${qb.title}" (${qb._id}) - video`,
                title:       qb.title,
                localUrl:    qb.video.url,
                s3Type:      S3_PREFIX.quickbyte,
                filename:    cls === 'local' ? filenameFromUrl(qb.video.url) : null,
                urlClass:    cls,
                alreadyDone: !!qb.video.s3_url,
                apply:       async (url) => QuickByte.updateOne(
                    { _id: qb._id },
                    { $set: { 'video.s3_url': url } }
                ),
            });
        }
        // ── QuickByte episodes ────────────────────────────────────────────────
        for (const ep of (qb.episodes || [])) {
            if (ep.url) {
                const cls = classifyUrl(ep.url);
                items.push({
                    label:       `QuickByte "${qb.title}" (${qb._id}) - episode ${ep._id}`,
                    title:       `${qb.title} [ep]`,
                    localUrl:    ep.url,
                    s3Type:      S3_PREFIX.quickbyte_episode,
                    filename:    cls === 'local' ? filenameFromUrl(ep.url) : null,
                    urlClass:    cls,
                    alreadyDone: !!ep.s3_url,
                    apply:       async (url) => QuickByte.updateOne(
                        { _id: qb._id, 'episodes._id': ep._id },
                        { $set: { 'episodes.$.s3_url': url } }
                    ),
                });
            }
        }
    }

    // ── ForYou ────────────────────────────────────────────────────────────────
    const reels = await ForYou.find({}).lean(false);
    for (const r of reels) {
        if (r.video?.url) {
            const cls = classifyUrl(r.video.url);
            items.push({
                label:       `ForYou "${r.title}" (${r._id})`,
                title:       r.title,
                localUrl:    r.video.url,
                s3Type:      S3_PREFIX.foryou,
                filename:    cls === 'local' ? filenameFromUrl(r.video.url) : null,
                urlClass:    cls,
                alreadyDone: !!r.video.s3_url,
                apply:       async (url) => ForYou.updateOne(
                    { _id: r._id },
                    { $set: { 'video.s3_url': url } }
                ),
            });
        }
    }

    // ── Content: movie / trailer / episodes ───────────────────────────────────
    const contents = await Content.find({}).lean(false);
    for (const c of contents) {
        // Main video
        if (c.video?.url) {
            const cls = classifyUrl(c.video.url);
            items.push({
                label:       `Content "${c.title}" (${c._id}) - video`,
                title:       c.title,
                localUrl:    c.video.url,
                s3Type:      S3_PREFIX.movie,
                filename:    cls === 'local' ? filenameFromUrl(c.video.url) : null,
                urlClass:    cls,
                alreadyDone: !!c.video.s3_url,
                apply:       async (url) => Content.updateOne(
                    { _id: c._id },
                    { $set: { 'video.s3_url': url } }
                ),
            });
        }
        // Trailer
        if (c.trailer?.url) {
            const cls = classifyUrl(c.trailer.url);
            items.push({
                label:       `Content "${c.title}" (${c._id}) - trailer`,
                title:       `${c.title} [trailer]`,
                localUrl:    c.trailer.url,
                s3Type:      S3_PREFIX.trailer,
                filename:    cls === 'local' ? filenameFromUrl(c.trailer.url) : null,
                urlClass:    cls,
                alreadyDone: !!c.trailer.s3_url,
                apply:       async (url) => Content.updateOne(
                    { _id: c._id },
                    { $set: { 'trailer.s3_url': url } }
                ),
            });
        }
        // Episodes
        for (const season of (c.seasons || [])) {
            for (const ep of (season.episodes || [])) {
                if (ep.video?.url) {
                    const cls = classifyUrl(ep.video.url);
                    items.push({
                        label:       `Content "${c.title}" (${c._id}) - S${season.seasonNumber}E${ep.episodeNumber}`,
                        title:       `${c.title} S${season.seasonNumber}E${ep.episodeNumber}`,
                        localUrl:    ep.video.url,
                        s3Type:      S3_PREFIX.episode,
                        filename:    cls === 'local' ? filenameFromUrl(ep.video.url) : null,
                        urlClass:    cls,
                        alreadyDone: !!ep.video.s3_url,
                        apply:       async (url) => Content.updateOne(
                            { _id: c._id },
                            { $set: { 'seasons.$[s].episodes.$[e].video.s3_url': url } },
                            { arrayFilters: [{ 's._id': season._id }, { 'e._id': ep._id }] }
                        ),
                    });
                }
            }
        }
    }

    // ── Banner (video type only) ───────────────────────────────────────────────
    // Fix 3: Only reconcile mediaUrl values that point at /uploads/videos/.
    // Skip CloudFront / HLS URLs — they are not local originals.
    const banners = await Banner.find({ mediaType: 'video' }).lean(false);
    for (const b of banners) {
        if (b.mediaUrl) {
            const cls = classifyUrl(b.mediaUrl);
            // Only push if this is a local /uploads/ path
            if (cls === 'local') {
                items.push({
                    label:       `Banner (${b._id})`,
                    title:       `Banner ${b._id}`,
                    localUrl:    b.mediaUrl,
                    s3Type:      S3_PREFIX.banner,
                    filename:    filenameFromUrl(b.mediaUrl),
                    urlClass:    cls,
                    alreadyDone: !!b.originalS3Url,
                    apply:       async (url) => Banner.updateOne(
                        { _id: b._id },
                        { $set: { originalS3Url: url } }
                    ),
                });
            } else {
                // CloudFront / HLS banner — record as HLS_ONLY so it appears in report
                items.push({
                    label:       `Banner (${b._id})`,
                    title:       `Banner ${b._id}`,
                    localUrl:    b.mediaUrl,
                    s3Type:      S3_PREFIX.banner,
                    filename:    null,
                    urlClass:    cls,
                    alreadyDone: !!b.originalS3Url,
                    apply:       null,
                });
            }
        }
    }

    // ── Promotion ─────────────────────────────────────────────────────────────
    // Fix 3: Only reconcile promoVideoUrl values that contain /uploads/videos/.
    const promos = await Promotion.find({}).lean(false);
    for (const p of promos) {
        if (p.promoVideoUrl) {
            const cls = classifyUrl(p.promoVideoUrl);
            if (cls === 'local') {
                items.push({
                    label:       `Promotion "${p.title}" (${p._id})`,
                    title:       p.title,
                    localUrl:    p.promoVideoUrl,
                    s3Type:      S3_PREFIX.promotion,
                    filename:    filenameFromUrl(p.promoVideoUrl),
                    urlClass:    cls,
                    alreadyDone: !!p.originalS3Url,
                    apply:       async (url) => Promotion.updateOne(
                        { _id: p._id },
                        { $set: { originalS3Url: url } }
                    ),
                });
            } else {
                items.push({
                    label:       `Promotion "${p.title}" (${p._id})`,
                    title:       p.title,
                    localUrl:    p.promoVideoUrl,
                    s3Type:      S3_PREFIX.promotion,
                    filename:    null,
                    urlClass:    cls,
                    alreadyDone: !!p.originalS3Url,
                    apply:       null,
                });
            }
        }
    }

    return items;
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const { host, name } = mongoose.connection;

    console.log('================================================');
    console.log(' INPLAY — Reconcile Original S3 URLs');
    console.log('================================================');
    console.log(`Database : ${name} @ ${host}`);
    console.log(`Bucket   : ${BUCKET}`);
    console.log(`CDN      : ${CF_URL || '(direct S3 URL)'}`);
    console.log(`Mode     : ${DRY_RUN ? 'DRY RUN  (no DB writes)' : 'EXECUTE  (will write to Mongo)'}`);
    console.log('');

    // 1. Build the S3 filename index
    const s3Index = await buildS3Index();

    // 2. Collect all work items from Mongo
    console.log('Scanning MongoDB records …');
    const items = await collectWorkItems();
    console.log(`Found ${items.length} video-bearing records total.\n`);

    // ── Result buckets (Patch 5: expanded categories) ─────────────────────────
    const results = {
        alreadyUpdated:   [],   // ALREADY_UPDATED  – s3_url already set, nothing to do
        mongoUpdated:     [],   // FOUND_IN_S3      – reconciled successfully
        hlsOnly:          [],   // HLS_ONLY         – video.url is .m3u8 / CloudFront HLS
        s3Missing:        [],   // S3_MISSING       – filename not found in S3 index
        mongoMatchFailed: [],   // MONGO_MATCH_FAILED – updateOne returned modifiedCount 0
    };

    // 3. Process each item
    for (let i = 0; i < items.length; i++) {
        const item     = items[i];
        const progress = `[${i + 1}/${items.length}]`;
        const label    = item.title || item.label;

        // ALREADY_UPDATED – s3_url already set in Mongo
        if (item.alreadyDone) {
            results.alreadyUpdated.push(item);
            console.log(`${progress} ALREADY_UPDATED → ${label}`);
            continue;
        }

        // HLS_ONLY – video.url is .m3u8 or a CloudFront URL without /uploads/
        if (item.urlClass === 'hls_only' || item.urlClass === 'empty') {
            results.hlsOnly.push(item);
            console.log(`${progress} HLS_ONLY → ${label}  [${item.localUrl || 'no url'}]`);
            continue;
        }

        // No filename could be derived (should not normally happen after classification)
        if (!item.filename) {
            results.hlsOnly.push(item);
            console.log(`${progress} HLS_ONLY → No filename derived → ${label}`);
            continue;
        }

        // Look up type+filename in the S3 index (Patch 2: collision-safe)
        const mapKey = `${item.s3Type}/${item.filename}`;
        const s3Key  = s3Index.get(mapKey);

        if (!s3Key) {
            results.s3Missing.push(item);
            console.log(`${progress} S3_MISSING → ${label}  [key tried: ${mapKey}]`);
            continue;
        }

        // Found in S3 – patch Mongo (or report in dry-run)
        const url = buildUrl(s3Key);

        if (DRY_RUN) {
            console.log(`${progress} FOUND_IN_S3 → [DRY RUN – would update] → ${label}`);
            results.mongoUpdated.push({ ...item, url });
        } else {
            try {
                // Patch 4: validate modifiedCount
                const res = await item.apply(url);
                if (res.modifiedCount === 1) {
                    console.log(`${progress} FOUND_IN_S3 → Mongo Updated → ${label}`);
                    results.mongoUpdated.push({ ...item, url });
                } else {
                    // Document matched 0 — filter didn't match or field already set
                    console.warn(`${progress} MONGO_MATCH_FAILED → modifiedCount=${res.modifiedCount} → ${label}`);
                    results.mongoMatchFailed.push({ ...item, url, reason: `modifiedCount=${res.modifiedCount}` });
                }
            } catch (err) {
                console.error(`${progress} MONGO_MATCH_FAILED → ${err.message} → ${label}`);
                results.mongoMatchFailed.push({ ...item, reason: `Mongo write threw: ${err.message}` });
            }
        }
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('\n========== RECONCILIATION SUMMARY ==========');
    console.log(`ALREADY_UPDATED    : ${results.alreadyUpdated.length}`);
    console.log(`FOUND_IN_S3        : ${results.mongoUpdated.length}${DRY_RUN ? ' (dry run – not written)' : ''}`);
    console.log(`HLS_ONLY           : ${results.hlsOnly.length}`);
    console.log(`S3_MISSING         : ${results.s3Missing.length}`);
    console.log(`MONGO_MATCH_FAILED : ${results.mongoMatchFailed.length}`);
    console.log(`Total Processed    : ${items.length}`);
    console.log('');

    // ── Reports ───────────────────────────────────────────────────────────────
    const reportDir     = path.join(__dirname, '../logs');
    const ts            = new Date().toISOString().replace(/[:.]/g, '-');
    const txtReportPath = path.join(reportDir, `reconcile-s3-urls-${ts}.txt`);
    const jsonReportPath= path.join(reportDir, `reconcile-s3-urls-${ts}.json`);

    try {
        fs.mkdirSync(reportDir, { recursive: true });

        // JSON
        const summary = {
            timestamp:        new Date().toISOString(),
            mode:             DRY_RUN ? 'dry-run' : 'execute',
            database:         `${name} @ ${host}`,
            bucket:           BUCKET,
            totalRecords:     items.length,
            ALREADY_UPDATED:  results.alreadyUpdated.length,
            FOUND_IN_S3:      results.mongoUpdated.length,
            HLS_ONLY:         results.hlsOnly.length,
            S3_MISSING:       results.s3Missing.length,
            MONGO_MATCH_FAILED: results.mongoMatchFailed.length,
            updatedDetails:   results.mongoUpdated.map(r => ({ label: r.label, url: r.url })),
            s3MissingDetails: results.s3Missing.map(r => ({ label: r.label, filename: r.filename, localUrl: r.localUrl, mapKey: `${r.s3Type}/${r.filename}` })),
            mongoMatchFailed: results.mongoMatchFailed.map(r => ({ label: r.label, url: r.url, reason: r.reason })),
            hlsOnlyDetails:   results.hlsOnly.map(r => ({ label: r.label, localUrl: r.localUrl })),
        };
        fs.writeFileSync(jsonReportPath, JSON.stringify(summary, null, 2));

        // TXT
        const lines = [
            `Reconcile S3 URLs — ${new Date().toISOString()}`,
            `Mode     : ${DRY_RUN ? 'DRY RUN' : 'EXECUTE'}`,
            `Database : ${name} @ ${host}`,
            `Bucket   : ${BUCKET}`,
            '',
            `ALREADY_UPDATED    : ${results.alreadyUpdated.length}`,
            `FOUND_IN_S3        : ${results.mongoUpdated.length}`,
            `HLS_ONLY           : ${results.hlsOnly.length}`,
            `S3_MISSING         : ${results.s3Missing.length}`,
            `MONGO_MATCH_FAILED : ${results.mongoMatchFailed.length}`,
            `Total              : ${items.length}`,
            '',
            '=== FOUND_IN_S3 (updated) ===',
            ...results.mongoUpdated.map(r => `  ${r.label}\n    → ${r.url}`),
            '',
            '=== S3_MISSING ===',
            ...results.s3Missing.map(r => `  ${r.label}  [tried: ${r.s3Type}/${r.filename || 'null'}]`),
            '',
            '=== MONGO_MATCH_FAILED ===',
            ...results.mongoMatchFailed.map(r => `  ${r.label}  reason: ${r.reason}`),
            '',
            '=== HLS_ONLY (skipped) ===',
            ...results.hlsOnly.map(r => `  ${r.label}  localUrl=${r.localUrl}`),
        ];
        fs.writeFileSync(txtReportPath, lines.join('\n') + '\n');

        console.log(`TXT  report → ${txtReportPath}`);
        console.log(`JSON report → ${jsonReportPath}`);
    } catch (err) {
        console.error(`Could not write reports: ${err.message}`);
    }

    if (DRY_RUN && results.mongoUpdated.length > 0) {
        console.log('\nDry run complete. Re-run with --execute to apply these Mongo updates.');
    }
    if (results.mongoMatchFailed.length > 0) {
        console.log(`\n[!] ${results.mongoMatchFailed.length} record(s) had MONGO_MATCH_FAILED. Check the report for details.`);
    }

    await mongoose.disconnect();
};

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
