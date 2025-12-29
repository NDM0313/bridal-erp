-- ============================================
-- PHASE 2: DATA MIGRATION
-- Migrate existing businesses to organizations
-- ============================================
-- 
-- GOAL: Create organizations for existing businesses
-- STRATEGY: One organization per business (default)
-- SAFETY: Zero downtime, no data loss, backward compatible
-- 
-- MIGRATION LOGIC:
-- 1. Create organization for each existing business
-- 2. Link business.organization_id
-- 3. Migrate users from user_profiles to organization_users
-- 4. Preserve all roles and access
-- ============================================

-- ============================================
-- STEP 1: VERIFY PRE-MIGRATION STATE
-- ============================================
-- Run these checks BEFORE migration to ensure safe state

-- Check existing businesses (should all have organization_id = NULL)
DO $$
DECLARE
    total_businesses INTEGER;
    businesses_with_org INTEGER;
    legacy_businesses INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_businesses FROM businesses;
    SELECT COUNT(*) INTO businesses_with_org FROM businesses WHERE organization_id IS NOT NULL;
    legacy_businesses := total_businesses - businesses_with_org;
    
    RAISE NOTICE 'Pre-migration check:';
    RAISE NOTICE 'Total businesses: %', total_businesses;
    RAISE NOTICE 'Businesses with org: %', businesses_with_org;
    RAISE NOTICE 'Legacy businesses to migrate: %', legacy_businesses;
    
    IF businesses_with_org > 0 THEN
        RAISE WARNING 'Some businesses already have organization_id. Review before proceeding.';
    END IF;
END $$;

-- Check existing user_profiles
DO $$
DECLARE
    total_profiles INTEGER;
    profiles_with_business INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_profiles FROM user_profiles;
    SELECT COUNT(*) INTO profiles_with_business 
    FROM user_profiles up
    WHERE EXISTS (SELECT 1 FROM businesses b WHERE b.id = up.business_id);
    
    RAISE NOTICE 'Total user_profiles: %', total_profiles;
    RAISE NOTICE 'Profiles with valid business: %', profiles_with_business;
    
    IF profiles_with_business < total_profiles THEN
        RAISE WARNING 'Some user_profiles reference non-existent businesses.';
    END IF;
END $$;

-- ============================================
-- STEP 2: CREATE ORGANIZATIONS FOR EXISTING BUSINESSES
-- ============================================
-- 
-- Strategy: One organization per business
-- Organization name: "{Business Name} Organization"
-- Slug: "org-{business_id}" (unique, URL-friendly)
-- Plan: 'free' (default, can be upgraded later)
-- Status: 'active' (legacy businesses are already active)
-- ============================================

BEGIN;

-- Create organizations for businesses that don't have one
INSERT INTO organizations (
    name,
    slug,
    subscription_plan,
    subscription_status,
    max_businesses,
    max_users,
    max_locations,
    max_transactions_per_month,
    created_at,
    updated_at
)
SELECT 
    name || ' Organization' as name,
    'org-' || id as slug,  -- URL-friendly slug
    'free' as subscription_plan,  -- Default plan, can upgrade later
    'active' as subscription_status,  -- Legacy businesses are active
    1 as max_businesses,  -- Free plan: 1 business
    3 as max_users,  -- Free plan: 3 users
    1 as max_locations,  -- Free plan: 1 location
    100 as max_transactions_per_month,  -- Free plan: 100 transactions/month
    created_at,  -- Preserve original creation time
    updated_at
FROM businesses
WHERE organization_id IS NULL  -- Only migrate businesses without org
ORDER BY id;  -- Process in order

-- Verify organizations created
DO $$
DECLARE
    orgs_created INTEGER;
BEGIN
    SELECT COUNT(*) INTO orgs_created
    FROM organizations
    WHERE slug LIKE 'org-%';
    
    RAISE NOTICE 'Organizations created: %', orgs_created;
END $$;

-- ============================================
-- STEP 3: LINK BUSINESSES TO ORGANIZATIONS
-- ============================================
-- 
-- Link each business to its newly created organization
-- Match by business name and creation time
-- ============================================

UPDATE businesses b
SET organization_id = (
    SELECT o.id
    FROM organizations o
    WHERE o.slug = 'org-' || b.id
    LIMIT 1
)
WHERE b.organization_id IS NULL;

-- Verify links created
DO $$
DECLARE
    businesses_linked INTEGER;
    businesses_unlinked INTEGER;
BEGIN
    SELECT COUNT(*) INTO businesses_linked
    FROM businesses
    WHERE organization_id IS NOT NULL;
    
    SELECT COUNT(*) INTO businesses_unlinked
    FROM businesses
    WHERE organization_id IS NULL;
    
    RAISE NOTICE 'Businesses linked to organizations: %', businesses_linked;
    RAISE NOTICE 'Businesses still unlinked: %', businesses_unlinked;
    
    IF businesses_unlinked > 0 THEN
        RAISE WARNING 'Some businesses were not linked. Review and fix manually.';
    END IF;
END $$;

-- ============================================
-- STEP 4: MIGRATE USERS TO organization_users
-- ============================================
-- 
-- Strategy:
-- 1. For each user in user_profiles, find their business
-- 2. Get the business's organization_id
-- 3. Create organization_users entry
-- 4. Map roles: user_profiles.role → organization_users.role
-- 5. First user per business becomes organization admin
-- ============================================

