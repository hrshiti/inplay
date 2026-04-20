const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');
const execPromise = util.promisify(exec);

// Detect FFmpeg path for Windows (fallback to absolute if PATH not yet updated)
const FFMPEG_BIN = 'C:\\Users\\admin\\Downloads\\ffmpeg-2026-04-16-git-5abc240a27-full_build\\ffmpeg-2026-04-16-git-5abc240a27-full_build\\bin\\ffmpeg.exe';
const FFMPEG = fs.existsSync(FFMPEG_BIN) ? `"${FFMPEG_BIN}"` : 'ffmpeg';

/**
 * Process a video file into HLS format with multiple qualities
 * @param {string} inputPath - Path to the original mp4 file
 * @param {string} outputDir - Directory where HLS files will be stored
 * @returns {Promise<string>} - Path to the master m3u8 file
 */
const processToHLS = async (inputPath, outputDir) => {
    try {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
        
        // FFmpeg command to generate 3 qualities: 240p, 480p, 720p
        // Handling audio splitting to prevent "Same elementary stream" error in modern FFmpeg
        const ffmpegCommand = `${FFMPEG} -i "${inputPath}" -filter_complex "[0:v]split=3[v1][v2][v3];[v1]scale=w=426:h=240[v1out];[v2]scale=w=854:h=480[v2out];[v3]scale=w=1280:h=720[v3out];[0:a]asplit=3[a1][a2][a3]" -map "[v1out]" -map "[a1]" -b:v:0 400k -maxrate:v:0 400k -bufsize:v:0 800k -map "[v2out]" -map "[a2]" -b:v:1 800k -maxrate:v:1 800k -bufsize:v:1 1200k -map "[v3out]" -map "[a3]" -b:v:2 1400k -maxrate:v:2 1400k -bufsize:v:2 2100k -f hls -hls_time 10 -hls_playlist_type vod -master_pl_name master.m3u8 -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2" -hls_segment_filename "${outputDir}/output_%v_%03d.ts" "${outputDir}/output_%v.m3u8"`;

        console.log(`Processing video to HLS: ${inputPath}`);
        await execPromise(ffmpegCommand);
        console.log(`HLS processing completed: ${masterPlaylistPath}`);

        return masterPlaylistPath;
    } catch (error) {
        console.error('Error during HLS processing:', error);
        throw new Error(`Failed to process video to HLS: ${error.message}`);
    }
};

module.exports = {
    processToHLS
};
