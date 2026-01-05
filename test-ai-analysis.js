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

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAIAnalysis();