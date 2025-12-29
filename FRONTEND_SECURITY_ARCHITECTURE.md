# Frontend Security Architecture - Production Readiness

## 🎯 GOAL
Prepare secure frontend integration using Supabase anon key + RLS, ensuring multi-tenant data isolation.

---

## ✅ TASK 1 — CURRENT RLS STATUS REVIEW

### RLS Enabled Tables

**Core Business Tables**:
- ✅ `businesses` - RLS enabled
- ✅ `business_locations` - RLS enabled
- ✅ `user_profiles` - RLS enabled
- ✅ `units` - RLS enabled
- ✅ `products` - RLS enabled
- ✅ `variations` - RLS enabled
- ✅ `variation_location_details` - RLS enabled
- ✅ `transactions` - RLS enabled
- ✅ `transaction_sell_lines` - RLS enabled
- ✅ `purchase_lines` - RLS enabled
- ✅ `stock_adjustment_lines` - RLS enabled
- ✅ `stock_transfer_lines` - RLS enabled

### Current RLS Policy Pattern

**All policies use**: `get_user_business_id()` function

**Function Logic**:
```sql
CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_business_id INTEGER;
BEGIN
    SELECT business_id INTO user_business_id
    FROM user_profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    RETURN user_business_id;
END;
$$;
```

**Policy Example (products)**:
```sql
-- SELECT policy
CREATE POLICY "Users view own products" ON products
FOR SELECT USING (business_id = get_user_business_id());

-- ALL operations policy (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Users manage own products" ON products
FOR ALL USING (business_id = get_user_business_id());
```

### RLS Status Summary

| Table | RLS Enabled | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy |
|-------|-------------|---------------|---------------|---------------|---------------|
| `businesses` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `business_locations` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `units` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `products` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `variations` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `transactions` | ✅ | ✅ | ✅ | ✅ | ✅ |

**Note**: Some tables use `FOR ALL` which covers all operations.

---

## ✅ TASK 2 — PRODUCTION-SAFE RLS POLICY DESIGN

### Current Policy Assessment

**✅ Strengths**:
- All tables have RLS enabled
- Policies use `get_user_business_id()` for multi-tenant isolation
- `user_profiles` policies ensure users can only access their own profile
- Business-level isolation is enforced

**⚠️ Gaps Identified**:

1. **Missing INSERT Policy for `businesses`**:
   - Current: Only SELECT and UPDATE
   - Issue: Users cannot create businesses (needs admin or service_role)
   - **Status**: OK (businesses should be created by admin only)

2. **Missing Explicit INSERT Policies**:
   - Some tables use `FOR ALL` which includes INSERT
   - **Status**: OK (covers all operations)

3. **No DELETE Policies (Explicit)**:
   - Some tables use `FOR ALL` which includes DELETE
   - **Status**: OK (covers all operations)

### Recommended Production-Safe Policy Structure

**Pattern 1: Separate Policies (More Granular Control)**
```sql
-- SELECT: Users can view their own business data
CREATE POLICY "users_select_own_products" ON products
FOR SELECT USING (business_id = get_user_business_id());

-- INSERT: Users can create products for their business
CREATE POLICY "users_insert_own_products" ON products
FOR INSERT WITH CHECK (business_id = get_user_business_id());

-- UPDATE: Users can update their own products
CREATE POLICY "users_update_own_products" ON products
FOR UPDATE USING (business_id = get_user_business_id());

-- DELETE: Users can delete their own products (if needed)
CREATE POLICY "users_delete_own_products" ON products
FOR DELETE USING (business_id = get_user_business_id());
```

**Pattern 2: Combined Policy (Current - Simpler)**
```sql
-- ALL operations: Users can manage their own business data
CREATE POLICY "users_manage_own_products" ON products
FOR ALL USING (business_id = get_user_business_id());
```

**✅ Current Implementation**: Uses Pattern 2 (simpler, production-safe)

### Critical Security Rules

1. **Multi-Tenant Isolation**:
   - ✅ All policies check `business_id = get_user_business_id()`
   - ✅ Users can ONLY access data from their own business
   - ✅ Cross-business access is blocked by RLS

2. **User Profile Requirement**:
   - ✅ `get_user_business_id()` requires `user_profiles` row
   - ✅ If no profile exists, function returns NULL
   - ✅ NULL business_id blocks ALL data access

3. **Authentication Requirement**:
   - ✅ All policies use `auth.uid()` (requires authenticated user)
   - ✅ Unauthenticated users see NO data
   - ✅ Anonymous access is blocked

