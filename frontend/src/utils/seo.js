const DEFAULT_TITLE = 'InPlay — Watch Movies, Web Series, Shorts & Audio Series Online';
const DEFAULT_DESCRIPTION =
    'InPlay is an OTT streaming platform for original movies, web series, Bhojpuri entertainment, quick-bite shorts and audio series.';

const ROUTE_META = [
    { match: /^\/$/, title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION },
    { match: /^\/about/, title: 'About InPlay — OTT Streaming Platform', description: 'Learn about InPlay, the streaming platform for original movies, web series, shorts and audio series.' },
    { match: /^\/privacy/, title: 'Privacy Policy — InPlay', description: 'How InPlay collects, uses and protects your personal data.' },
    { match: /^\/help/, title: 'Help Center & Contact — InPlay', description: 'Get support, FAQs and contact options for the InPlay streaming platform.' },
    { match: /^\/plan/, title: 'Subscription Plans — InPlay', description: 'Choose an InPlay subscription for the full catalog and an ad-free experience.' },
    { match: /^\/(movie|watch|details)\//, title: null, description: null } // set dynamically by the details page
];

/** Sets document.title and the meta description for the current view. */
export const setPageMeta = (title, description) => {
    document.title = title || DEFAULT_TITLE;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', description || DEFAULT_DESCRIPTION);
};

/** Applies the static route → title/description mapping (call on route change). */
export const applyRouteMeta = (pathname) => {
    const entry = ROUTE_META.find((r) => r.match.test(pathname));
    if (entry && entry.title === null) return; // dynamic page manages its own meta
    setPageMeta(entry?.title, entry?.description);
};
