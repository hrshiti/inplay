import { io } from 'socket.io-client';

const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api';

const getSocketUrl = (apiUrl) => {
    try {
        const url = new URL(apiUrl);
        return `${url.protocol}//${url.host}`;
    } catch (e) {
        return apiUrl.split('/api')[0];
    }
};

const SOCKET_URL = getSocketUrl(rawApiUrl);

let socket = null;

const socketService = {
    connect(userId) {
        if (!socket) {
            console.log('🔌 [Socket] Connecting to:', SOCKET_URL);
            socket = io(SOCKET_URL, {
                autoConnect: true,
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelay: 2000,
                transports: ['polling', 'websocket'], // Start with polling (more stable for mobile init)
                upgrade: true, // Upgrade to websocket when possible
                forceNew: true, 
                timeout: 30000,
            });

            socket.on('connect', () => {
                console.log('🔌 [Socket] Connected successfully! ID:', socket.id);
                if (userId) {
                    this.registerUser(userId);
                }
            });

            socket.on('connect_error', (error) => {
                console.error('🔌 [Socket] Connection Error:', error.message);
            });

            socket.on('disconnect', (reason) => {
                console.log('🔌 [Socket] Disconnected. Reason:', reason);
            });

            socket.on('force_logout_all', (data) => {
                console.log('🚫 [Socket] EVENT: force_logout_all received');
                this.handleForceLogout(data.message || 'FORCE_LOGOUT_ALL');
            });

            socket.on('force_logout', (data) => {
                console.log('🚫 [Socket] EVENT: force_logout received');
                this.handleForceLogout(data.message || 'FORCE_LOGOUT');
            });
        }
        return socket;
    },

    registerUser(userId) {
        if (socket && userId) {
            socket.emit('register', userId);
            console.log('🔌 [Socket] Registered user room:', userId);
        }
    },

    disconnect() {
        if (socket) {
            socket.disconnect();
            socket = null;
        }
    },

    getSocket() {
        return socket;
    },

    handleForceLogout(message) {
        console.log('🚨 [Socket] Triggering Force Logout Cleanup');
        
        // Comprehensive list of keys to clear (matching authService.logout + extras)
        const keysToRemove = [
            'inplay_token', 'inplay_current_user', 
            'adminToken', 'adminUser', 'adminAuthenticated',
            'token', 'user',
            'fcm_token_registered', 'fcm_platform', 'fcm_user_id',
            'inplay_quickbyte_progress'
        ];
        
        try {
            keysToRemove.forEach(k => localStorage.removeItem(k));
            console.log('✅ [Socket] LocalStorage cleared');
        } catch (e) {
            console.error('❌ [Socket] Storage clear failed:', e);
            localStorage.clear(); // Nuclear option
        }
        
        // Trigger a custom event for the UI to react
        window.dispatchEvent(new CustomEvent('inplay_force_logout', { detail: { message } }));
        
        // Determine redirect path (Admin vs User)
        const isAdmin = window.location.pathname.startsWith('/admin');
        const redirectPath = isAdmin ? '/admin/login' : '/login';
        const finalUrl = `${redirectPath}?reason=${encodeURIComponent(message)}`;
        
        console.log('🚀 [Socket] Redirecting to:', finalUrl);

        // For Flutter WebView, we use a more aggressive redirection
        setTimeout(() => {
            window.location.replace(finalUrl);
            // Fallback for tricky WebViews
            setTimeout(() => {
                if (window.location.pathname !== redirectPath) {
                    window.location.href = finalUrl;
                }
            }, 500);
        }, 100);
    }
};

export default socketService;
