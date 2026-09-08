/**
 * transcodeQuickBytesToHLS.js
 * High-Speed Parallel HLS Transcoder & S3 Uploader
 */

require('dotenv').config();
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { MongoClient, ObjectId } = require('mongodb');
const ffmpegStatic = require('ffmpeg-static');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

const cloudfrontUrl = (process.env.CLOUDFRONT_URL || 'https://d3ezguscssopmp.cloudfront.net').replace(/\/$/, '');
const bucket = process.env.AWS_S3_BUCKET || 'inplay-media';

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const tempBase = path.join(__dirname, '../scratch_hls_temp');
if (!fs.existsSync(tempBase)) {
    fs.mkdirSync(tempBase, { recursive: true });
}

// Check if an S3 key already exists
async function s3KeyExists(key) {
    try {
        await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return true;
    } catch {
        return false;
    }
}

// Download file from URL to local disk
async function downloadFile(url, destPath) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${url}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(destPath, buffer);
}

// Parallel upload directory of HLS files to S3 with bounded concurrency
async function uploadHlsFolderToS3(localFolder, s3Prefix, concurrency = 15) {
    const files = fs.readdirSync(localFolder);
    const queue = [...files];

    const worker = async () => {
        while (queue.length > 0) {
            const f = queue.shift();
            if (!f) break;
            const localFilePath = path.join(localFolder, f);
            const s3Key = `${s3Prefix}/${f}`.replace(/\\/g, '/');
            const fileContent = fs.readFileSync(localFilePath);
            const contentType = f.endsWith('.m3u8') ? 'application/x-mpegURL'
                : f.endsWith('.ts') ? 'video/MP2T'
                : (mime.lookup(f) || 'application/octet-stream');

            await s3Client.send(new PutObjectCommand({
                Bucket: bucket,
                Key: s3Key,
                Body: fileContent,
                ContentType: contentType
            }));
        }
    };

    await Promise.all(Array.from({ length: concurrency }, worker));
}

// Ultra-fast HLS remuxing with FFmpeg
function transcodeToHls(inputMp4, outputDir) {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const masterPlaylist = path.join(outputDir, 'master.m3u8');
    const segmentPattern = path.join(outputDir, 'segment_%03d.ts');

    // Try fast stream copy first (-c copy) for 100x speed
    try {
        const fastCmd = `"${ffmpegStatic}" -y -i "${inputMp4}" -c copy -hls_time 4 -hls_playlist_type vod -hls_segment_filename "${segmentPattern}" "${masterPlaylist}"`;
        execSync(fastCmd, { stdio: 'pipe' });
        return masterPlaylist;
    } catch {
        // Fallback to ultrafast encoding
        const fallbackCmd = `"${ffmpegStatic}" -y -i "${inputMp4}" -codec:v libx264 -crf 26 -preset ultrafast -codec:a aac -b:a 128k -hls_time 4 -hls_playlist_type vod -hls_segment_filename "${segmentPattern}" "${masterPlaylist}"`;
        execSync(fallbackCmd, { stdio: 'pipe' });
        return masterPlaylist;
    }
}

