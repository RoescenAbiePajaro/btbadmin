# 🚀 Deployment Instructions for Render

## Problem Fixed
When refreshing any page (like `/educator/dashboard`, `/student/dashboard`, etc.) on the deployed app, you were getting a "Not Found" error. This is now fixed!

## What Was Changed

### 1. Created `server-frontend.js`
- A simple Express server that serves your React app
- Handles all routes and returns `index.html` for SPA routing

### 2. Updated `package.json`
- Changed `"start"` script from `vite` to `node server-frontend.js`
- This runs the Express server in production

### 3. Updated `render.yaml`
- Changed from **Static Site** to **Web Service**
- Changed environment from `static` to `node`
- Added `startCommand: npm start`

## 📋 Deployment Steps

### Step 1: Commit and Push
```bash
git add .
git commit -m "Fix SPA routing for Render deployment"
git push origin main
```

### Step 2: Update Render Service

You have 2 options:

#### Option A: Modify Existing Service (Recommended)
1. Go to https://dashboard.render.com/
2. Click on your existing `btbstatictest` service
3. Go to **Settings**
4. Change these settings:
   - **Environment**: Change to **Node**
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Click **"Save Changes"**
6. Go to **"Manual Deploy"** → Click **"Deploy latest commit"**

#### Option B: Create New Web Service
1. Go to https://dashboard.render.com/
2. Delete the old static site
3. Click **"New +"** → **"Web Service"**
4. Connect your GitHub repository
5. Configure:
   - **Name**: `btbadmin-frontend`
   - **Environment**: **Node**
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
6. Add Environment Variables:
   ```
   VITE_BACKEND_URL=https://btbtestservice.onrender.com
   VITE_SUPABASE_URL=https://pqghrhpexsrgoscfyuzv.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxZ2hyaHBleHNyZ29zY2Z5dXp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjE2NzEsImV4cCI6MjA4MDQzNzY3MX0.LBU1b9GM1XMaFOqJorQhIml7kEjVAjGgbwgV0XlTvpQ
   ```
7. Click **"Create Web Service"**

### Step 3: Wait for Deployment
- Deployment takes 2-5 minutes
- Watch the build logs for any errors
- Look for: ✅ "Deploy succeeded"

### Step 4: Test Your App
1. Visit your deployed URL
2. Navigate to `/educator/dashboard` or `/student/dashboard`
3. **Refresh the page (F5)**
4. ✅ Should work without "Not Found" error!

## ✅ Expected Result

After deployment, ALL pages will work on refresh:
- ✅ Homepage: `https://yourapp.onrender.com/`
- ✅ Login: `https://yourapp.onrender.com/login`
- ✅ Educator Dashboard: `https://yourapp.onrender.com/educator/dashboard`
- ✅ Student Dashboard: `https://yourapp.onrender.com/student/dashboard`
- ✅ Admin Dashboard: `https://yourapp.onrender.com/admin/dashboard`
- ✅ **All pages work on refresh!**

## 🔧 How It Works

### Before (Static Site):
```
User refreshes /educator/dashboard
→ Render looks for file: dist/educator/dashboard
→ File doesn't exist
→ ❌ 404 Error
```

### After (Web Service):
```
User refreshes /educator/dashboard
→ Express server receives request
→ Server responds with dist/index.html
→ React app loads
→ React Router handles /educator/dashboard route
→ ✅ Shows correct component!
```

## 📞 Need Help?

If you still see "Not Found" errors after deployment:
1. Check Render build logs for errors
2. Verify environment variables are added
3. Make sure `dist` folder contains `index.html`
4. Check that the service is using **Node** environment (not Static)

## 🎉 That's It!

Your React SPA routing is now properly configured for Render deployment!
