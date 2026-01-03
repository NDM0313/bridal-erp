-- ============================================
-- FIX CONTACTS RLS POLICY
-- This fixes the Row Level Security policy for contacts table
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop ALL existing policies on contacts table
DROP POLICY IF EXISTS "Users manage own contacts" ON contacts;
DROP POLICY IF EXISTS "users_manage_contacts" ON contacts;
DROP POLICY IF EXISTS "Users can view own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can insert own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON contacts;
DROP POLICY IF EXISTS "users_view_own_contacts" ON contacts;
DROP POLICY IF EXISTS "users_manage_own_contacts" ON contacts;

-- Create comprehensive RLS policies for contacts table
-- Policy 1: SELECT (View) - Users can view contacts from their business
CREATE POLICY "Users can view own contacts" ON contacts
FOR SELECT
USING (business_id = get_user_business_id());

-- Policy 2: INSERT - Users can insert contacts for their business
CREATE POLICY "Users can insert own contacts" ON contacts
FOR INSERT
WITH CHECK (business_id = get_user_business_id());

-- Policy 3: UPDATE - Users can update contacts from their business
CREATE POLICY "Users can update own contacts" ON contacts
FOR UPDATE
USING (business_id = get_user_business_id())
WITH CHECK (business_id = get_user_business_id());

-- Policy 4: DELETE - Users can delete contacts from their business
CREATE POLICY "Users can delete own contacts" ON contacts
FOR DELETE
USING (business_id = get_user_business_id());

-- Verify the function exists and works
-- This should return the business_id for the current user
-- If it returns NULL, the function needs to be fixed
SELECT get_user_business_id() as current_user_business_id;

-- Test query to verify RLS is working
-- This should only return contacts for your business
SELECT COUNT(*) as contact_count FROM contacts;

