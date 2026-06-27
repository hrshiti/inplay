const express = require('express');
const router = express.Router();

const cloudFrontBase = (process.env.CLOUDFRONT_URL || '').replace(/\/$/, '');

/**
 * Proxy HLS manifests and segments from CloudFront with CORS headers.
 * Relative paths inside .m3u8 playlists resolve against this route, so the
 * entire HLS tree is served same-origin to the API host.
 */
router.get(/^\/(.+)/, async (req, res) => {
    if (!cloudFrontBase) {
        return res.status(503).json({ success: false, message: 'CloudFront URL is not configured' });
    }

    const s3Key = req.params[0];
    if (!s3Key || s3Key.includes('..')) {
        return res.status(400).json({ success: false, message: 'Invalid HLS path' });
    }

    const targetUrl = `${cloudFrontBase}/${s3Key}`;

    try {
        const upstreamHeaders = {};
        if (req.headers.range) upstreamHeaders.Range = req.headers.range;

        const upstream = await fetch(targetUrl, { headers: upstreamHeaders });

        if (!upstream.ok && upstream.status !== 206) {
            return res.status(upstream.status).json({
                success: false,
                message: `Upstream HLS fetch failed (${upstream.status})`
            });
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

        const contentType = upstream.headers.get('content-type');
        if (contentType) res.setHeader('Content-Type', contentType);

        const contentLength = upstream.headers.get('content-length');
        if (contentLength) res.setHeader('Content-Length', contentLength);

        const contentRange = upstream.headers.get('content-range');
        if (contentRange) res.setHeader('Content-Range', contentRange);

        const acceptRanges = upstream.headers.get('accept-ranges');
        if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);

        res.setHeader('Cache-Control', 'public, max-age=86400');

        res.status(upstream.status);
        const body = Buffer.from(await upstream.arrayBuffer());
        res.send(body);
    } catch (err) {
        console.error('[HLS Proxy] Error fetching', targetUrl, err.message);
        res.status(502).json({ success: false, message: 'HLS proxy fetch failed' });
    }
});

router.options(/^\/(.+)/, (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.status(204).end();
});

module.exports = router;
