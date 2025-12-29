# Critical Findings - Data Visibility Issue

## 🚨 IMMEDIATE ISSUES FOUND

### 1. MISSING MIDDLEWARE FUNCTION (CRITICAL)

**Location**: `backend/src/routes/products.js` (line 7, 26)

**Issue**:
```javascript
import { authenticateUser, attachBusinessContext } from '../middleware/auth.js';
```

**Problem**: 
- `attachBusinessContext` function **does NOT exist** in `backend/src/middleware/auth.js`
- This will cause **import error** when routes load
- Routes will **fail to initialize**

**Impact**: 
- Backend routes may not work at all
- API endpoints may return 500 errors
- This could be the PRIMARY cause of data invisibility

**Note**: 
- `authenticateUser` already sets `req.businessId` (line 71)
- `attachBusinessContext` appears to be redundant
- But if it's imported, it MUST exist or routes will crash

---

## 🔍 DIAGNOSTIC CHECKLIST

Use the comprehensive guide in `SUPABASE_VISIBILITY_DIAGNOSIS.md` to check:

### Step 1: Verify Supabase Project
- [ ] Project URL matches dashboard
- [ ] Anon key matches dashboard
- [ ] Backend and frontend use same project

### Step 2: Check Database Data
- [ ] `businesses` table has ≥ 1 row
- [ ] `user_profiles` table has ≥ 1 row ⚠️ **CRITICAL**
- [ ] `products` table has data (or is empty)

### Step 3: Check User-Business Link
- [ ] Your user_id exists in `user_profiles`
- [ ] `business_id` is set in your profile
- [ ] Business exists for that `business_id`

### Step 4: Check RLS
- [ ] RLS is enabled on all tables
- [ ] `get_user_business_id()` function exists
- [ ] Function returns business_id (not NULL)

### Step 5: Check Backend
- [ ] Backend server is running
- [ ] Environment variables are set
- [ ] API returns 200 (not 403/500)
- [ ] `business_id` is attached to request

### Step 6: Check Frontend
- [ ] Authorization header is present
- [ ] Token is valid
- [ ] API response is received
- [ ] No console errors

---

## 🎯 MOST LIKELY ROOT CAUSES

### 1. Missing Middleware Function (NEW - 95% likely)
**Symptom**: Backend routes fail to load, 500 errors
**Evidence**: `attachBusinessContext` imported but doesn't exist
**Fix**: Remove import OR create function

### 2. user_profiles Table Empty (90% likely)
**Symptom**: Backend returns 403 "User is not associated with any business"
**Evidence**: Step 3 shows no profile
**Fix**: Create user_profiles row

### 3. get_user_business_id() Returns NULL (80% likely)
**Symptom**: Empty results even if data exists
**Evidence**: Step 4 shows function returns NULL
**Fix**: Ensure user_profiles has row

### 4. No Data in Database (50% likely)
**Symptom**: API returns 200 with empty array `[]`
**Evidence**: Step 2 shows products table empty
**Fix**: Create test products

### 5. Backend Config Mismatch (30% likely)
**Symptom**: Connection errors
**Evidence**: Step 1 shows URL/key mismatch
**Fix**: Update .env files

---

## 📋 QUICK DIAGNOSTIC QUERIES

Run these in Supabase SQL Editor:

```sql
-- 1. Check data existence
SELECT 'businesses' as table_name, COUNT(*) as count FROM businesses
UNION ALL SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL SELECT 'products', COUNT(*) FROM products;

-- 2. Check your profile (replace UUID)
SELECT * FROM user_profiles WHERE user_id = 'YOUR_UUID'::UUID;

-- 3. Check RLS function
SELECT get_user_business_id() as business_id;

-- 4. Check RLS status
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'products';
```

---

## 🔧 WHEN READY TO FIX

### Priority 1: Fix Missing Middleware
- Remove `attachBusinessContext` from imports OR
- Create the function (even if it's a no-op)

### Priority 2: Create user_profiles Row
```sql
INSERT INTO user_profiles (user_id, business_id, role)
VALUES ('YOUR_UUID'::UUID, 1, 'owner');
```

### Priority 3: Verify RLS Function
- Ensure `get_user_business_id()` reads from `user_profiles`
- Ensure it returns business_id (not NULL)

---

**Complete diagnostic guide available in: `SUPABASE_VISIBILITY_DIAGNOSIS.md`**

