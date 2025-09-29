import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mech-count';
    
    await mongoose.connect(mongoUri);
    
    console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed.');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

export { connectDB };