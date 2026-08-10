// READ-ONLY audit. No writes, no deletes, no file removal.
// Reports how many published items across all local-video-storing collections
// have a confirmed hls_url (safe to reclaim raw local file later) vs. missing
// hls_url (must NOT have their raw local file touched - they may depend on it).
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Content = require('../models/Content');
const QuickByte = require('../models/QuickByte');
const ForYou = require('../models/ForYou');
const Banner = require('../models/Banner');
const Promotion = require('../models/Promotion');

const line = () => console.log('-'.repeat(60));

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // ---------- QuickByte (main video) ----------
    line();
    console.log('QUICKBYTE - main video');
    const qbTotal = await QuickByte.countDocuments({ 'video.url': { $exists: true, $ne: '' } });
    const qbWithHLS = await QuickByte.countDocuments({ 'video.hls_url': { $exists: true, $ne: '' } });
    const qbMissing = await QuickByte.find({ 'video.url': { $exists: true, $ne: '' }, 'video.hls_url': { $in: [null, ''] } })
        .select('title status createdAt').lean();
    console.log(`Total with a video: ${qbTotal} | With hls_url: ${qbWithHLS} | Missing hls_url: ${qbMissing.length}`);
    if (qbMissing.length) {
        console.log('  Items missing hls_url (raw file is their ONLY playable copy - do not touch):');
        qbMissing.forEach(d => console.log(`   - [${d.status}] ${d.title} (${d._id}) created ${d.createdAt?.toISOString()}`));
    }

    // ---------- QuickByte episodes ----------
    const qbEpisodeAgg = await QuickByte.aggregate([
        { $unwind: '$episodes' },
        { $match: { 'episodes.url': { $exists: true, $ne: '' } } },
        { $group: {
            _id: null,
            total: { $sum: 1 },
            withHLS: { $sum: { $cond: [{ $and: [{ $ne: ['$episodes.hls_url', null] }, { $ne: ['$episodes.hls_url', ''] }] }, 1, 0] } }
        } }
    ]);
    if (qbEpisodeAgg.length) {
        const { total, withHLS } = qbEpisodeAgg[0];
        console.log(`Episodes total: ${total} | With hls_url: ${withHLS} | Missing hls_url: ${total - withHLS}`);
    } else {
        console.log('Episodes total: 0');
    }

    // ---------- ForYou ----------
    line();
    console.log('FORYOU - main video');
    const fyTotal = await ForYou.countDocuments({ 'video.url': { $exists: true, $ne: '' } });
    const fyWithHLS = await ForYou.countDocuments({ 'video.hls_url': { $exists: true, $ne: '' } });
    const fyMissing = await ForYou.find({ 'video.url': { $exists: true, $ne: '' }, 'video.hls_url': { $in: [null, ''] } })
        .select('title status createdAt').lean();
    console.log(`Total with a video: ${fyTotal} | With hls_url: ${fyWithHLS} | Missing hls_url: ${fyMissing.length}`);
    if (fyMissing.length) {
        console.log('  Items missing hls_url (raw file is their ONLY playable copy - do not touch):');
        fyMissing.forEach(d => console.log(`   - [${d.status}] ${d.title} (${d._id}) created ${d.createdAt?.toISOString()}`));
    }

    // ---------- Content (movies) ----------
    line();
    console.log('CONTENT - main video (movies)');
    const cTotal = await Content.countDocuments({ 'video.url': { $exists: true, $ne: '' } });
    const cWithHLS = await Content.countDocuments({ 'video.hls_url': { $exists: true, $ne: '' } });
    const cMissing = await Content.find({ 'video.url': { $exists: true, $ne: '' }, 'video.hls_url': { $in: [null, ''] } })
        .select('title status createdAt').lean();
    console.log(`Total with a video: ${cTotal} | With hls_url: ${cWithHLS} | Missing hls_url: ${cMissing.length}`);
    if (cMissing.length) {
        console.log('  Items missing hls_url (raw file is their ONLY playable copy - do not touch):');
        cMissing.forEach(d => console.log(`   - [${d.status}] ${d.title} (${d._id}) created ${d.createdAt?.toISOString()}`));
    }

    // ---------- Content episodes (series) ----------
    const cEpisodeAgg = await Content.aggregate([
        { $unwind: '$seasons' },
        { $unwind: '$seasons.episodes' },
        { $match: { 'seasons.episodes.video.url': { $exists: true, $ne: '' } } },
        { $group: {
            _id: null,
            total: { $sum: 1 },
            withHLS: { $sum: { $cond: [{ $and: [{ $ne: ['$seasons.episodes.video.hls_url', null] }, { $ne: ['$seasons.episodes.video.hls_url', ''] }] }, 1, 0] } }
        } }
    ]);
    if (cEpisodeAgg.length) {
        const { total, withHLS } = cEpisodeAgg[0];
        console.log(`Series episodes total: ${total} | With hls_url: ${withHLS} | Missing hls_url: ${total - withHLS}`);
    } else {
        console.log('Series episodes total: 0');
    }

    // ---------- Banner ----------
    line();
    console.log('BANNER - video banners');
    const bTotal = await Banner.countDocuments({ mediaType: 'video', mediaUrl: { $exists: true, $ne: '' } });
    const bWithHLS = await Banner.countDocuments({ mediaType: 'video', hlsUrl: { $exists: true, $ne: '' } });
    const bMissing = await Banner.find({ mediaType: 'video', mediaUrl: { $exists: true, $ne: '' }, hlsUrl: { $in: [null, ''] } })
        .select('category isActive createdAt').lean();
    console.log(`Total video banners: ${bTotal} | With hlsUrl: ${bWithHLS} | Missing hlsUrl: ${bMissing.length}`);
    if (bMissing.length) {
        bMissing.forEach(d => console.log(`   - [${d.category}] active=${d.isActive} (${d._id}) created ${d.createdAt?.toISOString()}`));
    }

    // ---------- Promotion ----------
    line();
    console.log('PROMOTION - promo videos');
    const pTotal = await Promotion.countDocuments({ promoVideoUrl: { $exists: true, $ne: '' } });
    const pWithHLS = await Promotion.countDocuments({ hls_url: { $exists: true, $ne: '' } });
    const pMissing = await Promotion.find({ promoVideoUrl: { $exists: true, $ne: '' }, hls_url: { $in: [null, ''] } })
        .select('title isActive createdAt').lean();
    console.log(`Total promo videos: ${pTotal} | With hls_url: ${pWithHLS} | Missing hls_url: ${pMissing.length}`);
    if (pMissing.length) {
        pMissing.forEach(d => console.log(`   - ${d.title} active=${d.isActive} (${d._id}) created ${d.createdAt?.toISOString()}`));
    }

    line();
    console.log('\nSUMMARY');
    console.log(`QuickByte main videos safely reclaimable (hls_url confirmed): ${qbWithHLS} / ${qbTotal}`);
    console.log(`ForYou main videos safely reclaimable:                        ${fyWithHLS} / ${fyTotal}`);
    console.log(`Content main videos safely reclaimable:                       ${cWithHLS} / ${cTotal}`);
    console.log(`Banner videos safely reclaimable:                             ${bWithHLS} / ${bTotal}`);
    console.log(`Promotion videos safely reclaimable:                          ${pWithHLS} / ${pTotal}`);
    console.log('\nNote: this only tells you what the DATABASE thinks. It does not touch or measure');
    console.log('the actual server disk - this dev machine is not the production host, so local');
    console.log('uploads/ folder sizes here are meaningless. Run an equivalent "df -h" / du check');
    console.log('directly on the production server to see real free space.');

    await mongoose.disconnect();
    process.exit(0);
};

run().catch(err => {
    console.error(err);
    process.exit(1);
});
