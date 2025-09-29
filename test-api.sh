#!/bin/bash

# Test S3 Upload API
# First, let's test if the server is responding

echo "🧪 Testing Mech-Count API..."
echo ""

# Test health check
echo "1. Testing health check..."
curl -X GET http://localhost:3000/health
echo ""
echo ""

# Test API endpoint
echo "2. Testing API endpoint..."
curl -X GET http://localhost:3000/api/test
echo ""
echo ""

# Test S3 validation (without file)
echo "3. Testing S3 configuration validation..."
curl -X POST http://localhost:3000/api/blueprints/upload \
  -H "Authorization: Bearer fake-token-for-now" \
  -H "Content-Type: multipart/form-data"
echo ""
echo ""

echo "✅ Basic API tests completed!"
echo ""
echo "📝 Next steps:"
echo "   - Upload a test image via Postman or frontend"
echo "   - Use proper Firebase auth token"
echo "   - Test with actual image file"