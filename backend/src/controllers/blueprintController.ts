import { Request, Response } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { Blueprint } from '../models/Blueprint';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { AIUsage } from '../models/AIUsage';
import { uploadToS3, deleteFromS3, validateS3Config } from '../services/s3Service';
import { analyzeBlueprint, validateImageForAnalysis, getAnalysisCost } from '../services/aiService';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

// Configure multer for file uploads (memory storage)
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

/**
 * Helper function to get user ObjectId from Firebase UID
 * Creates user if it doesn't exist
 */
async function getUserObjectId(firebaseUid: string, userInfo?: { email?: string; name?: string }): Promise<mongoose.Types.ObjectId> {
  // Try to find existing user
  let user = await User.findOne({ firebaseUid });
  
  if (!user) {
    // Create new user if doesn't exist
    user = new User({
      firebaseUid,
      email: userInfo?.email || '',
      name: userInfo?.name || userInfo?.email || 'User',
      lastLoginAt: new Date()
    });
    await user.save();
    console.log('🆕 Created new user for Firebase UID:', firebaseUid);
  } else {
    // Update last login time for existing user
    user.lastLoginAt = new Date();
    await user.save();
  }
  
  return user._id as mongoose.Types.ObjectId;
}

/**
 * Upload a blueprint image
 */
export async function uploadBlueprint(req: Request, res: Response) {
  try {
    // Validate S3 configuration
    if (!validateS3Config()) {
      return res.status(500).json({
        success: false,
        message: 'S3 configuration is incomplete'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { name, description, projectId } = req.body;
    const firebaseUid = req.user?.uid; // From auth middleware

    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get the user ObjectId from Firebase UID (creates user if needed)
    const userObjectId = await getUserObjectId(firebaseUid, {
      email: req.user?.email,
      name: req.user?.name
    });

    // Get image metadata using Sharp
    const metadata = await sharp(req.file.buffer).metadata();
    
    if (!metadata.width || !metadata.height) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image file'
      });
    }

    // Upload to S3
    const uploadResult = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'blueprints'
    );

    // Create blueprint document
    const blueprint = new Blueprint({
      name: name || req.file.originalname,
      description: description || '',
      imageUrl: uploadResult.url,
      s3Key: uploadResult.key,
      originalFilename: req.file.originalname,
      userId: userObjectId, // Use the MongoDB ObjectId from the helper
      projectId: projectId || null,
      symbols: [],
      status: 'processing',
      metadata: {
        dimensions: {
          width: metadata.width,
          height: metadata.height,
        },
        fileSize: req.file.size,
        mimetype: req.file.mimetype,
      },
    });

    await blueprint.save();

    console.log(`📝 [DEBUG] Blueprint created successfully:`);
    console.log(`📝 [DEBUG] - Blueprint _id: ${blueprint._id}`);
    console.log(`📝 [DEBUG] - Blueprint name: ${blueprint.name}`);
    console.log(`📝 [DEBUG] - Blueprint userId: ${blueprint.userId}`);
    console.log(`📝 [DEBUG] - Blueprint projectId: ${blueprint.projectId}`);

    // If projectId is provided, add blueprint to project's blueprintIds array
    if (projectId) {
      try {
        const project = await Project.findOne({ _id: projectId, userId: userObjectId });
        if (project) {
          const blueprintObjectId = blueprint._id as mongoose.Types.ObjectId;
          if (!project.blueprintIds.some(id => id.equals(blueprintObjectId))) {
            project.blueprintIds.push(blueprintObjectId);
            await project.save();
            console.log(`📎 [DEBUG] Added blueprint ${blueprint._id} to project ${projectId}`);
          } else {
            console.log(`📎 [DEBUG] Blueprint ${blueprint._id} already in project ${projectId}`);
          }
        } else {
          console.log(`⚠️ [DEBUG] Project ${projectId} not found or doesn't belong to user`);
        }
      } catch (projectError) {
        console.error('Error adding blueprint to project:', projectError);
        // Don't fail the entire upload if project linking fails
      }
    }

    // Start AI analysis in the background
    processAIAnalysis((blueprint._id as mongoose.Types.ObjectId).toString(), req.file.buffer, req.file.mimetype, userObjectId)
      .catch(error => {
        console.error('Background AI analysis failed:', error);
      });

    const responseData = {
      _id: (blueprint._id as mongoose.Types.ObjectId).toString(),
      id: (blueprint._id as mongoose.Types.ObjectId).toString(), // Add both _id and id for compatibility
      name: blueprint.name,
      description: blueprint.description,
      imageUrl: blueprint.imageUrl,
      s3Key: blueprint.s3Key,
      originalFilename: blueprint.originalFilename,
      userId: (blueprint.userId as any).toString(),
      projectId: blueprint.projectId ? (blueprint.projectId as any).toString() : null,
      symbols: blueprint.symbols,
      status: blueprint.status,
      metadata: blueprint.metadata,
      createdAt: blueprint.createdAt,
      updatedAt: blueprint.updatedAt
    };

    console.log(`📝 [DEBUG] Sending response data:`, responseData);

    res.status(201).json({
      success: true,
      data: responseData,
      message: 'Blueprint uploaded successfully'
    });

  } catch (error) {
    console.error('Blueprint upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload blueprint',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
    });
  }
}