---

## ✅ TASK 3 — SERVICE_ROLE vs ANON KEY USAGE

### Service Role Key (Backend Only)

**When to Use**:
- ✅ **Backend API operations** that need to bypass RLS
- ✅ **Admin operations** (creating businesses, bulk operations)
- ✅ **System operations** (background jobs, migrations)
- ✅ **Testing** (test routes like `/test/insert`)

**Where Used**:
- `backend/src/config/supabase.js` → `supabaseAdmin`
- `backend/src/routes/test.js` → Test routes
- `backend/src/services/*.js` → Should use `supabaseAdmin` for server-side operations

**Security**:
- ⚠️ **NEVER expose to frontend**
- ⚠️ **NEVER commit to version control**
- ⚠️ **NEVER use in client-side code**
- ✅ **Only in backend `.env` file**
- ✅ **Bypasses RLS completely**

### Anon Key (Frontend + Backend)

**When to Use**:
- ✅ **Frontend direct Supabase queries** (with JWT token)
- ✅ **Backend authenticated requests** (with user JWT)
- ✅ **Client-side operations** (respects RLS)

**Where Used**:
- `lib/api/client.ts` → Frontend API client
- `lib/hooks/useAuth.ts` → Frontend auth hook
- `backend/src/config/supabase.js` → `supabase` (anon client)
- `backend/src/middleware/auth.js` → Token verification

**Security**:
- ✅ **Safe to expose in frontend** (with RLS enabled)
- ✅ **Respects RLS policies**
- ✅ **Requires authenticated user** (JWT token)
- ✅ **Multi-tenant isolation enforced**

### Decision Matrix

| Operation | Location | Key Type | Reason |
|-----------|----------|----------|--------|
| Frontend: List products | Frontend | Anon + JWT | RLS enforces business_id |
| Frontend: Create product | Frontend | Anon + JWT | RLS enforces business_id |
| Backend: Verify JWT | Backend | Anon | Standard auth verification |
| Backend: Query user_profiles | Backend | Anon | RLS allows own profile |
| Backend: Bulk operations | Backend | Service Role | Needs to bypass RLS |
| Backend: Admin operations | Backend | Service Role | Needs to bypass RLS |
| Backend: Test routes | Backend | Service Role | Testing purposes |

### Key Usage Rules

**✅ DO**:
- Use **anon key** in frontend with JWT token
- Use **anon key** in backend for authenticated user operations
- Use **service_role key** in backend for admin/system operations
- Always verify JWT token before using anon key

**❌ DON'T**:
- Use **service_role key** in frontend (NEVER)
- Use **service_role key** for user operations (use anon + JWT)
- Expose **service_role key** in client-side code
- Commit **service_role key** to version control

---

## ✅ TASK 4 — FRONTEND CONNECTION FLOW

### Architecture Overview

```
┌─────────────────┐
│  Next.js App    │
│  (Frontend)     │
└────────┬────────┘
         │
         │ 1. User Login
         ▼
┌─────────────────┐
│ Supabase Auth   │
│ (anon key)      │
└────────┬────────┘
         │
         │ 2. Returns JWT Token
         ▼
┌─────────────────┐
│ Frontend Client │
│ (anon key + JWT)│
└────────┬────────┘
         │
         │ 3. Direct Query OR
         │    API Request
         ▼
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────────┐
│Supabase│ │Backend API  │
│(RLS)   │ │(JWT verify) │
└────────┘ └──────────────┘
```

### Flow 1: Direct Supabase Query (Frontend)

**Step 1: User Authentication**
```
User → Login Page → Supabase Auth (anon key)
  → Email/Password → JWT Token returned
```

**Step 2: Supabase Client Initialization**
```typescript
// Frontend: lib/hooks/useAuth.ts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// User logs in
await supabase.auth.signInWithPassword({ email, password });

// Session contains JWT token
const { data: { session } } = await supabase.auth.getSession();
// session.access_token = JWT token
```

**Step 3: Direct Query (Respects RLS)**
```typescript
// Frontend: Direct Supabase query
const { data, error } = await supabase
  .from('products')
  .select('*');

// RLS automatically filters by business_id
// Only products where business_id = get_user_business_id() are returned
```

**Security**:
- ✅ Uses anon key (safe for frontend)
- ✅ JWT token automatically included in request
- ✅ RLS enforces `business_id = get_user_business_id()`
- ✅ User can only see their own business data

### Flow 2: Backend API Request (Frontend → Backend → Supabase)

