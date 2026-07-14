const mongoose = require('mongoose');

// One row per ad lifecycle event reported by the web player (IMA SDK) or the
// Flutter app (AdMob). Powers the admin ad-performance stats endpoint
// (impressions, fill rate, quartile completion, error breakdown).
const adEventSchema = new mongoose.Schema({
    platform: {
        type: String,
        enum: ['web', 'android', 'ios', 'unknown'],
        default: 'web'
    },
    surface: {
        type: String, // 'watch' | 'shorts' | 'interstitial' | 'native'
        default: 'watch'
    },
    eventType: {
        type: String,
        required: true,
        index: true
        // request | loaded | impression | started | first_quartile | midpoint |
        // third_quartile | complete | skipped | clicked | error | empty
    },
    adBreakId: { type: String, default: '' },   // preroll | midroll-N | postroll (VMAP breakId)
    contentId: { type: String, default: '' },
    errorCode: { type: String, default: '' },
    errorMessage: { type: String, default: '' },
    sessionId: { type: String, default: '', index: true },
    userAgent: { type: String, default: '' }
}, { timestamps: true });

adEventSchema.index({ createdAt: -1 });
adEventSchema.index({ eventType: 1, createdAt: -1 });

module.exports = mongoose.model('AdEvent', adEventSchema);
