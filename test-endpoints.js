// Simple test script to verify API endpoints
const testEndpoints = async () => {
  const baseURL = 'http://localhost:3000';
  
  // Test health check
  try {
    console.log('🧪 Testing API endpoints...\n');
    
    const healthResponse = await fetch(`${baseURL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health Check:', healthData);
    
    const testResponse = await fetch(`${baseURL}/api/test`);
    const testData = await testResponse.json();
    console.log('✅ Test Endpoint:', testData);
    
    // Test blueprints endpoint (should require auth)
    const blueprintsResponse = await fetch(`${baseURL}/api/blueprints`, {
      headers: {
        'Authorization': 'Bearer fake-token'
      }
    });
    const blueprintsData = await blueprintsResponse.json();
    console.log('🔍 Blueprints Endpoint:', blueprintsData);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

testEndpoints();