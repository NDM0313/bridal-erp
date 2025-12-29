# Diagnostic Steps: Data Not Visible on Frontend

## 🎯 Purpose
Systematically diagnose why data is not appearing on the web frontend.

**IMPORTANT**: Do NOT modify code. Only CHECK and REPORT.

---

## 📋 STEP 1 — DATABASE EXISTENCE CHECK

### Action:
Open **Supabase SQL Editor** (use service role/admin access) and run:

```sql
-- File: database/DIAGNOSTIC_QUERIES.sql
-- Run the "STEP 1: DATABASE EXISTENCE CHECK" section
```

Or run directly:
```sql
SELECT 
    'businesses' as table_name,
    COUNT(*) as row_count
FROM businesses
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'business_locations', COUNT(*) FROM business_locations;
```

### Report:
```
✅ STEP 1 RESULTS:
- businesses: X rows
- user_profiles: X rows ⚠️ (CRITICAL - must be > 0)
- products: X rows
- business_locations: X rows
```

### Expected:
- `businesses`: At least 1 row
- `user_profiles`: At least 1 row (MUST HAVE)
- `products`: 0 or more rows
- `business_locations`: At least 1 row

---

## 📋 STEP 2 — RLS VISIBILITY CHECK

### Action:
In Supabase SQL Editor, check RLS status:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('products', 'user_profiles', 'businesses');
```

### Test RLS Function:
```sql
-- This should return a business_id (not NULL)
-- If NULL, RLS will block everything
SELECT get_user_business_id() as business_id;
```

**Note**: This function only works when authenticated. To test properly:
1. Log in via frontend
2. Get your JWT token
3. Use Supabase REST API with that token
4. Or temporarily disable RLS to verify data exists

### Report:
```
✅ STEP 2 RESULTS:
- RLS Enabled on products: [YES / NO]
- RLS Enabled on user_profiles: [YES / NO]
- get_user_business_id() returns: [business_id / NULL] ⚠️
```

### Expected:
- RLS: Enabled on all tables
- `get_user_business_id()`: Should return business_id (NOT NULL)

---

## 📋 STEP 3 — AUTH USER ↔ BUSINESS LINK CHECK

### Action:
**First, get your user ID:**
1. Go to Supabase Dashboard → Authentication → Users
2. Find your email
3. Copy the UUID

**Then run:**
```sql
-- Replace 'YOUR_USER_UUID' with actual UUID
SELECT 
    up.user_id,
    up.business_id,
    b.name as business_name,
    u.email
FROM user_profiles up
LEFT JOIN businesses b ON b.id = up.business_id
LEFT JOIN auth.users u ON u.id = up.user_id
WHERE up.user_id = 'YOUR_USER_UUID'::UUID;
```

### Also check all profiles:
```sql
SELECT 
    up.*,
    b.name as business_name
FROM user_profiles up
LEFT JOIN businesses b ON b.id = up.business_id;
```

### Report:
```
✅ STEP 3 RESULTS:
- My user_id: [UUID or NOT FOUND]
- My business_id: [ID or NULL] ⚠️
- Business name: [Name or NULL]
- Total user_profiles: X rows
```

### Expected:
- Should find your user_id
- Should have a business_id (NOT NULL)
- Business name should exist

---

## 📋 STEP 4 — BACKEND API CHECK

### Action 1: Check Backend Server
```bash
# Is backend running?
curl http://localhost:3001/health
```

### Action 2: Get JWT Token
1. Log in via frontend (http://localhost:3000/login)
2. Open browser DevTools → Application → Local Storage
3. Find Supabase auth token OR
4. Use Network tab to capture token from login request

### Action 3: Test API with Token
```bash
# Replace YOUR_JWT_TOKEN with actual token
curl -X GET "http://localhost:3001/api/v1/products" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -v
```

### Action 4: Check Backend Logs
Look at backend console output for:
- Authentication success/failure
- business_id extraction
- Database query errors

### Report:
```
✅ STEP 4 RESULTS:
- Backend Health: [200 OK / Connection refused]
- JWT Token: [Present / Missing]
- API Response Status: [200 / 401 / 403 / 500]
- API Response Body: [Show JSON]
- Backend Logs: [Any errors?]
```

### Expected:
- Backend: Running (200 OK)
- Token: Present and valid
- Response: 200 with data OR 403 if user_profiles missing
- Logs: No errors

---

## 📋 STEP 5 — FRONTEND API CALL CHECK

### Action:
1. Open browser → http://localhost:3000/products
2. Open DevTools (F12)
3. Go to **Network** tab
4. Filter by "products" or "api"
5. Click on the API request
6. Check:

**Request Tab:**
- URL: Should be `http://localhost:3001/api/v1/products`
- Headers → Authorization: Should have `Bearer ...`
- Request Method: GET

