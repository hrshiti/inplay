const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Detect FFmpeg: 1. .env FFMPEG_PATH, 2. system PATH, 3. ffmpeg-static bundled binary
let FFMPEG = 'ffmpeg'; // default: system PATH
const FFMPEG_BIN = process.env.FFMPEG_PATH;
if (FFMPEG_BIN && fs.existsSync(FFMPEG_BIN)) {
  FFMPEG = FFMPEG_BIN;
} else {
  // Use ffmpeg-static bundled binary as fallback
  try {
    const ffmpegStatic = require('ffmpeg-static');
    if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
      FFMPEG = ffmpegStatic;
      console.log('Using bundled ffmpeg-static:', FFMPEG);
    }
  } catch (e) {
    console.warn('ffmpeg-static not found, falling back to system ffmpeg');
  }
}

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
            
            // FFmpeg arguments for 4 qualities (240p, 480p, 720p, 1080p)
            // -preset veryfast: Good balance of speed and quality
            // -crf 24: High quality encoding
            const args = [
                '-i', inputPath,
                '-preset', 'veryfast', 
                '-threads', '0',
                '-tune', 'fastdecode',
                '-filter_complex', '[0:v]split=4[v1][v2][v3][v4];[v1]scale=-2:240[v1out];[v2]scale=-2:480[v2out];[v3]scale=-2:720[v3out];[v4]scale=-2:1080[v4out];[0:a]asplit=4[a1][a2][a3][a4]',
                // 240p (Low Quality)
                '-map', '[v1out]', '-map', '[a1]', '-c:v:0', 'libx264', '-crf:v:0', '26', '-maxrate:v:0', '600k', '-bufsize:v:0', '1200k', '-profile:v:0', 'baseline', '-level', '3.0',
                // 480p (Standard Quality)
                '-map', '[v2out]', '-map', '[a2]', '-c:v:1', 'libx264', '-crf:v:1', '24', '-maxrate:v:1', '1500k', '-bufsize:v:1', '3000k',
                // 720p (High Quality)
                '-map', '[v3out]', '-map', '[a3]', '-c:v:2', 'libx264', '-crf:v:2', '24', '-maxrate:v:2', '3500k', '-bufsize:v:2', '7000k',
                // 1080p (Full HD Quality)
                '-map', '[v4out]', '-map', '[a4]', '-c:v:3', 'libx264', '-crf:v:3', '22', '-maxrate:v:3', '6000k', '-bufsize:v:3', '12000k',
                '-c:a', 'aac', '-ar', '44100', '-ac', '2',
                '-f', 'hls',
                '-hls_time', '6',
                '-hls_playlist_type', 'vod',
                '-hls_list_size', '0',
                '-master_pl_name', 'master.m3u8',
                '-var_stream_map', 'v:0,a:0 v:1,a:1 v:2,a:2 v:3,a:3',
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
