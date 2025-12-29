# Supabase Visibility Diagnosis Report

## 🔍 Live System Audit - Data Not Visible on Web Frontend

**Date**: Current  
**Stack**: Next.js Frontend + Node.js Backend + Supabase (PostgreSQL + RLS)

---

## STEP 1 — SUPABASE PROJECT VERIFICATION

### Action Required:
1. Open Supabase Dashboard
2. Go to Project Settings → API
3. Verify Project URL matches:
   - Backend `.env`: `SUPABASE_URL`
   - Frontend `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`

4. Verify Publishable (anon) Key matches:
   - Backend `.env`: `SUPABASE_ANON_KEY`
   - Frontend `.env.local`: `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Expected Configuration:

**Backend** (`backend/.env`):
```
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=[anon-key-from-dashboard]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key-from-dashboard]
```

**Frontend** (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key-from-dashboard]
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### Report Format:
```
✅ STEP 1 RESULTS:
- Supabase Project URL: [URL from dashboard]
- Backend SUPABASE_URL: [URL from .env] → [MATCH / MISMATCH]
- Frontend NEXT_PUBLIC_SUPABASE_URL: [URL from .env.local] → [MATCH / MISMATCH]
- Backend SUPABASE_ANON_KEY: [First 10 chars] → [MATCH / MISMATCH]
- Frontend NEXT_PUBLIC_SUPABASE_ANON_KEY: [First 10 chars] → [MATCH / MISMATCH]
```

### ⚠️ Common Issues:
- URL mismatch between backend and frontend
- Wrong project URL (staging vs production)
- Anon key mismatch

---

## STEP 2 — DATABASE DATA CHECK (ADMIN VIEW)

### Action Required:
Open **Supabase SQL Editor** (use service role/admin access) and run:

```sql
-- Comprehensive data check
SELECT 
    'businesses' as table_name,
    COUNT(*) as row_count
FROM businesses
UNION ALL
SELECT 'business_locations', COUNT(*) FROM business_locations
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'units', COUNT(*) FROM units
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'brands', COUNT(*) FROM brands;
```

### Expected Results:
- `businesses`: **≥ 1 row** (CRITICAL)
- `business_locations`: **≥ 1 row** (CRITICAL)
- `user_profiles`: **≥ 1 row** (CRITICAL - MUST HAVE)
- `products`: 0 or more rows
- `units`: **≥ 1 row** (CRITICAL - base unit needed)
- `categories`: 0 or more rows
- `brands`: 0 or more rows

### Report Format:
```
✅ STEP 2 RESULTS:
- businesses: X rows [OK / MISSING]
- business_locations: X rows [OK / MISSING]
- user_profiles: X rows [OK / MISSING] ⚠️ CRITICAL
- products: X rows [OK / EMPTY]
- units: X rows [OK / MISSING]
- categories: X rows
- brands: X rows
```

### ⚠️ If user_profiles is 0:
**This is the #1 cause of data invisibility!**
- Backend will return 403 "User is not associated with any business"
- Frontend will show empty data or error

---

## STEP 3 — AUTH & USER LINK CHECK

### Action Required:

**Part A: Identify Current User**
1. Go to Supabase Dashboard → Authentication → Users
2. Find your logged-in user (by email)
3. Copy the UUID (user ID)

**Part B: Check user_profiles Link**
Run in SQL Editor:

```sql
-- Replace 'YOUR_USER_UUID' with actual UUID from Auth dashboard
SELECT 
    up.id,
    up.user_id,
    up.business_id,
    b.name as business_name,
    b.id as business_id_verified,
    up.role,
    up.created_at
FROM user_profiles up
LEFT JOIN businesses b ON b.id = up.business_id
WHERE up.user_id = 'YOUR_USER_UUID'::UUID;
```

**Part C: Check All Users Without Profiles**
```sql
-- Find users without profiles
SELECT 
    u.id as user_id,
    u.email,
    u.created_at as user_created_at,
    CASE 
        WHEN up.id IS NULL THEN '❌ NO PROFILE'
        ELSE '✅ HAS PROFILE'
    END as profile_status
