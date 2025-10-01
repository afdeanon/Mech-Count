import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './config/database';

// Import routes
import userRoutes from './routes/users';
import projectRoutes from './routes/projects';
import blueprintRoutes from './routes/blueprints';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

// Debug: Check if env vars are loaded
console.log('🔧 Environment check:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
console.log('- MONGODB_URI exists:', !!process.env.MONGODB_URI);

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:8080', 
    'http://localhost:8081',
    process.env.FRONTEND_URL
  ].filter((url): url is string => Boolean(url)),
  credentials: true
}));
app.use(express.json());

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
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/blueprints', blueprintRoutes);

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