import socketService from '../services/socketService';

export const authenticatedFetch = async (url, options = {}) => {
    const token = localStorage.getItem('inplay_token');
    
    const headers = {
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401) {
        const data = await response.clone().json().catch(() => ({}));
        if (data.message === 'FORCE_LOGOUT') {
            console.warn('🚨 [API] Force logout detected from server');
            socketService.handleForceLogout(data.reason || 'Session expired');
        }
    }

    return response;
};
