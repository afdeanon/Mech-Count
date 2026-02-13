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
exports.Blueprint = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Mechanical Symbol Sub-schema
const MechanicalSymbolSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    type: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    category: {
        type: String,
        enum: ['hydraulic', 'pneumatic', 'mechanical', 'electrical', 'other'],
        default: 'other'
    },
    position: {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        width: { type: Number, required: true },
        height: { type: Number, required: true }
    },
    confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 1
    }
}, { _id: false });
// Blueprint Schema
const BlueprintSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    imageUrl: {
        type: String,
        required: true
    },
    s3Key: {
        type: String,
        required: true
    },
    originalFilename: {
        type: String,
        required: true
    },
    uploadDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    symbols: [MechanicalSymbolSchema],
    totalSymbols: {
        type: Number,
        default: 0
    },
    averageAccuracy: {
        type: Number,
        default: 0,
        min: 0,
        max: 1
    },
    projectId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Project',
        default: null
    },
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['processing', 'completed', 'failed'],
        default: 'processing'
    },
    processingError: {
        type: String,
        default: null
    },
    aiAnalysis: {
        isAnalyzed: { type: Boolean, default: false },
        analysisDate: { type: Date },
        processingTime: { type: Number },
        confidence: { type: Number, default: 0, min: 0, max: 100 },
        summary: { type: String, default: '' },
        errorMessage: { type: String }
    },
    metadata: {
        dimensions: {
            width: { type: Number, required: true },
            height: { type: Number, required: true }
        },
        fileSize: { type: Number, required: true },
        mimetype: { type: String, required: true }
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
// Indexes for performance
BlueprintSchema.index({ userId: 1, createdAt: -1 });
BlueprintSchema.index({ projectId: 1 });
BlueprintSchema.index({ status: 1 });
BlueprintSchema.index({ uploadDate: -1 });
// Pre-save middleware to calculate average accuracy
BlueprintSchema.pre('save', function (next) {
    if (this.symbols && this.symbols.length > 0) {
        this.totalSymbols = this.symbols.length;
        const totalConfidence = this.symbols.reduce((sum, symbol) => sum + symbol.confidence, 0);
        this.averageAccuracy = totalConfidence / this.symbols.length;
    }
    next();
});
exports.Blueprint = mongoose_1.default.model('Blueprint', BlueprintSchema);
