-- ============================================
-- FIX RLS POLICIES FOR CATEGORIES, BRANDS, AND UNITS
-- ============================================
-- 
-- This script creates Row-Level Security (RLS) policies that allow
-- authenticated users to manage categories, brands, and units for their business.
-- 
-- USAGE: Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ENABLE RLS ON TABLES (if not already enabled)
-- ============================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. DROP EXISTING POLICIES (if any)
-- ============================================
DROP POLICY IF EXISTS "Users can view categories for their business" ON categories;
DROP POLICY IF EXISTS "Users can insert categories for their business" ON categories;
DROP POLICY IF EXISTS "Users can update categories for their business" ON categories;
DROP POLICY IF EXISTS "Users can delete categories for their business" ON categories;

DROP POLICY IF EXISTS "Users can view brands for their business" ON brands;
DROP POLICY IF EXISTS "Users can insert brands for their business" ON brands;
DROP POLICY IF EXISTS "Users can update brands for their business" ON brands;
DROP POLICY IF EXISTS "Users can delete brands for their business" ON brands;

DROP POLICY IF EXISTS "Users can view units for their business" ON units;
DROP POLICY IF EXISTS "Users can insert units for their business" ON units;
DROP POLICY IF EXISTS "Users can update units for their business" ON units;
DROP POLICY IF EXISTS "Users can delete units for their business" ON units;

-- ============================================
-- 3. CATEGORIES POLICIES
-- ============================================

-- Allow users to view categories for their business
CREATE POLICY "Users can view categories for their business"
ON categories FOR SELECT
USING (
  business_id IN (
    SELECT business_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Allow users to insert categories for their business
CREATE POLICY "Users can insert categories for their business"
ON categories FOR INSERT
WITH CHECK (
  business_id IN (
    SELECT business_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

-- Allow users to update categories for their business
CREATE POLICY "Users can update categories for their business"
ON categories FOR UPDATE
USING (
  business_id IN (
    SELECT business_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Allow users to delete categories for their business
CREATE POLICY "Users can delete categories for their business"
ON categories FOR DELETE
USING (
  business_id IN (
    SELECT business_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- ============================================
-- 4. BRANDS POLICIES
-- ============================================

-- Allow users to view brands for their business
CREATE POLICY "Users can view brands for their business"
ON brands FOR SELECT
USING (
  business_id IN (
    SELECT business_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Allow users to insert brands for their business
CREATE POLICY "Users can insert brands for their business"
ON brands FOR INSERT
WITH CHECK (
  business_id IN (
    SELECT business_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

-- Allow users to update brands for their business
CREATE POLICY "Users can update brands for their business"
ON brands FOR UPDATE
USING (
  business_id IN (
    SELECT business_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Allow users to delete brands for their business
CREATE POLICY "Users can delete brands for their business"
ON brands FOR DELETE
USING (
  business_id IN (
    SELECT business_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- ============================================
-- 5. UNITS POLICIES
-- ============================================

-- Allow users to view units for their business
CREATE POLICY "Users can view units for their business"
ON units FOR SELECT
USING (
  business_id IN (
    SELECT business_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Allow users to insert units for their business
CREATE POLICY "Users can insert units for their business"
ON units FOR INSERT
WITH CHECK (
  business_id IN (
    SELECT business_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

-- Allow users to update units for their business
CREATE POLICY "Users can update units for their business"
ON units FOR UPDATE
USING (
  business_id IN (
    SELECT business_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Allow users to delete units for their business
CREATE POLICY "Users can delete units for their business"
ON units FOR DELETE
USING (
  business_id IN (
    SELECT business_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- ============================================
-- VERIFICATION
-- ============================================
-- Check if policies were created
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
WHERE tablename IN ('categories', 'brands', 'units')
ORDER BY tablename, policyname;

-- ============================================
-- NOTES
-- ============================================
-- 1. These policies ensure users can only access data for their own business
-- 2. The policies use auth.uid() to get the current authenticated user
-- 3. The policies check user_profiles to get the user's business_id
-- 4. All operations (SELECT, INSERT, UPDATE, DELETE) are restricted to the user's business
-- ============================================

