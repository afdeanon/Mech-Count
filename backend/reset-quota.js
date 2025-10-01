#!/usr/bin/env node

// Reset AI quota script for testing purposes
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Define AIUsage schema (simplified version for the script)
const AIUsageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  analysisCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastAnalysisDate: {
    type: Date
  },
  monthlyAnalysisCount: {
    type: Number,
    default: 0,
    min: 0
  },
  currentMonthYear: {
    type: String,
    default: () => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
  },
  totalCost: {
    type: Number,
    default: 0,
    min: 0
  },
  subscription: {
    tier: {
      type: String,
      enum: ['free', 'basic', 'premium'],
      default: 'free'
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    analysisLimit: {
      type: Number,
      default: 100 // Increased for testing
    }
  }
}, {
  timestamps: true
});

const AIUsage = mongoose.model('AIUsage', AIUsageSchema);

async function resetQuota() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Reset all AI usage records for testing
    const result = await AIUsage.updateMany(
      {}, // All documents
      {
        $set: {
          monthlyAnalysisCount: 0,
          'subscription.analysisLimit': 100,
          currentMonthYear: new Date().toISOString().slice(0, 7)
        }
      }
    );

    console.log('🔄 Reset quota for testing:');
    console.log(`📊 Updated ${result.modifiedCount} user quota records`);
    console.log('📈 New monthly limit: 100 analyses per user');
    console.log('🗓️ Monthly count reset to: 0');
    
    // Also create a premium user entry for unlimited testing if needed
    const testUserId = '68dcfb118dd0fd62a01b4f38'; // Your user ID from the logs
    
    try {
      const userObjectId = new mongoose.Types.ObjectId(testUserId);
      await AIUsage.findOneAndUpdate(
        { userId: userObjectId },
        {
          $set: {
            monthlyAnalysisCount: 0,
            'subscription.tier': 'premium',
            'subscription.analysisLimit': 999999,
            currentMonthYear: new Date().toISOString().slice(0, 7)
          }
        },
        { upsert: true }
      );
      console.log('🎯 Set your user account to PREMIUM with unlimited analyses');
    } catch (userError) {
      console.log('⚠️ Could not set premium for specific user, but general reset completed');
    }

    console.log('✅ AI quota reset completed successfully!');
    console.log('🚀 You can now test AI analysis again');

  } catch (error) {
    console.error('❌ Error resetting quota:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
resetQuota();