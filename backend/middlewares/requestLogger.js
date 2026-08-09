/**
 * Middleware to log incoming requests and their responses.
 *
 * Verbose logging (full request + response bodies) is OFF by default. It was
 * previously always on, which pretty-printed every JSON response into the
 * process log - a content listing is hundreds of KB, and it grew the PM2 log
 * to 29GB and filled the disk. morgan already logs a one-line summary per
 * request, so the default here is a no-op.
 *
 * Enable temporarily for debugging with VERBOSE_REQUEST_LOGS=true.
 */
const VERBOSE = process.env.VERBOSE_REQUEST_LOGS === 'true';

// Hard cap on any single logged payload, so verbose mode cannot run away either
const MAX_BODY_CHARS = 2000;

const truncate = (text) =>
    text.length > MAX_BODY_CHARS
        ? `${text.slice(0, MAX_BODY_CHARS)}... [${text.length - MAX_BODY_CHARS} more chars truncated]`
        : text;

const requestLogger = (req, res, next) => {
    if (!VERBOSE) return next();

    const start = Date.now();
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';

    console.log(`\n--- [REQUEST] ${new Date().toISOString()} ---`);
    console.log(`${method} ${originalUrl}`);
    console.log(`From: ${ip} | UA: ${userAgent}`);

    // Never log upload bodies - they contain binary data
    if (req.body && !originalUrl.includes('upload')) {
        const body = { ...req.body };
        // Mask anything credential-shaped
        for (const key of ['password', 'currentPassword', 'newPassword', 'otp', 'token']) {
            if (body[key]) body[key] = '********';
        }
        console.log('Body:', truncate(JSON.stringify(body)));
    }

    const originalSend = res.send;
    res.send = function (data) {
        const duration = Date.now() - start;

        console.log(`--- [RESPONSE] ${method} ${originalUrl} ---`);
        console.log(`Status: ${res.statusCode} | Duration: ${duration}ms`);

        const contentType = res.get('Content-Type');
        if (contentType && contentType.includes('application/json')) {
            // Compact, not pretty-printed, and always truncated
            console.log('Response Body:', truncate(typeof data === 'string' ? data : String(data)));
        }
        console.log('-------------------------------------------\n');

        return originalSend.apply(res, arguments);
    };

    next();
};

module.exports = requestLogger;
