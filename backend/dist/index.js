"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./config/database");
// Import routes
const users_1 = __importDefault(require("./routes/users"));
const projects_1 = __importDefault(require("./routes/projects"));
const blueprints_1 = __importDefault(require("./routes/blueprints"));
// Load environment variables from .env file
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
// Debug: Check if env vars are loaded
console.log('🔧 Environment check:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
console.log('- MONGODB_URI exists:', !!process.env.MONGODB_URI);
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Connect to MongoDB
(0, database_1.connectDB)();
// Middleware
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:5173',
        'http://localhost:8080',
        'http://localhost:8081',
        process.env.FRONTEND_URL
    ].filter((url) => Boolean(url)),
    credentials: true
}));
app.use(express_1.default.json());
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Server is running',
        database: 'MongoDB connected',
        timestamp: new Date().toISOString()
    });
});
// Basic API routes
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working!',
        environment: process.env.NODE_ENV || 'development'
    });
});
// API routes
app.use('/api/users', users_1.default);
app.use('/api/projects', projects_1.default);
app.use('/api/blueprints', blueprints_1.default);
// 404 handler for unmatched routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl
    });
});
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
    console.log(`👤 Users API: http://localhost:${PORT}/api/users`);
    console.log(`📁 Projects API: http://localhost:${PORT}/api/projects`);
    console.log(`📋 Blueprints API: http://localhost:${PORT}/api/blueprints`);
});
