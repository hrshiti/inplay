const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api';
const API_URL = rawApiUrl.replace(/\/$/, '').endsWith('/api') ? rawApiUrl.replace(/\/$/, '') : `${rawApiUrl.replace(/\/$/, '')}/api`;

const subscriptionService = {
    async getPlans() {
        // Try user token first, then admin token
        const token = localStorage.getItem('inplay_token') || localStorage.getItem('adminToken');
        if (!token) throw new Error('Authentication required');

        const response = await fetch(`${API_URL}/user/plans`, {
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

    async getAppSettings() {
        const response = await fetch(`${API_URL}/app-settings`, {
            method: 'GET'
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch app settings');
        }

        return data.data;
    },

    async createSubscription(planId, isTrial = false) {
        const token = localStorage.getItem('inplay_token');
        if (!token) throw new Error('User authentication required for subscription');

        const requestBody = { planId, isTrial };

        const response = await fetch(`${API_URL}/user/subscription/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to initiate subscription');
        }

        return data.data;
    },

    async verifySubscription(paymentDetails) {
        const token = localStorage.getItem('inplay_token');
        if (!token) throw new Error('User authentication required');

        const response = await fetch(`${API_URL}/user/subscription/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(paymentDetails),
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to verify subscription');
        }

        return data;
    }
};

export default subscriptionService;