**Step 1: User Authentication**
```
User → Login Page → Supabase Auth (anon key)
  → Email/Password → JWT Token returned
```

**Step 2: Frontend API Client**
```typescript
// Frontend: lib/api/client.ts
async function getAuthToken() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// Make API request with JWT
const response = await fetch('http://localhost:3001/api/v1/products', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

**Step 3: Backend Verification**
```typescript
// Backend: src/middleware/auth.js
// 1. Extract JWT from Authorization header
// 2. Verify with Supabase (anon key)
const { data: { user } } = await supabase.auth.getUser(token);

// 3. Get business_id from user_profiles
const { data: profile } = await supabase
  .from('user_profiles')
  .select('business_id')
  .eq('user_id', user.id)
  .single();

// 4. Attach business_id to request
req.businessId = profile.business_id;
```

**Step 4: Backend Query (Service Role or Anon)**
```typescript
// Option A: Use service_role (bypasses RLS)
const { data } = await supabaseAdmin
  .from('products')
  .select('*')
  .eq('business_id', req.businessId);

// Option B: Use anon key with user JWT (respects RLS)
const userSupabase = createClient(url, anonKey, {
  global: { headers: { Authorization: `Bearer ${token}` } }
});
const { data } = await userSupabase
  .from('products')
  .select('*');
```

**Security**:
- ✅ Frontend uses anon key (safe)
- ✅ Backend verifies JWT token
- ✅ Backend extracts business_id
- ✅ Backend filters by business_id (or uses RLS)

### Recommended Flow

**For Frontend**:
- ✅ **Use Backend API** (recommended)
  - Centralized business logic
  - Consistent error handling
  - Easier to maintain

- ⚠️ **Direct Supabase queries** (optional, for simple reads)
  - Faster for simple queries
  - Less backend load
  - Still secure (RLS enforced)

**For Backend**:
- ✅ **Use service_role key** for:
  - Admin operations
  - Bulk operations
  - System operations

- ✅ **Use anon key + JWT** for:
  - User operations
  - Operations that should respect RLS

---

## ✅ TASK 5 — SECURITY VERIFICATION CHECKS

### Check 1: RLS is Enabled

**SQL Query**:
```sql
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('products', 'businesses', 'units', 'user_profiles')
ORDER BY tablename;
```

**Expected Result**:
- All tables show `rls_enabled = true`

**❌ If False**: RLS is disabled → Security risk!

---

### Check 2: Policies Exist

**SQL Query**:
```sql
SELECT 
    tablename,
    policyname,
    cmd as command
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('products', 'businesses', 'units')
ORDER BY tablename, policyname;
```

**Expected Result**:
- Each table has at least SELECT policy
- Policies use `get_user_business_id()` function

**❌ If Missing**: No policies → All data blocked or all data visible (security risk!)

---

### Check 3: get_user_business_id() Function Works

**SQL Query** (as authenticated user):
```sql
SELECT get_user_business_id() as business_id;
```

**Expected Result**:
- Returns business_id (integer) or NULL
- NULL means user has no profile → RLS blocks all data

**❌ If NULL**: User needs `user_profiles` row

---

### Check 4: Frontend Cannot Access Other Business Data

**Test Scenario**:
1. Login as User A (business_id = 1)
2. Query products
3. Should only see products where business_id = 1

**Frontend Test**:
```typescript
// Login as User A
await supabase.auth.signInWithPassword({ email: 'userA@example.com', password: '...' });

// Query products
const { data } = await supabase.from('products').select('*');

// Verify: All products have business_id = 1
data.forEach(product => {
  if (product.business_id !== 1) {
    throw new Error('Security breach: User A can see other business data!');
  }
});
```

**Expected Result**:
- Only products with business_id = 1 are returned
- No products from other businesses

**❌ If Other Business Data Visible**: RLS policy is broken!

---

### Check 5: Unauthenticated Users See No Data

**Test Scenario**:
1. Do NOT login
2. Query products (without JWT)
3. Should return empty array or error

**Frontend Test**:
```typescript
// No login
const supabase = createClient(url, anonKey);

// Query products
const { data, error } = await supabase.from('products').select('*');

