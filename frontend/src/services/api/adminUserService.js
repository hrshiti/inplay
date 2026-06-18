const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api';
const API_URL = rawApiUrl.replace(/\/$/, '').endsWith('/api') ? rawApiUrl.replace(/\/$/, '') : `${rawApiUrl.replace(/\/$/, '')}/api`;

const adminUserService = {
    async getAllUsers() {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const response = await fetch(`${API_URL}/admin/users?limit=2000`, {
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

        return data;
    },

    async getActiveSubscriptions() {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const response = await fetch(`${API_URL}/admin/subscription/active`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch active subscriptions');
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
    },

    async getAppSettings() {
        const token = localStorage.getItem('adminToken');
        // Token is optional for public settings but recommended for admin
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        const response = await fetch(`${API_URL}/app-settings`, {
            method: 'GET',
            headers: headers,
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch app settings');
        }

        return data.data;
    },

    async updateAppSettings(settingsData) {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const response = await fetch(`${API_URL}/admin/app-settings`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(settingsData),
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to update app settings');
        }

        return data.data;
    },

    async forceLogoutUser(userId) {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const response = await fetch(`${API_URL}/admin/users/${userId}/force-logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to trigger force logout');
        }

        return data;
    },

    async forceLogoutAll() {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const response = await fetch(`${API_URL}/admin/users/force-logout-all`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to trigger global force logout');
        }

        return data;
    }
};

export default adminUserService;
