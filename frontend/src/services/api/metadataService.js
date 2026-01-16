const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
// Fallback token retrieval function
const getToken = () => localStorage.getItem('inplay_admin_token') || localStorage.getItem('inplay_token');

const metadataService = {
    async getMetadata() {
        const token = getToken();
        const response = await fetch(`${API_URL}/metadata`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) return { tabs: [], categories: [] };
        const data = await response.json();
        return data.data;
    },

    async addTab(name) {
        const token = getToken();
        const response = await fetch(`${API_URL}/metadata/tabs`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ value: name })
        });
        return response.json();
    },

    async addCategory(name) {
        const token = getToken();
        const response = await fetch(`${API_URL}/metadata/categories`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ value: name })
        });
        return response.json();
    }
};

export default metadataService;
