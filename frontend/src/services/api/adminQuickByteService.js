const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api';
const API_URL = rawApiUrl.replace(/\/$/, '').endsWith('/api') ? rawApiUrl.replace(/\/$/, '') : `${rawApiUrl.replace(/\/$/, '')}/api`;

const adminQuickByteService = {
    // Fetch all Quick Bites (using new dedicated model)
    async getAllReels() {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        // Using new endpoint
        const response = await fetch(`${API_URL}/quickbytes?status=published`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to fetch Quick Bites');
        }

        const data = await response.json();
        return data.data || [];
    },

    // Create a new Quick Bite
    async createReel(formData) {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const response = await fetch(`${API_URL}/quickbytes`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to create Quick Bite');
        }

        const data = await response.json();
        return data.data;
    },

    // Delete a Quick Bite
    async deleteReel(id) {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const response = await fetch(`${API_URL}/quickbytes/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to delete Quick Bite');
        }

        return true;
    },

    // Get a specific Quick Bite by ID
    async getReelById(id) {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const response = await fetch(`${API_URL}/quickbytes/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to fetch Quick Bite details');
        }

        const data = await response.json();
        return data.data; // Assuming response structure { success: true, data: { ... } }
    },

    // Update an existing Quick Bite
    async updateReel(id, formData) {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const response = await fetch(`${API_URL}/quickbytes/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to update Quick Bite');
        }

        const data = await response.json();
        return data.data;
    }
};

export default adminQuickByteService;
