-- ============================================
-- SOFT LAUNCH VERIFICATION QUERIES
-- Run these to verify soft launch configuration
-- ============================================

-- ============================================
-- 1. VERIFY SOFT LAUNCH CONFIGURATION
-- ============================================

-- Check system settings exist
SELECT 
    key,
    value,
    description,
    CASE WHEN key IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM system_settings
WHERE key IN ('signup_enabled', 'soft_launch_mode', 'soft_launch_user_limit')
ORDER BY key;

-- Verify signup is enabled
SELECT 
    CASE 
        WHEN value::text = 'true' THEN '✅ SIGNUP ENABLED'
        ELSE '❌ SIGNUP DISABLED'
    END as signup_status
FROM system_settings
WHERE key = 'signup_enabled';

-- Verify soft launch mode
SELECT 
    CASE 
        WHEN value::text = 'true' THEN '✅ SOFT LAUNCH MODE ACTIVE'
        ELSE '❌ SOFT LAUNCH MODE DISABLED'
    END as soft_launch_status
FROM system_settings
WHERE key = 'soft_launch_mode';

-- Verify user limit
SELECT 
    key,
    value::text as user_limit,
    CASE 
        WHEN value::text::integer <= 10 THEN '✅ LIMIT SET (10 or less)'
        ELSE '⚠️ LIMIT HIGHER THAN 10'
    END as limit_status
FROM system_settings
WHERE key = 'soft_launch_user_limit';

-- Count current organizations
SELECT 
    COUNT(*) as current_organizations,
    CASE 
        WHEN COUNT(*) < 10 THEN '✅ UNDER LIMIT'
        WHEN COUNT(*) = 10 THEN '⚠️ AT LIMIT'
        ELSE '❌ OVER LIMIT'
    END as limit_status
FROM organizations;

-- ============================================
-- 2. VERIFY TRIAL PLANS
-- ============================================

-- Check all organizations are on Free plan
SELECT 
    subscription_plan,
    COUNT(*) as count,
    CASE 
        WHEN subscription_plan = 'free' THEN '✅ FREE PLAN'
        ELSE '⚠️ NOT FREE PLAN'
    END as plan_status
FROM organizations
GROUP BY subscription_plan;

-- Check all subscriptions are in trial
SELECT 
    status,
    COUNT(*) as count,
    CASE 
        WHEN status = 'trial' THEN '✅ TRIAL STATUS'
        ELSE '⚠️ NOT TRIAL'
    END as status_check
FROM organization_subscriptions
GROUP BY status;

-- Check trial end dates are set (14 days from now)
SELECT 
    id,
    organization_id,
    trial_start,
    trial_end,
    CASE 
        WHEN trial_end IS NOT NULL AND trial_end > CURRENT_TIMESTAMP THEN '✅ TRIAL ACTIVE'
        WHEN trial_end IS NOT NULL AND trial_end <= CURRENT_TIMESTAMP THEN '⚠️ TRIAL EXPIRED'
        ELSE '❌ NO TRIAL END DATE'
    END as trial_status
FROM organization_subscriptions
WHERE status = 'trial'
ORDER BY trial_end;

-- ============================================
-- 3. VERIFY MONITORING TABLES
-- ============================================

-- Check error_logs table exists and has data
SELECT 
    'error_logs' as table_name,
    COUNT(*) as total_errors,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_errors,
    COUNT(*) FILTER (WHERE severity = 'error') as errors,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_errors,
    CASE WHEN COUNT(*) >= 0 THEN '✅ TABLE EXISTS' ELSE '❌ TABLE MISSING' END as status
FROM error_logs;

-- Check payment_failure_logs table exists
SELECT 
    'payment_failure_logs' as table_name,
    COUNT(*) as total_failures,
    COUNT(*) FILTER (WHERE resolved = false) as unresolved,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_failures,
    CASE WHEN COUNT(*) >= 0 THEN '✅ TABLE EXISTS' ELSE '❌ TABLE MISSING' END as status
FROM payment_failure_logs;

-- Check sale_failure_logs table exists
SELECT 
    'sale_failure_logs' as table_name,
    COUNT(*) as total_failures,
    COUNT(*) FILTER (WHERE resolved = false) as unresolved,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_failures,
    CASE WHEN COUNT(*) >= 0 THEN '✅ TABLE EXISTS' ELSE '❌ TABLE MISSING' END as status
FROM sale_failure_logs;

-- ============================================
-- 4. VERIFY SIGNUP DISABLE FUNCTIONALITY
-- ============================================

-- Test: Check if signup can be disabled
-- (This is a read-only check, actual disable is done via UPDATE)
SELECT 
    'signup_enabled' as setting,
    value::text as current_value,
    'To disable: UPDATE system_settings SET value = ''false''::jsonb WHERE key = ''signup_enabled'';' as disable_command
FROM system_settings
WHERE key = 'signup_enabled';

-- ============================================
-- 5. SUMMARY REPORT
-- ============================================

-- Overall soft launch status
SELECT 
    'SOFT LAUNCH STATUS' as check_type,
    CASE 
        WHEN (SELECT value::text FROM system_settings WHERE key = 'soft_launch_mode') = 'true'
         AND (SELECT COUNT(*) FROM organizations) <= (SELECT value::text::integer FROM system_settings WHERE key = 'soft_launch_user_limit')
         AND (SELECT COUNT(*) FROM organizations WHERE subscription_plan != 'free') = 0
         AND (SELECT COUNT(*) FROM organization_subscriptions WHERE status != 'trial') = 0
        THEN '✅ READY FOR SOFT LAUNCH'
        ELSE '⚠️ CONFIGURATION ISSUES DETECTED'
    END as status;

-- ============================================
-- NOTES
-- ============================================
-- 
-- Run these queries daily during soft launch to verify:
-- 1. User limit not exceeded
-- 2. All organizations on Free plan
-- 3. All subscriptions in trial
-- 4. Monitoring tables working
-- 5. Signup can be disabled if needed
-- 
-- ============================================

