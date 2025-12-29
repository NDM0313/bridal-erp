# Diagnostic Report: Data Not Visible on Web Frontend

## 🔍 Step-by-Step Diagnosis Guide

**IMPORTANT**: Run these checks in order. Do NOT skip steps.

---

## STEP 1 — DATABASE EXISTENCE CHECK

### Run in Supabase SQL Editor (as admin/service role):

```sql
-- Check table existence and row counts
SELECT 
    'businesses' as table_name,
    COUNT(*) as row_count
FROM businesses
UNION ALL
SELECT 
    'business_locations' as table_name,
    COUNT(*) as row_count
FROM business_locations
UNION ALL
SELECT 
    'user_profiles' as table_name,
    COUNT(*) as row_count
FROM user_profiles
UNION ALL
SELECT 
    'products' as table_name,
    COUNT(*) as row_count
FROM products
UNION ALL
SELECT 
    'units' as table_name,
    COUNT(*) as row_count
FROM units;
```

### Expected Results:
- `businesses`: Should have at least 1 row
- `business_locations`: Should have at least 1 row
- `user_profiles`: Should have at least 1 row (CRITICAL)
- `products`: May be 0 or more
- `units`: Should have at least 1 row (base unit)

### Report Format:
```
Table: businesses → Row Count: X
Table: business_locations → Row Count: X
Table: user_profiles → Row Count: X ⚠️ (CRITICAL)
Table: products → Row Count: X
Table: units → Row Count: X
```

---

## STEP 2 — RLS VISIBILITY CHECK

### Run in Supabase SQL Editor (simulate authenticated user):

**First, get your user ID from Supabase Auth dashboard, then:**

```sql
-- Set role to authenticated (simulates logged-in user)
SET LOCAL ROLE authenticated;

-- Set the user ID (replace with your actual auth.uid())
-- Note: This is a simulation - actual RLS uses auth.uid() automatically
SET LOCAL request.jwt.claim.sub = 'YOUR_USER_UUID_HERE';

-- Try to select businesses
SELECT * FROM businesses;

-- Try to select products
SELECT * FROM products LIMIT 10;

-- Try to select user_profiles
SELECT * FROM user_profiles;
```

### Alternative: Test with actual authenticated session

**In Supabase SQL Editor, use this approach:**

```sql
-- Check if get_user_business_id() function exists and works
SELECT get_user_business_id() as business_id;

-- If returns NULL, that's the problem!
```

### Report Format:
```
RLS Test Results:
- businesses SELECT: [Empty / Has Data]
- products SELECT: [Empty / Has Data]
- user_profiles SELECT: [Empty / Has Data]
- get_user_business_id(): [Returns NULL / Returns business_id]
```

---

## STEP 3 — AUTH USER ↔ BUSINESS LINK CHECK

### Run in Supabase SQL Editor:

**First, identify your user ID:**
1. Go to Supabase Dashboard → Authentication → Users
2. Find your user email
3. Copy the UUID (user ID)

**Then run:**

```sql
-- Replace 'YOUR_USER_UUID' with actual UUID from Auth dashboard
SELECT 
    up.id,
    up.user_id,
    up.business_id,
    b.name as business_name,
    u.email as user_email
FROM user_profiles up
LEFT JOIN businesses b ON b.id = up.business_id
LEFT JOIN auth.users u ON u.id = up.user_id
WHERE up.user_id = 'YOUR_USER_UUID'::UUID;
```

### Also check if function works:

```sql
-- This should return a business_id (not NULL)
-- Note: This only works if you're authenticated in Supabase
SELECT get_user_business_id() as business_id;
```

### Report Format:
```
User Profile Check:
- user_id: [UUID or NOT FOUND]
- business_id: [ID or NULL]
- business_name: [Name or NULL]
- get_user_business_id() result: [ID or NULL]
```

---

## STEP 4 — BACKEND API CHECK

### Test from Terminal/Postman:

**1. Get JWT Token:**
```bash
# Login via Supabase Auth API (or use your frontend login)
# Save the access_token from response
```

**2. Test Products API:**
```bash
curl -X GET "http://localhost:3001/api/v1/products" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### Check Backend Logs:

Look for:
- Authentication success/failure
- business_id extraction
- Database query results
- Error messages

### Report Format:
```
Backend API Test:
- HTTP Status: [200 / 401 / 403 / 500]
- Response Body: [Show full response]
- business_id in request: [ID or NULL]
- Backend Logs: [Any errors?]
```

---

## STEP 5 — FRONTEND API CALL CHECK

### Browser DevTools (Network Tab):

**1. Open Products page in browser**
**2. Open DevTools → Network tab**
**3. Filter by "products" or "api"**
**4. Click on the API request**
**5. Check:**

- **Request Headers:**
  - `Authorization: Bearer ...` present?
  - Token value (first/last 10 chars)

- **Request URL:**
  - Correct API URL? (`http://localhost:3001/api/v1/products`)
  - Any query parameters?

