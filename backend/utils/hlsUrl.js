/**
 * Normalize and optionally proxy HLS URLs for browser playback.
 * CloudFront/S3 only attach CORS headers when Origin is forwarded; cached
 * responses without them cause manifestLoadError in hls.js on localhost/dev.
 */
const hydrateHlsUrl = (url) => {
    if (!url) return url;

    const backendUrl = (process.env.BACKEND_URL || '').replace(/\/$/, '');
    const cloudFrontUrl = (process.env.CLOUDFRONT_URL || '').replace(/\/$/, '');

    // Relative local paths → absolute backend URL
    if (url.startsWith('/')) {
        return backendUrl ? `${backendUrl}${url}` : url;
    }

    // CloudFront HLS → backend proxy (adds Access-Control-Allow-Origin on every response)
    if (cloudFrontUrl && url.startsWith(`${cloudFrontUrl}/`)) {
        const s3Key = url.slice(cloudFrontUrl.length + 1);
        if (backendUrl && s3Key) {
            return `${backendUrl}/api/hls-proxy/${s3Key}`;
        }
    }

    return url;
};

module.exports = { hydrateHlsUrl };
