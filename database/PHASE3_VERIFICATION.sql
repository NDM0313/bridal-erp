-- ============================================
-- PHASE 3 VERIFICATION QUERIES
-- Run these after deploying Phase 3 schema
-- ============================================

-- ============================================
-- VERIFICATION 1: Tables Created
-- ============================================

SELECT 
    'organization_subscriptions' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'organization_subscriptions'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
    'billing_history',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'billing_history'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
    'subscription_events',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'subscription_events'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END;

-- ============================================
-- VERIFICATION 2: Functions Created
-- ============================================

SELECT 
    routine_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' AND routine_name = routine_name
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (VALUES 
    ('sync_organization_subscription_plan'),
    ('sync_organization_features_on_plan_change'),
    ('handle_payment_failure')
) AS t(routine_name);

-- ============================================
-- VERIFICATION 3: Triggers Created
-- ============================================

SELECT 
    trigger_name,
    event_object_table,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = t.trigger_name
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (VALUES 
    ('sync_org_plan_on_subscription_update', 'organization_subscriptions'),
    ('sync_features_on_plan_change', 'organization_subscriptions'),
    ('handle_payment_failure_trigger', 'organization_subscriptions')
) AS t(trigger_name, event_object_table);

-- ============================================
-- VERIFICATION 4: Subscriptions Created for Existing Orgs
-- ============================================

SELECT 
    'Subscriptions created' as check_name,
    COUNT(*) as count,
    (SELECT COUNT(*) FROM organizations) as total_orgs,
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(*) FROM organizations) THEN '✅ ALL CREATED'
        ELSE '❌ SOME MISSING'
    END as status
FROM organization_subscriptions;

-- ============================================
-- VERIFICATION 5: Subscription Status Distribution
-- ============================================

SELECT 
    status,
    COUNT(*) as count,
    CASE 
        WHEN status = 'active' THEN '✅ ACTIVE'
        WHEN status = 'trial' THEN '✅ TRIAL'
        ELSE '⚠️ OTHER'
    END as status_label
FROM organization_subscriptions
GROUP BY status
ORDER BY count DESC;

-- ============================================
-- VERIFICATION 6: Plan Distribution
-- ============================================

SELECT 
    plan,
    COUNT(*) as count,
    CASE 
        WHEN plan = 'free' THEN '✅ FREE (expected)'
        ELSE '⚠️ PAID'
    END as status_label
FROM organization_subscriptions
GROUP BY plan
ORDER BY count DESC;

-- ============================================
-- VERIFICATION 7: RLS Enabled
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
    AND tablename IN ('organization_subscriptions', 'billing_history', 'subscription_events')
ORDER BY tablename;

-- ============================================
-- VERIFICATION 8: Organization-Subscription Sync
-- ============================================

SELECT 
    'Organization-Subscription sync' as check_name,
    COUNT(*) as mismatched,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ALL SYNCED'
        ELSE '❌ MISMATCHES FOUND'
    END as status
FROM organizations o
LEFT JOIN organization_subscriptions s ON s.organization_id = o.id
WHERE o.subscription_plan != COALESCE(s.plan, 'free')
   OR o.subscription_status != COALESCE(s.status, 'active');

-- ============================================
-- VERIFICATION 9: Feature Sync on Plan Change
-- ============================================

-- Test: Check if features exist for organizations
SELECT 
    o.id as organization_id,
    o.subscription_plan,
    COUNT(of.id) as feature_count,
    CASE 
        WHEN COUNT(of.id) > 0 THEN '✅ FEATURES SYNCED'
        ELSE '⚠️ NO FEATURES'
    END as status
FROM organizations o
LEFT JOIN organization_features of ON of.organization_id = o.id
GROUP BY o.id, o.subscription_plan
ORDER BY o.id
LIMIT 10;

-- ============================================
-- VERIFICATION 10: Migration Completeness
-- ============================================

SELECT 
    'Phase 3 Migration' as report_name,
    (SELECT COUNT(*) FROM organizations) as total_organizations,
    (SELECT COUNT(*) FROM organization_subscriptions) as subscriptions_created,
    (SELECT COUNT(*) FROM organization_features) as features_synced,
    CASE 
        WHEN (SELECT COUNT(*) FROM organization_subscriptions) = (SELECT COUNT(*) FROM organizations)
        THEN '✅ COMPLETE'
        ELSE '⚠️ INCOMPLETE'
    END as status;

-- ============================================
-- NOTES
-- ============================================
-- 
-- All verifications should show ✅
-- If any show ❌, review the Phase 3 deployment
-- 
-- ============================================

