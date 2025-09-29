import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
  UserCredential,
  AuthError
} from 'firebase/auth';
import { auth, googleProvider } from '@/config/firebase';
import { User } from '@/types';

// Custom error handling
export const getAuthErrorMessage = (error: AuthError): string => {
  switch (error.code) {
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in cancelled. Please try again.';
    case 'auth/popup-blocked':
      return 'Pop-up blocked. Please allow pop-ups and try again.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
};

// Convert Firebase user to our User type
export const convertFirebaseUser = (firebaseUser: FirebaseUser): User => {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: firebaseUser.displayName || firebaseUser.email || 'User',
    avatar: firebaseUser.photoURL || undefined
  };
};

// Email and password sign up
export const signUpWithEmail = async (
  email: string,
  password: string,
  name: string
): Promise<User> => {
  try {
    const userCredential: UserCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    
    // Update the user's display name
    await updateProfile(userCredential.user, {
      displayName: name
    });

    // Reload user to get updated profile
    await userCredential.user.reload();
    
    return convertFirebaseUser(userCredential.user);
  } catch (error) {
    throw new Error(getAuthErrorMessage(error as AuthError));
  }
};

// Email and password sign in
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return convertFirebaseUser(userCredential.user);
  } catch (error) {
    throw new Error(getAuthErrorMessage(error as AuthError));
  }
};

// Google sign in
export const signInWithGoogle = async (): Promise<User> => {
  try {
    const userCredential: UserCredential = await signInWithPopup(auth, googleProvider);
    return convertFirebaseUser(userCredential.user);
  } catch (error) {
    throw new Error(getAuthErrorMessage(error as AuthError));
  }
};

// Sign out
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error(getAuthErrorMessage(error as AuthError));
  }
};

// Auth state listener
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      callback(convertFirebaseUser(firebaseUser));
    } else {
      callback(null);
    }
  });
};

// Get current user
export const getCurrentUser = (): User | null => {
  const firebaseUser = auth.currentUser;
  return firebaseUser ? convertFirebaseUser(firebaseUser) : null;
};