FROM auth.users u
LEFT JOIN user_profiles up ON up.user_id = u.id
ORDER BY u.created_at DESC;
```

### Report Format:
```
✅ STEP 3 RESULTS:
- My user_id (from Auth): [UUID]
- My email: [email]
- user_profiles row exists: [YES / NO] ⚠️
- business_id in profile: [ID / NULL] ⚠️
- Business name: [Name / NULL]
- Users without profiles: X users
```

### ⚠️ If profile doesn't exist:
**This is the #1 root cause!**

**Fix** (when instructed):
```sql
-- Get your user_id first
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then create profile (replace UUID and business_id)
INSERT INTO user_profiles (user_id, business_id, role)
VALUES ('YOUR_USER_UUID'::UUID, 1, 'owner');
```

---

## STEP 4 — RLS VISIBILITY CHECK

### Action Required:

**Part A: Check RLS Status**
```sql
-- Check if RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('products', 'user_profiles', 'businesses', 'business_locations')
ORDER BY tablename;
```

**Part B: Test get_user_business_id() Function**
```sql
-- This function is CRITICAL for RLS
-- It should return business_id (not NULL)
SELECT get_user_business_id() as business_id_result;

-- If NULL, RLS will block ALL data!
```

**Part C: Check Function Definition**
```sql
-- Verify function reads from user_profiles
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'get_user_business_id';
```

**Part D: Test RLS with Authenticated Role**
```sql
-- Note: This is a simulation
-- Actual RLS uses auth.uid() automatically

-- Check what an authenticated user would see
-- (This requires actual authentication, so test via API instead)
```

### Report Format:
```
✅ STEP 4 RESULTS:
- RLS Enabled on products: [YES / NO]
- RLS Enabled on user_profiles: [YES / NO]
- get_user_business_id() exists: [YES / NO]
- get_user_business_id() returns: [business_id / NULL] ⚠️ CRITICAL
- Function reads from: [user_profiles / other]
```

### ⚠️ If get_user_business_id() returns NULL:
**This is the #2 root cause!**
- RLS will block ALL queries
- Even if data exists, it won't be visible
- Fix: Ensure user_profiles has row for your user

---

## STEP 5 — BACKEND CONNECTION CHECK

### Action Required:

**Part A: Verify Backend Environment**
1. Check `backend/.env` file exists
2. Verify variables:
   - `SUPABASE_URL` matches dashboard
   - `SUPABASE_ANON_KEY` matches dashboard
   - `SUPABASE_SERVICE_ROLE_KEY` is set

**Part B: Test Backend Health**
```bash
# Is backend running?
curl http://localhost:3001/health
```

**Part C: Test Products API with JWT**

1. **Get JWT Token:**
   - Log in via frontend (http://localhost:3000/login)
   - Open browser DevTools → Application → Local Storage
   - Find Supabase auth token OR
   - Use Network tab to capture token from login request

2. **Test API:**
```bash
# Replace YOUR_JWT_TOKEN with actual token
curl -X GET "http://localhost:3001/api/v1/products" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -v
```

**Part D: Check Backend Logs**
Look at backend console for:
- Authentication success/failure
- business_id extraction
- Database query errors
- RLS errors

### Expected Backend Flow:

1. **Request arrives** → `authenticateUser` middleware
2. **Extract JWT** → Verify with Supabase
3. **Get user_id** → From JWT token
4. **Query user_profiles** → Get business_id
5. **Attach business_id** → To request context
6. **Query products** → Filter by business_id

### Report Format:
```
✅ STEP 5 RESULTS:
- Backend .env exists: [YES / NO]
- SUPABASE_URL matches dashboard: [YES / NO]
- SUPABASE_ANON_KEY matches dashboard: [YES / NO]
- Backend server running: [YES / NO]
- Health endpoint: [200 OK / Connection refused]
- JWT Token obtained: [YES / NO]
- API Response Status: [200 / 401 / 403 / 500]
- API Response Body: [Show JSON]
- business_id in request: [ID / NULL] ⚠️
- Backend Logs: [Any errors?]
```

### ⚠️ Common Backend Issues:

1. **403 "User is not associated with any business"**
   - **Cause**: user_profiles table is empty
   - **Fix**: Create user_profiles row

2. **401 "Invalid or expired token"**
   - **Cause**: Token expired or invalid
   - **Fix**: Re-login to get new token

3. **200 with empty array `[]`**
   - **Cause**: No products OR RLS blocking
   - **Fix**: Check RLS and data

4. **500 Internal Server Error**
   - **Cause**: Backend code error
   - **Fix**: Check backend logs

---

## STEP 6 — FRONTEND NETWORK CHECK

### Action Required:

1. **Open Browser** → http://localhost:3000/products
2. **Open DevTools** (F12)
3. **Go to Network Tab**
4. **Filter by "products" or "api"**
5. **Click on the API request**
6. **Check Request Tab:**
   - URL: Should be `http://localhost:3001/api/v1/products`
   - Method: GET
   - Headers → Authorization: Should have `Bearer ...`
   - Request Headers: Show full headers

