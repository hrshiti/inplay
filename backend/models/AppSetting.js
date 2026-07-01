const mongoose = require('mongoose');

const appSettingSchema = new mongoose.Schema({
    helpCenter: {
        chatSupportText: {
            type: String,
            default: 'Need assistance? Our support team is here to help you 24/7.'
        },
        faqs: [
            {
                question: { type: String, required: true },
                answer: { type: String, required: true }
            }
        ]
    },
    privacyPolicy: {
        content: {
            type: String,
            default: 'InPlay privacy policy content goes here.'
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    },
    aboutInPlay: {
        description: {
            type: String,
            default: 'InPlay is the next generation streaming platform.'
        },
        version: {
            type: String,
            default: '1.0.0'
        },
        website: {
            type: String,
            default: 'www.inplay.com'
        },
        twitter: {
            type: String,
            default: '@InPlayHQ'
        },
        instagram: {
            type: String,
            default: '@inplay_official'
        }
    },
    subscriptionSettings: {
        trialPrice: {
            type: Number,
            default: 9
        },
        trialDurationDays: {
            type: Number,
            default: 4
        },
        isTrialActive: {
            type: Boolean,
            default: true
        },
        promoVideoUrl: {
            type: String,
            default: ''
        },
        promoVideoHlsUrl: {
            type: String,
            default: ''
        },
        promoVideoThumbnail: {
            type: String,
            default: ''
        }
    },
    adSettings: {
        interstitialEnabled: {
            type: Boolean,
            default: true
        },
        skipAdsForPremium: {
            type: Boolean,
            default: true
        },
        androidAdUnitId: {
            type: String,
            default: ''
        },
        iosAdUnitId: {
            type: String,
            default: ''
        },
        cooldownMinutes: {
            type: Number,
            default: 3
        },
        maxAdsPerSession: {
            type: Number,
            default: 6
        },
        maxAdsPerDay: {
            type: Number,
            default: 15
        },
        watchIntervalMinutes: {
            type: Number,
            default: 12
        },
        shortsSwipeInterval: {
            type: Number,
            default: 10
        },
        midRoll: {
            enabled: {
                type: Boolean,
                default: false
            },
            adsPerVideo: {
                type: Number,
                default: 2
            },
            minVideoDurationSeconds: {
                type: Number,
                default: 300
            },
            preRollEnabled: {
                type: Boolean,
                default: false
            },
            postRollEnabled: {
                type: Boolean,
                default: false
            },
            // VAST tag used for every ad break. Defaults to Google's public IMA
            // sample tag so mid-roll works out of the box for testing. Replace
            // with your real Google Ad Manager video ad unit tag before going live.
            vastTagUrl: {
                type: String,
                default: 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_preroll_skippable&sz=640x480&ciu_szs=300x250&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator='
            }
        }
    }
}, { timestamps: true });

module.exports = mongoose.model('AppSetting', appSettingSchema);
