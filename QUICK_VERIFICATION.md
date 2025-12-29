# Quick Verification Guide - Frontend Supabase Integration

## 🚀 Quick Start

1. **Ensure environment variables are set**:
   ```bash
   # Check .env.local
   cat .env.local | grep SUPABASE
   ```
   Should show:
   - `NEXT_PUBLIC_SUPABASE_URL=...`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`

2. **Start Next.js dev server**:
   ```bash
   npm run dev
   ```

3. **Login and test**:
   - Navigate to `http://localhost:3000/login`
   - Login with your Supabase user credentials
   - Navigate to `http://localhost:3000/test-supabase`
   - Click "Run Security Tests"

---

## ✅ Verification Steps

### Step 1: Check Anon Key Usage

**Command**:
```bash
grep -r "SERVICE_ROLE\|service_role" lib/ app/ components/ utils/
```

**Expected**: No matches (empty output)

**If matches found**: ❌ Security risk! Remove service_role key from frontend.

---

### Step 2: Check JWT Token in Browser

1. Open browser DevTools (F12)
2. Go to Network tab
3. Login to application
4. Find request to Supabase (e.g., `rest/v1/products`)
5. Check Request Headers:
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

**Expected**: ✅ `Authorization` header with JWT token

**If missing**: ❌ JWT not being sent - check authentication flow

---

### Step 3: Test Unauthenticated Access

1. Open browser in incognito/private mode
2. Navigate to `http://localhost:3000/test-supabase`
3. Do NOT login
4. Open browser console
5. Run:
   ```javascript
   const { createClient } = await import('@supabase/supabase-js');
   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
   );
   const { data } = await supabase.from('products').select('*');
   console.log(data); // Should be []
   ```

**Expected**: ✅ Empty array `[]`

**If data visible**: ❌ RLS is not blocking - security risk!

---

### Step 4: Test Authenticated Access

1. Login to application
2. Navigate to `http://localhost:3000/test-supabase`
3. Click "Run Security Tests"
4. Check results:
   - ✅ Authentication Check: PASS
   - ✅ JWT Token Check: PASS
   - ✅ Direct Query (Authenticated): PASS
   - ✅ User Profile Check: PASS
   - ✅ RLS Enforcement Check: PASS

**Expected**: All tests pass

**If any test fails**: Check error message and fix issue

---

### Step 5: Verify Cross-Business Isolation

1. Login as User A (business_id = 1)
2. Query products:
   ```javascript
   const { data } = await supabase.from('products').select('*');
   console.log(data);
   ```
3. Verify all products have `business_id = 1`

**Expected**: ✅ All products have `business_id = 1`

**If other business data visible**: ❌ RLS policy broken - security risk!

---

## 📋 Complete Checklist

- [ ] `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `.env.local` has `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] No `SERVICE_ROLE` key in frontend code
- [ ] Login works and returns JWT token
- [ ] JWT token included in Supabase requests
- [ ] Unauthenticated users see no data
- [ ] Authenticated users see only own business data
- [ ] Cross-business access is blocked
- [ ] All security tests pass

---

## 🎯 Expected Results

### ✅ Success Indicators

1. **Anon Key Only**: No service_role key in frontend
2. **JWT Present**: Authorization header in all requests
3. **RLS Working**: Unauthenticated users see `[]`
4. **Isolation**: Users see only own business data
5. **Tests Pass**: All security tests pass

### ❌ Failure Indicators

1. **Service Role Found**: Service_role key in frontend code
2. **No JWT**: Missing Authorization header
3. **Data Visible**: Unauthenticated users see data
4. **Cross-Business**: Users can see other business data
5. **Tests Fail**: Security tests fail

---

**If all checks pass**: Frontend is securely integrated with Supabase! ✅

