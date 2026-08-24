/**
 * reconcileContentOriginals.js
 *
 * PURPOSE
 * -------
 * 100% READ-ONLY audit tool for Content documents (Movies & Trailers).
 *
 * It classifies each Content video / trailer into one of five audit states:
 *   1. ALREADY_PRESENT    - Already has video.s3_url / trailer.s3_url recorded.
 *   2. HLS_VALID          - Has a valid video.hls_url / trailer.hls_url (streaming ready).
 *                           No local file or s3_url needed; NOT marked as missing.
 *   3. LOCAL_ONLY_PRESENT - Local upload exists on disk, but no HLS and no S3 URL.
 *   4. LOCAL_ONLY_MISSING - Local upload URL referenced, but file is missing from disk.
 *   5. SKIPPED            - No video/trailer object or empty/unrecognized reference.
 *
 * SAFETY GUARANTEES
 * -----------------
 * - NEVER uploads to S3.
 * - NEVER deletes any file.
 * - NEVER modifies MongoDB (read-only audit).
 * - NEVER modifies HLS URLs or video URLs.
 * - NO AWS SDK / S3 dependencies required.
 *
 * USAGE (from backend/):
 *   node scripts/reconcileContentOriginals.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const Content = require('../models/Content');
const { UPLOAD_BASE, getFilePathFromUrl } = require('../config/multerStorage');

// ─── Helper: Local File Resolution ───────────────────────────────────────────

const resolveLocalFilePath = (rawUrl) => {
    if (!rawUrl || typeof rawUrl !== 'string') return null;

    // Direct helper attempt
    let filePath = getFilePathFromUrl(rawUrl);
    if (filePath) return filePath;

    // Fallback: locate 'uploads/' in url regardless of malformed prefix
    const uploadsIndex = rawUrl.indexOf('uploads/');
    if (uploadsIndex !== -1) {
        const subPath = rawUrl.substring(uploadsIndex + 'uploads/'.length);
        const cleanSubPath = subPath.split('?')[0].split('#')[0];
        return path.join(UPLOAD_BASE, cleanSubPath.replace(/\//g, path.sep));
    }

    return null;
};

// ─── Helper: Check HLS Validity ──────────────────────────────────────────────

const isValidHlsUrl = (hlsUrl) => {
    if (!hlsUrl || typeof hlsUrl !== 'string') return false;
    const clean = hlsUrl.trim();
    return clean.length > 0 && (clean.includes('.m3u8') || clean.startsWith('http'));
};

// ─── Main Audit Runner ───────────────────────────────────────────────────────

const run = async () => {
    console.log(`====================================================`);
    console.log(` INPLAY OTT — Content Originals Audit (Read-Only)`);
    console.log(`====================================================\n`);

    await mongoose.connect(process.env.MONGODB_URI);
    const { host, name } = mongoose.connection;
    console.log(`Database    : ${name} @ ${host}`);
    console.log(`Uploads Dir : ${UPLOAD_BASE}\n`);

    console.log(`Scanning Content collection...`);
    const contents = await Content.find({}).lean(true);
    console.log(`Found ${contents.length} Content document(s).\n`);

    const records = [];

    const counts = {
        ALREADY_PRESENT: 0,
        HLS_VALID: 0,
        LOCAL_ONLY_PRESENT: 0,
        LOCAL_ONLY_MISSING: 0,
        SKIPPED: 0,
    };

    const auditField = ({ contentId, title, type, videoObj }) => {
        const rawUrl = videoObj?.url || '';
        const hlsUrl = videoObj?.hls_url || '';
        const s3Url = videoObj?.s3_url || videoObj?.original_s3_url || '';

        let status = 'SKIPPED';
        let detail = '';

        // CASE 1: Already has S3 URL
        if (s3Url) {
            status = 'ALREADY_PRESENT';
            detail = `S3 URL: ${s3Url}`;
        }
        // CASE 2: Has valid HLS URL (Streaming ready)
        else if (isValidHlsUrl(hlsUrl)) {
            status = 'HLS_VALID';
            detail = `HLS: ${hlsUrl}`;
        }
        // CASE 3: Local upload URL referenced
        else if (rawUrl && (rawUrl.includes('uploads/') || rawUrl.includes('/uploads/'))) {
            const localPath = resolveLocalFilePath(rawUrl);
            const exists = localPath ? fs.existsSync(localPath) : false;

            if (exists) {
                status = 'LOCAL_ONLY_PRESENT';
                detail = `Local Path: ${localPath}`;
            } else {
                status = 'LOCAL_ONLY_MISSING';
                detail = `Missing Path: ${localPath || rawUrl}`;
            }
        }
        // CASE 4: Empty or unrecognized
        else {
            status = 'SKIPPED';
            detail = rawUrl ? `Unrecognized URL: ${rawUrl}` : 'No URL provided';
        }

        counts[status]++;

        records.push({
            contentId,
            title,
            type,
            status,
            videoUrl: rawUrl,
            hlsUrl: hlsUrl,
            s3Url: s3Url,
            detail,
        });
    };

    for (const c of contents) {
        const contentId = c._id.toString();
        const contentTitle = c.title || 'Untitled';

        // Audit Main Movie
        auditField({
            contentId,
            title: contentTitle,
            type: 'movie',
            videoObj: c.video,
        });

        // Audit Trailer
        auditField({
            contentId,
            title: contentTitle,
            type: 'trailer',
            videoObj: c.trailer,
        });
    }

    const total = records.length;

    // ─── Summary Output ──────────────────────────────────────────────────────
    console.log(`========== CONTENT RECONCILIATION SUMMARY ==========`);
    console.log(`ALREADY_PRESENT    : ${counts.ALREADY_PRESENT}`);
    console.log(`HLS_VALID          : ${counts.HLS_VALID}`);
    console.log(`LOCAL_ONLY_PRESENT : ${counts.LOCAL_ONLY_PRESENT}`);
    console.log(`LOCAL_ONLY_MISSING : ${counts.LOCAL_ONLY_MISSING}`);
    console.log(`SKIPPED            : ${counts.SKIPPED}`);
    console.log(`TOTAL              : ${total}`);
    console.log(`====================================================\n`);

    // ─── Generate Reports ────────────────────────────────────────────────────
    const reportDir = path.join(__dirname, '../logs');
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    const txtReportPath = path.join(reportDir, `content-reconciliation-${timestampStr}.txt`);
    const jsonReportPath = path.join(reportDir, `content-reconciliation-${timestampStr}.json`);

    try {
        fs.mkdirSync(reportDir, { recursive: true });

        const summaryJson = {
            timestamp: new Date().toISOString(),
            database: `${name} @ ${host}`,
            summary: counts,
            total,
            records,
        };
        fs.writeFileSync(jsonReportPath, JSON.stringify(summaryJson, null, 2));

        const txtLines = [
            `INPLAY OTT — Content Reconciliation Audit Report`,
            `Timestamp : ${new Date().toISOString()}`,
            `Database  : ${name} @ ${host}`,
            `Total     : ${total}`,
            '',
            `ALREADY_PRESENT    : ${counts.ALREADY_PRESENT}`,
            `HLS_VALID          : ${counts.HLS_VALID}`,
            `LOCAL_ONLY_PRESENT : ${counts.LOCAL_ONLY_PRESENT}`,
            `LOCAL_ONLY_MISSING : ${counts.LOCAL_ONLY_MISSING}`,
            `SKIPPED            : ${counts.SKIPPED}`,
            '',
            '=== DETAILS ===',
            ...records.map(r => `[${r.status}] ${r.type.toUpperCase()} | ID: ${r.contentId} | Title: "${r.title}" | URL: ${r.videoUrl || 'N/A'} | HLS: ${r.hlsUrl || 'N/A'} | ${r.detail}`),
        ];
        fs.writeFileSync(txtReportPath, txtLines.join('\n') + '\n');

        console.log(`TXT Report  : ${txtReportPath}`);
        console.log(`JSON Report : ${jsonReportPath}\n`);
    } catch (err) {
        console.error(`Could not write audit reports: ${err.message}`);
    }

    await mongoose.disconnect();
};

if (require.main === module) {
    run().catch((err) => {
        console.error('Fatal error during audit:', err);
        process.exit(1);
    });
}

module.exports = { run };
