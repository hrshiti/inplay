const { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types'); // Need to install this or use a simple mapping

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;

/**
 * Upload a single file to S3
 * @param {string} filePath - Local path to the file
 * @param {string} s3Key - Path in the S3 bucket
 */
const getHlsContentType = (filePath) => {
    if (filePath.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
    if (filePath.endsWith('.ts')) return 'video/mp2t';
    return mime.lookup(filePath) || 'application/octet-stream';
};

const uploadFile = async (filePath, s3Key) => {
    const fileContent = fs.readFileSync(filePath);
    const contentType = getHlsContentType(filePath);

    const params = {
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable'
    };

    try {
        await s3Client.send(new PutObjectCommand(params));
        // console.log(`Uploaded: ${s3Key}`);
    } catch (error) {
        console.error(`Error uploading ${s3Key} to S3:`, error);
        throw error;
    }
};

/**
 * Upload an entire folder and its subdirectories to S3
 * @param {string} localFolderPath - Local path to the folder
 * @param {string} s3FolderPrefix - Prefix (folder path) in S3
 */
const uploadFolder = async (localFolderPath, s3FolderPrefix) => {
    const files = fs.readdirSync(localFolderPath);
    const uploadPromises = files.map(async (file) => {
        const localPath = path.join(localFolderPath, file);
        const s3Key = path.join(s3FolderPrefix, file).replace(/\\/g, '/');

        if (fs.lstatSync(localPath).isDirectory()) {
            return uploadFolder(localPath, s3Key);
        } else {
            return uploadFile(localPath, s3Key);
        }
    });

    await Promise.all(uploadPromises);
};

/**
 * Returns the public URL for an S3 key (via CloudFront if configured)
 * @param {string} s3Key - The key in S3
 * @returns {string} - The public URL
 */
const getPublicUrl = (s3Key) => {
    const cloudFrontUrl = process.env.CLOUDFRONT_URL;
    if (cloudFrontUrl) {
        return `${cloudFrontUrl.replace(/\/$/, '')}/${s3Key.replace(/^\//, '')}`;
    }
    // Fallback to direct S3 URL
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
};

/**
 * Check whether an object actually exists on S3 (HEAD request, no body transfer).
 * Used to verify an upload really landed before anything local is ever deleted
 * on the strength of it - never trust a DB field alone (see cleanupOrphanedMedia.js).
 * @param {string} s3Key
 * @returns {Promise<boolean>}
 */
const objectExists = async (s3Key) => {
    try {
        await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key }));
        return true;
    } catch (error) {
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) return false;
        console.error(`Error checking S3 object ${s3Key}:`, error.message);
        return false;
    }
};

/**
 * Delete a single object from S3. Never throws - cleanup callers should not
 * fail an otherwise-successful operation (e.g. a DB record delete) just
 * because a best-effort cloud cleanup step failed; they log and move on.
 * @param {string} s3Key
 * @returns {Promise<boolean>} true if the delete request succeeded
 */
const deleteObject = async (s3Key) => {
    if (!s3Key) return false;
    try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key }));
        return true;
    } catch (error) {
        console.error(`Error deleting S3 object ${s3Key}:`, error.message);
        return false;
    }
};

/**
 * Delete every object under an S3 "folder" prefix (e.g. an HLS rendition set).
 * Lists in pages of up to 1000 and batch-deletes (S3 DeleteObjects max is 1000
 * keys per call). Never throws - same non-fatal contract as deleteObject.
 * @param {string} s3FolderPrefix
 * @returns {Promise<{deleted: number, failed: number}>}
 */
const deleteFolder = async (s3FolderPrefix) => {
    if (!s3FolderPrefix) return { deleted: 0, failed: 0 };
    const prefix = s3FolderPrefix.replace(/\/$/, '') + '/';
    let deleted = 0;
    let failed = 0;

    try {
        let continuationToken;
        do {
            const listResult = await s3Client.send(new ListObjectsV2Command({
                Bucket: BUCKET_NAME,
                Prefix: prefix,
                ContinuationToken: continuationToken
            }));

            const keys = (listResult.Contents || []).map(obj => ({ Key: obj.Key }));
            if (keys.length > 0) {
                const deleteResult = await s3Client.send(new DeleteObjectsCommand({
                    Bucket: BUCKET_NAME,
                    Delete: { Objects: keys, Quiet: true }
                }));
                deleted += keys.length - (deleteResult.Errors?.length || 0);
                failed += deleteResult.Errors?.length || 0;
                (deleteResult.Errors || []).forEach(e => console.error(`Error deleting S3 key ${e.Key}: ${e.Message}`));
            }

            continuationToken = listResult.IsTruncated ? listResult.NextContinuationToken : undefined;
        } while (continuationToken);
    } catch (error) {
        console.error(`Error deleting S3 folder ${prefix}:`, error.message);
        failed++;
    }

    return { deleted, failed };
};

module.exports = {
    uploadFile,
    uploadFolder,
    getPublicUrl,
    objectExists,
    deleteObject,
    deleteFolder
};
