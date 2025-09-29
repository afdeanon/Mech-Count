import { Request, Response } from 'express';
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

    const { id } = req.params;

    // Find user first
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const project = await Project.findOne({ _id: id, userId: user._id })
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

    const { id } = req.params;

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
      { _id: id, userId: user._id },
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

    const { id } = req.params;

    // Find user first
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const project = await Project.findOneAndDelete({ _id: id, userId: user._id });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Also delete associated blueprints
    await Blueprint.deleteMany({ projectId: id });

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteProject:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};