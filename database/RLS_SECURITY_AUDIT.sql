-- ============================================
-- RLS SECURITY AUDIT QUERIES
-- Run these to verify RLS is properly configured
-- ============================================

-- ============================================
-- CHECK 1: RLS STATUS
-- ============================================

SELECT 
    'RLS Status Check' as check_type,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'businesses',
        'business_locations',
        'user_profiles',
        'units',
        'products',
        'variations',
        'transactions'
    )
ORDER BY tablename;

-- ============================================
-- CHECK 2: POLICY EXISTENCE
-- ============================================

SELECT 
    'Policy Existence Check' as check_type,
    tablename,
    policyname,
    cmd as command,
    CASE 
        WHEN cmd = 'SELECT' THEN '✅ SELECT'
        WHEN cmd = 'INSERT' THEN '✅ INSERT'
        WHEN cmd = 'UPDATE' THEN '✅ UPDATE'
        WHEN cmd = 'DELETE' THEN '✅ DELETE'
        WHEN cmd = 'ALL' THEN '✅ ALL'
        ELSE '⚠️ UNKNOWN'
    END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'businesses',
        'business_locations',
        'user_profiles',
        'units',
        'products',
        'variations',
        'transactions'
    )
ORDER BY tablename, cmd;

-- ============================================
-- CHECK 3: POLICY USES get_user_business_id()
-- ============================================

SELECT 
    'Policy Function Check' as check_type,
    tablename,
    policyname,
    CASE 
        WHEN qual LIKE '%get_user_business_id()%' THEN '✅ Uses function'
        WHEN qual LIKE '%business_id%' THEN '✅ Uses business_id'
        ELSE '⚠️ Check manually'
    END as function_usage
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'businesses',
        'products',
        'units'
    )
ORDER BY tablename, policyname;

-- ============================================
-- CHECK 4: get_user_business_id() FUNCTION
-- ============================================

SELECT 
    'Function Check' as check_type,
    routine_name,
    routine_type,
    data_type as return_type,
    CASE 
        WHEN routine_name = 'get_user_business_id' THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name = 'get_user_business_id';

-- View function definition
SELECT 
    'Function Definition' as check_type,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'get_user_business_id';

-- ============================================
-- CHECK 5: USER_PROFILES TABLE ACCESS
-- ============================================

SELECT 
    'User Profiles Check' as check_type,
    COUNT(*) as total_profiles,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT business_id) as unique_businesses
FROM user_profiles;

-- Check for users without profiles
SELECT 
    'Users Without Profiles' as check_type,
    COUNT(*) as users_without_profiles
FROM auth.users u
LEFT JOIN user_profiles up ON up.user_id = u.id
WHERE up.id IS NULL;

-- ============================================
-- CHECK 6: POLICY COVERAGE SUMMARY
-- ============================================

WITH policy_summary AS (
    SELECT 
        tablename,
        COUNT(*) as total_policies,
        COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
        COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
        COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
        COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies,
        COUNT(CASE WHEN cmd = 'ALL' THEN 1 END) as all_policies
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename IN (
            'businesses',
            'business_locations',
            'user_profiles',
            'units',
            'products',
            'variations',
            'transactions'
        )
    GROUP BY tablename
)
SELECT 
    'Policy Coverage' as check_type,
    tablename,
    total_policies,
    CASE 
        WHEN select_policies > 0 OR all_policies > 0 THEN '✅'
        ELSE '❌'
    END as has_select,
    CASE 
        WHEN insert_policies > 0 OR all_policies > 0 THEN '✅'
        ELSE '❌'
    END as has_insert,
    CASE 
        WHEN update_policies > 0 OR all_policies > 0 THEN '✅'
        ELSE '❌'
    END as has_update,
    CASE 
        WHEN delete_policies > 0 OR all_policies > 0 THEN '✅'
        ELSE '❌'
    END as has_delete
FROM policy_summary
ORDER BY tablename;

-- ============================================
-- EXPECTED RESULTS
-- ============================================
-- 
-- RLS Status: All tables should show ✅ ENABLED
-- Policy Existence: All tables should have policies
-- Policy Function: All policies should use get_user_business_id()
-- Function: get_user_business_id() should exist
-- User Profiles: Should have at least 1 row
-- Policy Coverage: All tables should have SELECT and INSERT policies
-- 
-- ============================================

