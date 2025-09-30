import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure AWS S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

function getBucketName(): string {
  const bucketName = process.env.S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('S3_BUCKET_NAME environment variable is not set');
  }
  return bucketName;
}

export interface S3UploadResult {
  key: string;
  url: string;
  bucket: string;
}

/**
 * Upload a file to S3
 */
export async function uploadToS3(
  buffer: Buffer,
  originalFilename: string,
  mimetype: string,
  folder: string = 'blueprints'
): Promise<S3UploadResult> {
  try {
    const bucketName = getBucketName();

    // Generate unique filename
    const fileExtension = originalFilename.split('.').pop();
    const key = `${folder}/${uuidv4()}.${fileExtension}`;

    console.log(`🪣 Using bucket: ${bucketName}`);
    console.log(`🔑 Using key: ${key}`);

    const command = new PutObjectCommand({
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
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw new Error('Failed to upload file to S3');
  }
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  try {
    const bucketName = getBucketName();

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting from S3:', error);
    throw new Error('Failed to delete file from S3');
  }
}

/**
 * Get a signed URL for temporary access to a private file
 */
export async function getSignedUrlForS3(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const bucketName = getBucketName();

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error('Failed to generate signed URL');
  }
}

/**
 * Check if S3 is properly configured
 */
export function validateS3Config(): boolean {
  const required = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'S3_BUCKET_NAME'];
  
  for (const env of required) {
    if (!process.env[env]) {
      console.error(`Missing required environment variable: ${env}`);
      return false;
    }
  }
  
  return true;
}