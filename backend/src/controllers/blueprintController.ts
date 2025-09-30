import { Request, Response } from 'express';
import multer from 'multer';
import { Blueprint } from '../models/Blueprint';
import { User } from '../models/User';
import { uploadToS3, deleteFromS3, validateS3Config } from '../services/s3Service';
import sharp from 'sharp';

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
async function getUserObjectId(firebaseUid: string, userInfo?: { email?: string; name?: string }) {
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
  
  return user._id;
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

    // TODO: Queue AI processing job here
    // await queueSymbolDetection(blueprint._id);

    res.status(201).json({
      success: true,
      data: blueprint,
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
      .limit(Number(limit))
      .populate('projectId', 'name description');

    const total = await Blueprint.countDocuments(filter);

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