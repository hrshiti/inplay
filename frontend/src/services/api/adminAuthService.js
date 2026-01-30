const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api';
const API_URL = rawApiUrl.replace(/\/$/, '').endsWith('/api') ? rawApiUrl.replace(/\/$/, '') : `${rawApiUrl.replace(/\/$/, '')}/api`;

const adminAuthService = {
    async login(email, password) {
        const response = await fetch(`${API_URL}/admin/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (!data.success) {
            let errorMessage = data.message || 'Login failed';
            if (data.errors && Array.isArray(data.errors)) {
                errorMessage = data.errors.map(err => err.msg).join(', ');
            }
            throw new Error(errorMessage);
        }

        // Store token and user
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.data.user));
        localStorage.setItem('adminAuthenticated', 'true');
        return data;
    },

    async getProfile() {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const response = await fetch(`${API_URL}/admin/auth/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!data.success) {
            if (response.status === 401) {
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUser');
                localStorage.removeItem('adminAuthenticated');
            }
            throw new Error(data.message || 'Failed to fetch admin profile');
        }

        localStorage.setItem('adminUser', JSON.stringify(data.data));
        return data.data;
    },

    async updateProfile(updateData) {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const response = await fetch(`${API_URL}/admin/auth/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(updateData),
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to update profile');
        }

        localStorage.setItem('adminUser', JSON.stringify(data.data)); // Update local storage
        return data.data;
    },

    async changePassword(currentPassword, newPassword) {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        const response = await fetch(`${API_URL}/admin/auth/change-password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ currentPassword, newPassword }),
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to change password');
        }

        return data;
    },

    logout() {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        localStorage.removeItem('adminAuthenticated');
    }
};

export default adminAuthService;
