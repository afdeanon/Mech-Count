import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { connectDB } from './config/database';

// Import routes
import userRoutes from './routes/users';
import projectRoutes from './routes/projects';
import blueprintRoutes from './routes/blueprints';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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