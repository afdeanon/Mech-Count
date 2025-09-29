import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  if (admin.apps.length === 0) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
  }
};

// Initialize Firebase
initializeFirebase();

// Authentication middleware
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No token provided'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Add user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      firebaseUid: decodedToken.uid
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Keep the old authenticate function for backward compatibility
export const authenticate = authenticateToken;