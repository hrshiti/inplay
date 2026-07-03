require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const database = require('../config/database');
const QuickByte = require('../models/QuickByte');

async function run() {
    try {
        console.log("Connecting to database...");
        await new Promise((resolve) => {
            if (mongoose.connection.readyState === 1) resolve();
            else mongoose.connection.once('open', resolve);
        });
        console.log("Connected.");

        const qbs = await QuickByte.find({}).limit(3).lean();
        qbs.forEach(qb => {
            console.log(`\nQuickByte: ${qb.title}`);
            if (qb.episodes) {
                qb.episodes.forEach((ep, idx) => {
                    console.log(`  Episode ${idx + 1}: Title="${ep.title}", url="${ep.url}", hls_url="${ep.hls_url}"`);
                });
            }
        });
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

run();
