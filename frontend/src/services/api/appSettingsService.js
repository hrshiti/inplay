const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api';
const API_URL = rawApiUrl.replace(/\/$/, '').endsWith('/api') ? rawApiUrl.replace(/\/$/, '') : `${rawApiUrl.replace(/\/$/, '')}/api`;

const appSettingsService = {
    async getSettings() {
        const response = await fetch(`${API_URL}/app-settings`, {
            method: 'GET',
        });
        if (!response.ok) {
            throw new Error('Failed to fetch app settings');
        }
        const data = await response.json();
        return data.data;
    },

    async updateSettings(settingsData) {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found. Please login as admin.');
        const response = await fetch(`${API_URL}/app-settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(settingsData)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update app settings');
        }
        const data = await response.json();
        return data.data;
    }
};

export default appSettingsService;
