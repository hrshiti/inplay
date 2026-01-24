const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
const API_URL = rawApiUrl.replace(/\/$/, '').endsWith('/api') ? rawApiUrl.replace(/\/$/, '') : `${rawApiUrl.replace(/\/$/, '')}/api`;

// Helper for making authorized requests
const authFetch = async (endpoint, options = {}) => {
    const token = localStorage.getItem('inplay_token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json();
    if (!data.success && !response.ok) {
        throw new Error(data.message || 'Request failed');
    }
    return data;
};

const paymentService = {
    // Create Content Purchase Order
    createContentOrder: async (contentId) => {
        const data = await authFetch('/payment/create-content-order', {
            method: 'POST',
            body: JSON.stringify({ contentId }),
        });
        return data.data; // Expecting { order, content }
    },

    // Verify Content Payment
    verifyContentPayment: async (paymentData) => {
        const data = await authFetch('/payment/verify-content-payment', {
            method: 'POST',
            body: JSON.stringify(paymentData),
        });
        return data.data;
    },

    // Get Payment History
    getHistory: async (limit = 10) => {
        const data = await authFetch(`/payment/history?limit=${limit}`, {
            method: 'GET',
        });
        return data.data;
    }
};

export default paymentService;
