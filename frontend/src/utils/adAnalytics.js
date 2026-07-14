import { analytics } from '../firebase';

const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api';
const API_BASE = rawApiUrl.replace(/\/$/, '').endsWith('/api')
    ? rawApiUrl.replace(/\/$/, '')
    : `${rawApiUrl.replace(/\/$/, '')}/api`;

const AD_EVENTS_URL = `${API_BASE}/ad-events`;

const getSessionId = () => {
    try {
        let id = sessionStorage.getItem('inplay_ad_session');
        if (!id) {
            id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
            sessionStorage.setItem('inplay_ad_session', id);
        }
        return id;
    } catch {
        return 'no-session';
    }
};

let queue = [];
let flushTimer = null;

const flush = () => {
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
    if (!queue.length) return;
    const payload = JSON.stringify({ events: queue.splice(0, queue.length) });

    try {
        // sendBeacon survives page unloads (mid-roll → user closes tab)
        const sent = navigator.sendBeacon?.(
            AD_EVENTS_URL,
            new Blob([payload], { type: 'application/json' })
        );
        if (!sent) {
            fetch(AD_EVENTS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
                keepalive: true
            }).catch(() => {});
        }
    } catch {
        // Analytics must never break playback.
    }
};

if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flush();
    });
}

/**
 * Records a video-ad lifecycle event (request/impression/quartiles/error/...)
 * to the backend (/api/ad-events, batched via sendBeacon) and mirrors it to
 * GA4 through Firebase Analytics as `video_ad_<eventType>`.
 */
export const trackAdEvent = (eventType, data = {}) => {
    const event = {
        platform: 'web',
        eventType,
        sessionId: getSessionId(),
        surface: data.surface || 'watch',
        adBreakId: data.adBreakId || '',
        contentId: data.contentId || '',
        errorCode: data.errorCode != null ? String(data.errorCode) : '',
        errorMessage: data.errorMessage || ''
    };

    queue.push(event);
    if (queue.length >= 10) flush();
    else if (!flushTimer) flushTimer = setTimeout(flush, 5000);

    try {
        if (analytics) {
            // Lazy import keeps firebase/analytics out of the critical path
            import('firebase/analytics').then(({ logEvent }) => {
                logEvent(analytics, `video_ad_${eventType}`, {
                    ad_break_id: event.adBreakId,
                    content_id: event.contentId,
                    error_code: event.errorCode
                });
            }).catch(() => {});
        }
    } catch {
        // GA4 mirror is best-effort only.
    }
};
