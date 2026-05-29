const { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } = require('@aws-sdk/client-s3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const bucketName = process.env.AWS_S3_BUCKET;

async function run() {
    if (!bucketName) {
        console.error('Error: AWS_S3_BUCKET is not configured in .env file.');
        process.exit(1);
    }
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        console.error('Error: AWS credentials (AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY) are missing in .env file.');
        process.exit(1);
    }

    console.log(`Checking current CORS configuration for bucket: ${bucketName}...`);
    try {
        const currentCors = await s3Client.send(new GetBucketCorsCommand({ Bucket: bucketName }));
        console.log('Current CORS configuration:', JSON.stringify(currentCors.CORSRules, null, 2));
    } catch (err) {
        if (err.name === 'NoSuchCORSConfiguration' || err.code === 'NoSuchCORSConfiguration') {
            console.log('No existing CORS configuration found.');
        } else {
            console.warn('Warning: Could not fetch current CORS (it might not exist):', err.message);
        }
    }

    const corsRules = [
        {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'HEAD'],
            AllowedOrigins: ['*'], // Allow requests from all origins (including inplays.in and localhost)
            ExposeHeaders: ['ETag', 'Access-Control-Allow-Origin'],
            MaxAgeSeconds: 3000
        }
    ];

    console.log('Applying new CORS configuration to allow all origins for GET/HEAD...');
    try {
        await s3Client.send(new PutBucketCorsCommand({
            Bucket: bucketName,
            CORSConfiguration: {
                CORSRules: corsRules
            }
        }));
        console.log('Successfully configured CORS rules on S3 bucket!');
    } catch (err) {
        console.error('Failed to configure CORS rules on S3 bucket:', err);
    }
}

run();
