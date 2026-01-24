import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
const API_Base = rawApiUrl.replace(/\/$/, '').endsWith('/api') ? rawApiUrl.replace(/\/$/, '') : `${rawApiUrl.replace(/\/$/, '')}/api`;
const API_URL = `${API_Base}/upload`;

const uploadFile = async (file, type = 'image') => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        const token = localStorage.getItem('adminToken');
        const config = {
            headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${token}`
            }
        };

        const response = await axios.post(API_URL, formData, config);
        return response.data;
    } catch (error) {
        console.error('File upload failed', error);
        throw error;
    }
};

export default {
    uploadFile
};
