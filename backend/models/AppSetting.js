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
        }
    }
}, { timestamps: true });

module.exports = mongoose.model('AppSetting', appSettingSchema);
