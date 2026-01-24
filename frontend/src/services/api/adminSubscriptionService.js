const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
const API_URL = rawApiUrl.replace(/\/$/, '').endsWith('/api') ? rawApiUrl.replace(/\/$/, '') : `${rawApiUrl.replace(/\/$/, '')}/api`;

const adminSubscriptionService = {
    async getAllPlans() {
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

    async getPlan(planId) {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const response = await fetch(`${API_URL}/admin/subscription/plans/${planId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch plan details');
        }

        return data.data;
    },

    async createPlan(planData) {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const response = await fetch(`${API_URL}/admin/subscription/plans`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(planData),
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to create plan');
        }

        return data.data;
    },

    async updatePlan(planId, planData) {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const response = await fetch(`${API_URL}/admin/subscription/plans/${planId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(planData),
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to update plan');
        }

        return data.data;
    },

    async deletePlan(planId) {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const response = await fetch(`${API_URL}/admin/subscription/plans/${planId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to delete plan');
        }

        return data.data;
    },

    async getAnalytics() {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const response = await fetch(`${API_URL}/admin/subscription/analytics`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch analytics');
        }

        return data.data;
    }
};

export default adminSubscriptionService;
