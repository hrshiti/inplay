const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
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
const uploadFile = async (filePath, s3Key) => {
    const fileContent = fs.readFileSync(filePath);
    const contentType = mime.lookup(filePath) || 'application/octet-stream';

    const params = {
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType
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

module.exports = {
    uploadFile,
    uploadFolder,
    getPublicUrl
};
