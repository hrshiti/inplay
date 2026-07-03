require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const https = require('https');
const mm = require('music-metadata');
const database = require('../config/database');
const QuickByte = require('../models/QuickByte');
const Content = require('../models/Content');

function getRemoteDuration(url) {
    return new Promise((resolve) => {
        https.get(url, async (res) => {
            try {
                if (res.statusCode !== 200 && res.statusCode !== 206) {
                    console.error(`Failed to fetch ${url}, status code: ${res.statusCode}`);
                    resolve(0);
                    return;
                }
                const metadata = await mm.parseStream(res, { mimeType: 'video/mp4' });
                resolve(metadata.format.duration || 0);
            } catch (err) {
                console.error(`Error parsing stream for ${url}:`, err.message);
                resolve(0);
            }
        }).on('error', (err) => {
            console.error(`HTTP error for ${url}:`, err.message);
            resolve(0);
        });
    });
}

async function run() {
    try {
        console.log("Connecting to database...");
        await new Promise((resolve) => {
            if (mongoose.connection.readyState === 1) resolve();
            else mongoose.connection.once('open', resolve);
        });
        console.log("Connected.");

        const cloudfrontUrl = (process.env.CLOUDFRONT_URL || 'https://d3ezguscssopmp.cloudfront.net').replace(/\/$/, '');

        // Fix QuickBytes
        const qbs = await QuickByte.find({});
        console.log(`Processing ${qbs.length} QuickBytes...`);
        for (const qb of qbs) {
            let updated = false;
            if (qb.episodes && qb.episodes.length > 0) {
                for (let i = 0; i < qb.episodes.length; i++) {
                    const ep = qb.episodes[i];
                    if (!ep.duration || ep.duration === 0) {
                        const relUrl = ep.url || '';
                        if (relUrl.startsWith('/uploads/')) {
                            // Construct S3/CloudFront URL: replace '/uploads/' with the CloudFront URL
                            const publicUrl = `${cloudfrontUrl}/${relUrl.replace('/uploads/', '')}`;
                            console.log(`Fetching remote duration for: ${publicUrl}`);
                            const dur = await getRemoteDuration(publicUrl);
                            if (dur > 0) {
                                console.log(`  -> Duration: ${Math.round(dur)}s`);
                                ep.duration = Math.round(dur);
                                updated = true;
                            } else {
                                console.log(`  -> Could not get duration`);
                            }
                        }
                    }
                }
            }
            if (updated) {
                await qb.save();
                console.log(`Saved QuickByte: ${qb.title}`);
            }
        }

        // Fix Content episodes
        const contents = await Content.find({});
        console.log(`Processing ${contents.length} Content items...`);
        for (const content of contents) {
            let updated = false;
            if (content.episodes && content.episodes.length > 0) {
                for (let i = 0; i < content.episodes.length; i++) {
                    const ep = content.episodes[i];
                    if (!ep.duration || ep.duration === 0) {
                        const relUrl = ep.url || '';
                        if (relUrl.startsWith('/uploads/')) {
                            const publicUrl = `${cloudfrontUrl}/${relUrl.replace('/uploads/', '')}`;
                            console.log(`Fetching remote duration for Content ep: ${publicUrl}`);
                            const dur = await getRemoteDuration(publicUrl);
                            if (dur > 0) {
                                console.log(`  -> Duration: ${Math.round(dur)}s`);
                                ep.duration = Math.round(dur);
                                updated = true;
                            }
                        }
                    }
                }
            }
            if (updated) {
                await content.save();
                console.log(`Saved Content: ${content.title}`);
            }
        }

        console.log("All remote durations fixed successfully.");
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

run();
