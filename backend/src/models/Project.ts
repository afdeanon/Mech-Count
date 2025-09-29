import mongoose, { Document, Schema } from 'mongoose';

// Project Interface
export interface IProject extends Document {
  name: string;
  description: string;
  userId: mongoose.Types.ObjectId;
  blueprintIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// Project Schema
const ProjectSchema = new Schema<IProject>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  blueprintIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blueprint'
  }]
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
ProjectSchema.index({ userId: 1, createdAt: -1 });

export const Project = mongoose.model<IProject>('Project', ProjectSchema);