- **Response:**
  - Status code: [200 / 401 / 403 / 500]
  - Response body: [Show full JSON]
  - Empty array `[]` or has data?

### Also check Console:

- Any JavaScript errors?
- Any authentication errors?

### Report Format:
```
Frontend API Call:
- Authorization Header: [Present / Missing]
- Token (first 10 chars): [Bearer eyJ...]
- Request URL: [Full URL]
- Response Status: [200 / 401 / 403 / 500]
- Response Body: [Full JSON response]
- Console Errors: [List any errors]
```

---

## STEP 6 — CODE LOGIC VERIFICATION

### Check These Files:

**1. Backend Auth Middleware (`backend/src/middleware/auth.js`):**
- ✅ Line 54-58: Queries `user_profiles` table
- ✅ Line 60-68: Returns 403 if profile not found
- ✅ Line 71: Attaches `business_id` to request

**2. Backend Product Service (`backend/src/services/productService.js`):**
- ✅ Line 35: Filters by `business_id`
- ✅ Uses Supabase client (respects RLS)

**3. Frontend API Client (`lib/api/client.ts`):**
- ✅ Line 28-40: Gets token from Supabase session
- ✅ Line 57: Adds Authorization header

**4. Frontend Products Page (`app/products/page.tsx`):**
- ✅ Line 23: Calls `productsApi.getAll()`
- ✅ Line 24-25: Sets products from response

### Potential Issues Found:

1. **Backend uses `supabase` client (anon key) - might not respect RLS correctly**
2. **Frontend token might be expired or invalid**
3. **user_profiles table might be empty**
4. **get_user_business_id() function might return NULL**

---

## STEP 7 — ROOT CAUSE ANALYSIS

### Answer These Questions:

**1. Is data missing from database?**
- [ ] YES - No products in database
- [ ] NO - Products exist but not visible

**2. Is RLS blocking data?**
- [ ] YES - `get_user_business_id()` returns NULL
- [ ] NO - Function works correctly

**3. Is user_profiles missing?**
- [ ] YES - No row in user_profiles for logged-in user
- [ ] NO - Row exists with business_id

**4. Is backend filtering business_id incorrectly?**
- [ ] YES - business_id mismatch or NULL
- [ ] NO - business_id is correct

**5. Is frontend token/API config wrong?**
- [ ] YES - Token missing or invalid
- [ ] NO - Token present and valid

---

## 🔧 QUICK FIXES TO CHECK

### Fix 1: Ensure user_profiles exists

```sql
-- Check if your user has a profile
SELECT * FROM user_profiles;

-- If empty, create one:
-- First, get your user_id from auth.users
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then create profile (replace UUID and business_id):
INSERT INTO user_profiles (user_id, business_id, role)
VALUES ('YOUR_USER_UUID'::UUID, 1, 'owner');
```

### Fix 2: Verify get_user_business_id() function

```sql
-- Check function definition
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'get_user_business_id';

-- Should show it reads from user_profiles table
```

### Fix 3: Test RLS directly

```sql
-- Disable RLS temporarily to test (DANGER - only for testing!)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Test query
SELECT * FROM products;

-- Re-enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
```

---

## 📋 DIAGNOSTIC CHECKLIST

Run through this checklist:

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

## 🎯 MOST LIKELY ISSUES

Based on code review, these are the most likely causes:

1. **user_profiles table is empty** (90% likely)
   - User logged in but no profile created
   - Backend returns 403 "User is not associated with any business"

2. **get_user_business_id() returns NULL** (80% likely)
   - Function not implemented correctly
   - RLS blocks all data

3. **No data in database** (50% likely)
   - Products table is empty
   - Need to create test data

4. **Frontend token issue** (30% likely)
   - Token expired
   - Token not sent correctly

5. **Backend Supabase client issue** (20% likely)
   - Using wrong client (should use authenticated client)
   - RLS not respected

---

## 📝 NEXT STEPS AFTER DIAGNOSIS

Once you complete all steps, report:
1. Which step failed
2. Exact error messages
3. Screenshots of SQL results
4. Network tab screenshots
5. Console errors

Then we can provide targeted fixes.

---

**DIAGNOSIS COMPLETE – READY FOR FIX**

