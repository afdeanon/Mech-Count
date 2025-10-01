import mongoose, { Document, Schema } from 'mongoose';

// Mechanical Symbol Interface
export interface IMechanicalSymbol {
  id: string;
  type: string;
  name: string;
  description?: string;
  category: 'hydraulic' | 'pneumatic' | 'mechanical' | 'electrical' | 'other';
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
}

// Blueprint Interface
export interface IBlueprint extends Document {
  name: string;
  description?: string;
  imageUrl: string;
  s3Key: string;
  originalFilename: string;
  uploadDate: Date;
  symbols: IMechanicalSymbol[];
  totalSymbols: number;
  averageAccuracy: number;
  projectId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: 'processing' | 'completed' | 'failed';
  processingError?: string;
  aiAnalysis: {
    isAnalyzed: boolean;
    analysisDate?: Date;
    processingTime?: number;
    confidence: number;
    summary?: string;
    errorMessage?: string;
  };
  metadata: {
    dimensions: {
      width: number;
      height: number;
    };
    fileSize: number;
    mimetype: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Mechanical Symbol Sub-schema
const MechanicalSymbolSchema = new Schema<IMechanicalSymbol>({
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
const BlueprintSchema = new Schema<IBlueprint>({
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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
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
    transform: function(doc: any, ret: any) {
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
BlueprintSchema.pre<IBlueprint>('save', function(next) {
  if (this.symbols && this.symbols.length > 0) {
    this.totalSymbols = this.symbols.length;
    const totalConfidence = this.symbols.reduce((sum: number, symbol: IMechanicalSymbol) => sum + symbol.confidence, 0);
    this.averageAccuracy = totalConfidence / this.symbols.length;
  }
  next();
});

export const Blueprint = mongoose.model<IBlueprint>('Blueprint', BlueprintSchema);