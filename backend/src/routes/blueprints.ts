import express from 'express';
import { 
  uploadBlueprint, 
  deleteBlueprint, 
  getUserBlueprints, 
  getBlueprintById,
  upload 
} from '../controllers/blueprintController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Blueprint routes
router.post('/upload', authenticateToken, upload.single('blueprint'), uploadBlueprint);
router.get('/', authenticateToken, getUserBlueprints);
router.get('/:id', authenticateToken, getBlueprintById);
router.delete('/:id', authenticateToken, deleteBlueprint);

export default router;