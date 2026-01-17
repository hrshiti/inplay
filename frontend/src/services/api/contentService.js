const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

const contentService = {
    // Fetch all content (public)
    async getAllContent(filters = {}) {
        const queryParams = new URLSearchParams();
        if (filters.type) queryParams.append('type', filters.type);
        if (filters.category) queryParams.append('category', filters.category);
        if (filters.limit) queryParams.append('limit', filters.limit);
        if (filters.page) queryParams.append('page', filters.page);
        if (filters.search) queryParams.append('search', filters.search);

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
    }
};

export default contentService;
