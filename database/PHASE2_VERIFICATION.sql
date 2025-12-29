-- ============================================
-- PHASE 2 VERIFICATION QUERIES
-- Run these after migration to verify success
-- ============================================

-- ============================================
-- VERIFICATION 1: All Businesses Have Organizations
-- ============================================

SELECT 
    'Businesses with organizations' as check_name,
    COUNT(*) as count,
    (SELECT COUNT(*) FROM businesses) as total_businesses,
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(*) FROM businesses) THEN '✅ ALL LINKED'
        ELSE '❌ SOME UNLINKED'
    END as status
FROM businesses
WHERE organization_id IS NOT NULL;

-- ============================================
-- VERIFICATION 2: All Users Migrated
-- ============================================

SELECT 
    'Users in organization_users' as check_name,
    COUNT(*) as migrated_count,
    (SELECT COUNT(*) FROM user_profiles) as total_profiles,
    CASE 
        WHEN COUNT(*) >= (SELECT COUNT(*) FROM user_profiles) THEN '✅ ALL MIGRATED'
        ELSE '⚠️ SOME NOT MIGRATED'
    END as status
FROM organization_users;

-- ============================================
-- VERIFICATION 3: Organization Isolation
-- ============================================

-- Each organization should have its own businesses
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    o.slug,
    COUNT(DISTINCT b.id) as business_count,
    COUNT(DISTINCT ou.user_id) as user_count,
    CASE 
        WHEN COUNT(DISTINCT b.id) = 1 THEN '✅ SINGLE BUSINESS (expected)'
        WHEN COUNT(DISTINCT b.id) = 0 THEN '❌ NO BUSINESSES'
        ELSE '⚠️ MULTIPLE BUSINESSES'
    END as status
FROM organizations o
LEFT JOIN businesses b ON b.organization_id = o.id
LEFT JOIN organization_users ou ON ou.organization_id = o.id
WHERE o.slug LIKE 'org-%'  -- Only migrated organizations
GROUP BY o.id, o.name, o.slug
ORDER BY o.id;

-- ============================================
-- VERIFICATION 4: Role Mapping Correct
-- ============================================

-- Compare roles between user_profiles and organization_users
SELECT 
    up.user_id,
    up.business_id,
    up.role as legacy_role,
    ou.role as org_role,
    ou.is_organization_admin,
    CASE 
        WHEN ou.role IS NULL THEN '❌ NOT MIGRATED'
        WHEN up.role = 'owner' AND ou.role = 'admin' THEN '✅ OWNER → ADMIN'
        WHEN up.role = 'user' AND ou.role = 'cashier' THEN '✅ USER → CASHIER'
        WHEN up.role = ou.role THEN '✅ ROLE PRESERVED'
        ELSE '⚠️ ROLE CHANGED'
    END as status
FROM user_profiles up
LEFT JOIN businesses b ON b.id = up.business_id
LEFT JOIN organization_users ou ON ou.user_id = up.user_id 
    AND ou.organization_id = b.organization_id
ORDER BY up.business_id, up.created_at;

-- ============================================
-- VERIFICATION 5: No Orphaned Data
-- ============================================

-- Check for businesses with invalid organization_id
SELECT 
    'Orphaned businesses' as check_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NONE'
        ELSE '❌ FOUND'
    END as status
FROM businesses b
WHERE b.organization_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM organizations o WHERE o.id = b.organization_id
    );

-- Check for organization_users with invalid organization_id
SELECT 
    'Orphaned organization_users' as check_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NONE'
        ELSE '❌ FOUND'
    END as status
FROM organization_users ou
WHERE NOT EXISTS (
    SELECT 1 FROM organizations o WHERE o.id = ou.organization_id
);

-- ============================================
-- VERIFICATION 6: No Duplicates
-- ============================================

-- Check for duplicate organization_users (same user in same org)
SELECT 
    'Duplicate organization_users' as check_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NONE'
        ELSE '❌ FOUND'
    END as status
