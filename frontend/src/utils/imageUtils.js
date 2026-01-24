export const getImageUrl = (path) => {
    if (!path) return "https://placehold.co/300x450/111/FFF?text=No+Image";

    // If it's already a full URL (http/https), return as is
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    // Getting the base URL (stripping '/api' from VITE_API_BASE_URL if present)
    const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
    const serverRoot = rawApiUrl.replace(/\/$/, '').replace(/\/api$/, '');

    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    return `${serverRoot}${cleanPath}`;
};
