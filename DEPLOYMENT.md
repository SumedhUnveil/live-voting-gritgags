# Live Voting App - Deployment Guide

## 🚀 Deploy to Render (Recommended)

### Step 1: Prepare Your Repository
```bash
cd c:\Users\sumedh-unveil\Desktop\live-voting
git init
git add .
git commit -m "Initial commit for deployment"
```

### Step 2: Push to GitHub
1. Create a new repository on GitHub: https://github.com/new
2. Name it: `live-voting-app`
3. Run:
```bash
git remote add origin https://github.com/YOUR_USERNAME/live-voting-app.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy Backend on Render
1. Go to https://render.com (sign up with GitHub)
2. Click **New** → **Web Service**
3. Connect your `live-voting-app` repository
4. Configure:
   - **Name**: `live-voting-backend`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Click **Create Web Service**
6. Wait 2-3 minutes for deployment
7. Copy your backend URL (e.g., `https://live-voting-backend.onrender.com`)

### Step 4: Deploy Frontend on Vercel
1. Go to https://vercel.com (sign up with GitHub)
2. Click **Add New** → **Project**
3. Import your `live-voting-app` repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (leave as root)
   - **Environment Variables**:
     - `NEXT_PUBLIC_API_URL` = `https://live-voting-backend.onrender.com`
5. Click **Deploy**
6. Your app will be live at `https://live-voting-app.vercel.app`

### Step 5: Share with Participants
- **Participant URL**: `https://live-voting-backend.onrender.com/participant`
- **Admin URL**: `https://live-voting-backend.onrender.com/admin`

---

## ⚡ Alternative: Quick ngrok (For Testing Right Now)

If you need it working **immediately** for testing:

```bash
# Install ngrok: https://ngrok.com/download
# Or use: choco install ngrok (if you have Chocolatey)

# In backend terminal:
ngrok http 3001
```

Copy the ngrok URL (e.g., `https://abc123.ngrok-free.app`) and:
1. Update `.env.local`: `NEXT_PUBLIC_API_URL=https://abc123.ngrok-free.app`
2. Restart both servers
3. Share the ngrok URL with participants

**Note**: ngrok free tier has limits (40 connections/minute), so use Render for the actual event.
