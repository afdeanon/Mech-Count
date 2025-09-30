import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getOrCreateUser,
  getUserProfile,
  updateUserProfile
} from '../controllers/userController';

const router = express.Router();

// GET /api/users - Test endpoint (no auth required)
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Users API is working!',
    availableEndpoints: [
      'GET /api/users/me - Get or create current user (requires auth)',
      'GET /api/users/profile - Get user profile (requires auth)',
      'PUT /api/users/profile - Update user profile (requires auth)'
    ]
  });
});

// GET /api/users/me - Get or create current user
router.get('/me', authenticateToken, getOrCreateUser);

// GET /api/users/profile - Get user profile
router.get('/profile', authenticateToken, getUserProfile);

// PUT /api/users/profile - Update user profile
router.put('/profile', authenticateToken, updateUserProfile);

export default router;