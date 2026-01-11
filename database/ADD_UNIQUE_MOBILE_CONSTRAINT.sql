-- Add Unique Constraint: Mobile Number per Business
-- Ensures mobile numbers are unique within each business
-- Date: January 10, 2026

-- ============================================
-- PURPOSE
-- ============================================
-- Prevent duplicate contacts with same mobile number within a business
-- Mobile number must be unique per business_id

-- ============================================
-- IMPLEMENTATION
-- ============================================

-- Step 1: Check for existing duplicate data
SELECT 
  business_id,
  mobile,
  COUNT(*) as duplicate_count,
  array_agg(id) as contact_ids,
  array_agg(name) as contact_names
FROM contacts
WHERE mobile IS NOT NULL
GROUP BY business_id, mobile
HAVING COUNT(*) > 1;

-- If duplicates exist, you need to resolve them first:
-- Option A: Delete duplicates (keep oldest)
-- DELETE FROM contacts 
-- WHERE id IN (
--   SELECT id FROM (
--     SELECT id, ROW_NUMBER() OVER (PARTITION BY business_id, mobile ORDER BY created_at) as rn
--     FROM contacts
--     WHERE mobile IS NOT NULL
--   ) t WHERE rn > 1
-- );

-- Option B: Update mobile numbers to make them unique
-- UPDATE contacts 
-- SET mobile = mobile || '-' || id::text
-- WHERE id IN (
--   SELECT id FROM (
--     SELECT id, ROW_NUMBER() OVER (PARTITION BY business_id, mobile ORDER BY created_at) as rn
--     FROM contacts
--     WHERE mobile IS NOT NULL
--   ) t WHERE rn > 1
-- );

-- Step 2: Add unique constraint
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_contact_mobile_per_business'
  ) THEN
    -- Add unique constraint
    ALTER TABLE contacts 
    ADD CONSTRAINT unique_contact_mobile_per_business 
    UNIQUE (business_id, mobile);
    
    RAISE NOTICE 'Unique constraint added: unique_contact_mobile_per_business';
  ELSE
    RAISE NOTICE 'Constraint unique_contact_mobile_per_business already exists';
  END IF;
END $$;

-- Step 3: Verify constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'contacts'::regclass
  AND conname = 'unique_contact_mobile_per_business';

-- Expected output:
-- UNIQUE (business_id, mobile)

-- ============================================
-- TESTING
-- ============================================

-- Test 1: Insert contact with unique mobile (should work)
-- INSERT INTO contacts (business_id, name, type, mobile, created_by)
-- VALUES (1, 'Test Contact 1', 'customer', '03001111111', auth.uid())
-- RETURNING id, name, mobile;

-- Test 2: Try inserting duplicate mobile (should fail)
-- INSERT INTO contacts (business_id, name, type, mobile, created_by)
-- VALUES (1, 'Test Contact 2', 'customer', '03001111111', auth.uid());
-- Expected: ERROR: duplicate key value violates unique constraint "unique_contact_mobile_per_business"

-- Test 3: Same mobile in different business (should work)
-- INSERT INTO contacts (business_id, name, type, mobile, created_by)
-- VALUES (2, 'Test Contact 3', 'customer', '03001111111', auth.uid())
-- RETURNING id, name, mobile;
-- Expected: Success (different business_id)

-- ============================================
-- NOTES
-- ============================================

/*
Constraint Behavior:
- Mobile number must be unique per business_id
- Same mobile can exist in different businesses
- NULL mobile values are allowed (multiple NULLs allowed)
- Case-sensitive: '03001234567' ≠ '03001234568'

Error Code:
- 23505: unique_violation
- Message: "duplicate key value violates unique constraint unique_contact_mobile_per_business"

Client-Side Handling:
- Check duplicate before submit (debounced)
- Show inline banner with existing contact info
- Provide actions: View, Edit, Cancel

Server-Side Handling:
- Constraint enforces uniqueness at database level
- Returns error code 23505 on violation
- Client catches and shows user-friendly message
*/

-- ============================================
-- ROLLBACK (if needed)
-- ============================================

-- To remove constraint:
-- ALTER TABLE contacts DROP CONSTRAINT IF EXISTS unique_contact_mobile_per_business;
