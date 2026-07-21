const path = require('path');
const fs = require('fs');
const { processToHLS } = require('../utils/hlsProcessor');
const s3Service = require('./s3Service');

/**
 * Process video to HLS and upload to S3
 * @param {string} localPath - Local path to mp4
 * @param {string} id - ID of the content
 * @param {string} type - Folder name (e.g., 'movie', 'episode', 'quickbyte', 'foryou')
 * @returns {Promise<string>} - The public HLS URL
 */
const handleVideoHLS = async (localPath, id, type = 'movie') => {
  const videoId = id.toString();
  const outputDir = path.join(__dirname, '../uploads/temp_hls', `${type}_${videoId}`);
  const s3FolderPrefix = `videos/${type}/${videoId}`;

  try {
    if (!fs.existsSync(localPath)) {
        throw new Error(`Local file not found: ${localPath}`);
    }

    // 1. Process local mp4 to HLS
    await processToHLS(localPath, outputDir);

    // 2. Upload HLS folder to S3
    await s3Service.uploadFolder(outputDir, s3FolderPrefix);

    // 3. Return HLS URL
    const masterPlaylistKey = `${s3FolderPrefix}/master.m3u8`;
    const hlsUrl = s3Service.getPublicUrl(masterPlaylistKey);

    // 4. Cleanup local temp HLS files
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }

    return hlsUrl;
  } catch (error) {
    console.error(`HLS process failed for ${type} ${videoId}:`, error);
    // Cleanup if failed
    if (fs.existsSync(outputDir)) {
      try {
        fs.rmSync(outputDir, { recursive: true, force: true });
      } catch (e) {}
    }
    return null;
  }
};

/**
 * Process video to HLS, upload to S3, and extract exact duration in seconds
 * @param {string} localPath - Local path to mp4
 * @param {string} id - ID of the content
 * @param {string} type - Folder name (e.g., 'movie', 'episode', 'quickbyte', 'foryou')
 * @returns {Promise<{hlsUrl: string, duration: number}>} - The public HLS URL and duration in seconds
 */
const handleVideoHLSWithDuration = async (localPath, id, type = 'movie') => {
  let duration = 0;
  try {
    const mm = require('music-metadata');
    const metadata = await mm.parseFile(localPath);
    duration = Math.round(metadata?.format?.duration || 0);
  } catch (err) {
    console.error(`[mediaService] Could not parse duration from ${localPath}:`, err.message);
  }

  const hlsUrl = await handleVideoHLS(localPath, id, type);
  return { hlsUrl, duration };
};

module.exports = {
  handleVideoHLS,
  handleVideoHLSWithDuration
};