7. **Check Response Tab:**
   - Status: 200 / 401 / 403 / 500
   - Preview/Body: Show full JSON response

8. **Check Console Tab:**
   - Any JavaScript errors?
   - Any authentication errors?
   - Any API errors?

### Expected Frontend Flow:

1. **Page loads** → `ProductsPage` component
2. **useEffect runs** → Calls `productsApi.getAll()`
3. **API client** → Gets token from Supabase session
4. **Fetch request** → Adds Authorization header
5. **Backend responds** → Returns products or error
6. **Frontend updates** → Sets products state

### Report Format:
```
✅ STEP 6 RESULTS:
- Request URL: [Full URL]
- Request Method: [GET / POST / etc]
- Authorization Header: [Present / Missing] ⚠️
- Token (first 10 chars): [Bearer eyJ... / Missing]
- Response Status: [200 / 401 / 403 / 500]
- Response Headers: [Show relevant headers]
- Response Body: [Full JSON - show here]
- Console Errors: [List any errors]
- Network Errors: [List any errors]
```

### ⚠️ Common Frontend Issues:

1. **Missing Authorization Header**
   - **Cause**: Token not retrieved from Supabase session
   - **Fix**: Check `getAuthToken()` function

2. **401 Unauthorized**
   - **Cause**: Token expired or invalid
   - **Fix**: Re-login

3. **403 Forbidden**
   - **Cause**: user_profiles missing
   - **Fix**: Create user_profiles row

4. **Empty array `[]`**
   - **Cause**: No data OR RLS blocking
   - **Fix**: Check database and RLS

5. **CORS Error**
   - **Cause**: Backend CORS not configured
   - **Fix**: Check backend CORS settings

---

## STEP 7 — ROOT CAUSE DECISION

### Answer These Questions Based on Steps 1-6:

**1. Is data missing in database?**
- [ ] YES - No products in database
- [ ] NO - Products exist but not visible

**2. Is user_profiles missing or empty?**
- [ ] YES - No row in user_profiles for logged-in user
- [ ] NO - Row exists with business_id

**3. Is RLS blocking data?**
- [ ] YES - `get_user_business_id()` returns NULL
- [ ] NO - Function works correctly

**4. Is backend Supabase config mismatch?**
- [ ] YES - URL or key doesn't match dashboard
- [ ] NO - Config matches dashboard

**5. Is frontend auth/token issue?**
- [ ] YES - Token missing, expired, or invalid
- [ ] NO - Token present and valid

---

## 🎯 DIAGNOSTIC SUMMARY

### Most Likely Root Causes (Ranked):

1. **user_profiles Table is Empty (90% likely)**
   - **Symptom**: Backend returns 403 "User is not associated with any business"
   - **Evidence**: Step 3 shows no profile for logged-in user
   - **Fix**: Create user_profiles row linking user to business

