import mongoose, { Document, Schema, Model } from 'mongoose';

type JSONTransformDoc = {
  _id?: unknown;
  __v?: unknown;
  id?: unknown;
};

// AI Usage Interface
export interface IAIUsage extends Document {
  userId: mongoose.Types.ObjectId;
  analysisCount: number;
  lastAnalysisDate?: Date;
  monthlyAnalysisCount: number;
  currentMonthYear: string; // Format: "2025-09"
  totalCost: number;
  subscription: {
    tier: 'free' | 'basic' | 'premium';
    startDate?: Date;
    endDate?: Date;
    analysisLimit: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Static methods interface
export interface IAIUsageModel extends Model<IAIUsage> {
  getUserUsage(userId: mongoose.Types.ObjectId): Promise<IAIUsage>;
  canUserAnalyze(userId: mongoose.Types.ObjectId): Promise<{
    canAnalyze: boolean;
    remaining: number;
    tier?: string;
    limit?: number;
  }>;
  recordAnalysis(userId: mongoose.Types.ObjectId, cost?: number): Promise<IAIUsage>;
  upgradeSubscription(
    userId: mongoose.Types.ObjectId, 
    tier: 'basic' | 'premium',
    durationMonths?: number
  ): Promise<IAIUsage>;
}

// AI Usage Schema
const AIUsageSchema = new Schema<IAIUsage>({
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
      default: 10 // Temporarily increased for testing - change back to 3 for production
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(_doc: unknown, ret: JSONTransformDoc) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

export const AIUsage = mongoose.model<IAIUsage, IAIUsageModel>('AIUsage', AIUsageSchema);

// Add static methods after model creation to ensure proper typing
AIUsage.getUserUsage = async function(userId: mongoose.Types.ObjectId) {
  let usage = await this.findOne({ userId });
  
  if (!usage) {
    // Create new usage record for user with increased testing limit
    usage = await this.create({
      userId,
      analysisCount: 0,
      monthlyAnalysisCount: 0,
      totalCost: 0,
      subscription: {
        tier: 'free',
        analysisLimit: 10 // Increased for testing
      }
    });
  }

  // Check if we need to reset monthly count
  const currentMonthYear = new Date().toISOString().slice(0, 7); // "2025-09"
  if (usage.currentMonthYear !== currentMonthYear) {
    usage.monthlyAnalysisCount = 0;
    usage.currentMonthYear = currentMonthYear;
    await usage.save();
  }

  // Ensure existing users get the new testing limit
  if (usage.subscription.analysisLimit < 10) {
    usage.subscription.analysisLimit = 10;
    await usage.save();
  }

  return usage;
};

AIUsage.canUserAnalyze = async function(userId: mongoose.Types.ObjectId) {
  const usage = await this.getUserUsage(userId);
  
  // Premium users have unlimited analyses
  if (usage.subscription.tier === 'premium') {
    return { canAnalyze: true, remaining: -1 }; // -1 indicates unlimited
  }

  // Check monthly limit
  const remaining = usage.subscription.analysisLimit - usage.monthlyAnalysisCount;
  return {
    canAnalyze: remaining > 0,
    remaining: Math.max(0, remaining),
    tier: usage.subscription.tier,
    limit: usage.subscription.analysisLimit
  };
};

AIUsage.recordAnalysis = async function(userId: mongoose.Types.ObjectId, cost: number = 0.01) {
  const usage = await this.getUserUsage(userId);
  
  usage.analysisCount += 1;
  usage.monthlyAnalysisCount += 1;
  usage.lastAnalysisDate = new Date();
  usage.totalCost += cost;
  
  await usage.save();
  return usage;
};

AIUsage.upgradeSubscription = async function(
  userId: mongoose.Types.ObjectId, 
  tier: 'basic' | 'premium',
  durationMonths: number = 1
) {
  const usage = await this.getUserUsage(userId);
  
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + durationMonths);
  
  const limits = {
    basic: 50,   // 50 analyses per month
    premium: -1  // Unlimited
  };
  
  usage.subscription = {
    tier,
    startDate,
    endDate,
    analysisLimit: limits[tier] === -1 ? 999999 : limits[tier] // Use large number for unlimited
  };
  
  await usage.save();
  return usage;
};
