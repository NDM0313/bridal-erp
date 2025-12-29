# Security Verification Guide - Frontend Integration

## 🎯 PURPOSE
Verify that frontend integration is secure and RLS properly enforces multi-tenant isolation.

---

## ✅ VERIFICATION CHECKLIST

### 1. RLS is Enabled on All Tables

**Action**: Run in Supabase SQL Editor:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('products', 'businesses', 'units', 'user_profiles')
ORDER BY tablename;
```

**Expected**: All show `rowsecurity = true`

**❌ If False**: Security risk! Enable RLS immediately.

---

### 2. Policies Exist and Use get_user_business_id()

**Action**: Run in Supabase SQL Editor:
```sql
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('products', 'businesses', 'units')
ORDER BY tablename;
```

**Expected**: 
- Each table has policies
- Policies use `get_user_business_id()` function

**❌ If Missing**: Create policies using `SUPABASE_SCHEMA.sql`

---

### 3. Frontend Uses Anon Key Only

**Action**: Search frontend code:
```bash
# Should find NEXT_PUBLIC_SUPABASE_ANON_KEY
grep -r "SUPABASE.*KEY" lib/ app/ components/
```

**Expected**: 
- Only `NEXT_PUBLIC_SUPABASE_ANON_KEY` found
- NO `SERVICE_ROLE` or `service_role` found

**❌ If Service Role Found**: Critical security risk! Remove immediately.

---

### 4. Backend Uses Service Role for Admin Only

**Action**: Search backend code:
```bash
# Should find SUPABASE_SERVICE_ROLE_KEY in backend only
grep -r "SERVICE_ROLE" backend/src/
```

**Expected**:
- `SUPABASE_SERVICE_ROLE_KEY` only in backend
- Used for admin operations only

**❌ If Used for User Operations**: Security risk! Use anon key + JWT instead.

---

### 5. Unauthenticated Users See No Data

**Test**: 
1. Open browser DevTools
2. Clear all cookies/localStorage
3. Do NOT login
4. Try to query products directly:
   ```javascript
   const { data } = await supabase.from('products').select('*');
   console.log(data); // Should be []
   ```

**Expected**: Empty array `[]`

**❌ If Data Visible**: RLS policy allows anonymous access → Fix immediately!

---

### 6. Users Cannot Access Other Business Data

**Test**:
1. Login as User A (business_id = 1)
2. Query products
3. Verify all products have business_id = 1

**Frontend Test**:
```typescript
// After login
const { data } = await supabase.from('products').select('*');

// Verify isolation
const wrongBusiness = data?.find(p => p.business_id !== 1);
if (wrongBusiness) {
  console.error('SECURITY BREACH: User can see other business data!');
}
```

**Expected**: All products have business_id = 1

**❌ If Other Business Data Visible**: RLS policy is broken → Fix immediately!

---

### 7. Backend Verifies JWT Token

**Test**: 
1. Make API request without token:
   ```bash
   curl http://localhost:3001/api/v1/products
   ```

**Expected**: 401 Unauthorized

**❌ If 200 OK**: Backend is not verifying tokens → Security risk!

---

### 8. Backend Extracts business_id

**Test**: 
1. Login and get JWT token
2. Make API request with token
3. Check backend logs for business_id

**Expected**: Backend logs show business_id extracted

**❌ If business_id is NULL**: User needs user_profiles row

---

## 📊 SECURITY AUDIT REPORT TEMPLATE

After running all checks, fill this template:

```
=== SECURITY AUDIT REPORT ===

Date: [Date]
Auditor: [Name]

RLS Status:
- products: [ENABLED / DISABLED]
- businesses: [ENABLED / DISABLED]
- units: [ENABLED / DISABLED]
- user_profiles: [ENABLED / DISABLED]

Policies:
- products: [X policies] [✅ / ❌]
- businesses: [X policies] [✅ / ❌]
- units: [X policies] [✅ / ❌]

Key Usage:
- Frontend uses: [ANON KEY / SERVICE_ROLE] [✅ / ❌]
- Backend uses service_role for: [Admin ops / User ops] [✅ / ❌]

Authentication:
- Frontend requires login: [YES / NO] [✅ / ❌]
- Backend verifies JWT: [YES / NO] [✅ / ❌]
- Unauthenticated users see data: [YES / NO] [❌ / ✅]

Data Isolation:
- Users see only own business: [YES / NO] [✅ / ❌]
- Cross-business access blocked: [YES / NO] [✅ / ❌]

ISSUES FOUND:
[List any security issues]

RECOMMENDATIONS:
[List recommendations]
```

---

**Security verification complete!**

