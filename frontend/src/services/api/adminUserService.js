const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api';
const API_URL = rawApiUrl.replace(/\/$/, '').endsWith('/api') ? rawApiUrl.replace(/\/$/, '') : `${rawApiUrl.replace(/\/$/, '')}/api`;

const adminUserService = {
    async getAllUsers() {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const response = await fetch(`${API_URL}/admin/users`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch users');
        }

        return data.data; // This is the array of users
    },

    async getUser(userId) {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch user details');
        }

        return data.data;
    },

    async updateUserStatus(userId, isActive) {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const response = await fetch(`${API_URL}/admin/users/${userId}/status`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ isActive }),
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to update user status');
        }

        return data.data;
    },

    async updateUserSubscription(userId, subscriptionData) {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const response = await fetch(`${API_URL}/admin/users/${userId}/subscription`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(subscriptionData),
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to update user subscription');
        }

        return data.data;
    },

    async getPlans() {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const response = await fetch(`${API_URL}/admin/subscription/plans?all=true`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch subscription plans');
        }

        return data.data;
    },

    async deleteUser(userId) {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to delete user');
        }

        return data;
    }
};

export default adminUserService;
