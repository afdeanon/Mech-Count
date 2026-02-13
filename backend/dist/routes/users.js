"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const userController_1 = require("../controllers/userController");
const router = express_1.default.Router();
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
router.get('/me', auth_1.authenticateToken, userController_1.getOrCreateUser);
// GET /api/users/profile - Get user profile
router.get('/profile', auth_1.authenticateToken, userController_1.getUserProfile);
// PUT /api/users/profile - Update user profile
router.put('/profile', auth_1.authenticateToken, userController_1.updateUserProfile);
exports.default = router;