async function main() {
    console.log('==================================================');
    console.log('  HIGH-SPEED PARALLEL HLS TRANSCODER FOR QUICKBYTES');
    console.log('==================================================\n');

    const mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db('inplay');
    const quickbytesCol = db.collection('quickbytes');

    const shows = await quickbytesCol.find({}).toArray();
    console.log(`Found ${shows.length} QuickByte shows to process.\n`);

    let totalTranscoded = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const startTime = Date.now();

    for (let i = 0; i < shows.length; i++) {
        const qb = shows[i];
        const qbIdStr = qb._id.toString();
        console.log(`\n--------------------------------------------------`);
        console.log(`Show #${i + 1}/${shows.length}: "${qb.title}" (ID: ${qbIdStr})`);
        const episodes = qb.episodes || [];
        console.log(`Total Episodes: ${episodes.length}`);

        let mainHlsUrl = qb.video?.hls_url;
        const mainS3Prefix = `videos/quickbyte/${qbIdStr}`;
        const mainMasterKey = `${mainS3Prefix}/master.m3u8`;

        // Check main video HLS
        const mainHlsExists = await s3KeyExists(mainMasterKey);
        if (mainHlsExists) {
            console.log(`  ℹ️ Main show HLS live on S3: ${mainMasterKey}`);
            mainHlsUrl = `${cloudfrontUrl}/${mainMasterKey}`;
            totalSkipped++;
        } else if (qb.video?.url && qb.video.url.endsWith('.mp4')) {
            const tempWorkDir = path.join(tempBase, `main_${qbIdStr}`);
            const tempMp4 = path.join(tempWorkDir, 'input.mp4');
            const hlsOutDir = path.join(tempWorkDir, 'hls');

            try {
                fs.mkdirSync(tempWorkDir, { recursive: true });
                console.log(`  📥 Main MP4: Downloading...`);
                await downloadFile(qb.video.url, tempMp4);

                console.log(`  ⚡ Main MP4: Fast HLS Remuxing...`);
                transcodeToHls(tempMp4, hlsOutDir);

                console.log(`  🚀 Main MP4: Parallel S3 Upload...`);
                await uploadHlsFolderToS3(hlsOutDir, mainS3Prefix);

                mainHlsUrl = `${cloudfrontUrl}/${mainMasterKey}`;
                console.log(`  ✅ Main HLS Ready: ${mainHlsUrl}`);
                totalTranscoded++;
            } catch (err) {
                console.error(`  ❌ Failed main video HLS: ${err.message}`);
                totalErrors++;
            } finally {
                fs.rmSync(tempWorkDir, { recursive: true, force: true });
            }
        }

        // Process Episodes
        const updatedEpisodes = [];

        for (let epIdx = 0; epIdx < episodes.length; epIdx++) {
            const ep = episodes[epIdx];
            const epIdStr = ep._id ? ep._id.toString() : new ObjectId().toString();
            const epS3Prefix = `videos/quickbyte_episode/${epIdStr}`;
            const epMasterKey = `${epS3Prefix}/master.m3u8`;

            let epHlsUrl = ep.hls_url;
            const epHlsExists = await s3KeyExists(epMasterKey);

            if (epHlsExists) {
                epHlsUrl = `${cloudfrontUrl}/${epMasterKey}`;
                totalSkipped++;
            } else if (ep.url && ep.url.endsWith('.mp4')) {
                const tempEpWorkDir = path.join(tempBase, `ep_${epIdStr}`);
                const tempEpMp4 = path.join(tempEpWorkDir, 'input.mp4');
                const epHlsOutDir = path.join(tempEpWorkDir, 'hls');

                try {
                    fs.mkdirSync(tempEpWorkDir, { recursive: true });
                    await downloadFile(ep.url, tempEpMp4);
                    transcodeToHls(tempEpMp4, epHlsOutDir);
                    await uploadHlsFolderToS3(epHlsOutDir, epS3Prefix);

                    epHlsUrl = `${cloudfrontUrl}/${epMasterKey}`;
                    totalTranscoded++;
                    console.log(`    ✅ Ep #${epIdx + 1}/${episodes.length} HLS Ready: ${epHlsUrl}`);
                } catch (err) {
                    console.error(`    ❌ Failed Ep #${epIdx + 1} HLS: ${err.message}`);
                    totalErrors++;
                    epHlsUrl = undefined;
                } finally {
                    fs.rmSync(tempEpWorkDir, { recursive: true, force: true });
                }
            }

            updatedEpisodes.push({
                ...ep,
                _id: ep._id || new ObjectId(epIdStr),
                hls_url: epHlsUrl
            });
        }

        // Update MongoDB document for this show
        const updateFields = {
            episodes: updatedEpisodes,
            updatedAt: new Date()
        };
        if (mainHlsUrl) {
            updateFields['video.hls_url'] = mainHlsUrl;
            updateFields.hls_url = mainHlsUrl;
        }

        await quickbytesCol.updateOne(
            { _id: qb._id },
            { $set: updateFields }
        );
        console.log(`  💾 Updated MongoDB record for "${qb.title}"`);
    }

    fs.rmSync(tempBase, { recursive: true, force: true });
    const durationMin = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    console.log('\n==================================================');
    console.log('  HLS TRANSCODING COMPLETE');
    console.log('==================================================');
    console.log(`  Total Transcoded to HLS : ${totalTranscoded}`);
    console.log(`  Already Live on S3     : ${totalSkipped}`);
    console.log(`  Errors                 : ${totalErrors}`);
    console.log(`  Time Elapsed           : ${durationMin} minutes`);
    console.log('==================================================\n');

    await mongoClient.close();
}

main().catch(console.error);
