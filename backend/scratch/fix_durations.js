require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const mm = require('music-metadata');
const database = require('../config/database');
const QuickByte = require('../models/QuickByte');
const Content = require('../models/Content'); // We can fix Content episodes too!

async function getDuration(filePath) {
    try {
        const metadata = await mm.parseFile(filePath);
        return metadata.format.duration || 0;
    } catch (err) {
        console.error(`Error parsing metadata for ${filePath}:`, err.message);
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
                for (let i = 0; i < qb.episodes.length; i++) {
                    const ep = qb.episodes[i];
                    if (!ep.duration || ep.duration === 0) {
                        // Resolve file path
                        const urlPath = ep.url || '';
                        if (urlPath.startsWith('/uploads/')) {
                            const relPath = urlPath.replace('/uploads/', '');
                            const absPath = path.join(__dirname, '../uploads', relPath);
                            if (fs.existsSync(absPath)) {
                                console.log(`Reading duration for: ${absPath}`);
                                const dur = await getDuration(absPath);
                                if (dur > 0) {
                                    console.log(`  -> Setting duration: ${dur}s`);
                                    ep.duration = dur;
                                    updated = true;
                                }
                            } else {
                                console.log(`File not found: ${absPath}`);
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
                        const urlPath = ep.url || '';
                        if (urlPath.startsWith('/uploads/')) {
                            const relPath = urlPath.replace('/uploads/', '');
                            const absPath = path.join(__dirname, '../uploads', relPath);
                            if (fs.existsSync(absPath)) {
                                console.log(`Reading duration for Content ep: ${absPath}`);
                                const dur = await getDuration(absPath);
                                if (dur > 0) {
                                    console.log(`  -> Setting duration: ${dur}s`);
                                    ep.duration = dur;
                                    updated = true;
                                }
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

        console.log("All durations fixed successfully.");
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

run();
