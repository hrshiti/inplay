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
 * Upload the ORIGINAL local file (not a transcode) to S3, under a separate
 * `originals/` prefix from the HLS renditions. Never deletes or modifies the
 * local file - this is purely a durability side-channel so the local copy
 * eventually becomes reclaimable (see scripts/migrateOriginalsToS3.js and the
 * `--delete-verified-originals` mode of cleanupOrphanedMedia.js).
 *
 * Non-fatal by design: a failure here must never affect HLS delivery, which
 * is the primary, already-working pipeline. Always verifies the object is
 * actually reachable on S3 (HEAD request) before returning a URL - a caller
 * must never be told "this succeeded" on the strength of an unconfirmed PUT.
 *
 * @param {string} localPath - Local path to the original file
 * @param {string} id - ID of the content
 * @param {string} type - Folder name (e.g., 'movie', 'episode', 'quickbyte', 'foryou', 'banner', 'promotion')
 * @returns {Promise<string|null>} - The public S3 URL, or null if unavailable/unverified
 */
const uploadOriginalToS3 = async (localPath, id, type = 'movie') => {
  const videoId = id.toString();
  try {
    if (!fs.existsSync(localPath)) return null;

    const filename = path.basename(localPath);
    const s3Key = `originals/${type}/${videoId}/${filename}`;

    await s3Service.uploadFile(localPath, s3Key);

    const verified = await s3Service.objectExists(s3Key);
    if (!verified) {
      console.error(`[mediaService] Original upload for ${type} ${videoId} could not be verified on S3 after upload`);
      return null;
    }

    return s3Service.getPublicUrl(s3Key);
  } catch (error) {
    console.error(`[mediaService] Original-to-S3 upload failed for ${type} ${videoId}:`, error.message);
    return null;
  }
};

/**
 * Process video to HLS AND upload the original to S3, in parallel.
 * Use this in place of handleVideoHLS() wherever the caller wants to also
 * retain a durable, verified original copy in S3 (not just the local file).
 * @returns {Promise<{hlsUrl: string|null, originalS3Url: string|null}>}
 */
const handleVideoHLSWithOriginal = async (localPath, id, type = 'movie') => {
  const [hlsUrl, originalS3Url] = await Promise.all([
    handleVideoHLS(localPath, id, type),
    uploadOriginalToS3(localPath, id, type)
  ]);
  return { hlsUrl, originalS3Url };
};

/**
 * Process video to HLS, upload to S3, upload the original to S3, and extract
 * exact duration in seconds - all in parallel where possible.
 * @param {string} localPath - Local path to mp4
 * @param {string} id - ID of the content
 * @param {string} type - Folder name (e.g., 'movie', 'episode', 'quickbyte', 'foryou')
 * @returns {Promise<{hlsUrl: string, duration: number, originalS3Url: string|null}>}
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

  const [hlsUrl, originalS3Url] = await Promise.all([
    handleVideoHLS(localPath, id, type),
    uploadOriginalToS3(localPath, id, type)
  ]);
  return { hlsUrl, duration, originalS3Url };
};

module.exports = {
  handleVideoHLS,
  handleVideoHLSWithDuration,
  handleVideoHLSWithOriginal,
  uploadOriginalToS3
};
