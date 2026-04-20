const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const ForYou = require('../models/ForYou');
const mediaService = require('../services/mediaService');

// Detect FFmpeg path from environment variables or use system default
const FFMPEG_BIN = process.env.FFMPEG_PATH;
const FFMPEG = (FFMPEG_BIN && fs.existsSync(FFMPEG_BIN)) ? `"${FFMPEG_BIN}"` : 'ffmpeg';

const testEverything = async () => {
    console.log('--- Starting ULTIMATE OTT INTEGRATION TEST ---');
    console.log('S3 Bucket:', process.env.AWS_S3_BUCKET);
    console.log('CloudFront:', process.env.CLOUDFRONT_URL);
    
    const testFolder = path.join(__dirname, '../uploads/test_run');
    if (!fs.existsSync(testFolder)) fs.mkdirSync(testFolder, { recursive: true });

    const localVideo = path.join(testFolder, 'test_source.mp4');

    try {
        // 1. Check MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ 1. MongoDB connected');

        // 2. Generate small 1-second video using FFmpeg (Verification of FFmpeg installation)
        console.log('Generating 1-second test video...');
        await execPromise(`${FFMPEG} -f lavfi -i color=c=red:s=640x360:d=1 -f lavfi -i sine=f=440:b=4:d=1 -c:v libx264 -c:a aac -shortest "${localVideo}" -y`);
        console.log('✅ 2. FFmpeg working (Test video generated)');

        // 3. Test Full HLS Pipeline (Convert + Upload to S3)
        const dummyDoc = await ForYou.create({
            title: 'HLS Test Reel',
            status: 'draft',
            video: { url: '/dummy', public_id: 'dummy' }
        });
        
        console.log(`Processing HLS & Uploading to S3 for ID: ${dummyDoc._id}...`);
        const hlsUrl = await mediaService.handleVideoHLS(localVideo, dummyDoc._id, 'test_hls');
        
        if (hlsUrl) {
            console.log('✅ 3. HLS Processing & S3 Upload Success!');
            console.log(`🔗 MASTER HLS URL: ${hlsUrl}`);
            
            // 4. Verify DB Update
            await ForYou.findByIdAndUpdate(dummyDoc._id, { 'video.hls_url': hlsUrl });
            console.log('✅ 4. Database updated successfully');
        } else {
            throw new Error('HLS Processing failed (check console logs)');
        }

        console.log('\n🌟 CONGRATULATIONS! YOUR OTT INFRASTRUCTURE IS 100% READY 🌟');
        
        // Cleanup local test files
        if (fs.existsSync(testFolder)) fs.rmSync(testFolder, { recursive: true, force: true });
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ TEST FAILED:', error);
        // Cleanup on fail
        if (fs.existsSync(testFolder)) fs.rmSync(testFolder, { recursive: true, force: true });
        process.exit(1);
    }
};

testEverything();
