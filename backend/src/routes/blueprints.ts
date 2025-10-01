import express from 'express';
import { 
  uploadBlueprint, 
  deleteBlueprint, 
  getUserBlueprints, 
  getBlueprintById,
  updateBlueprint,
  analyzeExistingBlueprint,
  getUserAIUsage,
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

// AI service health check
router.get('/ai/health', authenticateToken, async (req, res) => {
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