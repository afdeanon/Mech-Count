"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = exports.authenticateToken = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
// Initialize Firebase Admin SDK
const initializeFirebase = () => {
    if (firebase_admin_1.default.apps.length === 0) {
        // Debug: Log environment variables
        console.log('🔐 Firebase config debug:');
        console.log('- PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
        console.log('- CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL);
        console.log('- PRIVATE_KEY exists:', !!process.env.FIREBASE_PRIVATE_KEY);
        console.log('- PRIVATE_KEY length:', process.env.FIREBASE_PRIVATE_KEY?.length);
        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        };
        console.log('🔐 Service account object:', {
            projectId: serviceAccount.projectId,
            clientEmail: serviceAccount.clientEmail,
            privateKeyExists: !!serviceAccount.privateKey
        });
        firebase_admin_1.default.initializeApp({
            credential: firebase_admin_1.default.credential.cert(serviceAccount),
        });
    }
};
// Initialize Firebase
initializeFirebase();
// Authentication middleware
const authenticateToken = async (req, res, next) => {
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
        const decodedToken = await firebase_admin_1.default.auth().verifyIdToken(token);
        // Add user info to request
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name,
            firebaseUid: decodedToken.uid
        };
        next();
    }
    catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};
exports.authenticateToken = authenticateToken;
// Keep the old authenticate function for backward compatibility
exports.authenticate = exports.authenticateToken;
