# New Schema Deployment Guide

## 🎯 Objective
Deploy the new POS database schema to Supabase alongside existing tables.

**IMPORTANT**: Old tables are NOT touched or deleted.

---

## 📋 Pre-Deployment Checklist

- [ ] Access to Supabase Dashboard
- [ ] Project URL and credentials ready
- [ ] SQL Editor access (admin/service role)
- [ ] Your user UUID from Authentication → Users

---

## 🔍 STEP 1 — SCHEMA VERIFICATION

### Action:
Open **Supabase SQL Editor** and run:

```sql
-- Check if new tables already exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN (
        'businesses',
        'business_locations',
        'user_profiles',
        'variations',
        'variation_location_details',
        'transactions'
    )
ORDER BY table_name;
```

### Expected Result:
- **Empty result** = Tables don't exist (GOOD - proceed)
- **Has rows** = Some tables exist (WARNING - check if they're old or new)

### Report:
```
✅ STEP 1 RESULTS:
- businesses: [EXISTS / NOT EXISTS]
- business_locations: [EXISTS / NOT EXISTS]
- user_profiles: [EXISTS / NOT EXISTS]
- variations: [EXISTS / NOT EXISTS]
- variation_location_details: [EXISTS / NOT EXISTS]
- transactions: [EXISTS / NOT EXISTS]
```

---

## 🚀 STEP 2 — DEPLOY NEW SCHEMA

### Action:
1. Open **Supabase SQL Editor**
2. Open file: `database/DEPLOY_NEW_SCHEMA.sql`
3. **Copy entire file content**
4. **Paste into SQL Editor**
5. **Click "Run"** (or press Ctrl+Enter)

### What This Does:
- Creates all new tables
- Creates indexes
- Creates `get_user_business_id()` function
- Enables RLS on all tables
- Creates RLS policies

### Expected Result:
- ✅ Success message
- ✅ All tables created
- ✅ No errors

### If Errors Occur:
- **Table already exists**: Use `CREATE TABLE IF NOT EXISTS` (already in script)
- **Foreign key error**: Check dependencies
- **Permission error**: Ensure admin/service role access

### Report:
```
✅ STEP 2 RESULTS:
- Schema deployment: [SUCCESS / FAILED]
- Tables created: [List created tables]
- Errors: [List any errors]
```

---

## ✅ STEP 3 — VERIFY TABLE CREATION

### Action:
Run in SQL Editor:

```sql
-- List all new tables
SELECT 
    table_name,
    'CREATED' as status
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN (
        'businesses',
        'business_locations',
        'user_profiles',
        'contacts',
        'units',
        'brands',
        'categories',
        'products',
        'product_variations',
        'variations',
        'variation_location_details',
        'transactions',
        'transaction_sell_lines'
    )
ORDER BY table_name;
```

### Expected Result:
- All 13 tables listed
- Status: CREATED

### Also Check:
```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('businesses', 'products', 'user_profiles')
ORDER BY tablename;
```

### Report:
```
✅ STEP 3 RESULTS:
- Total new tables: X
- Tables created: [List]
- RLS enabled: [YES / NO]
- Missing tables: [List if any]
```

---

## 📦 STEP 4 — MINIMUM BOOTSTRAP DATA

### Action:
1. **Get Your User UUID:**
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
   ```
   Copy the UUID (id column)

2. **Open file**: `database/BOOTSTRAP_DATA.sql`

3. **Replace placeholders:**
   - `YOUR_USER_UUID` → Your actual UUID from step 1
   - `business_id` → Will be 1 (first business)

4. **Run the script step by step:**
   - Step 2: Insert business (note the returned `id`)
   - Step 3: Insert location (use business_id from step 2)
   - Step 4: Insert base unit (note the returned `id`)
   - Step 5: Insert Box unit (use base_unit_id from step 4)
   - Step 6: Insert user_profiles (use your UUID and business_id)

### Expected Result:
- ✅ 1 business created
- ✅ 1 location created
- ✅ 2 units created (Pieces, Box)
- ✅ 1 user_profiles row created

### Report:
```
✅ STEP 4 RESULTS:
- Business created: [YES / NO] → ID: X
- Location created: [YES / NO] → ID: X
- Base unit (Pieces): [YES / NO] → ID: X
- Secondary unit (Box): [YES / NO] → ID: X
- User profile: [YES / NO] → business_id: X
```

---

## 🧪 STEP 5 — FINAL VERIFICATION

### Action 1: Test API Endpoint

**From Terminal/Postman:**
```bash
# Get JWT token from frontend login
# Then test:
curl -X GET "http://localhost:3001/api/v1/products" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Expected Result:
- ✅ Status: 200 OK
- ✅ Response: `{"success": true, "data": [], "meta": {...}}`
- ✅ Empty array is OK (no products yet)

### Action 2: Test Frontend

1. Open browser → http://localhost:3000/products
2. Should load without errors
3. Should show "No products found" (empty state)

### Expected Result:
- ✅ Page loads
- ✅ No console errors
- ✅ Shows empty state (not error)

### Action 3: Verify Function

```sql
-- Test get_user_business_id() function
-- (Only works when authenticated)
SELECT get_user_business_id() as business_id_result;
```

### Expected Result:
- Returns business_id (not NULL)

### Report:
```
✅ STEP 5 RESULTS:
- API /products endpoint: [200 OK / ERROR]
- API response: [Show JSON]
- Frontend Products page: [LOADS / ERROR]
- get_user_business_id(): [Returns ID / NULL]
```

---

## 🔧 Troubleshooting

### Issue: Tables Already Exist
**Solution**: Script uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run again.

### Issue: Foreign Key Error
**Solution**: Ensure tables are created in order (script handles this).

### Issue: RLS Blocking Data
**Solution**: 
1. Check `user_profiles` has row
2. Check `get_user_business_id()` returns business_id
3. Verify RLS policies are created

### Issue: API Returns 403
**Solution**: 
1. Check `user_profiles` table has row for your user
2. Verify `business_id` is set correctly

### Issue: API Returns 500
**Solution**: 
1. Check backend logs
2. Verify database connection
3. Check environment variables

---

## 📝 Deployment Checklist

- [ ] Step 1: Verified new tables don't exist
- [ ] Step 2: Deployed schema successfully
- [ ] Step 3: Verified all tables created
- [ ] Step 4: Inserted bootstrap data
- [ ] Step 5: API returns 200 (empty array OK)
- [ ] Step 5: Frontend loads without errors
- [ ] Step 5: `get_user_business_id()` works

---

## 🎯 Success Criteria

✅ All new tables exist  
✅ RLS is enabled  
✅ Bootstrap data inserted  
✅ API returns 200 (not 403/500)  
✅ Frontend loads without errors  
✅ `get_user_business_id()` returns business_id  

---

## 📋 Files Used

1. `database/DEPLOY_NEW_SCHEMA.sql` - Main deployment script
2. `database/BOOTSTRAP_DATA.sql` - Bootstrap data insertion
3. `database/FINAL_SCHEMA.sql` - Reference schema (not executed directly)

---

**Ready to deploy!** 🚀

