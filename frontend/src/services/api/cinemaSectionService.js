const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api';
const API_URL = rawApiUrl.replace(/\/$/, '').endsWith('/api') ? rawApiUrl.replace(/\/$/, '') : `${rawApiUrl.replace(/\/$/, '')}/api`;

const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken');
    if (!token) throw new Error('No admin token found');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

const CinemaSectionService = {
    getAllSections: async () => {
        const response = await fetch(`${API_URL}/admin/Cinema-sections`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch Cinema sections');
        return data.data;
    },

    createSection: async (sectionData) => {
        const response = await fetch(`${API_URL}/admin/Cinema-sections`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(sectionData)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to create Cinema section');
        return data.data;
    },

    updateSection: async (id, sectionData) => {
        const response = await fetch(`${API_URL}/admin/Cinema-sections/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(sectionData)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to update Cinema section');
        return data.data;
    },

    deleteSection: async (id) => {
        const response = await fetch(`${API_URL}/admin/Cinema-sections/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to delete Cinema section');
        return data;
    },

    // Public method
    getActiveSections: async () => {
        // Not all services have public endpoints here, but we will add one for convenience
        // Wait, Darmaa sections didn't have this in the admin service, it was probably fetched separately.
        const response = await fetch(`${API_URL}/public/Cinema-sections`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch active Cinema sections');
        return data.data;
    }
};

export default CinemaSectionService;
