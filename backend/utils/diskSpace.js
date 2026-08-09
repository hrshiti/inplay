const fs = require('fs');
const { UPLOAD_BASE } = require('../config/multerStorage');

// Refuse new uploads when the uploads volume drops below this much free space.
// Transcoding needs several times the source size (4 HLS renditions), so keep
// a real buffer rather than letting multer fill the disk to the last byte.
const MIN_FREE_BYTES = Number(process.env.MIN_FREE_DISK_MB || 2048) * 1024 * 1024;

const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes)) return 'unknown';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }
    return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
};

// Free bytes available on the volume that holds the uploads directory.
// Returns null when the platform/runtime cannot report it.
const getFreeBytes = (targetPath = UPLOAD_BASE) => {
    try {
        if (typeof fs.statfsSync !== 'function') return null;
        const stats = fs.statfsSync(targetPath);
        return stats.bavail * stats.bsize;
    } catch (error) {
        console.error('[diskSpace] Could not read free space:', error.message);
        return null;
    }
};

// Express middleware: fail fast with a clear message instead of letting multer
// die half-way through writing a multi-GB file with a raw ENOSPC.
const requireFreeDiskSpace = (req, res, next) => {
    const freeBytes = getFreeBytes();

    if (freeBytes !== null && freeBytes < MIN_FREE_BYTES) {
        console.error(`[diskSpace] Upload refused - only ${formatBytes(freeBytes)} free on the uploads volume`);
        return res.status(507).json({
            success: false,
            message: `Server storage is full (only ${formatBytes(freeBytes)} free). ` +
                `Free up space on the server before uploading, then try again.`,
            code: 'INSUFFICIENT_STORAGE',
            freeBytes
        });
    }

    next();
};

module.exports = { getFreeBytes, requireFreeDiskSpace, formatBytes, MIN_FREE_BYTES };
