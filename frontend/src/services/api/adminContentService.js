const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api';
const API_URL = rawApiUrl.replace(/\/$/, '').endsWith('/api') ? rawApiUrl.replace(/\/$/, '') : `${rawApiUrl.replace(/\/$/, '')}/api`;

const adminContentService = {
    // Get all content with pagination and filters
    async getAllContent(params = {}) {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.search) queryParams.append('search', params.search);
        if (params.status) queryParams.append('status', params.status);
        if (params.type) queryParams.append('type', params.type);
        if (params.category) queryParams.append('category', params.category);

        const response = await fetch(`${API_URL}/admin/content?${queryParams.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to fetch content');
        }

        const data = await response.json();
        return data; // Return full response including pagination metadata
    },

    // Get single content
    async getContent(id) {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const response = await fetch(`${API_URL}/admin/content/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch content details');
        }

        const data = await response.json();
        return data.data;
    },

    // Create new content
    async createContent(contentData) {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const isFormData = contentData instanceof FormData;
        const headers = {
            'Authorization': `Bearer ${token}`,
        };
        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(`${API_URL}/admin/content`, {
            method: 'POST',
            headers: headers,
            body: isFormData ? contentData : JSON.stringify(contentData),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to create content');
        }

        const data = await response.json();
        return data.data;
    },

    // Update content
    async updateContent(id, contentData) {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const isFormData = contentData instanceof FormData;
        const headers = {
            'Authorization': `Bearer ${token}`,
        };
        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(`${API_URL}/admin/content/${id}`, {
            method: 'PUT',
            headers: headers,
            body: isFormData ? contentData : JSON.stringify(contentData),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to update content');
        }

        const data = await response.json();
        return data.data;
    },

    // Delete content
    async deleteContent(id) {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const response = await fetch(`${API_URL}/admin/content/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to delete content');
        }

        return true;
    }
};

export default adminContentService;
