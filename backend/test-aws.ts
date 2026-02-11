// Test AWS S3 credentials
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

async function testAWSCredentials() {
  console.log('🔧 Testing AWS S3 Configuration...\n');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`AWS_REGION: ${process.env.AWS_REGION || 'NOT SET'}`);
  console.log(`AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '✅ SET (starts with: ' + process.env.AWS_ACCESS_KEY_ID.substring(0, 8) + '...)' : '❌ NOT SET'}`);
  console.log(`AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '✅ SET (length: ' + process.env.AWS_SECRET_ACCESS_KEY.length + ')' : '❌ NOT SET'}`);
  console.log(`S3_BUCKET_NAME: ${process.env.S3_BUCKET_NAME || 'NOT SET'}`);
  console.log('');

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.log('❌ Missing AWS credentials in environment variables');
    return;
  }

  // Test S3 connection
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    console.log('🔍 Testing S3 connection...');
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    
    console.log('✅ S3 Connection successful!');
    console.log(`📂 Found ${response.Buckets?.length || 0} buckets`);
    
    if (response.Buckets) {
      const targetBucket = response.Buckets.find(b => b.Name === process.env.S3_BUCKET_NAME);
      if (targetBucket) {
        console.log(`✅ Target bucket "${process.env.S3_BUCKET_NAME}" found!`);
      } else {
        console.log(`❌ Target bucket "${process.env.S3_BUCKET_NAME}" not found`);
        console.log('Available buckets:', response.Buckets.map(b => b.Name));
      }
    }
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.log('❌ S3 Connection failed:');
    console.log(`Error: ${message}`);
    
    if (message.includes('InvalidAccessKeyId')) {
      console.log('💡 Fix: Check your AWS_ACCESS_KEY_ID');
    } else if (message.includes('SignatureDoesNotMatch')) {
      console.log('💡 Fix: Check your AWS_SECRET_ACCESS_KEY');
    } else if (message.includes('TokenRefreshRequired')) {
      console.log('💡 Fix: Your credentials may have expired');
    }
  }
}

testAWSCredentials().catch(console.error);
