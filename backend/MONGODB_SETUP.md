# MongoDB Setup Guide for Mech-Count

## Option 1: Local MongoDB (Quick Development Setup)

### Step 1: Install MongoDB locally
```bash
# macOS with Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb/brew/mongodb-community
```

### Step 2: Verify MongoDB is running
```bash
# Check if MongoDB is running on default port 27017
mongosh --eval "db.adminCommand('ismaster')"
```

### Step 3: Your current `.env` is already configured for local MongoDB:
```
MONGODB_URI=mongodb://localhost:27017/mech-count
```

---

## Option 2: MongoDB Atlas (Cloud - Recommended for Production)

### Step 1: Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new cluster (choose the free M0 tier)

### Step 2: Configure Database Access
1. Go to "Database Access" in your Atlas dashboard
2. Click "Add New Database User"
3. Create a username and password
4. Grant "Read and write to any database" permissions

### Step 3: Configure Network Access
1. Go to "Network Access"
2. Click "Add IP Address"
3. Select "Allow Access from Anywhere" (for development) or add your specific IP

### Step 4: Get Connection String
1. Go to "Database" and click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your database user password

### Step 5: Update your `.env` file
```env
# Replace the MONGODB_URI with your Atlas connection string
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/mech-count?retryWrites=true&w=majority
```

---

## Testing Your Database Connection

1. Start your backend server:
```bash
cd /Users/angelifaithdeanon/Desktop/ReactProjects/mech-count/backend
npm run dev
```

2. Check the health endpoint:
```bash
curl http://localhost:3000/health
```

3. You should see:
```json
{
  "status": "ok",
  "message": "Server is running",
  "database": "MongoDB connected",
  "timestamp": "2025-09-29T..."
}
```

---

## Next Steps

Once your database is connected:

1. **API Endpoints**: Create CRUD operations for users, projects, and blueprints
2. **Authentication**: Integrate Firebase Auth with your database
3. **File Upload**: Set up AWS S3 for blueprint image storage
4. **AI Integration**: Add OpenAI Vision API for symbol detection

---

## Troubleshooting

### Connection Issues:
- **Local MongoDB**: Make sure MongoDB service is running
- **Atlas**: Check network access whitelist and credentials
- **Both**: Verify the connection string format in `.env`

### Common Errors:
- `MongooseServerSelectionError`: Database server not reachable
- `MongoParseError`: Invalid connection string format
- `MongoAuthenticationError`: Wrong username/password

---

## Recommended: Start with Local Development

For now, I recommend starting with **local MongoDB** for development:

1. It's faster to set up
2. No internet dependency
3. No usage limits
4. Easy to reset/clear data during development

You can always migrate to Atlas later when you're ready for production!