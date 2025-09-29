# Firebase Authentication Setup Guide

This guide will walk you through setting up Firebase Authentication for your Mech-Count application with both Google OAuth and Email/Password authentication.

## Prerequisites

- Firebase project (create one at [Firebase Console](https://console.firebase.google.com))
- Google account
- Node.js and npm/yarn installed

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project" or "Add project"
3. Enter your project name (e.g., "mech-count")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Set up Authentication

1. In your Firebase project, navigate to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable the following sign-in providers:

### Email/Password Authentication
1. Click on "Email/Password"
2. Enable "Email/Password"
3. Click "Save"

### Google Authentication
1. Click on "Google"
2. Enable Google sign-in
3. Add your project support email
4. Add authorized domains if needed (localhost is included by default)
5. Click "Save"

## Step 3: Get Firebase Configuration

1. Go to Project Settings (click the gear icon next to "Project Overview")
2. Scroll down to "Your apps" section
3. Click the web app icon (`</>`) to add a web app
4. Register your app with a nickname (e.g., "mech-count-web")
5. Copy the Firebase configuration object

## Step 4: Configure Environment Variables

1. In your project root, you should already have a `.env` file
2. Replace the placeholder values with your actual Firebase config:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_actual_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_actual_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_actual_sender_id
VITE_FIREBASE_APP_ID=your_actual_app_id
```

**Important:** 
- Never commit your `.env` file to version control
- Make sure `.env` is in your `.gitignore` file
- Use `VITE_` prefix for environment variables in Vite projects

## Step 5: Update Firebase Security Rules (Optional)

For production apps, you may want to set up Firestore security rules:

1. Go to "Firestore Database" in Firebase Console
2. Click on "Rules" tab
3. Set appropriate security rules based on your needs

## Step 6: Testing the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Try the authentication features:
   - Sign up with email and password
   - Sign in with existing account
   - Sign in with Google
   - Sign out

## Step 7: Production Deployment

When deploying to production:

1. Add your production domain to Firebase authorized domains:
   - Go to Authentication > Settings > Authorized domains
   - Add your production domain

2. Set up environment variables in your hosting platform with the same Firebase configuration

## Troubleshooting

### Common Issues:

1. **"Firebase: Error (auth/unauthorized-domain)"**
   - Add your domain to Firebase authorized domains

2. **"Firebase: Error (auth/api-key-not-valid)"**
   - Check that your API key is correct in the `.env` file

3. **"Firebase: Error (auth/project-not-found)"**
   - Verify your project ID is correct

4. **Google Sign-in popup blocked**
   - Ensure pop-ups are allowed in browser
   - Check that Google OAuth is properly configured

### Debug Steps:

1. Check browser console for detailed error messages
2. Verify all environment variables are properly set
3. Ensure Firebase project has the correct authentication methods enabled
4. Check that your domain is authorized in Firebase settings

## Security Best Practices

1. **Never expose sensitive configuration**: Use environment variables
2. **Enable only required auth methods**: Disable unused authentication providers
3. **Set up proper security rules**: Implement Firestore security rules if using database
4. **Monitor authentication**: Use Firebase Console to monitor sign-ins and errors
5. **Handle errors gracefully**: Implement proper error handling in your application

## Additional Features

You can extend the authentication system by:

1. **Email verification**: Enable email verification in Firebase Console
2. **Password reset**: Implement password reset functionality
3. **Profile management**: Allow users to update their profiles
4. **Multi-factor authentication**: Add extra security layers
5. **Custom claims**: Implement role-based authentication

## Support

- [Firebase Documentation](https://firebase.google.com/docs/auth)
- [Firebase Auth Web Guide](https://firebase.google.com/docs/auth/web/start)
- [Firebase Console](https://console.firebase.google.com)

---

## Current Implementation Features

✅ Email/Password registration and login
✅ Google OAuth authentication  
✅ User session persistence
✅ Automatic authentication state restoration
✅ Error handling with user-friendly messages
✅ Loading states during authentication
✅ Logout functionality
✅ Toast notifications for auth events