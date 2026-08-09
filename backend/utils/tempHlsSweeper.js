const fs = require('fs');
const path = require('path');
const { UPLOAD_BASE } = require('../config/multerStorage');
const { formatBytes } = require('./diskSpace');

const TEMP_HLS_DIR = path.join(UPLOAD_BASE, 'temp_hls');

const dirSize = (dir) => {
    let total = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        try {
            total += entry.isDirectory() ? dirSize(full) : fs.statSync(full).size;
        } catch {
            // file vanished mid-scan
        }
    }
    return total;
};

/**
 * Delete leftover HLS transcode folders.
 *
 * mediaService removes these after a successful S3 upload, but a crash, kill or
 * restart mid-transcode leaves multi-GB folders behind forever. Anything older
 * than `maxAgeHours` cannot belong to a running job.
 */
const sweepStaleTempHls = ({ maxAgeHours = 6, dryRun = false } = {}) => {
    if (!fs.existsSync(TEMP_HLS_DIR)) return { removed: 0, bytesFreed: 0 };

    const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
    let removed = 0;
    let bytesFreed = 0;

    for (const entry of fs.readdirSync(TEMP_HLS_DIR, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;

        const full = path.join(TEMP_HLS_DIR, entry.name);
        try {
            if (fs.statSync(full).mtimeMs > cutoff) continue; // possibly still transcoding

            const size = dirSize(full);
            if (!dryRun) fs.rmSync(full, { recursive: true, force: true });
            removed++;
            bytesFreed += size;
            console.log(`[temp_hls] ${dryRun ? 'would remove' : 'removed'} stale transcode folder ${entry.name} (${formatBytes(size)})`);
        } catch (error) {
            console.error(`[temp_hls] Could not clean ${entry.name}:`, error.message);
        }
    }

    if (removed > 0) {
        console.log(`[temp_hls] ${dryRun ? 'Would free' : 'Freed'} ${formatBytes(bytesFreed)} from ${removed} stale folder(s)`);
    }

    return { removed, bytesFreed };
};

module.exports = { sweepStaleTempHls, TEMP_HLS_DIR };
