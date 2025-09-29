import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// Configure AWS S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

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
    // Generate unique filename
    const fileExtension = originalFilename.split('.').pop();
    const key = `${folder}/${uuidv4()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      // No ACL needed - bucket policy handles public access
    });

    await s3Client.send(command);

    // Construct the public URL
    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return {
      key,
      url,
      bucket: BUCKET_NAME,
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
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
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
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
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