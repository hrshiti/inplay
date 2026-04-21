const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Detect FFmpeg path from environment variables or use system default
const FFMPEG_BIN = process.env.FFMPEG_PATH;
const FFMPEG = (FFMPEG_BIN && fs.existsSync(FFMPEG_BIN)) ? FFMPEG_BIN : 'ffmpeg';

/**
 * Process a video file into HLS format with multiple qualities
 * Optimized for Mobile (Flutter APK) and Large Files
 */
const processToHLS = (inputPath, outputDir) => {
    return new Promise((resolve, reject) => {
        try {
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const outputDirForward = outputDir.replace(/\\/g, '/');
            
            // FFmpeg arguments for 3 qualities (240p, 480p, 720p)
            // -preset veryfast: Faster processing
            // -profile:v baseline -level 3.0: High compatibility for Android APK
            // -hls_time 6: Faster startup/buffering on mobile
            const args = [
                '-i', inputPath,
                '-preset', 'ultrafast', 
                '-threads', '0',
                '-tune', 'fastdecode',  // Speed up decoding/processing
                '-filter_complex', '[0:v]split=3[v1][v2][v3];[v1]scale=w=426:h=240[v1out];[v2]scale=w=854:h=480[v2out];[v3]scale=w=1280:h=720[v3out];[0:a]asplit=3[a1][a2][a3]',
                // 240p
                '-map', '[v1out]', '-map', '[a1]', '-c:v:0', 'libx264', '-crf:v:0', '28', '-maxrate:v:0', '400k', '-bufsize:v:0', '800k', '-profile:v:0', 'baseline', '-level', '3.0',
                // 480p
                '-map', '[v2out]', '-map', '[a2]', '-c:v:1', 'libx264', '-crf:v:1', '28', '-maxrate:v:1', '800k', '-bufsize:v:1', '1200k',
                // 720p
                '-map', '[v3out]', '-map', '[a3]', '-c:v:2', 'libx264', '-crf:v:2', '28', '-maxrate:v:2', '1400k', '-bufsize:v:2', '2100k',
                '-c:a', 'aac', '-ar', '44100', '-ac', '2',
                '-f', 'hls',
                '-hls_time', '10',
                '-hls_playlist_type', 'vod',
                '-hls_list_size', '0',
                '-master_pl_name', 'master.m3u8',
                '-var_stream_map', 'v:0,a:0 v:1,a:1 v:2,a:2',
                '-hls_segment_filename', `${outputDirForward}/output_%v_%03d.ts`,
                `${outputDirForward}/output_%v.m3u8`
            ];

            console.log(`Processing video to HLS: ${inputPath}`);
            const ffmpeg = spawn(FFMPEG, args);

            // Using spawn avoids the 200KB buffer limit of exec()
            ffmpeg.stderr.on('data', (data) => {
                // Log progress if needed: console.log(`FFmpeg: ${data}`);
            });

            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    console.log(`HLS processing completed: ${outputDir}`);
                    resolve(path.join(outputDir, 'master.m3u8'));
                } else {
                    reject(new Error(`FFmpeg exited with code ${code}`));
                }
            });

        } catch (error) {
            console.error('Error during HLS processing:', error);
            reject(error);
        }
    });
};

module.exports = {
    processToHLS
};
