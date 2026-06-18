/**
 * Console Manager
 * Override global console methods to filter and show only ads-related logs.
 * This can be easily toggled on/off using the configuration below.
 */

// Toggle to true to suppress all logs except those related to advertisements/promotions.
// Set to false to restore default browser console behavior.
export const SHOW_ONLY_ADS_LOGS = true;

// Define what keywords qualify a log statement as ads/promotions related.
const ADS_KEYWORDS = ['ad', 'ads', 'promo', 'promotion', 'sponsor', 'advertise', 'carousel', 'advertisement'];

if (typeof window !== 'undefined') {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

    // Helper to determine if the arguments contain any ads-related keywords
    const isAdsRelated = (args) => {
        if (!SHOW_ONLY_ADS_LOGS) return true;

        return args.some(arg => {
            if (typeof arg === 'string') {
                const lower = arg.toLowerCase();
                return ADS_KEYWORDS.some(keyword => lower.includes(keyword));
            }
            if (typeof arg === 'object' && arg !== null) {
                try {
                    const str = JSON.stringify(arg).toLowerCase();
                    return ADS_KEYWORDS.some(keyword => str.includes(keyword));
                } catch (e) {
                    return false;
                }
            }
            return false;
        });
    };

    console.log = function (...args) {
        if (isAdsRelated(args)) {
            originalLog.apply(console, args);
        }
    };

    console.warn = function (...args) {
        if (isAdsRelated(args)) {
            originalWarn.apply(console, args);
        }
    };

    console.error = function (...args) {
        if (isAdsRelated(args)) {
            originalError.apply(console, args);
        }
    };

    console.info = function (...args) {
        if (isAdsRelated(args)) {
            originalInfo.apply(console, args);
        }
    };
}
