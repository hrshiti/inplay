const cron = require('node-cron');
const Content = require('../models/Content');
const QuickByte = require('../models/QuickByte');

const publishScheduledContent = async () => {
    try {
        const now = new Date();
        
        // Update Content
        const contentResult = await Content.updateMany(
            { status: 'scheduled', publishAt: { $lte: now } },
            { $set: { status: 'published' } }
        );

        if (contentResult.modifiedCount > 0) {
            console.log(`✅ [Publish Cron] Automatically published ${contentResult.modifiedCount} scheduled Content items.`);
        }

        // Update QuickBytes
        const qbResult = await QuickByte.updateMany(
            { status: 'scheduled', publishAt: { $lte: now } },
            { $set: { status: 'published' } }
        );

        if (qbResult.modifiedCount > 0) {
            console.log(`✅ [Publish Cron] Automatically published ${qbResult.modifiedCount} scheduled QuickByte items.`);
        }
    } catch (err) {
        console.error('🔥 [Publish Cron Error]:', err.message);
    }
};

const startContentPublishCron = () => {
    console.log('🚀 [Publish Cron] Initialized and running every 1 minute to check for scheduled content.');
    cron.schedule('*/1 * * * *', publishScheduledContent);
};

module.exports = { startContentPublishCron };