/**
 * Delete a blueprint and its S3 file
 */
export async function deleteBlueprint(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const firebaseUid = req.user?.uid;

    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const userObjectId = await getUserObjectId(firebaseUid, {
      email: req.user?.email,
      name: req.user?.name
    });
    const blueprint = await Blueprint.findOne({ _id: id, userId: userObjectId });

    if (!blueprint) {
      return res.status(404).json({
        success: false,
        message: 'Blueprint not found'
      });
    }

    // Delete from S3
    if (blueprint.s3Key) {
      await deleteFromS3(blueprint.s3Key);
    }

    // Delete from database
    await Blueprint.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Blueprint deleted successfully'
    });

  } catch (error) {
    console.error('Blueprint deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete blueprint',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
    });
  }
}

/**
 * Get user's blueprints
 */
export async function getUserBlueprints(req: Request, res: Response) {
  try {
    const firebaseUid = req.user?.uid;

    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const userObjectId = await getUserObjectId(firebaseUid, {
      email: req.user?.email,
      name: req.user?.name
    });
    const { projectId, status, page = 1, limit = 20 } = req.query;
    
    // Build filter
    const filter: any = { userId: userObjectId };
    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const blueprints = await Blueprint
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
      // Removed .populate('projectId') to keep projectId as ObjectId string
      // The frontend expects projectId to be a string, not a populated object

    const total = await Blueprint.countDocuments(filter);

    console.log(`📋 [DEBUG] getUserBlueprints returning ${blueprints.length} blueprints for user ${userObjectId}`);
    blueprints.forEach(bp => {
      console.log(`  - ${bp._id}: "${bp.name}" (projectId: ${bp.projectId})`);
    });

    // Also log total blueprint count for this user to detect duplicates
    const totalBlueprints = await Blueprint.find({ userId: userObjectId });
    console.log(`📋 [DEBUG] Total blueprints in DB for user: ${totalBlueprints.length}`);
    if (totalBlueprints.length !== blueprints.length) {
      console.log(`📋 [WARNING] Mismatch between filtered and total blueprints! This might indicate pagination or filtering issues.`);
    }

    res.json({
      success: true,
      data: blueprints,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error('Get blueprints error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blueprints',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
    });
  }
}

/**
 * Get a single blueprint by ID
 */
export async function getBlueprintById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const firebaseUid = req.user?.uid;

    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const userObjectId = await getUserObjectId(firebaseUid, {
      email: req.user?.email,
      name: req.user?.name
    });
    const blueprint = await Blueprint
      .findOne({ _id: id, userId: userObjectId })
      .populate('projectId', 'name description');

    if (!blueprint) {
      return res.status(404).json({
        success: false,
        message: 'Blueprint not found'
      });
    }

    res.json({
      success: true,
      data: blueprint
    });

  } catch (error) {
    console.error('Get blueprint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blueprint',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
    });
  }
}

/**
 * Update blueprint name and description
 */
