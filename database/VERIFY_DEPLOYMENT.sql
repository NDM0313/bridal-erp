-- ============================================
-- VERIFY NEW SCHEMA DEPLOYMENT
-- Run this after deploying DEPLOY_NEW_SCHEMA.sql
-- ============================================

-- ============================================
-- STEP 1: VERIFY TABLE CREATION
-- ============================================

SELECT 
    'TABLE CREATION CHECK' as check_type,
    table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = t.table_name
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (VALUES
    ('businesses'),
    ('business_locations'),
    ('user_profiles'),
    ('contacts'),
    ('units'),
    ('brands'),
    ('categories'),
    ('products'),
    ('product_variations'),
    ('variations'),
    ('variation_location_details'),
    ('transactions'),
    ('transaction_sell_lines')
) AS t(table_name)
ORDER BY table_name;

-- ============================================
-- STEP 2: VERIFY RLS STATUS
-- ============================================

SELECT 
    'RLS STATUS CHECK' as check_type,
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
ORDER BY tablename;

-- ============================================
-- STEP 3: VERIFY FUNCTION
-- ============================================

SELECT 
    'FUNCTION CHECK' as check_type,
    routine_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name = 'get_user_business_id'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (VALUES ('get_user_business_id')) AS f(routine_name);

-- ============================================
-- STEP 4: VERIFY INDEXES
-- ============================================

SELECT 
    'INDEX CHECK' as check_type,
    tablename,
    indexname,
    '✅ EXISTS' as status
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN (
        'businesses',
        'business_locations',
        'user_profiles',
        'products',
        'variations',
        'transactions'
    )
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname
LIMIT 20;

-- ============================================
-- STEP 5: VERIFY FOREIGN KEYS
-- ============================================

SELECT 
    'FOREIGN KEY CHECK' as check_type,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    '✅ EXISTS' as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN (
        'business_locations',
        'contacts',
        'products',
        'variations',
        'transactions'
    )
ORDER BY tc.table_name, kcu.column_name
LIMIT 20;

-- ============================================
-- STEP 6: VERIFY RLS POLICIES
-- ============================================

SELECT 
    'RLS POLICY CHECK' as check_type,
    tablename,
    policyname,
    cmd as command,
    '✅ EXISTS' as status
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'businesses',
        'products',
        'user_profiles',
        'transactions'
    )
ORDER BY tablename, policyname
LIMIT 20;

-- ============================================
-- STEP 7: VERIFY BOOTSTRAP DATA
-- ============================================

SELECT 
    'BOOTSTRAP DATA CHECK' as check_type,
    'businesses' as table_name,
    COUNT(*)::text as row_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ HAS DATA'
        ELSE '❌ EMPTY'
    END as status
FROM businesses
UNION ALL
SELECT 
    'BOOTSTRAP DATA CHECK',
    'business_locations',
    COUNT(*)::text,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ HAS DATA'
        ELSE '❌ EMPTY'
    END
FROM business_locations
UNION ALL
SELECT 
    'BOOTSTRAP DATA CHECK',
    'units',
    COUNT(*)::text,
    CASE 
        WHEN COUNT(*) >= 2 THEN '✅ HAS DATA (≥2 units)'
        WHEN COUNT(*) = 1 THEN '⚠️ ONLY 1 UNIT'
        ELSE '❌ EMPTY'
    END
FROM units
UNION ALL
SELECT 
    'BOOTSTRAP DATA CHECK',
    'user_profiles',
    COUNT(*)::text,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ HAS DATA'
        ELSE '❌ EMPTY (CRITICAL)'
    END
FROM user_profiles;

-- ============================================
-- STEP 8: COMPREHENSIVE SUMMARY
-- ============================================

WITH summary AS (
    SELECT 
        'Total New Tables' as metric,
        COUNT(*)::text as value
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
    UNION ALL
    SELECT 
        'Tables with RLS Enabled',
        COUNT(*)::text
    FROM pg_tables
    WHERE schemaname = 'public'
        AND rowsecurity = true
        AND tablename IN (
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
    UNION ALL
    SELECT 
        'get_user_business_id() Function',
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM pg_proc 
                WHERE proname = 'get_user_business_id'
            ) THEN '✅ EXISTS'
            ELSE '❌ MISSING'
        END
    UNION ALL
    SELECT 
        'Businesses Count',
        COUNT(*)::text
    FROM businesses
    UNION ALL
    SELECT 
        'Locations Count',
        COUNT(*)::text
    FROM business_locations
    UNION ALL
    SELECT 
        'Units Count',
        COUNT(*)::text
    FROM units
    UNION ALL
    SELECT 
        'User Profiles Count',
        COUNT(*)::text
    FROM user_profiles
)
SELECT * FROM summary
ORDER BY metric;

-- ============================================
-- EXPECTED RESULTS
-- ============================================
-- 
-- ✅ Total New Tables: 13
-- ✅ Tables with RLS Enabled: 13
-- ✅ get_user_business_id() Function: ✅ EXISTS
-- ✅ Businesses Count: ≥ 1
-- ✅ Locations Count: ≥ 1
-- ✅ Units Count: ≥ 2 (Pieces + Box)
-- ✅ User Profiles Count: ≥ 1 (CRITICAL)
-- 
-- ============================================