2. **get_user_business_id() Returns NULL (80% likely)**
   - **Symptom**: Empty results even if data exists
   - **Evidence**: Step 4 shows function returns NULL
   - **Fix**: Ensure user_profiles has row, function reads correctly

3. **No Data in Database (50% likely)**
   - **Symptom**: API returns 200 with empty array `[]`
   - **Evidence**: Step 2 shows products table is empty
   - **Fix**: Create test products

4. **Backend Config Mismatch (30% likely)**
   - **Symptom**: Connection errors or wrong project
   - **Evidence**: Step 1 shows URL/key mismatch
   - **Fix**: Update .env files to match dashboard

5. **Frontend Token Issue (20% likely)**
   - **Symptom**: 401 Unauthorized errors
   - **Evidence**: Step 6 shows missing/invalid token
   - **Fix**: Check token retrieval, re-login

---

## 📋 CODE ISSUES IDENTIFIED

### Critical Issue Found:

**Missing Middleware Function:**
- `backend/src/routes/products.js` imports `attachBusinessContext` (line 7, 26)
- This function **does not exist** in `backend/src/middleware/auth.js`
- **Impact**: Routes may fail to load or throw import errors
- **Note**: `authenticateUser` already sets `businessId`, so this might be redundant

### Backend Auth Flow Analysis:

1. ✅ **Token Verification** (line 29-33): Works correctly
2. ✅ **User Extraction** (line 47-51): Works correctly
3. ✅ **user_profiles Query** (line 54-58): **CRITICAL POINT**
4. ⚠️ **403 Return** (line 60-68): Returns error if profile missing
5. ✅ **business_id Attachment** (line 71): Works if profile exists

### Frontend API Flow Analysis:

1. ✅ **Token Retrieval** (line 28-40): Gets token from Supabase session
2. ✅ **Authorization Header** (line 57): Adds header if token exists
3. ✅ **Error Handling** (line 64-71): Handles errors correctly

---

## 🔧 QUICK FIXES (When Instructed)

### Fix 1: Create user_profiles Row
```sql
-- Get your user_id
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Create profile
INSERT INTO user_profiles (user_id, business_id, role)
VALUES ('YOUR_USER_UUID'::UUID, 1, 'owner');
```

### Fix 2: Verify get_user_business_id() Function
```sql
-- Check function
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'get_user_business_id';

-- Should read from user_profiles
```

### Fix 3: Update Environment Variables
```bash
# Backend .env
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

# Frontend .env.local
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

---

## 📝 FINAL REPORT TEMPLATE

After completing all steps, fill this template:

```
=== SUPABASE VISIBILITY DIAGNOSIS REPORT ===

STEP 1 - Project Verification:
- Project URL Match: [YES / NO]
- Anon Key Match: [YES / NO]
- Mismatches Found: [List any]

STEP 2 - Database Data:
- businesses: X rows
- user_profiles: X rows [CRITICAL]
- products: X rows

STEP 3 - User-Business Link:
- My user_id: [UUID]
- Profile exists: [YES / NO]
- business_id: [ID / NULL]

STEP 4 - RLS:
- RLS Enabled: [YES / NO]
- get_user_business_id(): [Returns ID / NULL]

STEP 5 - Backend:
- Config Match: [YES / NO]
- API Status: [200 / 401 / 403 / 500]
- business_id in request: [ID / NULL]

STEP 6 - Frontend:
- Authorization Header: [Present / Missing]
- Response Status: [200 / 401 / 403 / 500]
- Response Body: [Show JSON]

ROOT CAUSE:
1. Data missing? [YES / NO]
2. user_profiles missing? [YES / NO]
3. RLS blocking? [YES / NO]
4. Backend config mismatch? [YES / NO]
5. Frontend token issue? [YES / NO]

MOST LIKELY ISSUE: [Based on findings]
```

---

**SUPABASE VISIBILITY DIAGNOSIS COMPLETE**

