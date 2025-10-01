import express from 'express';
import { 
  uploadBlueprint, 
  deleteBlueprint, 
  getUserBlueprints, 
  getBlueprintById,
  updateBlueprint,
  analyzeExistingBlueprint,
  getUserAIUsage,
  testAIService,
  upload 
} from '../controllers/blueprintController';
import { checkAIServiceHealth } from '../services/aiService';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Test endpoints (no auth required)
router.get('/hello', (req, res) => {
  res.json({
    success: true,
    message: 'Hello from Blueprints API!',
    timestamp: new Date().toISOString()
  });
});

router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Blueprint routes are working!',
    availableEndpoints: [
      'POST /api/blueprints/upload - Upload blueprint (requires auth)',
      'GET /api/blueprints/ - Get user blueprints (requires auth)',
      'GET /api/blueprints/:id - Get blueprint by ID (requires auth)',
      'DELETE /api/blueprints/:id - Delete blueprint (requires auth)'
    ]
  });
});

// Blueprint routes
router.post('/upload', authenticateToken, upload.single('blueprint'), uploadBlueprint);
router.get('/', authenticateToken, getUserBlueprints);
router.get('/:id', authenticateToken, getBlueprintById);
router.put('/:id', authenticateToken, updateBlueprint);
router.post('/:id/analyze', authenticateToken, analyzeExistingBlueprint);
router.delete('/:id', authenticateToken, deleteBlueprint);

// AI service health check (no auth required for testing)
router.get('/ai/health', async (req, res) => {
  try {
    const health = await checkAIServiceHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ 
      available: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// AI service test - comprehensive test of AI capabilities (no auth required for testing)
router.get('/ai/test', testAIService);

// Simple image test endpoint to debug OpenAI issues
router.get('/ai/simple-test', async (req, res) => {
  try {
    const { analyzeBlueprint } = await import('../services/aiService');
    
    // Create a simple test image (1x1 pixel red square)
    const testImageBuffer = Buffer.from([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222, 0, 0, 0, 12, 73, 68, 65, 84, 8, 215, 99, 248, 15, 0, 0, 1, 0, 1, 0, 18, 221, 141, 219, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
    ]);
    
    const result = await analyzeBlueprint(testImageBuffer, 'image/png');
    
    res.json({
      success: true,
      message: 'Simple image test completed',
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Simple test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// AI service health check with auth
router.get('/ai/health-auth', authenticateToken, async (req, res) => {
  try {
    const health = await checkAIServiceHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ 
      available: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// AI usage statistics
router.get('/ai/usage', authenticateToken, getUserAIUsage);

export default router;