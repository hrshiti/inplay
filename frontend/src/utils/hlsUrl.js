/**
 * Rewrite CloudFront/CDN HLS URLs to the backend proxy so hls.js can load manifests
 * without browser CORS blocks (common on localhost and when CDN cache lacks ACAO).
 */
export const getProxiedHlsUrl = (url) => {
    if (!url || typeof url !== 'string' || !url.includes('.m3u8')) return url;

    const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api';
    const serverRoot = rawApiUrl.replace(/\/$/, '').replace(/\/api$/, '');

    if (url.includes('/api/hls-proxy/')) return url;

    try {
        const parsed = new URL(url);
        // S3/CloudFront HLS keys always live under /videos/...
        if (parsed.pathname.startsWith('/videos/')) {
            const s3Key = parsed.pathname.replace(/^\//, '');
            return `${serverRoot}/api/hls-proxy/${s3Key}`;
        }
    } catch {
        // Not an absolute URL — leave unchanged
    }

    return url;
};
