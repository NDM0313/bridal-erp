-- ============================================
-- PHASE 1 ROLLBACK PLAN
-- Use ONLY if Phase 1 causes critical issues
-- ============================================
-- 
-- WARNING: This will remove all Phase 1 changes
-- Only run if absolutely necessary
-- 
-- SAFETY: This rollback is safe because:
-- - organization_id is nullable (removing it won't break existing data)
-- - New tables are empty (no data loss)
-- - Functions can be reverted to original
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: DROP NEW TABLES
-- ============================================

-- Drop in reverse dependency order
DROP TABLE IF EXISTS organization_features CASCADE;
DROP TABLE IF EXISTS feature_definitions CASCADE;
DROP TABLE IF EXISTS organization_users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- ============================================
-- STEP 2: REMOVE organization_id FROM businesses
-- ============================================

-- Drop index first
DROP INDEX IF EXISTS idx_businesses_organization_id;

-- Remove column
ALTER TABLE businesses DROP COLUMN IF EXISTS organization_id;

-- ============================================
-- STEP 3: RESTORE ORIGINAL get_user_business_id()
-- ============================================

CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_business_id INTEGER;
BEGIN
    -- Original implementation: Get from user_profiles only
    SELECT business_id INTO user_business_id
    FROM user_profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    RETURN user_business_id;
END;
$$;

-- ============================================
-- STEP 4: DROP get_user_organization_id()
-- ============================================

DROP FUNCTION IF EXISTS get_user_organization_id();

-- ============================================
-- STEP 5: REMOVE NEW RLS POLICIES
-- ============================================

-- Remove organization-related policies
DROP POLICY IF EXISTS "users_manage_products_org" ON products;
DROP POLICY IF EXISTS "users_view_own_organization" ON organizations;
DROP POLICY IF EXISTS "users_view_own_org_membership" ON organization_users;
DROP POLICY IF EXISTS "users_view_own_org_features" ON organization_features;
DROP POLICY IF EXISTS "users_view_feature_definitions" ON feature_definitions;

-- Note: Existing RLS policies remain intact

COMMIT;

-- ============================================
-- VERIFICATION AFTER ROLLBACK
-- ============================================

-- Verify tables dropped
SELECT 
    'organizations' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'organizations'
    ) THEN '❌ STILL EXISTS' ELSE '✅ REMOVED' END as status
UNION ALL
SELECT 
    'organization_users',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'organization_users'
    ) THEN '❌ STILL EXISTS' ELSE '✅ REMOVED' END;

-- Verify organization_id removed
SELECT 
    column_name,
    CASE 
        WHEN column_name IS NULL THEN '✅ REMOVED'
        ELSE '❌ STILL EXISTS'
    END as status
FROM information_schema.columns
WHERE table_name = 'businesses'
    AND column_name = 'organization_id';

-- ============================================
-- NOTES
-- ============================================
-- 
-- After rollback:
-- 1. System returns to pre-Phase 1 state
-- 2. All existing functionality should work
-- 3. No data loss (organization_id was nullable)
-- 4. Can re-run Phase 1 after fixing issues
-- 
-- ============================================