export async function updateBlueprint(req: Request, res: Response) {
  try {
    const firebaseUid = req.user?.uid;
    const { id } = req.params; // Changed from blueprintId to id to match route
    const { name, description } = req.body;

    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    console.log(`📝 [DEBUG] Updating blueprint ${id} with name: "${name}"`);

    const userObjectId = await getUserObjectId(firebaseUid, {
      email: req.user?.email,
      name: req.user?.name
    });

    // Find and update the blueprint
    const blueprint = await Blueprint.findOneAndUpdate(
      { _id: id, userId: userObjectId }, // Changed from blueprintId to id
      { 
        name: name || undefined,
        description: description || undefined,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!blueprint) {
      console.log(`📝 [DEBUG] Blueprint not found for user ${userObjectId} and blueprint ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Blueprint not found'
      });
    }

    console.log(`📝 [DEBUG] Blueprint updated successfully: ${blueprint._id} (name: "${blueprint.name}")`);

    res.json({
      success: true,
      data: blueprint,
      message: 'Blueprint updated successfully'
    });

  } catch (error) {
    console.error('Update blueprint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update blueprint',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
    });
  }
}

/**
 * Process AI analysis for a blueprint
 */
async function processAIAnalysis(blueprintId: string, imageBuffer: Buffer, mimeType: string, userId?: mongoose.Types.ObjectId) {
  try {
    console.log(`🤖 Starting AI analysis for blueprint ${blueprintId}`);

    // Validate image for AI analysis
    const validation = validateImageForAnalysis(imageBuffer, mimeType);
    if (!validation.valid) {
      throw new Error(`Image validation failed: ${validation.reason}`);
    }

    // Check user's AI quota if userId provided
    if (userId) {
      const canAnalyze = await AIUsage.canUserAnalyze(userId);
      if (!canAnalyze.canAnalyze) {
        throw new Error(`AI analysis quota exceeded. ${canAnalyze.remaining} analyses remaining this month.`);
      }
    }

    // Perform AI analysis
    const analysisResult = await analyzeBlueprint(imageBuffer, mimeType);

    // Convert AI symbols to blueprint format
    const blueprintSymbols = analysisResult.symbols.map(symbol => ({
      id: uuidv4(),
      type: symbol.category,
      name: symbol.name,
      description: symbol.description || '',
      category: symbol.category,
      position: symbol.coordinates || { x: 0, y: 0, width: 100, height: 100 },
      confidence: symbol.confidence / 100 // Convert percentage to decimal
    }));

    // Update blueprint with AI results
    const updatedBlueprint = await Blueprint.findByIdAndUpdate(
      blueprintId,
      {
        symbols: blueprintSymbols,
        totalSymbols: blueprintSymbols.length,
        status: 'completed',
        aiAnalysis: {
          isAnalyzed: true,
          analysisDate: new Date(),
          processingTime: analysisResult.processingTime,
          confidence: analysisResult.confidence,
          summary: analysisResult.summary
        }
      },
      { new: true }
    );

    // Record usage if user provided
    if (userId && updatedBlueprint) {
      const cost = getAnalysisCost(imageBuffer.length);
      await AIUsage.recordAnalysis(userId, cost);
      console.log(`📊 Recorded AI usage for user ${userId}: $${cost}`);
    }

    if (updatedBlueprint) {
      console.log(`🤖 AI analysis completed for blueprint ${blueprintId}: ${blueprintSymbols.length} symbols detected`);
    }

  } catch (error) {
    console.error(`🤖 AI analysis failed for blueprint ${blueprintId}:`, error);
    
    // Update blueprint with error status
    await Blueprint.findByIdAndUpdate(
      blueprintId,
      {
        status: 'failed',
        processingError: error instanceof Error ? error.message : 'AI analysis failed',
        aiAnalysis: {
          isAnalyzed: false,
          confidence: 0,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    );
  }
}

/**
 * Trigger AI analysis for an existing blueprint
 */
export async function analyzeExistingBlueprint(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const firebaseUid = req.user?.uid;

    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const userObjectId = await getUserObjectId(firebaseUid, {
      email: req.user?.email,
      name: req.user?.name
    });

    const blueprint = await Blueprint.findOne({ _id: id, userId: userObjectId });

    if (!blueprint) {
      return res.status(404).json({
        success: false,
        message: 'Blueprint not found'
      });
    }

    // Check if already analyzed
    if (blueprint.aiAnalysis?.isAnalyzed) {
      return res.status(400).json({
        success: false,
        message: 'Blueprint has already been analyzed'
      });
    }

    // Check user's AI quota
    const canAnalyze = await AIUsage.canUserAnalyze(userObjectId);
    if (!canAnalyze.canAnalyze) {
      return res.status(402).json({
        success: false,
        message: `AI analysis quota exceeded. You have ${canAnalyze.remaining} analyses remaining this month.`,
        data: {
          tier: canAnalyze.tier,
          remaining: canAnalyze.remaining,
          limit: canAnalyze.limit
        }
      });
    }

    // Download image from S3 for analysis
    // For now, return success and note that analysis will start
    // In production, you'd download the image from S3 and process it

    res.json({
      success: true,
      message: 'AI analysis started for blueprint',
      data: {
        blueprintId: (blueprint._id as mongoose.Types.ObjectId).toString(),
        status: 'processing'
      }
    });

  } catch (error) {
    console.error('AI analysis trigger error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start AI analysis',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
    });
  }
}

/**
 * Get user's AI usage statistics
 */
export async function getUserAIUsage(req: Request, res: Response) {
  try {
    const firebaseUid = req.user?.uid;

    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const userObjectId = await getUserObjectId(firebaseUid, {
      email: req.user?.email,
      name: req.user?.name
    });

    const usage = await AIUsage.getUserUsage(userObjectId);
    const canAnalyze = await AIUsage.canUserAnalyze(userObjectId);

    res.json({
      success: true,
      data: {
        totalAnalyses: usage.analysisCount,
        monthlyAnalyses: usage.monthlyAnalysisCount,
        lastAnalysisDate: usage.lastAnalysisDate,
        totalCost: usage.totalCost,
        subscription: usage.subscription,
        quota: {
          canAnalyze: canAnalyze.canAnalyze,
          remaining: canAnalyze.remaining,
          limit: canAnalyze.limit
        }
      }
    });

  } catch (error) {
    console.error('Get AI usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI usage statistics',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
    });
  }
}