# Supabase Environment Variables Setup Guide

## 🚨 IMPORTANT: API Key Error Fix

Agar aapko "Invalid API key" ya "Configuration error" aa raha hai, to yeh guide follow karein.

---

## Step 1: Supabase Dashboard se API Keys lein

1. **Supabase Dashboard** kholen: https://app.supabase.com
2. Apna project select karein
3. **Settings** → **API** par jayein
4. Yahan aapko milenge:
   - **Project URL** (example: `https://xnpevheuniybnadyfjut.supabase.co`)
   - **API Keys** section mein:
     - **Publishable key** (yeh use karein frontend ke liye)
     - **Secret key** (backend ke liye, frontend mein NAHI use karein)

---

## Step 2: `.env.local` File Create Karein

**File Location:** `my-pos-system/.env.local`

**File Content:**
```env
# Supabase Configuration
# Get these from: Supabase Dashboard → Settings → API

# Project URL (Settings → API → Project URL)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Publishable Key (Settings → API → Publishable key)
# IMPORTANT: Use "Publishable key" NOT "Secret key" for frontend
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key-here
```

---

## Step 3: Keys Ko Copy Karein

### Option A: New API Keys Format (Recommended)
Agar Supabase Dashboard mein **"Publishable key"** aur **"Secret key"** dikh rahe hain:

1. **Publishable key** copy karein (starts with `sb_publishable_...`)
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` mein paste karein

### Option B: Legacy API Keys Format
Agar **"anon public"** aur **"service_role"** keys dikh rahe hain:

1. **anon public** key copy karein
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` mein paste karein

---

## Step 4: File Save Karein

1. `.env.local` file save karein
2. **Server restart karein** (important!)
   ```bash
   # Stop server (Ctrl+C)
   # Then restart
   npm run dev
   ```

---

## Step 5: Verification

Browser console mein check karein:
- Agar error nahi aa raha = ✅ Success
- Agar "Invalid API key" aa raha = ❌ Keys galat hain

---

## Common Issues

### Issue 1: "Invalid API key"
**Solution:** 
- Check karein ke `NEXT_PUBLIC_SUPABASE_ANON_KEY` mein **Publishable key** hai (NOT Secret key)
- Keys mein extra spaces na hon
- Server restart karein

### Issue 2: "Missing Supabase environment variables"
**Solution:**
- Check karein ke `.env.local` file `my-pos-system` folder mein hai
- File name exactly `.env.local` ho (`.env` nahi)
- Server restart karein

### Issue 3: Keys kaam nahi kar rahe
**Solution:**
- Supabase Dashboard mein check karein ke project active hai
- Project URL sahi hai ya nahi
- Browser cache clear karein

---

## Example `.env.local` File

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xnpevheuniybnadyfjut.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_Gl2zL4cEDTc0pv6VP9gFFA_GOSLU...
```

**Note:** Actual keys ko replace karein apne Supabase project se.

---

## Security Notes

✅ **SAFE (Frontend mein use karein):**
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Publishable key)
- `NEXT_PUBLIC_SUPABASE_URL`

❌ **NEVER USE IN FRONTEND:**
- Secret key (service_role key)
- Backend API keys

---

## Need Help?

1. Supabase Dashboard → Settings → API
2. Copy Project URL aur Publishable key
3. `.env.local` file mein paste karein
4. Server restart karein

**Done!** ✅

