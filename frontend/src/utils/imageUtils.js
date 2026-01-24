export const getImageUrl = (path) => {
    if (!path) return "https://placehold.co/300x450/111/FFF?text=No+Image";

    // Convert to string and sanitize "undefined" if it exists (common hydration bug)
    let sanitizedPath = String(path).replace(/^undefined\//, '/');

    // If it's already a full URL (http/https), return as is
    if (sanitizedPath.startsWith('http://') || sanitizedPath.startsWith('https://')) {
        return sanitizedPath;
    }

    // Getting the base URL
    const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api';
    const serverRoot = rawApiUrl.replace(/\/$/, '').replace(/\/api$/, '');

    // Ensure path starts with /
    const cleanPath = sanitizedPath.startsWith('/') ? sanitizedPath : `/${sanitizedPath}`;

    return `${serverRoot}${cleanPath}`;
};
