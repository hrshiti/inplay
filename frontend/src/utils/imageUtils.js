export const getImageUrl = (path) => {
    if (!path) return "https://placehold.co/300x450/111/FFF?text=No+Image";

    // Getting the base URL
    const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api';
    let serverRoot = rawApiUrl.replace(/\/$/, '');

    // If it is the production domain path (e.g. inplays.in/api), we MUST keep '/api'
    // because '/uploads' without '/api' will route to the Vercel frontend.
    if (serverRoot.endsWith('/api') && !serverRoot.includes('api.inplays.in')) {
        // Keep /api
    } else {
        serverRoot = serverRoot.replace(/\/api$/, '');
    }

    let sanitizedPath = String(path).trim();

    // Fix common hydration bug where "undefined/" is prepended
    sanitizedPath = sanitizedPath.replace(/^undefined\//, '/');

    // If it's already a full URL
    if (sanitizedPath.startsWith('http://') || sanitizedPath.startsWith('https://')) {
        // Special case: if it's a localhost URL from backend but we are on a tunnel/IP
        // we should try to point it back to the current serverRoot
        if (sanitizedPath.includes('localhost:5001') && !serverRoot.includes('localhost:5001')) {
            return sanitizedPath.replace(/https?:\/\/localhost:5001/, serverRoot);
        }
        return sanitizedPath;
    }

    // Ensure path starts with / and remove any double slashes at the start
    const cleanPath = sanitizedPath.startsWith('/') ? sanitizedPath : `/${sanitizedPath}`;
    
    // Combine serverRoot and cleanPath, ensuring no double slashes between them
    return `${serverRoot.replace(/\/$/, '')}/${cleanPath.replace(/^\//, '')}`;
};
