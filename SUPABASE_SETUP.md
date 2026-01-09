# 🔧 Supabase Connection Setup Guide

## ❌ Error You're Seeing

```
Network connection failed. Please check your internet connection.
```

This error occurs when the app cannot connect to Supabase database.

## ✅ Quick Fix (5 Minutes)

### Step 1: Create Environment File

Create a file named `.env.local` in the `my-pos-system` folder:

```bash
# Navigate to my-pos-system folder
cd my-pos-system

# Create .env.local file
# On Windows:
type nul > .env.local

# On Mac/Linux:
touch .env.local
```

### Step 2: Get Supabase Credentials

1. Go to: https://app.supabase.com
2. Open your project
3. Go to: **Settings** → **API**
4. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

### Step 3: Add to .env.local

Open `.env.local` and paste:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ Important:**
- Replace `https://your-project-id.supabase.co` with YOUR actual URL
- Replace the anon key with YOUR actual key
- Use the **anon/public** key, NOT the service_role key

### Step 4: Restart Server

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

## 🔍 Troubleshooting

### Error Persists?

**Check #1: Supabase Project Status**
- Go to your Supabase dashboard
- Check if project is **paused** (free tier auto-pauses after inactivity)
- If paused, click "Resume Project"

**Check #2: Internet Connection**
- Test: Can you open https://supabase.com in browser?
- Check firewall/antivirus isn't blocking connection

**Check #3: Environment Variables Loaded**
- Restart your IDE (VS Code/Cursor)
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- Check browser console for Supabase initialization message

**Check #4: Correct URL Format**
```
✅ Correct:   https://abcd1234.supabase.co
❌ Wrong:     http://abcd1234.supabase.co (missing 's' in https)
❌ Wrong:     abcd1234.supabase.co (missing https://)
```

## 📊 What You'll See When Working

### Console Messages (Normal)

```
✅ Supabase Frontend Client Initialized
   URL: ✅ Set
   Key prefix: eyJhbG...
   Key format: Legacy (anon)
   Key length: 185 characters
   ✅ Using ANON/PUBLISHABLE key only (safe for frontend)
```

### Connection Status

The app now includes:
- ✅ Automatic retry (3 attempts)
- ✅ 30-second timeout
- ✅ Better error messages
- ✅ Offline mode fallback

## 🔒 Security Notes

**Safe to use in .env.local:**
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**NEVER use in frontend:**
- ❌ `SUPABASE_SERVICE_ROLE_KEY`

The anon key is **designed** to be public. Your database is protected by Row Level Security (RLS) policies.

## 💡 Additional Help

- **Full ENV Setup Guide:** See `ENV_SETUP_GUIDE.md`
- **Supabase Docs:** https://supabase.com/docs
- **RLS Security:** https://supabase.com/docs/guides/auth/row-level-security

## 🎯 After Setup

Once connected, you should be able to:
- ✅ Login/Register users
- ✅ View products, sales, purchases
- ✅ Add new items
- ✅ Generate reports
- ✅ Print receipts

Need more help? Check the console for detailed error messages!