-- Migrate users to organization_users
-- Map roles: preserve existing roles, first user becomes org admin
INSERT INTO organization_users (
    organization_id,
    user_id,
    role,
    is_organization_admin,
    created_at,
    updated_at
)
SELECT DISTINCT
    b.organization_id,
    up.user_id,
    -- Map roles: ensure valid organization role
    CASE 
        WHEN up.role IN ('admin', 'manager', 'cashier', 'auditor') THEN up.role
        WHEN up.role = 'owner' THEN 'admin'  -- Map owner to admin
        WHEN up.role = 'user' THEN 'cashier'  -- Map generic user to cashier
        ELSE 'cashier'  -- Default to cashier for unknown roles
    END as role,
    -- First user per business becomes organization admin
    (ROW_NUMBER() OVER (PARTITION BY b.organization_id ORDER BY up.created_at ASC)) = 1 as is_organization_admin,
    up.created_at,
    up.updated_at
FROM user_profiles up
INNER JOIN businesses b ON up.business_id = b.id
WHERE b.organization_id IS NOT NULL  -- Only migrate users from businesses with orgs
    AND NOT EXISTS (
        -- Avoid duplicates: skip if user already in organization_users
        SELECT 1 FROM organization_users ou
        WHERE ou.user_id = up.user_id
            AND ou.organization_id = b.organization_id
    )
ORDER BY b.organization_id, up.created_at;

-- Verify users migrated
DO $$
DECLARE
    users_migrated INTEGER;
    orgs_with_users INTEGER;
BEGIN
    SELECT COUNT(*) INTO users_migrated
    FROM organization_users;
    
    SELECT COUNT(DISTINCT organization_id) INTO orgs_with_users
    FROM organization_users;
    
    RAISE NOTICE 'Users migrated to organization_users: %', users_migrated;
    RAISE NOTICE 'Organizations with users: %', orgs_with_users;
END $$;

-- Verify role mapping
DO $$
DECLARE
    admin_count INTEGER;
    manager_count INTEGER;
    cashier_count INTEGER;
    auditor_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count FROM organization_users WHERE role = 'admin';
    SELECT COUNT(*) INTO manager_count FROM organization_users WHERE role = 'manager';
    SELECT COUNT(*) INTO cashier_count FROM organization_users WHERE role = 'cashier';
    SELECT COUNT(*) INTO auditor_count FROM organization_users WHERE role = 'auditor';
    
    RAISE NOTICE 'Role distribution:';
    RAISE NOTICE '  Admins: %', admin_count;
    RAISE NOTICE '  Managers: %', manager_count;
    RAISE NOTICE '  Cashiers: %', cashier_count;
    RAISE NOTICE '  Auditors: %', auditor_count;
END $$;

COMMIT;

-- ============================================
-- STEP 5: POST-MIGRATION VERIFICATION
-- ============================================

-- Verify all businesses have organizations
SELECT 
    'Businesses with organizations' as check_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(*) FROM businesses) THEN '✅ ALL LINKED'
        ELSE '❌ SOME UNLINKED'
    END as status
FROM businesses
WHERE organization_id IS NOT NULL;

-- Verify all users migrated
SELECT 
    'Users in organization_users' as check_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) >= (SELECT COUNT(*) FROM user_profiles) THEN '✅ ALL MIGRATED'
        ELSE '⚠️ SOME NOT MIGRATED'
    END as status
FROM organization_users;

-- Verify organization isolation
-- Each organization should have its own businesses
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    COUNT(DISTINCT b.id) as business_count,
    COUNT(DISTINCT ou.user_id) as user_count,
    CASE 
        WHEN COUNT(DISTINCT b.id) = 1 THEN '✅ SINGLE BUSINESS'
        ELSE '⚠️ MULTIPLE BUSINESSES'
    END as status
FROM organizations o
LEFT JOIN businesses b ON b.organization_id = o.id
LEFT JOIN organization_users ou ON ou.organization_id = o.id
WHERE o.slug LIKE 'org-%'  -- Only migrated organizations
GROUP BY o.id, o.name
ORDER BY o.id;

-- Verify no orphaned data
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

-- Verify no duplicate organization_users
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
-- MIGRATION SUMMARY
-- ============================================

DO $$
DECLARE
    total_orgs INTEGER;
    total_businesses INTEGER;
    businesses_linked INTEGER;
    total_users INTEGER;
    users_migrated INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_orgs FROM organizations WHERE slug LIKE 'org-%';
    SELECT COUNT(*) INTO total_businesses FROM businesses;
    SELECT COUNT(*) INTO businesses_linked FROM businesses WHERE organization_id IS NOT NULL;
    SELECT COUNT(*) INTO total_users FROM user_profiles;
    SELECT COUNT(*) INTO users_migrated FROM organization_users;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Organizations created: %', total_orgs;
    RAISE NOTICE 'Total businesses: %', total_businesses;
    RAISE NOTICE 'Businesses linked: %', businesses_linked;
    RAISE NOTICE 'Total user_profiles: %', total_users;
    RAISE NOTICE 'Users migrated: %', users_migrated;
    RAISE NOTICE '========================================';
    
    IF businesses_linked = total_businesses AND users_migrated >= total_users THEN
        RAISE NOTICE '✅ MIGRATION SUCCESSFUL';
    ELSE
        RAISE WARNING '⚠️ MIGRATION INCOMPLETE - Review above checks';
    END IF;
END $$;

-- ============================================
-- NOTES
-- ============================================
-- 
-- 1. Migration is idempotent (can be run multiple times safely)
-- 2. Existing user_profiles remain intact (backward compatibility)
-- 3. Dual-mode RLS continues to work (org + legacy)
-- 4. Users can still access via legacy mode if needed
-- 5. System prefers organization mode after migration
-- 
-- NEXT: Verify application works, then optionally deprecate legacy mode
-- 
-- ============================================

