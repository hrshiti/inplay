const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api';
// Remove trailing slash if exists and ensure /api suffix
const API_URL = rawApiUrl.replace(/\/$/, '').endsWith('/api') ? rawApiUrl.replace(/\/$/, '') : `${rawApiUrl.replace(/\/$/, '')}/api`;

const contentService = {
    // Fetch all content (public)
    async getAllContent(filters = {}) {
        const queryParams = new URLSearchParams();
        if (filters.type) queryParams.append('type', filters.type);
        if (filters.category) queryParams.append('category', filters.category);
        if (filters.limit) queryParams.append('limit', filters.limit);
        if (filters.page) queryParams.append('page', filters.page);
        if (filters.search) queryParams.append('search', filters.search);
        if (filters.dynamicTabId) queryParams.append('dynamicTabId', filters.dynamicTabId);
        if (filters.dynamicTabs) queryParams.append('dynamicTabs', filters.dynamicTabs);

        const response = await fetch(`${API_URL}/content/all?${queryParams.toString()}`, {
            method: 'GET',
        });

        if (!response.ok) {
            // Fallback for empty state or error
            return []; // Fixed to return array based on previous usage expectation? previous code returned { content: [] } ?? no, old code returned data.data || []
            // Wait, previous code: return { content: [] }; then return data.data || [];
            // Actually getAllContent usage in UserRoutes expects array: item.poster?.url
            // Let's stick to returning array.
            return [];
        }

        const data = await response.json();
        return data.data || []; // Returns array of content
    },

    // Fetch single content details
    async getContentById(id) {
        const token = localStorage.getItem('inplay_token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/content/${id}`, {
            method: 'GET',
            headers: headers,
        });
        if (!response.ok) {
            throw new Error('Failed to fetch content details');
        }
        const data = await response.json();
        return data.data;
    },

    // New method for Quick Bytes
    async getQuickBytes(limit = 20) {
        const response = await fetch(`${API_URL}/quickbytes?status=published&limit=${limit}`, {
            method: 'GET',
        });

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        return data.data || [];
    },

    async getForYouReels() {
        const response = await fetch(`${API_URL}/foryou?status=published`, {
            method: 'GET'
        });
        const data = await response.json();
        return data.data || [];
    },

    async updateWatchHistory(watchData) {
        const token = localStorage.getItem('inplay_token');
        if (!token) return;

        const response = await fetch(`${API_URL}/user/watch-history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(watchData),
        });
        return await response.json();
    },

    async getNewReleases(limit = 10) {
        const response = await fetch(`${API_URL}/content/new-releases?limit=${limit}`, {
            method: 'GET'
        });
        const data = await response.json();
        return data.data || [];
    },

    // Dynamic Navigation
    async getDynamicStructure() {
        const response = await fetch(`${API_URL}/public/dynamic-structure`);
        const data = await response.json();
        return data.data || [];
    },

    async getDynamicContent(tabSlug, categorySlug) {
        const queryParams = new URLSearchParams();
        if (tabSlug) queryParams.append('tabSlug', tabSlug);
        if (categorySlug) queryParams.append('categorySlug', categorySlug);

        const response = await fetch(`${API_URL}/public/dynamic-content?${queryParams.toString()}`);
        const data = await response.json();
        return data.data || [];
    }
};

export default contentService;
