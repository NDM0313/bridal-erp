-- ============================================
-- DIAGNOSTIC QUERIES FOR DATA VISIBILITY ISSUE
-- Run these in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: DATABASE EXISTENCE CHECK
-- ============================================

-- Check row counts for all critical tables
SELECT 
    'businesses' as table_name,
    COUNT(*) as row_count
FROM businesses
UNION ALL
SELECT 
    'business_locations' as table_name,
    COUNT(*) as row_count
FROM business_locations
UNION ALL
SELECT 
    'user_profiles' as table_name,
    COUNT(*) as row_count
FROM user_profiles
UNION ALL
SELECT 
    'products' as table_name,
    COUNT(*) as row_count
FROM products
UNION ALL
SELECT 
    'units' as table_name,
    COUNT(*) as row_count
FROM units
UNION ALL
SELECT 
    'categories' as table_name,
    COUNT(*) as row_count
FROM categories
UNION ALL
SELECT 
    'brands' as table_name,
    COUNT(*) as row_count
FROM brands;

-- ============================================
-- STEP 2: RLS STATUS CHECK
-- ============================================

-- Check if RLS is enabled on critical tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'businesses',
        'business_locations',
        'user_profiles',
        'products',
        'units',
        'categories',
        'brands'
    )
ORDER BY tablename;

-- ============================================
-- STEP 3: get_user_business_id() FUNCTION CHECK
-- ============================================

-- Check if function exists
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name = 'get_user_business_id';

-- View function definition
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'get_user_business_id';

-- Test function (will return NULL if not authenticated or no profile)
-- Note: This only works when run as authenticated user
SELECT get_user_business_id() as business_id_result;

-- ============================================
-- STEP 4: USER PROFILES CHECK
-- ============================================

-- List all user profiles with business info
SELECT 
    up.id,
    up.user_id,
    up.business_id,
    b.name as business_name,
    up.role,
    up.created_at
FROM user_profiles up
LEFT JOIN businesses b ON b.id = up.business_id
ORDER BY up.created_at DESC;

-- Check for users without profiles
SELECT 
    u.id as user_id,
    u.email,
    u.created_at as user_created_at,
    CASE 
        WHEN up.id IS NULL THEN 'NO PROFILE'
        ELSE 'HAS PROFILE'
    END as profile_status
FROM auth.users u
LEFT JOIN user_profiles up ON up.user_id = u.id
ORDER BY u.created_at DESC;

-- ============================================
-- STEP 5: BUSINESS DATA CHECK
-- ============================================

-- List all businesses
SELECT 
    id,
    name,
    owner_id,
    created_at
FROM businesses
ORDER BY id;

-- Check if businesses have locations
SELECT 
    b.id as business_id,
    b.name as business_name,
    COUNT(bl.id) as location_count
FROM businesses b
LEFT JOIN business_locations bl ON bl.business_id = b.id
GROUP BY b.id, b.name;

-- ============================================
-- STEP 6: PRODUCTS DATA CHECK
-- ============================================

-- List all products with business info
SELECT 
    p.id,
    p.name,
    p.sku,
    p.business_id,
    b.name as business_name,
    p.is_inactive,
    p.created_at
FROM products p
LEFT JOIN businesses b ON b.id = p.business_id
ORDER BY p.created_at DESC
LIMIT 20;

-- Count products per business
SELECT 
    b.id as business_id,
    b.name as business_name,
    COUNT(p.id) as product_count
FROM businesses b
LEFT JOIN products p ON p.business_id = b.id
GROUP BY b.id, b.name;

-- ============================================
-- STEP 7: RLS POLICIES CHECK
-- ============================================

-- List all RLS policies on products table
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
WHERE tablename = 'products'
ORDER BY policyname;

-- List all RLS policies on user_profiles table
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
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- ============================================
-- STEP 8: TEST RLS VISIBILITY (Simulated)
-- ============================================

-- This query simulates what an authenticated user would see
-- Replace 'YOUR_BUSINESS_ID' with actual business_id from user_profiles

-- Test products visibility for a specific business
SELECT 
    p.id,
    p.name,
    p.sku,
    p.business_id,
    CASE 
        WHEN p.business_id = 1 THEN 'VISIBLE'  -- Replace 1 with your business_id
        ELSE 'BLOCKED BY RLS'
    END as visibility_status
FROM products p
WHERE p.business_id = 1;  -- Replace 1 with your business_id

-- ============================================
-- STEP 9: AUTH USERS CHECK
-- ============================================

-- List all auth users (if you have permission)
SELECT 
    id,
    email,
    created_at,
    raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- STEP 10: COMPREHENSIVE DIAGNOSTIC
-- ============================================

-- Run this to get a complete picture
WITH diagnostics AS (
    SELECT 
        'Total Businesses' as metric,
        COUNT(*)::text as value
    FROM businesses
    UNION ALL
    SELECT 
        'Total User Profiles' as metric,
        COUNT(*)::text as value
    FROM user_profiles
    UNION ALL
    SELECT 
        'Users Without Profiles' as metric,
        COUNT(*)::text as value
    FROM auth.users u
    LEFT JOIN user_profiles up ON up.user_id = u.id
    WHERE up.id IS NULL
    UNION ALL
    SELECT 
        'Total Products' as metric,
        COUNT(*)::text as value
    FROM products
    UNION ALL
    SELECT 
        'Active Products' as metric,
        COUNT(*)::text as value
    FROM products
    WHERE is_inactive = false
    UNION ALL
    SELECT 
        'RLS Enabled on Products' as metric,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM pg_tables 
                WHERE tablename = 'products' 
                AND rowsecurity = true
            ) THEN 'YES'
            ELSE 'NO'
        END as value
    UNION ALL
    SELECT 
        'get_user_business_id() Function Exists' as metric,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM pg_proc 
                WHERE proname = 'get_user_business_id'
            ) THEN 'YES'
            ELSE 'NO'
        END as value
)
SELECT * FROM diagnostics
ORDER BY metric;

-- ============================================
-- EXPECTED RESULTS SUMMARY
-- ============================================
-- 
-- For system to work:
-- 1. businesses: Should have ≥ 1 row
-- 2. user_profiles: Should have ≥ 1 row (CRITICAL)
-- 3. products: Can be 0 or more
-- 4. RLS: Should be enabled on all tables
-- 5. get_user_business_id(): Should exist and return business_id
-- 6. User profile: Should link user_id to business_id
-- 
-- ============================================

