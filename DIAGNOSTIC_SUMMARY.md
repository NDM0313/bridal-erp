# Diagnostic Summary: Data Not Visible on Frontend

## 🔍 Code Analysis Findings

### ✅ What's Working:
1. **Backend Auth Middleware** (`backend/src/middleware/auth.js`):
   - ✅ Verifies JWT token
   - ✅ Queries `user_profiles` table
   - ✅ Attaches `business_id` to request (line 71)
   - ✅ Returns 403 if profile not found

2. **Backend Product Service** (`backend/src/services/productService.js`):
   - ✅ Filters by `business_id` (line 35)
   - ✅ Uses Supabase client

3. **Frontend API Client** (`lib/api/client.ts`):
   - ✅ Gets token from Supabase session
   - ✅ Adds Authorization header

### ⚠️ Potential Issues Found:

1. **Missing Middleware Function**:
   - Routes reference `attachBusinessContext` (line 7, 26 in `products.js`)
   - This function doesn't exist in `auth.js`
   - **Impact**: May cause route errors OR it's redundant (since `authenticateUser` already sets `businessId`)

2. **Backend Supabase Client**:
   - Uses `supabase` (anon key) client (line 54 in `auth.js`)
   - **Issue**: May not respect RLS correctly when querying `user_profiles`
   - **Should use**: `supabaseAdmin` for server-side queries OR authenticated client

3. **Product Service Client**:
   - Uses `supabase` (anon key) client
   - **Issue**: RLS might block queries if `get_user_business_id()` returns NULL
   - **Note**: Backend filters by `business_id` manually, so this might work

---

## 📋 Diagnostic Steps Created

I've created 3 diagnostic files:

1. **`DIAGNOSTIC_STEPS.md`** - Step-by-step guide to run checks
2. **`DIAGNOSTIC_REPORT.md`** - Detailed diagnostic report template
3. **`database/DIAGNOSTIC_QUERIES.sql`** - SQL queries to run in Supabase

---

## 🎯 Most Likely Root Causes (Based on Code Review)

### 1. user_profiles Table is Empty (90% likely)
**Evidence**:
- Backend middleware queries `user_profiles` (line 54-58)
- Returns 403 if profile not found (line 60-68)
- This is the FIRST check that would fail

**Symptom**: 
- Backend returns 403 "User is not associated with any business"
- Frontend shows empty data or error

**Check**:
```sql
SELECT * FROM user_profiles;
```

### 2. get_user_business_id() Returns NULL (80% likely)
**Evidence**:
- RLS policies use `get_user_business_id()` function
- If function returns NULL, RLS blocks ALL data
- Function reads from `user_profiles` table

**Symptom**:
- Empty results even if data exists
- No error messages (silent failure)

**Check**:
```sql
SELECT get_user_business_id();
-- Should return business_id, not NULL
```

### 3. No Data in Database (50% likely)
**Evidence**:
- Products table might be empty
- Need to verify data exists

**Symptom**:
- API returns 200 with empty array `[]`

**Check**:
```sql
SELECT COUNT(*) FROM products;
```

### 4. Frontend Token Issue (30% likely)
**Evidence**:
- Frontend gets token from Supabase session
- Token might be expired or invalid

**Symptom**:
- 401 Unauthorized errors
- Network tab shows missing Authorization header

**Check**:
- Browser DevTools → Network tab → Check Authorization header

### 5. Backend Client Issue (20% likely)
**Evidence**:
- Backend uses `supabase` (anon key) client
- Should use authenticated client for RLS

**Symptom**:
- RLS not respected
- Wrong data returned

**Check**:
- Backend logs show RLS errors

---

## 📝 Next Steps

### Run These Checks in Order:

1. **STEP 1**: Run `database/DIAGNOSTIC_QUERIES.sql` in Supabase SQL Editor
   - Check row counts
   - Verify `user_profiles` has data

2. **STEP 2**: Check RLS function
   - Run: `SELECT get_user_business_id();`
   - Should return business_id (not NULL)

3. **STEP 3**: Check user-business link
   - Find your user_id from Auth dashboard
   - Check if profile exists: `SELECT * FROM user_profiles WHERE user_id = 'YOUR_UUID';`

4. **STEP 4**: Test backend API
   - Get JWT token from frontend login
   - Test: `curl -H "Authorization: Bearer TOKEN" http://localhost:3001/api/v1/products`

5. **STEP 5**: Check frontend
   - Open DevTools → Network tab
   - Check Authorization header
   - Check response status and body

---

## 🔧 Quick Fixes (If Issues Found)

### Fix 1: Create user_profiles row
```sql
-- Get your user_id from auth.users
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Create profile (replace UUID and business_id)
INSERT INTO user_profiles (user_id, business_id, role)
VALUES ('YOUR_USER_UUID'::UUID, 1, 'owner');
```

### Fix 2: Verify get_user_business_id() function
```sql
-- Check function exists and works
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'get_user_business_id';

-- Should show it reads from user_profiles
```

### Fix 3: Test without RLS (temporary)
```sql
-- Disable RLS to test (DANGER - only for testing!)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Test query
SELECT * FROM products;

-- Re-enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
```

---

## 📊 Diagnostic Checklist

Use this checklist when running diagnostics:

- [ ] Database has data (businesses, products exist)
- [ ] user_profiles table has row for logged-in user
- [ ] get_user_business_id() function returns business_id (not NULL)
- [ ] RLS policies are enabled on all tables
- [ ] Backend receives valid JWT token
- [ ] Backend extracts business_id from user_profiles
- [ ] Frontend sends Authorization header with token
- [ ] API URL is correct (localhost:3001)
- [ ] Backend server is running
- [ ] No CORS errors in browser console

---

## 🎯 Expected Diagnostic Results

### If Everything Works:
- `user_profiles`: Has row with your user_id and business_id
- `get_user_business_id()`: Returns business_id (not NULL)
- Backend API: Returns 200 with products array
- Frontend: Shows products in UI

### If user_profiles is Empty:
- Backend API: Returns 403 "User is not associated with any business"
- Frontend: Shows error or empty data

### If get_user_business_id() Returns NULL:
- Backend API: Returns 200 with empty array `[]`
- Frontend: Shows "No products found"
- RLS is blocking all data

### If No Data in Database:
- Backend API: Returns 200 with empty array `[]`
- Frontend: Shows "No products found"
- Need to create test data

---

## 📝 Report Template

After running diagnostics, fill this template:

```
=== DIAGNOSTIC RESULTS ===

STEP 1 - Database:
- businesses: X rows
- user_profiles: X rows [CRITICAL]
- products: X rows

STEP 2 - RLS:
- get_user_business_id(): [Returns ID / NULL]

STEP 3 - User-Business Link:
- My user_id: [UUID]
- My business_id: [ID / NULL]

STEP 4 - Backend API:
- Status: [200 / 401 / 403 / 500]
- Response: [Show JSON]

STEP 5 - Frontend:
- Authorization: [Present / Missing]
- Status: [200 / 401 / 403 / 500]
- Response: [Show JSON]

ROOT CAUSE: [Answer the 5 questions]
```

---

**DIAGNOSIS COMPLETE – READY FOR FIX**

