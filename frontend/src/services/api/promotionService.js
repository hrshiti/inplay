import axios from 'axios';

const API_Base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
const API_URL = `${API_Base}/promotions`;

// Get active promotions (Public)
const getActivePromotions = async (location) => {
    try {
        const url = location ? `${API_URL}/active?location=${location}` : `${API_URL}/active`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching active promotions', error);
        throw error;
    }
};

// Get all promotions (Admin)
const getAllPromotions = async () => {
    try {
        const token = localStorage.getItem('adminToken');
        const config = {
            headers: {
                Authorization: `Bearer ${token}`
            }
        };
        const response = await axios.get(`${API_URL}/all`, config);
        return response.data;
    } catch (error) {
        console.error('Error fetching all promotions', error);
        throw error;
    }
};

// Create promotion (Admin)
const createPromotion = async (promotionData) => {
    const token = localStorage.getItem('adminToken');
    const config = {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    const response = await axios.post(API_URL, promotionData, config);
    return response.data;
};

// Update promotion (Admin)
const updatePromotion = async (id, promotionData) => {
    const token = localStorage.getItem('adminToken');
    const config = {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    const response = await axios.put(`${API_URL}/${id}`, promotionData, config);
    return response.data;
};

// Delete promotion (Admin)
const deletePromotion = async (id) => {
    const token = localStorage.getItem('adminToken');
    const config = {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
    const response = await axios.delete(`${API_URL}/${id}`, config);
    return response.data;
};

export default {
    getActivePromotions,
    getAllPromotions,
    createPromotion,
    updatePromotion,
    deletePromotion
};
