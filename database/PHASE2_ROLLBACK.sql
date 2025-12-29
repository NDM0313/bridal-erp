-- ============================================
-- PHASE 2 ROLLBACK PLAN
-- Revert organization links while preserving data
-- ============================================
-- 
-- WARNING: This will revert Phase 2 migration
-- Businesses will return to legacy mode (organization_id = NULL)
-- organization_users entries will be removed
-- Organizations will remain (for audit trail)
-- 
-- SAFETY: No data deletion, only link removal
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: VERIFY ROLLBACK STATE
-- ============================================

DO $$
DECLARE
    businesses_with_org INTEGER;
    users_in_org INTEGER;
BEGIN
    SELECT COUNT(*) INTO businesses_with_org
    FROM businesses
    WHERE organization_id IS NOT NULL;
    
    SELECT COUNT(*) INTO users_in_org
    FROM organization_users;
    
    RAISE NOTICE 'Pre-rollback state:';
    RAISE NOTICE 'Businesses with organization_id: %', businesses_with_org;
    RAISE NOTICE 'Users in organization_users: %', users_in_org;
    
    IF businesses_with_org = 0 AND users_in_org = 0 THEN
        RAISE NOTICE 'System already in pre-Phase 2 state. Rollback not needed.';
    END IF;
END $$;

-- ============================================
-- STEP 2: REMOVE organization_users ENTRIES
-- ============================================
-- 
-- Remove migrated users from organization_users
-- Keep organizations for audit trail
-- ============================================

-- Remove organization_users entries for migrated users
-- Only remove entries linked to migrated organizations (slug LIKE 'org-%')
DELETE FROM organization_users
WHERE organization_id IN (
    SELECT id FROM organizations WHERE slug LIKE 'org-%'
);

-- Verify removal
DO $$
DECLARE
    remaining_users INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_users
    FROM organization_users
    WHERE organization_id IN (
        SELECT id FROM organizations WHERE slug LIKE 'org-%'
    );
    
    RAISE NOTICE 'Remaining organization_users (migrated): %', remaining_users;
    
    IF remaining_users > 0 THEN
        RAISE WARNING 'Some organization_users entries were not removed.';
    END IF;
END $$;

-- ============================================
-- STEP 3: REMOVE organization_id LINKS
-- ============================================
-- 
-- Set organization_id = NULL for all businesses
-- This returns them to legacy mode
-- ============================================

-- Remove organization_id links (set to NULL)
UPDATE businesses
SET organization_id = NULL
WHERE organization_id IN (
    SELECT id FROM organizations WHERE slug LIKE 'org-%'
);

-- Verify removal
DO $$
DECLARE
    businesses_still_linked INTEGER;
    businesses_unlinked INTEGER;
BEGIN
    SELECT COUNT(*) INTO businesses_still_linked
    FROM businesses
    WHERE organization_id IN (
        SELECT id FROM organizations WHERE slug LIKE 'org-%'
    );
    
    SELECT COUNT(*) INTO businesses_unlinked
    FROM businesses
    WHERE organization_id IS NULL;
    
    RAISE NOTICE 'Businesses still linked (migrated orgs): %', businesses_still_linked;
    RAISE NOTICE 'Businesses unlinked (legacy mode): %', businesses_unlinked;
    
    IF businesses_still_linked > 0 THEN
        RAISE WARNING 'Some businesses were not unlinked.';
    END IF;
END $$;

-- ============================================
-- STEP 4: PRESERVE ORGANIZATIONS (AUDIT TRAIL)
-- ============================================
-- 
-- Keep organizations for audit trail
-- Mark them as inactive or cancelled
-- Do NOT delete (preserve history)
-- ============================================

-- Mark migrated organizations as cancelled (for audit trail)
UPDATE organizations
SET subscription_status = 'cancelled',
    updated_at = CURRENT_TIMESTAMP
WHERE slug LIKE 'org-%'
    AND subscription_status != 'cancelled';

-- Verify organizations preserved
DO $$
DECLARE
    orgs_preserved INTEGER;
BEGIN
    SELECT COUNT(*) INTO orgs_preserved
    FROM organizations
    WHERE slug LIKE 'org-%';
    
    RAISE NOTICE 'Organizations preserved (audit trail): %', orgs_preserved;
END $$;

COMMIT;

-- ============================================
-- POST-ROLLBACK VERIFICATION
-- ============================================

-- Verify businesses returned to legacy mode
SELECT 
    'Businesses in legacy mode' as check_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(*) FROM businesses) THEN '✅ ALL IN LEGACY MODE'
        ELSE '❌ SOME STILL LINKED'
    END as status
FROM businesses
WHERE organization_id IS NULL;

-- Verify organization_users removed
SELECT 
    'organization_users (migrated) removed' as check_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ALL REMOVED'
        ELSE '❌ SOME REMAIN'
    END as status
FROM organization_users
WHERE organization_id IN (
    SELECT id FROM organizations WHERE slug LIKE 'org-%'
);

-- Verify organizations preserved
SELECT 
    'Organizations preserved' as check_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ PRESERVED (audit trail)'
        ELSE '❌ NOT PRESERVED'
    END as status
FROM organizations
WHERE slug LIKE 'org-%';

-- ============================================
-- ROLLBACK SUMMARY
-- ============================================

DO $$
DECLARE
    businesses_legacy INTEGER;
    org_users_remaining INTEGER;
    orgs_preserved INTEGER;
BEGIN
    SELECT COUNT(*) INTO businesses_legacy FROM businesses WHERE organization_id IS NULL;
    SELECT COUNT(*) INTO org_users_remaining FROM organization_users WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'org-%');
    SELECT COUNT(*) INTO orgs_preserved FROM organizations WHERE slug LIKE 'org-%';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ROLLBACK SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Businesses in legacy mode: %', businesses_legacy;
    RAISE NOTICE 'organization_users (migrated) remaining: %', org_users_remaining;
    RAISE NOTICE 'Organizations preserved: %', orgs_preserved;
    RAISE NOTICE '========================================';
    
    IF businesses_legacy = (SELECT COUNT(*) FROM businesses) AND org_users_remaining = 0 THEN
        RAISE NOTICE '✅ ROLLBACK SUCCESSFUL';
        RAISE NOTICE 'System returned to Phase 1 dual-mode state';
    ELSE
        RAISE WARNING '⚠️ ROLLBACK INCOMPLETE - Review above checks';
    END IF;
END $$;

-- ============================================
-- NOTES
-- ============================================
-- 
-- After rollback:
-- 1. System returns to Phase 1 dual-mode state
-- 2. All businesses have organization_id = NULL
-- 3. Users access via user_profiles (legacy mode)
-- 4. Organizations preserved for audit trail
-- 5. Can re-run Phase 2 migration after fixing issues
-- 
-- ============================================