**Response Tab:**
- Status: 200 / 401 / 403 / 500
- Preview/Body: Show full JSON response

**Console Tab:**
- Any JavaScript errors?
- Any authentication errors?

### Report:
```
✅ STEP 5 RESULTS:
- Request URL: [Full URL]
- Authorization Header: [Present / Missing]
- Token (first 10 chars): [Bearer eyJ...]
- Response Status: [200 / 401 / 403 / 500]
- Response Body: [Full JSON - show here]
- Console Errors: [List any]
```

### Expected:
- URL: Correct
- Authorization: Present
- Status: 200 (success) or 403 (no business)
- Body: `{success: true, data: [...]}` or error message
- Console: No errors

---

## 📋 STEP 6 — ROOT CAUSE SUMMARY

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

## 🔍 CODE ANALYSIS FINDINGS

### Potential Issues Identified:

1. **Backend Auth Middleware (Line 54-68)**:
   - Queries `user_profiles` table
   - Returns 403 if profile not found
   - **Issue**: If user_profiles is empty, all requests return 403

2. **Backend Supabase Client**:
   - Uses `supabase` (anon key) client
   - **Issue**: May not respect RLS correctly for authenticated users
   - **Should use**: Authenticated client with user's JWT

3. **RLS Function**:
   - `get_user_business_id()` reads from `user_profiles`
   - **Issue**: If function returns NULL, RLS blocks everything

4. **Frontend API Client**:
   - Gets token from Supabase session
   - **Issue**: Token might be expired or invalid

---

## 🎯 MOST LIKELY ROOT CAUSES (Ranked)

### 1. user_profiles Table is Empty (90% likely)
**Symptom**: Backend returns 403 "User is not associated with any business"
**Fix**: Create user_profiles row linking user to business

### 2. get_user_business_id() Returns NULL (80% likely)
**Symptom**: RLS blocks all data, empty results
**Fix**: Ensure function is implemented and user_profiles exists

### 3. No Data in Database (50% likely)
**Symptom**: Products table is empty
**Fix**: Create test products

### 4. Frontend Token Issue (30% likely)
**Symptom**: 401 Unauthorized errors
**Fix**: Check token expiration, refresh logic

### 5. Backend Client Issue (20% likely)
**Symptom**: RLS not respected, wrong data returned
**Fix**: Use authenticated Supabase client

---

## 📝 REPORT TEMPLATE

Copy and fill this template:

```
=== DIAGNOSTIC REPORT ===

STEP 1 - Database Existence:
- businesses: X rows
- user_profiles: X rows
- products: X rows
- business_locations: X rows

STEP 2 - RLS Visibility:
- RLS Enabled: [YES/NO]
- get_user_business_id(): [Returns ID / Returns NULL]

STEP 3 - User-Business Link:
- My user_id: [UUID]
- My business_id: [ID / NULL]
- Business name: [Name / NULL]

STEP 4 - Backend API:
- Backend Status: [Running / Not Running]
- API Response: [200 / 401 / 403 / 500]
- Response Body: [Show JSON]

STEP 5 - Frontend API:
- Request URL: [URL]
- Authorization: [Present / Missing]
- Response Status: [200 / 401 / 403 / 500]
- Response Body: [Show JSON]
- Console Errors: [List]

ROOT CAUSE:
[Answer the 5 questions above]

MOST LIKELY ISSUE:
[Based on findings]
```

---

## ✅ NEXT STEPS

After completing all steps:
1. Share the diagnostic report
2. Include screenshots of SQL results
3. Include Network tab screenshots
4. Include console errors (if any)

Then we can provide targeted fixes.

---

**DIAGNOSIS COMPLETE – READY FOR FIX**

