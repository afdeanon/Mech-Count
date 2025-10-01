// Quick script to reset AI usage quota for testing
const { MongoClient, ObjectId } = require('mongodb');

async function resetUserQuota() {
  const client = new MongoClient('mongodb+srv://afdeanon_db_user:MechCount_pwd@mechcountcluster.x5smqvw.mongodb.net/?retryWrites=true&w=majority&appName=MechCountCluster');
  
  try {
    await client.connect();
    const db = client.db();
    
    const userObjectId = new ObjectId('68db1d38fd8b785ced3f2026');
    
    // Find all AI usage records for this user
    const allUsage = await db.collection('aiusages').find({ userId: userObjectId }).toArray();
    console.log('📊 All usage records for user:', allUsage);
    
    // Delete all existing records and create fresh one
    await db.collection('aiusages').deleteMany({ userId: userObjectId });
    console.log('🗑️ Deleted existing usage records');
    
    // Create fresh record with 10 analyses
    const newRecord = await db.collection('aiusages').insertOne({
      userId: userObjectId,
      analysisCount: 0,
      monthlyAnalysisCount: 0,
      currentMonthYear: new Date().toISOString().slice(0, 7),
      totalCost: 0,
      subscription: {
        tier: 'free',
        analysisLimit: 10
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Created fresh quota record:', newRecord);
    
    // Verify the new record
    const verifyUsage = await db.collection('aiusages').findOne({ userId: userObjectId });
    console.log('📊 Verified new record:', verifyUsage);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

resetUserQuota();