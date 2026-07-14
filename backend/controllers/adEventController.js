const AdEvent = require('../models/AdEvent');

const ALLOWED_EVENT_TYPES = new Set([
    'request', 'loaded', 'impression', 'started', 'first_quartile', 'midpoint',
    'third_quartile', 'complete', 'skipped', 'clicked', 'error', 'empty'
]);

const sanitizeEvent = (raw, req) => {
    if (!raw || typeof raw !== 'object') return null;
    const eventType = String(raw.eventType || '').toLowerCase();
    if (!ALLOWED_EVENT_TYPES.has(eventType)) return null;

    const str = (v, max = 300) => (typeof v === 'string' ? v.slice(0, max) : '');
    return {
        platform: ['web', 'android', 'ios'].includes(raw.platform) ? raw.platform : 'web',
        surface: str(raw.surface, 40) || 'watch',
        eventType,
        adBreakId: str(raw.adBreakId, 60),
        contentId: str(raw.contentId, 60),
        errorCode: str(raw.errorCode, 40),
        errorMessage: str(raw.errorMessage, 500),
        sessionId: str(raw.sessionId, 80),
        userAgent: str(req.headers['user-agent'], 300)
    };
};

// @desc    Record one or more ad lifecycle events (batched by the client)
// @route   POST /api/ad-events
// @access  Public (fired by players; sendBeacon-compatible, always returns 204)
const recordAdEvents = async (req, res) => {
    try {
        const rawEvents = Array.isArray(req.body?.events) ? req.body.events : [req.body];
        const events = rawEvents.slice(0, 50).map((e) => sanitizeEvent(e, req)).filter(Boolean);
        if (events.length) {
            await AdEvent.insertMany(events, { ordered: false });
        }
    } catch (error) {
        // Never fail the player over analytics; swallow and return success.
    }
    res.status(204).end();
};

// @desc    Aggregate ad performance stats (impressions, fill rate, quartiles, errors)
// @route   GET /api/ad-events/stats?days=7
// @access  Private (Admin only)
const getAdEventStats = async (req, res) => {
    try {
        const days = Math.min(Math.max(parseInt(req.query.days) || 7, 1), 90);
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const match = { createdAt: { $gte: since } };

        const [byType, byError, byDay] = await Promise.all([
            AdEvent.aggregate([
                { $match: match },
                { $group: { _id: { eventType: '$eventType', platform: '$platform' }, count: { $sum: 1 } } }
            ]),
            AdEvent.aggregate([
                { $match: { ...match, eventType: 'error' } },
                { $group: { _id: '$errorCode', count: { $sum: 1 }, lastMessage: { $last: '$errorMessage' } } },
                { $sort: { count: -1 } },
                { $limit: 20 }
            ]),
            AdEvent.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: {
                            day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                            eventType: '$eventType'
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.day': 1 } }
            ])
        ]);

        const totals = {};
        for (const row of byType) {
            totals[row._id.eventType] = (totals[row._id.eventType] || 0) + row.count;
        }
        const requests = totals.request || 0;
        const impressions = totals.impression || 0;
        const starts = totals.started || 0;

        res.status(200).json({
            success: true,
            data: {
                rangeDays: days,
                totals,
                fillRate: requests ? +(impressions / requests * 100).toFixed(2) : null,
                completionRate: starts ? +((totals.complete || 0) / starts * 100).toFixed(2) : null,
                quartiles: {
                    started: starts,
                    firstQuartile: totals.first_quartile || 0,
                    midpoint: totals.midpoint || 0,
                    thirdQuartile: totals.third_quartile || 0,
                    complete: totals.complete || 0
                },
                errors: byError.map((e) => ({ code: e._id || 'unknown', count: e.count, lastMessage: e.lastMessage })),
                byPlatform: byType.map((r) => ({ platform: r._id.platform, eventType: r._id.eventType, count: r.count })),
                daily: byDay.map((r) => ({ day: r._id.day, eventType: r._id.eventType, count: r.count }))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { recordAdEvents, getAdEventStats };
