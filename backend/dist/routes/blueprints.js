"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const blueprintController_1 = require("../controllers/blueprintController");
const aiService_1 = require("../services/aiService");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
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
router.post('/upload', auth_1.authenticateToken, blueprintController_1.upload.single('blueprint'), blueprintController_1.uploadBlueprint);
router.get('/', auth_1.authenticateToken, blueprintController_1.getUserBlueprints);
router.get('/:id', auth_1.authenticateToken, blueprintController_1.getBlueprintById);
router.put('/:id', auth_1.authenticateToken, blueprintController_1.updateBlueprint);
router.post('/:id/analyze', auth_1.authenticateToken, blueprintController_1.analyzeExistingBlueprint);
router.delete('/:id', auth_1.authenticateToken, blueprintController_1.deleteBlueprint);
// AI service health check (no auth required for testing)
router.get('/ai/health', async (req, res) => {
    try {
        const health = await (0, aiService_1.checkAIServiceHealth)();
        res.json(health);
    }
    catch (error) {
        res.status(500).json({
            available: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// AI service test - comprehensive test of AI capabilities (no auth required for testing)
router.get('/ai/test', blueprintController_1.testAIService);
// Simple image test endpoint to debug OpenAI issues
router.get('/ai/simple-test', async (req, res) => {
    try {
        const { analyzeBlueprint } = await Promise.resolve().then(() => __importStar(require('../services/aiService')));
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Simple test failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// AI service health check with auth
router.get('/ai/health-auth', auth_1.authenticateToken, async (req, res) => {
    try {
        const health = await (0, aiService_1.checkAIServiceHealth)();
        res.json(health);
    }
    catch (error) {
        res.status(500).json({
            available: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// AI usage statistics
router.get('/ai/usage', auth_1.authenticateToken, blueprintController_1.getUserAIUsage);
exports.default = router;
