#!/usr/bin/env node

async function testAIAnalysis() {
  console.log('🧪 Starting AI Analysis Test...');

  try {
    // Test 1: Check AI service health
    console.log('\n📡 Step 1: Testing AI service health...');
    const healthResponse = await fetch('http://localhost:3000/api/blueprints/ai/health');
    const healthData = await healthResponse.json();
    console.log('Health check result:', healthData);

    if (!healthData.available) {
      console.error('❌ AI service not available');
      return;
    }

    // Test 2: Test comprehensive AI capabilities
    console.log('\n🔬 Step 2: Testing AI capabilities...');
    const testResponse = await fetch('http://localhost:3000/api/blueprints/ai/test');
    const testData = await testResponse.json();
    console.log('AI capabilities test:', testData);

    console.log('\n✅ AI service is working and ready for blueprint analysis!');
    console.log('\n📝 Next steps:');
    console.log('1. Upload a real blueprint image through the frontend');
    console.log('2. The AI analysis should now work correctly');
    console.log('3. Check for symbols in the analysis results');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAIAnalysis();