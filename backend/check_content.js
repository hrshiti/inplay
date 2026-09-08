const mongoose = require('mongoose');

require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;

const QuickByteSchema = new mongoose.Schema({
    title: String,
    video: {
        url: String,
        hls_url: String,
        s3_url: String
    },
    status: String,
    isActive: { type: Boolean, default: true },
    createdAt: Date,
    updatedAt: Date
}, { collection: 'quickbytes' });

const DarmaaSectionSchema = new mongoose.Schema({
    title: String,
    isActive: { type: Boolean, default: true },
    videos: [mongoose.Schema.Types.ObjectId],
    createdAt: Date,
    updatedAt: Date
}, { collection: 'darmassections' });

const QuickByte = mongoose.model('QuickByte', QuickByteSchema);
const DarmaaSection = mongoose.model('DarmaaSection', DarmaaSectionSchema);

const checkContent = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB Connected\n');

        // QuickByte Status
        console.log('═══════════════════════════════════════');
        console.log('📹 QUICKBYTE STATUS');
        console.log('═══════════════════════════════════════\n');

        const qbTotal = await QuickByte.countDocuments({});
        const qbActive = await QuickByte.countDocuments({ isActive: true });
        const qbInactive = await QuickByte.countDocuments({ isActive: false });
        const qbPublished = await QuickByte.countDocuments({ status: 'published' });
        const qbDraft = await QuickByte.countDocuments({ status: 'draft' });
        const qbScheduled = await QuickByte.countDocuments({ status: 'scheduled' });

        console.log(`Total Records          : ${qbTotal}`);
        console.log(`Active (isActive:true) : ${qbActive}`);
        console.log(`Inactive (isActive:false) : ${qbInactive}`);
        console.log(`Status = Published     : ${qbPublished}`);
        console.log(`Status = Draft         : ${qbDraft}`);
        console.log(`Status = Scheduled     : ${qbScheduled}`);

        if (qbTotal > 0) {
            console.log('\n✅ QuickByte records EXIST in database');
            const sample = await QuickByte.findOne().lean();
            console.log('\n📄 Sample Record:');
            console.log(`  Title: ${sample.title}`);
            console.log(`  Status: ${sample.status}`);
            console.log(`  IsActive: ${sample.isActive}`);
            console.log(`  Created: ${sample.createdAt}`);
        } else {
            console.log('\n❌ NO QuickByte records found');
        }

        // DarmaaSection Status
        console.log('\n═══════════════════════════════════════');
        console.log('🎭 DARMAA SECTION STATUS');
        console.log('═══════════════════════════════════════\n');

        const dsTotal = await DarmaaSection.countDocuments({});
        const dsActive = await DarmaaSection.countDocuments({ isActive: true });
        const dsInactive = await DarmaaSection.countDocuments({ isActive: false });

        console.log(`Total Records          : ${dsTotal}`);
        console.log(`Active (isActive:true) : ${dsActive}`);
        console.log(`Inactive (isActive:false) : ${dsInactive}`);

        if (dsTotal > 0) {
            console.log('\n✅ DarmaaSection records EXIST in database');
            const sample = await DarmaaSection.findOne().lean();
            console.log('\n📄 Sample Record:');
            console.log(`  Title: ${sample.title}`);
            console.log(`  IsActive: ${sample.isActive}`);
            console.log(`  Videos Count: ${(sample.videos || []).length}`);
            console.log(`  Created: ${sample.createdAt}`);
        } else {
            console.log('\n❌ NO DarmaaSection records found');
        }

        // Recovery Options
        console.log('\n═══════════════════════════════════════');
        console.log('🔄 RECOVERY OPTIONS');
        console.log('═══════════════════════════════════════\n');

        if (qbInactive > 0) {
            console.log(`✅ ${qbInactive} QuickByte record(s) found with isActive=false`);
            console.log('   → Can be recovered by setting isActive=true\n');
        }

        if (dsInactive > 0) {
            console.log(`✅ ${dsInactive} DarmaaSection record(s) found with isActive=false`);
            console.log('   → Can be recovered by setting isActive=true\n');
        }

        if (qbTotal === 0 && dsTotal === 0) {
            console.log('❌ Database completely empty for both collections');
            console.log('   → Check git history for deletion timeline\n');
        }

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

checkContent();
