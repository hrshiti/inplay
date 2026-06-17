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

const bhojpuriSectionService = {
    getAllSections: async () => {
        const response = await fetch(`${API_URL}/admin/bhojpuri-sections`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch Bhojpuri sections');
        return data.data;
    },

    createSection: async (sectionData) => {
        const response = await fetch(`${API_URL}/admin/bhojpuri-sections`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(sectionData)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to create Bhojpuri section');
        return data.data;
    },

    updateSection: async (id, sectionData) => {
        const response = await fetch(`${API_URL}/admin/bhojpuri-sections/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(sectionData)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to update Bhojpuri section');
        return data.data;
    },

    deleteSection: async (id) => {
        const response = await fetch(`${API_URL}/admin/bhojpuri-sections/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to delete Bhojpuri section');
        return data;
    },

    // Public method
    getActiveSections: async () => {
        // Not all services have public endpoints here, but we will add one for convenience
        // Wait, Darmaa sections didn't have this in the admin service, it was probably fetched separately.
        const response = await fetch(`${API_URL}/public/bhojpuri-sections`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch active Bhojpuri sections');
        return data.data;
    }
};

export default bhojpuriSectionService;
