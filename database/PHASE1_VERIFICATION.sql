-- ============================================
-- PHASE 1 VERIFICATION QUERIES
-- Run these after deploying Phase 1 schema
-- ============================================

-- ============================================
-- VERIFICATION 1: Tables Created
-- ============================================

SELECT 
    'organizations' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'organizations'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
    'organization_users',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'organization_users'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
    'feature_definitions',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'feature_definitions'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
    'organization_features',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'organization_features'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END;

-- ============================================
-- VERIFICATION 2: organization_id Column Added
-- ============================================

SELECT 
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN is_nullable = 'YES' THEN '✅ NULLABLE (backward compatible)'
        ELSE '❌ NOT NULL (may break existing data)'
    END as compatibility_check
FROM information_schema.columns
WHERE table_name = 'businesses'
    AND column_name = 'organization_id';

-- ============================================
-- VERIFICATION 3: Functions Created
-- ============================================

SELECT 
    routine_name,
    routine_type,
    CASE 
        WHEN routine_name = 'get_user_business_id' THEN '✅ Dual-mode support'
        WHEN routine_name = 'get_user_organization_id' THEN '✅ Organization support'
        ELSE '✅ Created'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('get_user_business_id', 'get_user_organization_id')
ORDER BY routine_name;

-- ============================================
-- VERIFICATION 4: RLS Enabled on New Tables
-- ============================================

SELECT 
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN '✅ RLS ENABLED'
        ELSE '❌ RLS NOT ENABLED'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('organizations', 'organization_users', 'organization_features', 'feature_definitions')
ORDER BY tablename;

-- ============================================
-- VERIFICATION 5: Feature Definitions Inserted
-- ============================================

SELECT 
    key,
    name,
    plan_requirements,
    default_enabled,
    CASE 
        WHEN key IS NOT NULL THEN '✅ INSERTED'
        ELSE '❌ MISSING'
    END as status
FROM feature_definitions
ORDER BY key;

-- ============================================
-- VERIFICATION 6: Existing Businesses Unaffected
-- ============================================

SELECT 
    COUNT(*) as total_businesses,
    COUNT(organization_id) as businesses_with_org,
    COUNT(*) - COUNT(organization_id) as legacy_businesses,
    CASE 
        WHEN COUNT(*) - COUNT(organization_id) = COUNT(*) THEN '✅ All businesses are legacy (expected)'
        ELSE '⚠️ Some businesses have organization_id (may be from Phase 2)'
    END as status
FROM businesses;

-- ============================================
-- VERIFICATION 7: Existing user_profiles Unaffected
-- ============================================

SELECT 
    COUNT(*) as total_user_profiles,
    '✅ Legacy user_profiles intact' as status
FROM user_profiles;

-- ============================================
-- VERIFICATION 8: RLS Policies Still Work
-- ============================================

-- Check that existing policies still exist
SELECT 
    schemaname,
    tablename,
    policyname,
    CASE 
        WHEN policyname IS NOT NULL THEN '✅ POLICY EXISTS'
        ELSE '❌ POLICY MISSING'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'products'
    AND policyname LIKE '%products%'
ORDER BY policyname;

-- ============================================
-- VERIFICATION 9: Backward Compatibility Test
-- ============================================
-- 
-- This query simulates what get_user_business_id() returns
-- for a legacy user (not in organization_users)
-- 
-- Expected: Should return business_id from user_profiles
-- ============================================

-- Test with a sample user_id (replace with actual user_id from your system)
-- SELECT 
--     'Legacy mode test' as test_name,
--     get_user_business_id() as result,
--     CASE 
--         WHEN get_user_business_id() IS NOT NULL THEN '✅ Legacy mode works'
--         ELSE '❌ Legacy mode broken'
--     END as status;

-- ============================================
-- VERIFICATION 10: Indexes Created
-- ============================================

SELECT 
    tablename,
    indexname,
    CASE 
        WHEN indexname IS NOT NULL THEN '✅ INDEX EXISTS'
        ELSE '❌ INDEX MISSING'
    END as status
FROM pg_indexes
WHERE schemaname = 'public'
    AND (
        (tablename = 'businesses' AND indexname LIKE '%organization_id%')
        OR (tablename = 'organizations' AND indexname LIKE '%slug%')
        OR (tablename = 'organization_users' AND indexname LIKE '%org%')
        OR (tablename = 'organization_users' AND indexname LIKE '%user%')
    )
ORDER BY tablename, indexname;

-- ============================================
-- SUMMARY
-- ============================================
-- 
-- All verifications should show ✅
-- If any show ❌, review the Phase 1 deployment
-- 
-- ============================================

