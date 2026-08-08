const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api';
const API_URL = rawApiUrl.replace(/\/$/, '').endsWith('/api') ? rawApiUrl.replace(/\/$/, '') : `${rawApiUrl.replace(/\/$/, '')}/api`;

// Build a readable message out of a failed response.
// The body is not always JSON (proxy error pages, gateway timeouts), so fall
// back to something that actually explains the status code.
const buildErrorMessage = async (response, fallback) => {
    let payload = null;
    const text = await response.text().catch(() => '');

    if (text) {
        try {
            payload = JSON.parse(text);
        } catch {
            // HTML or plain-text body - handled by the status switch below
        }
    }

    if (payload) {
        if (Array.isArray(payload.errors) && payload.errors.length > 0) {
            return payload.errors.join(', ');
        }
        if (payload.message) {
            return payload.message === 'FORCE_LOGOUT'
                ? 'Your admin session ended. Please log in again.'
                : payload.message;
        }
    }

    switch (response.status) {
        case 401:
            return 'Your admin session has expired. Please log in again.';
        case 403:
            return 'This account is not allowed to manage Quick Bites.';
        case 404:
            return 'API route not found. Check the backend URL configuration.';
        case 413:
            return 'Upload rejected: the files are larger than the server allows.';
        case 502:
        case 503:
        case 504:
            return 'The server did not respond - the upload may have timed out. Please try again.';
        default:
            return `${fallback} (HTTP ${response.status})`;
    }
};

const request = async (path, { method = 'GET', body, fallback } = {}) => {
    const token = localStorage.getItem('adminToken');
    if (!token) throw new Error('Admin session not found. Please log in again.');

    let response;
    try {
        response = await fetch(`${API_URL}${path}`, {
            method,
            headers: { 'Authorization': `Bearer ${token}` },
            ...(body ? { body } : {})
        });
    } catch {
        // Network failure, CORS rejection or a connection dropped mid-upload
        throw new Error('Could not reach the server. Check your connection and try again.');
    }

    if (!response.ok) {
        throw new Error(await buildErrorMessage(response, fallback));
    }

    if (response.status === 204) return null;
    return response.json().catch(() => ({}));
};

const adminQuickByteService = {
    // Fetch all Quick Bites (using new dedicated model)
    async getAllReels() {
        const data = await request('/quickbytes', { fallback: 'Failed to fetch Quick Bites' });
        return data.data || [];
    },

    // Create a new Quick Bite
    async createReel(formData) {
        const data = await request('/quickbytes', {
            method: 'POST',
            body: formData,
            fallback: 'Failed to create Quick Bite'
        });
        return data.data;
    },

    // Delete a Quick Bite
    async deleteReel(id) {
        await request(`/quickbytes/${id}`, {
            method: 'DELETE',
            fallback: 'Failed to delete Quick Bite'
        });
        return true;
    },

    // Get a specific Quick Bite by ID
    async getReelById(id) {
        const data = await request(`/quickbytes/${id}`, { fallback: 'Failed to fetch Quick Bite details' });
        return data.data;
    },

    // Update an existing Quick Bite
    async updateReel(id, formData) {
        const data = await request(`/quickbytes/${id}`, {
            method: 'PUT',
            body: formData,
            fallback: 'Failed to update Quick Bite'
        });
        return data.data;
    }
};

export default adminQuickByteService;
