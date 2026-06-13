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

const darmaaSectionService = {
    getAllSections: async () => {
        const response = await fetch(`${API_URL}/admin/darmaa-sections`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch Darmaa sections');
        return data.data;
    },

    createSection: async (sectionData) => {
        const response = await fetch(`${API_URL}/admin/darmaa-sections`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(sectionData)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to create Darmaa section');
        return data.data;
    },

    updateSection: async (id, sectionData) => {
        const response = await fetch(`${API_URL}/admin/darmaa-sections/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(sectionData)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to update Darmaa section');
        return data.data;
    },

    deleteSection: async (id) => {
        const response = await fetch(`${API_URL}/admin/darmaa-sections/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to delete Darmaa section');
        return data;
    }
};

export default darmaaSectionService;
