import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Project } from '../models/Project';
import { Blueprint } from '../models/Blueprint';
import { User } from '../models/User';
import Joi from 'joi';

// Validation schemas
const createProjectSchema = Joi.object({
  name: Joi.string().required().min(1).max(100),
  description: Joi.string().required().min(1).max(500)
});

const updateProjectSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  description: Joi.string().min(1).max(500)
});

// Get all projects for the authenticated user
export const getProjects = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Find user first
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const projects = await Project.find({ userId: user._id })
      .populate('blueprintIds')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Projects retrieved successfully',
      data: projects
    });
  } catch (error) {
    console.error('Error in getProjects:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get single project by ID
export const getProject = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { projectId } = req.params;

    // Find user first
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const project = await Project.findOne({ _id: projectId, userId: user._id })
      .populate('blueprintIds');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    res.json({
      success: true,
      message: 'Project retrieved successfully',
      data: project
    });
  } catch (error) {
    console.error('Error in getProject:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Create new project
export const createProject = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Validate input
    const { error } = createProjectSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details
      });
    }

    // Find user first
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { name, description } = req.body;

    const project = new Project({
      name,
      description,
      userId: user._id,
      blueprintIds: []
    });

    await project.save();

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project
    });
  } catch (error) {
    console.error('Error in createProject:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update project
export const updateProject = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { projectId } = req.params;

    // Validate input
    const { error } = updateProjectSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details
      });
    }

    // Find user first
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const project = await Project.findOneAndUpdate(
      { _id: projectId, userId: user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: project
    });
  } catch (error) {
    console.error('Error in updateProject:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete project
export const deleteProject = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { projectId } = req.params;

    // Find user first
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const project = await Project.findOneAndDelete({ _id: projectId, userId: user._id });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Also delete associated blueprints - convert projectId to ObjectId
    const projectObjectId = new mongoose.Types.ObjectId(projectId);
    
    // Debug: Check what blueprints exist for this project before deletion
    const blueprintsToDelete = await Blueprint.find({ projectId: projectObjectId });
    console.log(`🔍 Found ${blueprintsToDelete.length} blueprints to delete for project ${projectId}`);
    console.log('🔍 Blueprint IDs:', blueprintsToDelete.map(bp => bp._id));
    
    const deletedBlueprints = await Blueprint.deleteMany({ projectId: projectObjectId });
    
    console.log(`🗑️ Deleted ${deletedBlueprints.deletedCount} blueprints associated with project ${projectId}`);

    res.json({
      success: true,
      message: 'Project deleted successfully',
      data: {
        deletedBlueprints: deletedBlueprints.deletedCount
      }
    });
  } catch (error) {
    console.error('Error in deleteProject:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Add blueprint to project
export const addBlueprintToProject = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { projectId } = req.params;
    const { blueprintId } = req.body;

    if (!projectId || !blueprintId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID and Blueprint ID are required'
      });
    }

    // Validate ObjectId formats
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID format'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(blueprintId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid blueprint ID format'
      });
    }

    // Find user first
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify project exists and belongs to user
    const project = await Project.findOne({ _id: projectId, userId: user._id });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Verify blueprint exists and belongs to user
    const blueprint = await Blueprint.findOne({ _id: blueprintId, userId: user._id });
    if (!blueprint) {
      return res.status(404).json({
        success: false,
        message: 'Blueprint not found'
      });
    }

    // Check if blueprint is already in project
    const blueprintObjectId = new mongoose.Types.ObjectId(blueprintId);
    if (project.blueprintIds.some(id => id.equals(blueprintObjectId))) {
      return res.status(400).json({
        success: false,
        message: 'Blueprint is already in this project'
      });
    }

    // Add blueprint to project
    project.blueprintIds.push(blueprintObjectId);
    await project.save();

    // Update blueprint's projectId
    blueprint.projectId = new mongoose.Types.ObjectId(projectId);
    await blueprint.save();
    
    console.log(`📎 Successfully linked blueprint ${blueprintId} to project ${projectId}`);
    console.log(`📎 Blueprint projectId is now: ${blueprint.projectId}`);

    res.json({
      success: true,
      message: 'Blueprint added to project successfully',
      data: project
    });
  } catch (error) {
    console.error('Error in addBlueprintToProject:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Remove blueprint from project
export const removeBlueprintFromProject = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { projectId, blueprintId } = req.params;

    if (!projectId || !blueprintId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID and Blueprint ID are required'
      });
    }

    // Validate ObjectId formats
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID format'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(blueprintId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid blueprint ID format'
      });
    }

    // Find user first
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify project exists and belongs to user
    const project = await Project.findOne({ _id: projectId, userId: user._id });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Remove blueprint from project
    const blueprintObjectId = new mongoose.Types.ObjectId(blueprintId);
    project.blueprintIds = project.blueprintIds.filter(id => !id.equals(blueprintObjectId));
    await project.save();

    // Remove project reference from blueprint
    await Blueprint.findByIdAndUpdate(blueprintId, { $unset: { projectId: 1 } });

    res.json({
      success: true,
      message: 'Blueprint removed from project successfully',
      data: project
    });
  } catch (error) {
    console.error('Error in removeBlueprintFromProject:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};