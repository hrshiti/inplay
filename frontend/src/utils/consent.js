const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api';
const API_BASE = rawApiUrl.replace(/\/$/, '').endsWith('/api')
    ? rawApiUrl.replace(/\/$/, '')
    : `${rawApiUrl.replace(/\/$/, '')}/api`;

let initialized = false;

const injectFundingChoices = (publisherId) => {
    if (document.getElementById('fc-script')) return;

    const script = document.createElement('script');
    script.id = 'fc-script';
    script.async = true;
    script.src = `https://fundingchoicesmessages.google.com/i/${publisherId}?ers=1`;
    document.head.appendChild(script);

    // Google's required presence signal so the GDPR message can display
    // (standard snippet from GAM → Privacy & messaging → tag setup).
    const signal = document.createElement('script');
    signal.id = 'fc-signal';
    signal.textContent = `(function() {
        function signalGooglefcPresent() {
            if (!window.frames['googlefcPresent']) {
                if (document.body) {
                    const iframe = document.createElement('iframe');
                    iframe.style.cssText = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;';
                    iframe.style.display = 'none';
                    iframe.name = 'googlefcPresent';
                    document.body.appendChild(iframe);
                } else {
                    setTimeout(signalGooglefcPresent, 0);
                }
            }
        }
        signalGooglefcPresent();
    })();`;
    document.head.appendChild(signal);
};

/**
 * Loads Google's Funding Choices CMP (GAM "Privacy & messaging") when the
 * admin has enabled it in Admin → Settings → Consent. Required for serving
 * Google ads to EEA/UK users. No-op when disabled or unconfigured, so it is
 * always safe to call once at app startup.
 */
export const initConsent = async () => {
    if (initialized || typeof window === 'undefined') return;
    initialized = true;

    try {
        const res = await fetch(`${API_BASE}/app-settings`);
        if (!res.ok) return;
        const body = await res.json();
        const consent = body?.data?.adSettings?.consent;
        if (consent?.cmpEnabled && consent?.fundingChoicesPublisherId) {
            injectFundingChoices(consent.fundingChoicesPublisherId.trim());
        }
    } catch {
        // Settings fetch failed — skip CMP rather than blocking the app.
    }
};
