const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../logs');
const LOG_FILE = path.join(LOG_DIR, 'error.log');
const MAX_LOG_BYTES = 5 * 1024 * 1024; // rotate at 5MB so the log never fills the disk itself

const ensureLogDir = () => {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
};

const rotateIfNeeded = () => {
    try {
        if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > MAX_LOG_BYTES) {
            fs.renameSync(LOG_FILE, `${LOG_FILE}.1`); // keep one previous file
        }
    } catch {
        // rotation is best-effort
    }
};

/**
 * Append a server error to logs/error.log with the request that caused it.
 * Console output disappears when the terminal closes - this does not.
 */
const logServerError = (error, req) => {
    const entry = [
        `[${new Date().toISOString()}]`,
        req ? `${req.method} ${req.originalUrl}` : 'no request',
        `code=${error.code || error.name || 'unknown'}`,
        `message=${error.message}`,
        error.stack ? `\n${error.stack}` : ''
    ].join(' ');

    console.error('Error:', error);

    try {
        ensureLogDir();
        rotateIfNeeded();
        fs.appendFileSync(LOG_FILE, `${entry}\n\n`);
    } catch (writeError) {
        // Never let logging break the response (e.g. the disk is what failed)
        console.error('[errorLog] Could not write to error.log:', writeError.message);
    }
};

module.exports = { logServerError, LOG_FILE, LOG_DIR };
