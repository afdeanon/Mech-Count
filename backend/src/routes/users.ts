import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getOrCreateUser,
  getUserProfile,
  updateUserProfile
} from '../controllers/userController';

const router = express.Router();

// GET /api/users/me - Get or create current user
router.get('/me', authenticateToken, getOrCreateUser);

// GET /api/users/profile - Get user profile
router.get('/profile', authenticateToken, getUserProfile);

// PUT /api/users/profile - Update user profile
router.put('/profile', authenticateToken, updateUserProfile);

export default router;