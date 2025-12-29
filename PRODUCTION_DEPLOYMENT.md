# Production Deployment Guide

## 🚀 QUICK START

### Prerequisites

- ✅ GitHub repository connected
- ✅ Supabase project created
- ✅ Environment variables documented
- ✅ Secrets management ready

---

## 📋 DEPLOYMENT STEPS

### Step 1: Frontend Deployment (Vercel)

1. **Connect Repository**
   - Go to https://vercel.com
   - Import GitHub repository
   - Select root directory: `/` (frontend)

2. **Configure Build**
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

3. **Set Environment Variables**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Verify deployment URL

### Step 2: Backend Deployment (Railway)

1. **Connect Repository**
   - Go to https://railway.app
   - New Project → Deploy from GitHub
   - Select repository

2. **Configure Service**
   - Root Directory: `backend`
   - Start Command: `npm start`
   - Build Command: `npm install`

3. **Set Environment Variables**
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=sb_publishable_xxx
   SUPABASE_SERVICE_ROLE_KEY=sb_xxx
   NODE_ENV=production
   CORS_ORIGIN=https://your-frontend.vercel.app
   PORT=3001
   ```

4. **Deploy**
   - Railway auto-deploys on push
   - Get deployment URL
   - Update frontend `NEXT_PUBLIC_API_URL`

### Step 3: Verify Deployment

1. **Health Check**
   ```bash
   curl https://your-backend.railway.app/test/health
   ```

2. **Frontend Check**
   - Visit frontend URL
   - Login test
   - Create test sale

3. **Monitor Logs**
   - Vercel: Dashboard → Logs
   - Railway: Service → Logs

---

## 🔧 ENVIRONMENT VARIABLES REFERENCE

### Frontend (.env.production)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

### Backend (.env.production)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_xxx
NODE_ENV=production
CORS_ORIGIN=https://your-frontend.vercel.app
PORT=3001
```

---

## ✅ POST-DEPLOYMENT VERIFICATION

1. ✅ Frontend loads
2. ✅ Login works
3. ✅ Products load
4. ✅ Sales can be created
5. ✅ Health endpoint responds
6. ✅ No console errors
7. ✅ Monitoring active

---

**Deployment complete!** ✅

