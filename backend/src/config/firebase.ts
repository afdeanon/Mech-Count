import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Path to your service account key file
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
);

// Initialize the Firebase admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
}

// Firestore database instance
export const db = getFirestore();

// Firebase Storage instance
export const bucket = getStorage().bucket();
export const auth = admin.auth();

export default admin;