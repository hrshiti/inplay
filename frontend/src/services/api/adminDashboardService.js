const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

const adminDashboardService = {
    async getDashboardAnalytics(startDate, endDate) {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found');

        let url = `${API_URL}/admin/analytics/dashboard`;
        if (startDate && endDate) {
            url += `?startDate=${startDate}&endDate=${endDate}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch dashboard analytics');
        }

        return data.data;
    }
};

export default adminDashboardService;
