const IMA_SDK_URL = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js';

let loadPromise = null;

/** Loads Google's IMA HTML5 SDK script once and resolves with window.google.ima. */
export const loadImaSdk = () => {
  if (window.google?.ima) return Promise.resolve(window.google.ima);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = IMA_SDK_URL;
    script.async = true;
    script.onload = () => {
      if (window.google?.ima) resolve(window.google.ima);
      else reject(new Error('IMA SDK loaded but window.google.ima is missing'));
    };
    script.onerror = () => reject(new Error('Failed to load IMA SDK script'));
    document.head.appendChild(script);
  });

  return loadPromise;
};

const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api';
const API_Base = rawApiUrl.replace(/\/$/, '').endsWith('/api') ? rawApiUrl.replace(/\/$/, '') : `${rawApiUrl.replace(/\/$/, '')}/api`;

/** Builds the VMAP ad-tag URL for a given content duration (in seconds). */
export const getVmapTagUrl = (durationSeconds) =>
  `${API_Base}/vmap?duration=${Math.floor(durationSeconds || 0)}`;