FROM (
    SELECT organization_id, user_id, COUNT(*) as dup_count
    FROM organization_users
    GROUP BY organization_id, user_id
    HAVING COUNT(*) > 1
) duplicates;

-- ============================================
-- VERIFICATION 7: Organization Admin Assignment
-- ============================================

-- Verify each organization has at least one admin
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    COUNT(CASE WHEN ou.is_organization_admin THEN 1 END) as admin_count,
    COUNT(ou.id) as total_users,
    CASE 
        WHEN COUNT(CASE WHEN ou.is_organization_admin THEN 1 END) > 0 THEN '✅ HAS ADMIN'
        WHEN COUNT(ou.id) = 0 THEN '⚠️ NO USERS'
        ELSE '❌ NO ADMIN'
    END as status
FROM organizations o
LEFT JOIN organization_users ou ON ou.organization_id = o.id
WHERE o.slug LIKE 'org-%'
GROUP BY o.id, o.name
ORDER BY o.id;

-- ============================================
-- VERIFICATION 8: RLS Function Test
-- ============================================

-- Test get_user_organization_id() function
-- (Run as authenticated user to test)
-- SELECT 
--     'get_user_organization_id() test' as check_name,
--     get_user_organization_id() as result,
--     CASE 
--         WHEN get_user_organization_id() IS NOT NULL THEN '✅ RETURNS ORG ID'
--         ELSE '⚠️ RETURNS NULL (may be legacy user)'
--     END as status;

-- Test get_user_business_id() function
-- (Run as authenticated user to test)
-- SELECT 
--     'get_user_business_id() test' as check_name,
--     get_user_business_id() as result,
--     CASE 
--         WHEN get_user_business_id() IS NOT NULL THEN '✅ RETURNS BUSINESS ID'
--         ELSE '❌ RETURNS NULL'
--     END as status;

-- ============================================
-- VERIFICATION 9: Data Integrity
-- ============================================

-- Verify all migrated organizations have businesses
SELECT 
    'Organizations without businesses' as check_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NONE'
        ELSE '❌ FOUND'
    END as status
FROM organizations o
WHERE o.slug LIKE 'org-%'
    AND NOT EXISTS (
        SELECT 1 FROM businesses b WHERE b.organization_id = o.id
    );

-- Verify all migrated organizations have users
SELECT 
    'Organizations without users' as check_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NONE'
        ELSE '⚠️ FOUND (may be expected for new orgs)'
    END as status
FROM organizations o
WHERE o.slug LIKE 'org-%'
    AND NOT EXISTS (
        SELECT 1 FROM organization_users ou WHERE ou.organization_id = o.id
    );

-- ============================================
-- VERIFICATION 10: Migration Completeness
-- ============================================

-- Summary report
SELECT 
    'Migration Completeness' as report_name,
    (SELECT COUNT(*) FROM organizations WHERE slug LIKE 'org-%') as organizations_created,
    (SELECT COUNT(*) FROM businesses WHERE organization_id IS NOT NULL) as businesses_linked,
    (SELECT COUNT(*) FROM organization_users) as users_migrated,
    (SELECT COUNT(*) FROM businesses) as total_businesses,
    (SELECT COUNT(*) FROM user_profiles) as total_user_profiles,
    CASE 
        WHEN (SELECT COUNT(*) FROM businesses WHERE organization_id IS NOT NULL) = (SELECT COUNT(*) FROM businesses)
            AND (SELECT COUNT(*) FROM organization_users) >= (SELECT COUNT(*) FROM user_profiles)
        THEN '✅ COMPLETE'
        ELSE '⚠️ INCOMPLETE'
    END as status;

-- ============================================
-- NOTES
-- ============================================
-- 
-- All verifications should show ✅
-- If any show ❌, review the migration and fix issues
-- 
-- ============================================

