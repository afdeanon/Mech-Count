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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIUsage = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// AI Usage Schema
const AIUsageSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
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
        transform: function (_doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});
exports.AIUsage = mongoose_1.default.model('AIUsage', AIUsageSchema);
// Add static methods after model creation to ensure proper typing
exports.AIUsage.getUserUsage = async function (userId) {
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
exports.AIUsage.canUserAnalyze = async function (userId) {
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
exports.AIUsage.recordAnalysis = async function (userId, cost = 0.01) {
    const usage = await this.getUserUsage(userId);
    usage.analysisCount += 1;
    usage.monthlyAnalysisCount += 1;
    usage.lastAnalysisDate = new Date();
    usage.totalCost += cost;
    await usage.save();
    return usage;
};
exports.AIUsage.upgradeSubscription = async function (userId, tier, durationMonths = 1) {
    const usage = await this.getUserUsage(userId);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + durationMonths);
    const limits = {
        basic: 50, // 50 analyses per month
        premium: -1 // Unlimited
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
