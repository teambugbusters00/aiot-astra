import mongoose from 'mongoose';
import { logger } from './logger';

export async function connectDB(): Promise<void> {
  if (mongoose.connection.readyState >= 1) {
    logger.info('Using existing MongoDB connection');
    return;
  }
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aiot-studio';
  try {
    mongoose.set('bufferCommands', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`✅ MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    logger.warn('⚠️  MongoDB not available — running in memory-only mode');
    logger.warn('   Start MongoDB or set MONGODB_URI to enable persistence.');
  }
}

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB error:', err);
});
