-- Fix: Add 'worker' to contacts type CHECK constraint
-- Error: Code 23514 - "violates check constraint contacts_type_check"
-- Date: January 10, 2026

-- ============================================
-- PROBLEM
-- ============================================
-- The contacts table has a CHECK constraint that only allows:
--   - 'customer'
--   - 'supplier'  
--   - 'both'
-- 
-- But NOT 'worker'!
--
-- When trying to insert type='worker', database rejects it.

-- ============================================
-- SOLUTION
-- ============================================

-- Step 1: Check current constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as current_definition
FROM pg_constraint
WHERE conrelid = 'contacts'::regclass
  AND conname = 'contacts_type_check';

-- Expected output:
-- CHECK (type = ANY (ARRAY['customer'::text, 'supplier'::text, 'both'::text]))

-- Step 2: Drop old constraint
ALTER TABLE contacts 
DROP CONSTRAINT IF EXISTS contacts_type_check;

-- Step 3: Add new constraint with 'worker' included
ALTER TABLE contacts 
ADD CONSTRAINT contacts_type_check 
  CHECK (type IN ('customer', 'supplier', 'worker', 'both'));

-- Step 4: Verify new constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as new_definition
FROM pg_constraint
WHERE conrelid = 'contacts'::regclass
  AND conname = 'contacts_type_check';

-- Expected output:
-- CHECK (type = ANY (ARRAY['customer'::text, 'supplier'::text, 'worker'::text, 'both'::text]))

-- ============================================
-- TEST THE FIX
-- ============================================

-- Test 1: Insert a worker (should work now)
INSERT INTO contacts (business_id, name, type, mobile, created_by)
VALUES (1, 'Test Worker', 'worker', '03001234567', auth.uid())
RETURNING id, name, type;

-- Test 2: Insert a supplier (should still work)
INSERT INTO contacts (business_id, name, type, mobile, created_by)
VALUES (1, 'Test Supplier', 'supplier', '03002222222', auth.uid())
RETURNING id, name, type;

-- Test 3: Try invalid type (should fail with constraint error)
-- Uncomment to test:
/*
INSERT INTO contacts (business_id, name, type, mobile, created_by)
VALUES (1, 'Invalid', 'invalid_type', '03003333333', auth.uid());
-- Expected: ERROR: new row for relation "contacts" violates check constraint
*/

-- ============================================
-- CLEANUP TEST DATA (Optional)
-- ============================================

-- Remove test contacts
-- DELETE FROM contacts WHERE name LIKE 'Test %';

-- ============================================
-- NOTES
-- ============================================

/*
Valid Contact Types After Fix:
- 'customer'  - Regular customers/buyers
- 'supplier'  - Material/equipment suppliers
- 'worker'    - Production workers (NEW!)
- 'both'      - Contact that is both customer and supplier

Case Sensitivity:
- Values are case-sensitive ('worker' not 'Worker')
- Always use lowercase

Migration Safety:
- Dropping constraint is safe (no data loss)
- Adding new constraint with additional value is safe
- Existing data with 'customer', 'supplier', 'both' will still be valid

Common Errors After Fix:
- If you still get error 23514: Check you're using lowercase 'worker'
- If you get RLS error: Run FIX_CONTACTS_RLS_INSERT.sql
- If you get 23502 error: Missing required field (business_id, name, or type)
*/

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Count contacts by type (including workers)
SELECT 
  type,
  COUNT(*) as count
FROM contacts
WHERE business_id = 1
GROUP BY type
ORDER BY type;

-- ============================================
-- SUCCESS CRITERIA
-- ============================================

/*
After running this script successfully:

✅ Constraint updated to include 'worker'
✅ Test worker inserted successfully
✅ Production Setup → Add Worker works
✅ Contacts Page → Add Worker works
✅ No more error code 23514

Next Steps:
1. Refresh browser (F5)
2. Try adding worker from Production Setup
3. Worker should save successfully
4. Check Workers tab in Contacts page
*/
