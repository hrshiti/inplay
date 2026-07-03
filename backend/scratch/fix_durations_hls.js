require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const https = require('https');
const database = require('../config/database');
const QuickByte = require('../models/QuickByte');
const Content = require('../models/Content');

function fetchText(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Status code: ${res.statusCode}`));
                return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function getHlsDuration(masterUrl) {
    try {
        console.log(`  Fetching master playlist: ${masterUrl}`);
        const masterContent = await fetchText(masterUrl);
        // Find first child playlist
        const lines = masterContent.split('\n');
        let childPlaylist = '';
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && trimmed.endsWith('.m3u8')) {
                childPlaylist = trimmed;
                break;
            }
        }

        if (!childPlaylist) {
            console.log("  Could not find child playlist in master.m3u8");
            return 0;
        }

        // Construct child playlist URL
        const baseUrl = masterUrl.substring(0, masterUrl.lastIndexOf('/'));
        const childUrl = `${baseUrl}/${childPlaylist}`;
        console.log(`  Fetching child playlist: ${childUrl}`);
        const childContent = await fetchText(childUrl);

        // Sum EXTINF durations
        let totalDuration = 0;
        const childLines = childContent.split('\n');
        for (const line of childLines) {
            if (line.startsWith('#EXTINF:')) {
                const match = line.match(/#EXTINF:([0-9.]+)/);
                if (match) {
                    totalDuration += parseFloat(match[1]);
                }
            }
        }

        return totalDuration;
    } catch (err) {
        console.error(`  Error parsing HLS duration:`, err.message);
        return 0;
    }
}

async function run() {
    try {
        console.log("Connecting to database...");
        await new Promise((resolve) => {
            if (mongoose.connection.readyState === 1) resolve();
            else mongoose.connection.once('open', resolve);
        });
        console.log("Connected.");

        // Fix QuickBytes
        const qbs = await QuickByte.find({});
        console.log(`Processing ${qbs.length} QuickBytes...`);
        for (const qb of qbs) {
            let updated = false;
            if (qb.episodes && qb.episodes.length > 0) {
                console.log(`QuickByte: ${qb.title}`);
                for (let i = 0; i < qb.episodes.length; i++) {
                    const ep = qb.episodes[i];
                    if (!ep.duration || ep.duration === 0) {
                        const hlsUrl = ep.hls_url || '';
                        if (hlsUrl && hlsUrl.startsWith('http')) {
                            console.log(`Episode ${i + 1}: ${ep.title || 'Untitled'}`);
                            const dur = await getHlsDuration(hlsUrl);
                            if (dur > 0) {
                                console.log(`  -> Calculated Duration: ${Math.round(dur)}s`);
                                ep.duration = Math.round(dur);
                                updated = true;
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
                console.log(`Content: ${content.title}`);
                for (let i = 0; i < content.episodes.length; i++) {
                    const ep = content.episodes[i];
                    if (!ep.duration || ep.duration === 0) {
                        const hlsUrl = ep.hls_url || '';
                        if (hlsUrl && hlsUrl.startsWith('http')) {
                            console.log(`Episode ${i + 1}: ${ep.title || 'Untitled'}`);
                            const dur = await getHlsDuration(hlsUrl);
                            if (dur > 0) {
                                console.log(`  -> Calculated Duration: ${Math.round(dur)}s`);
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

        console.log("All HLS durations fixed successfully.");
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

run();
