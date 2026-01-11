# Quick Error Debug Guide

**Error Location:** Production Setup → Add Worker/Supplier  
**Date:** January 10, 2026  

---

## Console Output Analysis

When you try to add a worker, check the console (F12) for these logs:

### Expected Successful Flow:
```
✅ User authenticated: abc-123-xyz
✅ Business ID: 1
✅ Creating contact with type: worker
✅ Inserting contact: { business_id: 1, name: "...", ... }
✅ Contact created successfully: { id: 123, name: "...", ... }
```

### If Error Occurs:
```
=== SUPABASE INSERT ERROR ===
Full error object: { "code": "42501", "message": "..." }
Error message: [ACTUAL ERROR MESSAGE]
Error code: [ERROR CODE]
Error details: [DETAILS]
Error hint: [HINT]
=============================

=== CATCH BLOCK ERROR ===
Error.message: [ACTUAL MESSAGE]
Error.code: [CODE]
Final error message: [WHAT USER SEES]
========================
```

---

## Common Error Codes

| Code | Meaning | Quick Fix |
|------|---------|-----------|
| **23514** | CHECK constraint violation | 'worker' type not allowed. Run: `database/FIX_WORKER_TYPE_CONSTRAINT.sql` |
| **42501** | Permission denied (RLS) | Run SQL: `GRANT INSERT ON contacts TO authenticated;` |
| **23505** | Duplicate entry | Contact already exists, use different name |
| **23503** | Foreign key violation | Invalid business_id or user_id |
| **23502** | NOT NULL violation | Missing required field (business_id, name, or type) |
| **22P02** | Invalid text | Check data types |
| **08P01** | Connection error | Check Supabase connection |

---

## Quick Fixes

### Fix 1: CHECK Constraint - Add 'worker' Type (Code 23514)
```sql
-- Run in Supabase SQL Editor
-- See: database/FIX_WORKER_TYPE_CONSTRAINT.sql

-- Drop old constraint
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_type_check;

-- Add new constraint with 'worker'
ALTER TABLE contacts ADD CONSTRAINT contacts_type_check 
  CHECK (type IN ('customer', 'supplier', 'worker', 'both'));
```

### Fix 2: RLS Policy
```sql
-- Run in Supabase SQL Editor
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_insert_policy" ON contacts
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM user_profiles WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

GRANT INSERT ON contacts TO authenticated;
```

### Fix 3: Check User Profile
```sql
-- Verify you have a profile
SELECT user_id, business_id, role 
FROM user_profiles 
WHERE user_id = auth.uid();

-- If empty, create profile
INSERT INTO user_profiles (user_id, business_id, role)
VALUES (auth.uid(), 1, 'admin');
```

### Fix 4: Manual Test
```sql
-- Try inserting directly
INSERT INTO contacts (business_id, name, type, mobile, created_by)
VALUES (1, 'Test Worker', 'worker', '03001111111', auth.uid())
RETURNING *;
```

---

## Debug Steps

1. **Open Console (F12)**
2. **Try adding worker**
3. **Look for section headers:**
   - `=== SUPABASE INSERT ERROR ===`
   - `=== CATCH BLOCK ERROR ===`
4. **Check Error.code value**
5. **Match code to table above**
6. **Run corresponding fix**

---

## Still Not Working?

### Check These:

1. **Authentication:**
   ```javascript
   // In console
   const { data } = await supabase.auth.getSession();
   console.log(data?.session?.user);
   ```

2. **Business ID:**
   ```sql
   SELECT * FROM user_profiles WHERE user_id = auth.uid();
   ```

3. **Table Permissions:**
   ```sql
   SELECT grantee, privilege_type 
   FROM information_schema.role_table_grants 
   WHERE table_name = 'contacts';
   ```

4. **Try from Contacts Page:**
   - Go to Dashboard → Contacts
   - Click "Add Contact"
   - Select "Worker"
   - Try adding
   - If works here but not in Production Setup, issue is specific to Production component

---

## Files Modified

- `components/studio/ProductionSetupScreen.tsx` - Enhanced error logging
- `database/FIX_CONTACTS_RLS_INSERT.sql` - Complete RLS fix
- `PRODUCTION_SETUP_ERROR_FIX.md` - Detailed troubleshooting

---

## Next Steps

1. Refresh browser
2. Open console (F12)
3. Try adding worker
4. Read the detailed error logs
5. Match error code to fixes above
6. Share the **Error.code** and **Error.message** if still stuck

---

**Last Updated:** January 10, 2026  
**Status:** Enhanced debugging, waiting for error details
