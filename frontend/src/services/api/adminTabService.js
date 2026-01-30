import axios from 'axios';
const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api';
const API_BASE_URL = rawApiUrl.replace(/\/$/, '').endsWith('/api') ? rawApiUrl.replace(/\/$/, '') : `${rawApiUrl.replace(/\/$/, '')}/api`;

const adminTabService = {
    getAllTabs: async () => {
        const response = await axios.get(`${API_BASE_URL}/admin/dynamic/tabs`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });
        return response.data.data;
    },

    createTab: async (tabData) => {
        const response = await axios.post(`${API_BASE_URL}/admin/dynamic/tabs`, tabData, {
            headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });
        return response.data.data;
    },

    updateTab: async (tabId, tabData) => {
        const response = await axios.put(`${API_BASE_URL}/admin/dynamic/tabs/${tabId}`, tabData, {
            headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });
        return response.data.data;
    },

    deleteTab: async (tabId) => {
        const response = await axios.delete(`${API_BASE_URL}/admin/dynamic/tabs/${tabId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });
        return response.data;
    },

    createCategory: async (tabId, categoryData) => {
        const response = await axios.post(`${API_BASE_URL}/admin/dynamic/tabs/${tabId}/categories`, categoryData, {
            headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });
        return response.data.data;
    },

    deleteCategory: async (categoryId) => {
        const response = await axios.delete(`${API_BASE_URL}/admin/dynamic/tabs/categories/${categoryId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });
        return response.data;
    }
};

export default adminTabService;
