-- Fix Contacts Table RLS Policy for INSERT Operations
-- Run this if you get "Permission denied" or "row-level security" errors

-- ============================================
-- STEP 1: Check Current Policies
-- ============================================

-- View existing policies on contacts table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'contacts'
ORDER BY policyname;

-- ============================================
-- STEP 2: Enable RLS (if not already enabled)
-- ============================================

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Drop Existing Restrictive Policies (if needed)
-- ============================================

-- Uncomment these if you want to start fresh
-- DROP POLICY IF EXISTS "contacts_select_policy" ON contacts;
-- DROP POLICY IF EXISTS "contacts_insert_policy" ON contacts;
-- DROP POLICY IF EXISTS "contacts_update_policy" ON contacts;
-- DROP POLICY IF EXISTS "contacts_delete_policy" ON contacts;

-- ============================================
-- STEP 4: Create Permissive Policies
-- ============================================

-- SELECT Policy: Users can view contacts in their business
CREATE POLICY "contacts_select_policy" ON contacts
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- INSERT Policy: Users can add contacts to their business
CREATE POLICY "contacts_insert_policy" ON contacts
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- UPDATE Policy: Users can update contacts in their business
CREATE POLICY "contacts_update_policy" ON contacts
  FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- DELETE Policy: Users can delete contacts in their business
CREATE POLICY "contacts_delete_policy" ON contacts
  FOR DELETE
  USING (
    business_id IN (
      SELECT business_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- STEP 5: Grant Permissions to Authenticated Users
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON contacts TO authenticated;
GRANT USAGE ON SEQUENCE contacts_id_seq TO authenticated;

-- ============================================
-- STEP 6: Verify Policies are Working
-- ============================================

-- Test SELECT (should return your contacts)
SELECT id, name, type, business_id 
FROM contacts 
LIMIT 5;

-- Test INSERT (should work without errors)
-- Replace YOUR_BUSINESS_ID with actual business_id from user_profiles
/*
INSERT INTO contacts (business_id, name, type, mobile, created_by)
VALUES 
  (YOUR_BUSINESS_ID, 'Test Worker', 'worker', '03001234567', auth.uid())
RETURNING *;
*/

-- ============================================
-- STEP 7: Check for User Profile Issues
-- ============================================

-- Verify your user has a business_id
SELECT 
  up.user_id,
  up.business_id,
  up.role,
  b.name as business_name
FROM user_profiles up
LEFT JOIN businesses b ON up.business_id = b.id
WHERE up.user_id = auth.uid();

-- If no result, you need to create a user profile:
/*
INSERT INTO user_profiles (user_id, business_id, role)
VALUES (auth.uid(), YOUR_BUSINESS_ID, 'admin');
*/

-- ============================================
-- STEP 8: Alternative - Temporary Bypass for Testing
-- ============================================

-- WARNING: Only use this for testing/development
-- DO NOT use in production without proper security review

/*
-- Drop all policies (allows all operations)
DROP POLICY IF EXISTS "contacts_select_policy" ON contacts;
DROP POLICY IF EXISTS "contacts_insert_policy" ON contacts;
DROP POLICY IF EXISTS "contacts_update_policy" ON contacts;
DROP POLICY IF EXISTS "contacts_delete_policy" ON contacts;

-- Create permissive policy that allows everything for authenticated users
CREATE POLICY "contacts_all_policy" ON contacts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
*/

-- ============================================
-- STEP 9: Debug RLS Issues
-- ============================================

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'contacts';

-- Check effective permissions
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'contacts';

-- ============================================
-- STEP 10: Common Error Fixes
-- ============================================

-- Error: "new row violates row-level security policy"
-- Solution: Make sure business_id in INSERT matches user's business_id

-- Error: "permission denied for table contacts"
-- Solution: Run GRANT statements in Step 5

-- Error: "null value in column business_id"
-- Solution: Ensure user_profiles has business_id for current user

-- ============================================
-- FINAL VERIFICATION
-- ============================================

-- This should return TRUE if everything is working
SELECT EXISTS (
  SELECT 1 
  FROM contacts 
  WHERE business_id IN (
    SELECT business_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
) as can_access_contacts;

-- ============================================
-- NOTES
-- ============================================

/*
Common Issues:

1. **No business_id in user_profiles**
   - Create entry: INSERT INTO user_profiles (user_id, business_id, role) VALUES (auth.uid(), 1, 'admin');

2. **RLS blocking INSERT**
   - Check WITH CHECK condition matches your INSERT data
   - Verify created_by = auth.uid()

3. **Missing permissions**
   - Run GRANT statements in Step 5
   - Check role permissions

4. **Policy conflicts**
   - Drop all policies and recreate
   - Use PERMISSIVE policies (default) not RESTRICTIVE

5. **Auth issues**
   - Verify user is logged in: SELECT auth.uid();
   - Check session is valid in Supabase dashboard
*/
