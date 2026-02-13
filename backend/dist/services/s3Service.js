"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToS3 = uploadToS3;
exports.deleteFromS3 = deleteFromS3;
exports.getSignedUrlForS3 = getSignedUrlForS3;
exports.validateS3Config = validateS3Config;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const uuid_1 = require("uuid");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// Configure AWS S3 Client
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
function getBucketName() {
    const bucketName = process.env.S3_BUCKET_NAME;
    if (!bucketName) {
        throw new Error('S3_BUCKET_NAME environment variable is not set');
    }
    return bucketName;
}
/**
 * Upload a file to S3
 */
async function uploadToS3(buffer, originalFilename, mimetype, folder = 'blueprints') {
    try {
        const bucketName = getBucketName();
        // Generate unique filename
        const fileExtension = originalFilename.split('.').pop();
        const key = `${folder}/${(0, uuid_1.v4)()}.${fileExtension}`;
        console.log(`🪣 Using bucket: ${bucketName}`);
        console.log(`🔑 Using key: ${key}`);
        const command = new client_s3_1.PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: buffer,
            ContentType: mimetype,
            // No ACL needed - bucket policy handles public access
        });
        await s3Client.send(command);
        // Construct the public URL
        const url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
        return {
            key,
            url,
            bucket: bucketName,
        };
    }
    catch (error) {
        console.error('Error uploading to S3:', error);
        throw new Error('Failed to upload file to S3');
    }
}
/**
 * Delete a file from S3
 */
async function deleteFromS3(key) {
    try {
        const bucketName = getBucketName();
        const command = new client_s3_1.DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
        });
        await s3Client.send(command);
    }
    catch (error) {
        console.error('Error deleting from S3:', error);
        throw new Error('Failed to delete file from S3');
    }
}
/**
 * Get a signed URL for temporary access to a private file
 */
async function getSignedUrlForS3(key, expiresIn = 3600) {
    try {
        const bucketName = getBucketName();
        const command = new client_s3_1.GetObjectCommand({
            Bucket: bucketName,
            Key: key,
        });
        const signedUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn });
        return signedUrl;
    }
    catch (error) {
        console.error('Error generating signed URL:', error);
        throw new Error('Failed to generate signed URL');
    }
}
/**
 * Check if S3 is properly configured
 */
function validateS3Config() {
    const required = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'S3_BUCKET_NAME'];
    for (const env of required) {
        if (!process.env[env]) {
            console.error(`Missing required environment variable: ${env}`);
            return false;
        }
    }
    return true;
}
