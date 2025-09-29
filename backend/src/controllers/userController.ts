import { Request, Response } from 'express';
import { User } from '../models/User';

// Get or create user from Firebase authentication
export const getOrCreateUser = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { uid, email, name } = req.user;

    // Try to find existing user
    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      // Create new user if doesn't exist
      user = new User({
        firebaseUid: uid,
        email: email || '',
        name: name || email || 'Unknown User',
        lastLoginAt: new Date()
      });
      await user.save();
      
      return res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user
      });
    }

    // Update last login time
    user.lastLoginAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'User retrieved successfully',
      data: user
    });
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user profile
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const user = await User.findOne({ firebaseUid: req.user.uid });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User profile retrieved successfully',
      data: user
    });
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update user profile
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { name, avatar } = req.body;

    const user = await User.findOneAndUpdate(
      { firebaseUid: req.user.uid },
      { 
        ...(name && { name }),
        ...(avatar && { avatar })
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};