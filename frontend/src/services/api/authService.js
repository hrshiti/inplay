const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api';
// Remove trailing slash if exists and ensure /api suffix
const API_URL = rawApiUrl.replace(/\/$/, '').endsWith('/api') ? rawApiUrl.replace(/\/$/, '') : `${rawApiUrl.replace(/\/$/, '')}/api`;

const authService = {
    async signup(userData) {
        const response = await fetch(`${API_URL}/user/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });

        const data = await response.json();
        if (!data.success) {
            let errorMessage = data.message || 'Signup failed';
            if (data.errors && Array.isArray(data.errors)) {
                errorMessage = data.errors.map(err => err.msg).join(', ');
            }
            throw new Error(errorMessage);
        }

        // Store token and user
        localStorage.setItem('inplay_token', data.token);
        localStorage.setItem('inplay_current_user', JSON.stringify(data.data.user));
        return data;
    },

    async login(email, password) {
        const response = await fetch(`${API_URL}/user/auth/login`, {
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
        localStorage.setItem('inplay_token', data.token);
        localStorage.setItem('inplay_current_user', JSON.stringify(data.data.user));
        return data;
    },

    async getProfile() {
        const token = localStorage.getItem('inplay_token');
        if (!token) throw new Error('No token found');

        const response = await fetch(`${API_URL}/user/auth/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!data.success) {
            console.error('Profile fetch failed:', data.message, 'Status:', response.status);
            if (response.status === 401) {
                localStorage.removeItem('inplay_token');
                localStorage.removeItem('inplay_current_user');
            }
            throw new Error(data.message || 'Failed to fetch profile');
        }

        localStorage.setItem('inplay_current_user', JSON.stringify(data.data));
        return data.data;
    },

    async updateProfile(profileData) {
        const token = localStorage.getItem('inplay_token');
        if (!token) throw new Error('No token found');

        const response = await fetch(`${API_URL}/user/auth/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(profileData),
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to update profile');
        }

        localStorage.setItem('inplay_current_user', JSON.stringify(data.data));
        return data.data;
    },

    async updateAvatar(formData) {
        const token = localStorage.getItem('inplay_token');
        if (!token) throw new Error('No token found');

        const response = await fetch(`${API_URL}/user/auth/avatar`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to update avatar');
        }

        const currentUser = JSON.parse(localStorage.getItem('inplay_current_user') || '{}');
        const updatedUser = { ...currentUser, avatar: data.data.avatar };
        localStorage.setItem('inplay_current_user', JSON.stringify(updatedUser));
        return updatedUser;
    },

    async updatePreferences(preferences) {
        const token = localStorage.getItem('inplay_token');
        if (!token) throw new Error('No token found');

        const response = await fetch(`${API_URL}/user/auth/preferences`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(preferences),
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to update preferences');
        }

        const currentUser = JSON.parse(localStorage.getItem('inplay_current_user') || '{}');
        const updatedUser = { ...currentUser, preferences: data.data };
        localStorage.setItem('inplay_current_user', JSON.stringify(updatedUser));
        return updatedUser;
    },

    async addToMyList(contentId) {
        const token = localStorage.getItem('inplay_token');
        if (!token) throw new Error('No token found');

        const response = await fetch(`${API_URL}/user/auth/my-list/${contentId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message);
        return data.data;
    },

    async removeFromMyList(contentId) {
        const token = localStorage.getItem('inplay_token');
        if (!token) throw new Error('No token found');

        const response = await fetch(`${API_URL}/user/auth/my-list/${contentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message);
        return data.data;
    },

    async toggleLike(contentId) {
        const token = localStorage.getItem('inplay_token');
        if (!token) throw new Error('No token found');

        const response = await fetch(`${API_URL}/user/auth/like/${contentId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message);
        return data.data;
    },

    async removeFromHistory(contentId) {
        const token = localStorage.getItem('inplay_token');
        if (!token) throw new Error('No token found');

        const response = await fetch(`${API_URL}/user/auth/history/${contentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message);
        return data.data;
    },

    async clearHistory() {
        const token = localStorage.getItem('inplay_token');
        if (!token) throw new Error('No token found');

        const response = await fetch(`${API_URL}/user/auth/history`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message);
        return data.data;
    },

    logout() {
        localStorage.removeItem('inplay_token');
        localStorage.removeItem('inplay_current_user');
    }
};

export default authService;
