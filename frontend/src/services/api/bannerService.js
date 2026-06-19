const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api';
const API_URL = rawApiUrl.replace(/\/$/, '').endsWith('/api') ? rawApiUrl.replace(/\/$/, '') : `${rawApiUrl.replace(/\/$/, '')}/api`;

const bannerService = {
    // Admin APIs
    async getAllBanners(category = '') {
        const token = localStorage.getItem('adminToken');
        const url = category ? `${API_URL}/admin/banners?category=${category}` : `${API_URL}/admin/banners`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch banners');
        const data = await response.json();
        return data.data || [];
    },

    async createBanner(bannerData) {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/admin/banners`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(bannerData)
        });
        if (!response.ok) throw new Error('Failed to create banner');
        const data = await response.json();
        return data.data;
    },

    async updateBanner(id, bannerData) {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/admin/banners/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(bannerData)
        });
        if (!response.ok) throw new Error('Failed to update banner');
        const data = await response.json();
        return data.data;
    },

    async deleteBanner(id) {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/admin/banners/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to delete banner');
        return true;
    },

    // Public APIs
    async getPublicBanners(category = '') {
        const url = category ? `${API_URL}/public/banners?category=${category}` : `${API_URL}/public/banners`;
        const response = await fetch(url);
        if (!response.ok) return category ? [] : { drama: [], cinema: [], bhojpuri: [] };
        const data = await response.json();
        return data.data;
    }
};

export default bannerService;