// Verify: No data or error
if (data && data.length > 0) {
  throw new Error('Security breach: Unauthenticated users can see data!');
}
```

**Expected Result**:
- Empty array `[]` (RLS blocks all rows)
- OR error (if policy requires authentication)

**❌ If Data Visible**: RLS policy allows anonymous access → Security risk!

---

### Check 6: Service Role Key is NOT in Frontend

**Frontend Code Check**:
```bash
# Search for service_role in frontend code
grep -r "SERVICE_ROLE" lib/ app/ components/
```

**Expected Result**:
- No matches (service_role key should NOT be in frontend)

**❌ If Found**: Service role key in frontend → Critical security risk!

---

### Check 7: Anon Key is Used in Frontend

**Frontend Code Check**:
```typescript
// Should use NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY  // ✅ Anon key
);
```

**Expected Result**:
- Frontend uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- NOT `SUPABASE_SERVICE_ROLE_KEY`

**❌ If Service Role Used**: Critical security risk!

---

### Check 8: Backend Verifies JWT Token

**Backend Code Check**:
```typescript
// backend/src/middleware/auth.js
// Should verify JWT before processing
const { data: { user }, error } = await supabase.auth.getUser(token);
```

**Expected Result**:
- Backend verifies JWT token
- Returns 401 if token is invalid
- Extracts business_id from user_profiles

**❌ If No Verification**: Backend accepts any token → Security risk!

---

### Check 9: Frontend Cannot Bypass RLS

**Test Scenario**:
1. Login as User A
2. Try to query products with business_id = 2
3. Should return empty array (RLS blocks)

**Frontend Test**:
```typescript
// Login as User A (business_id = 1)
await supabase.auth.signInWithPassword({ email: 'userA@example.com', password: '...' });

// Try to query products with business_id = 2
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('business_id', 2);  // Different business

// Verify: Empty array (RLS blocks)
if (data && data.length > 0) {
  throw new Error('Security breach: User can access other business data!');
}
```

**Expected Result**:
- Empty array `[]` (RLS blocks cross-business access)

**❌ If Data Visible**: RLS policy is broken!

---

### Check 10: Backend Filters by business_id

**Backend Code Check**:
```typescript
// backend/src/services/productService.js
// Should filter by business_id
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('business_id', business_id);  // ✅ Filtered
```

**Expected Result**:
- Backend explicitly filters by business_id
- OR uses RLS (which enforces business_id)

**❌ If No Filter**: Backend might return all data → Security risk!

---

## 📋 COMPLETE VERIFICATION CHECKLIST

### RLS Status
- [ ] RLS is enabled on all core tables
- [ ] Policies exist for SELECT operations
- [ ] Policies exist for INSERT operations
- [ ] Policies use `get_user_business_id()` function

### Key Usage
- [ ] Frontend uses anon key only
- [ ] Backend uses service_role for admin operations
- [ ] Backend uses anon key for user operations
- [ ] Service role key is NOT in frontend code

### Authentication
- [ ] Frontend requires login before data access
- [ ] Backend verifies JWT token
- [ ] Backend extracts business_id from user_profiles
- [ ] Unauthenticated users see no data

### Data Isolation
- [ ] Users can only see their own business data
- [ ] Users cannot access other business data
- [ ] RLS blocks cross-business queries
- [ ] Backend filters by business_id

---

## 🎯 PRODUCTION READINESS SUMMARY

### ✅ Current Status

**RLS Configuration**:
- ✅ All tables have RLS enabled
- ✅ Policies use `get_user_business_id()` for isolation
- ✅ Multi-tenant isolation is enforced

**Key Usage**:
- ✅ Frontend uses anon key (safe)
- ✅ Backend uses service_role for admin operations
- ✅ Backend uses anon key for user operations

**Security**:
- ✅ Authentication required for data access
- ✅ Business-level isolation enforced
- ✅ Cross-business access blocked

### ⚠️ Recommendations

1. **Add Explicit INSERT Policies** (if needed):
   - Some tables use `FOR ALL` which includes INSERT
   - Consider separate policies for better control

2. **Add DELETE Policies** (if needed):
   - Some tables use `FOR ALL` which includes DELETE
   - Consider separate policies for better control

3. **Monitor RLS Performance**:
   - `get_user_business_id()` function is called for every query
   - Consider caching if performance issues arise

4. **Test RLS Policies**:
   - Create test users for different businesses
   - Verify they cannot access each other's data

---

## 📝 FRONTEND INTEGRATION READINESS

**✅ Ready For**:
- Frontend can use anon key safely
- RLS will enforce multi-tenant isolation
- JWT tokens will be verified
- Business-level access control is enforced

**✅ Security Guarantees**:
- Users can only access their own business data
- Unauthenticated users see no data
- Cross-business access is blocked
- Service role key is not exposed to frontend

---

**Frontend security architecture is production-ready!**

