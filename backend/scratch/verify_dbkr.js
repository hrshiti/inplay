require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const http = require('http');
const https = require('https');

async function checkUrl(url) {
    if (!url) return 'MISSING';
    try {
        const res = await fetch(url, { method: 'HEAD' });
        return res.ok ? 'EXISTS' : `HTTP ${res.status}`;
    } catch (e) {
        return 'ERROR';
    }
}

async function runAudit() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const coll = mongoose.connection.db.collection('quickbytes');
        const qbs = await coll.find({
            $or: [
                { 'episodes.url': { $regex: 'DBKR_EP_' } },
                { 'episodes.video.url': { $regex: 'DBKR_EP_' } }
            ]
        }).toArray();

        const results = [];

        for (const qb of qbs) {
            if (!qb.episodes) continue;
            let epNum = 1;
            for (const ep of qb.episodes) {
                const epUrl = ep.video ? ep.video.url : ep.url;
                const epHls = ep.video ? ep.video.hls_url : ep.hls_url;
                const epS3 = ep.video ? ep.video.s3_url : ep.s3_url;

                if (epUrl && epUrl.includes('DBKR_EP_')) {
                    const hlsStatus = await checkUrl(epHls);
                    const s3Status = await checkUrl(epS3);

                    // Extract filename
                    const filename = epUrl.split('/').pop();

                    results.push({
                        title: qb.title,
                        episode: epNum,
                        filename: filename,
                        url: epUrl,
                        hlsUrl: epHls,
                        s3Url: epS3,
                        hlsStatus,
                        s3Status,
                        safeToDelete: (hlsStatus === 'EXISTS' && s3Status === 'EXISTS')
                    });
                }
                epNum++;
            }
        }

        console.log(JSON.stringify(results, null, 2));
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

runAudit();
