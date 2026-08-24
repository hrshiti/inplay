require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function checkUrl(url) {
    if (!url) return 'MISSING';
    try {
        const res = await fetch(url, { method: 'HEAD' });
        return res.ok ? 'EXISTS' : `HTTP ${res.status}`;
    } catch (e) {
        return 'ERROR';
    }
}

async function runPhase6() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const coll = mongoose.connection.db.collection('quickbytes');
        const qbs = await coll.find({}).limit(5).toArray();

        for (let i = 0; i < qbs.length; i++) {
            const qb = qbs[i];
            console.log(`QuickByte ${i+1}: ${qb.title}`);
            if (qb.video) {
                const hlsExists = await checkUrl(qb.video.hls_url);
                const s3Exists = await checkUrl(qb.video.s3_url);
                console.log(`  Main Video:`);
                console.log(`    HLS: ${qb.video.hls_url || 'N/A'} -> ${hlsExists}`);
                console.log(`    Original S3: ${qb.video.s3_url || 'N/A'} -> ${s3Exists}`);
            }
            if (qb.episodes && qb.episodes.length > 0) {
                const ep = qb.episodes[0]; // just check first episode
                let hlsUrl = ep.video ? ep.video.hls_url : ep.hls_url;
                let s3Url = ep.video ? ep.video.s3_url : ep.s3_url;
                const hlsExists = await checkUrl(hlsUrl);
                const s3Exists = await checkUrl(s3Url);
                console.log(`  First Episode:`);
                console.log(`    HLS: ${hlsUrl || 'N/A'} -> ${hlsExists}`);
                console.log(`    Original S3: ${s3Url || 'N/A'} -> ${s3Exists}`);
            }
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

runPhase6();
