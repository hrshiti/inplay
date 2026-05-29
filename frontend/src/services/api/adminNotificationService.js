import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api';
const API_URL = rawApiUrl.replace(/\/$/, '').endsWith('/api') ? rawApiUrl.replace(/\/$/, '') : `${rawApiUrl.replace(/\/$/, '')}/api`;

const adminNotificationService = {
  sendToAll: async (notificationData) => {
    const token = localStorage.getItem('adminToken');
    const response = await axios.post(`${API_URL}/admin/notifications/send-all`, notificationData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  sendToSubscribed: async (notificationData) => {
    const token = localStorage.getItem('adminToken');
    const response = await axios.post(`${API_URL}/admin/notifications/send-subscribed`, notificationData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  sendToUser: async (userId, notificationData) => {
    const token = localStorage.getItem('adminToken');
    const response = await axios.post(`${API_URL}/admin/notifications/send-user`, {
      userId,
      ...notificationData
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  getHistory: async () => {
    const token = localStorage.getItem('adminToken');
    const response = await axios.get(`${API_URL}/admin/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  getRecipients: async (notificationId) => {
    const token = localStorage.getItem('adminToken');
    const response = await axios.get(`${API_URL}/admin/notifications/${notificationId}/recipients`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};

export default adminNotificationService;
