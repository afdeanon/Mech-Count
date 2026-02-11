// Direct S3 upload test - bypasses server
import dotenv from 'dotenv';
import { uploadToS3, validateS3Config } from './src/services/s3Service';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function testS3Upload() {
  console.log('🔧 Testing Direct S3 Upload...\n');
  
  // Check S3 configuration
  console.log('1️⃣ Validating S3 configuration...');
  if (!validateS3Config()) {
    console.log('❌ S3 configuration is incomplete');
    return;
  }
  console.log('✅ S3 configuration is valid\n');
  
  // Create a test image file
  console.log('2️⃣ Creating test image file...');
  const testImagePath = path.join(__dirname, 'test-upload-image.png');
  
  // Create a simple 1x1 PNG image (base64 encoded)
  const base64PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const imageBuffer = Buffer.from(base64PNG, 'base64');
  
  try {
    fs.writeFileSync(testImagePath, imageBuffer);
    console.log('✅ Test image created successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.log('❌ Failed to create test image:', message);
    return;
  }
  
  console.log('');
  
  // Test direct S3 upload
  console.log('3️⃣ Testing direct S3 upload...');
  try {
    const fileBuffer = fs.readFileSync(testImagePath);
    const originalFilename = 'test-blueprint.png';
    const mimetype = 'image/png';
    
    console.log(`📤 Uploading file: ${originalFilename}`);
    console.log(`📊 File size: ${fileBuffer.length} bytes`);
    console.log(`🏷️  MIME type: ${mimetype}`);
    
    const uploadResult = await uploadToS3(
      fileBuffer,
      originalFilename,
      mimetype,
      'test-uploads'
    );
    
    console.log('🎉 Upload successful!');
    console.log(`🔑 S3 Key: ${uploadResult.key}`);
    console.log(`🌐 Public URL: ${uploadResult.url}`);
    console.log(`🪣 Bucket: ${uploadResult.bucket}`);
    
    // Verify the URL format
    const expectedUrl = `https://${uploadResult.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadResult.key}`;
    if (uploadResult.url === expectedUrl) {
      console.log('✅ URL format is correct');
    } else {
      console.log('⚠️  URL format may be incorrect');
      console.log(`Expected: ${expectedUrl}`);
      console.log(`Got: ${uploadResult.url}`);
    }
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.log('❌ S3 upload failed:');
    console.log(`Error: ${message}`);
    
    if (message.includes('NoSuchBucket')) {
      console.log('💡 Fix: Check if your S3 bucket exists and name is correct');
    } else if (message.includes('AccessDenied')) {
      console.log('💡 Fix: Check your AWS credentials and bucket permissions');
    } else if (message.includes('InvalidAccessKeyId')) {
      console.log('💡 Fix: Check your AWS_ACCESS_KEY_ID');
    } else if (message.includes('SignatureDoesNotMatch')) {
      console.log('💡 Fix: Check your AWS_SECRET_ACCESS_KEY');
    }
  }
  
  // Cleanup
  try {
    fs.unlinkSync(testImagePath);
    console.log('\n🧹 Test file cleaned up');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.log('\n⚠️  Could not clean up test file:', message);
  }
  
  console.log('\n📝 Test Summary:');
  console.log('- S3 Configuration: ✅ Valid');
  console.log('- Direct Upload: Check results above');
  console.log('\n💡 Next steps:');
  console.log('1. Start your backend server');
  console.log('2. Test the complete upload flow via API endpoints');
  console.log('3. Verify files appear in your S3 bucket dashboard');
}

testS3Upload().catch(console.error);
