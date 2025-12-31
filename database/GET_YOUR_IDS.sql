-- ============================================
-- QUICK QUERY: Get Your User ID and Business ID
-- Run this FIRST to get the values you need
-- ============================================

-- Option 1: Get user_id and business_id from user_profiles
SELECT 
    up.user_id,
    up.business_id,
    b.name as business_name
FROM user_profiles up
LEFT JOIN businesses b ON b.id = up.business_id
ORDER BY up.created_at DESC
LIMIT 5;

-- Option 2: Get all businesses
SELECT id, name, owner_id 
FROM businesses 
ORDER BY id;

-- Option 3: Get user_id from auth.users (if you have access)
SELECT id, email 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- ============================================
-- After running above queries:
-- 1. Copy the user_id (UUID) from results
-- 2. Copy the business_id (integer) from results
-- 3. Use these values in DEMO_DATA_INSERT_MANUAL.sql
-- ============================================

