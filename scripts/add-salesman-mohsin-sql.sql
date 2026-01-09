-- ============================================================================
-- Add Salesman: Mohsin
-- Email: mhm313@yahoo.com
-- Password: 123456 (must be set via Supabase Auth UI or Admin API)
-- Salary: 40000
-- Commission: 1%
-- ============================================================================
-- 
-- IMPORTANT: This script assumes the user is already created in auth.users
-- If user doesn't exist, create via:
-- 1. Supabase Dashboard → Authentication → Add User
-- 2. Or use the Node.js script: node scripts/add-salesman-mohsin.js
-- ============================================================================

DO $$
DECLARE
    v_user_id UUID;
    v_business_id INTEGER;
    v_profile_exists BOOLEAN;
BEGIN
    -- Get user_id from auth.users by email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'mhm313@yahoo.com'
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email mhm313@yahoo.com not found in auth.users. Please create the user first via Supabase Dashboard → Authentication → Add User';
    END IF;

    RAISE NOTICE '✅ Found user: mhm313@yahoo.com (ID: %)', v_user_id;

    -- Get business_id (use first business or specific business_id = 1)
    SELECT id INTO v_business_id
    FROM businesses
    WHERE id = 1  -- Change this if you want a different business_id
    LIMIT 1;

    IF v_business_id IS NULL THEN
        -- Fallback: use first business
        SELECT id INTO v_business_id
        FROM businesses
        LIMIT 1;
    END IF;

    IF v_business_id IS NULL THEN
        RAISE EXCEPTION 'No business found. Please create a business first.';
    END IF;

    RAISE NOTICE '✅ Using business_id: %', v_business_id;

    -- Check if profile already exists
    SELECT EXISTS(
        SELECT 1 FROM user_profiles WHERE user_id = v_user_id
    ) INTO v_profile_exists;

    IF v_profile_exists THEN
        RAISE NOTICE '⚠️  User profile already exists. Updating salesman fields...';
        
        -- Update existing profile
        UPDATE user_profiles
        SET 
            role = 'salesman',
            base_salary = 40000,
            commission_percentage = 1.0,
            updated_at = NOW()
        WHERE user_id = v_user_id;

        RAISE NOTICE '✅ Profile updated successfully!';
    ELSE
        RAISE NOTICE '📝 Creating new user profile...';
        
        -- Create new profile
        INSERT INTO user_profiles (
            user_id,
            business_id,
            role,
            base_salary,
            commission_percentage,
            created_at,
            updated_at
        ) VALUES (
            v_user_id,
            v_business_id,
            'salesman',
            40000,
            1.0,
            NOW(),
            NOW()
        );

        RAISE NOTICE '✅ Profile created successfully!';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ SALESMAN ADDED SUCCESSFULLY!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Name: Mohsin';
    RAISE NOTICE 'Email: mhm313@yahoo.com';
    RAISE NOTICE 'Password: 123456 (set via Supabase Auth)';
    RAISE NOTICE 'Role: salesman';
    RAISE NOTICE 'Salary: Rs. 40,000';
    RAISE NOTICE 'Commission: 1%%';
    RAISE NOTICE 'User ID: %', v_user_id;
    RAISE NOTICE 'Business ID: %', v_business_id;
    RAISE NOTICE '============================================';

END $$;

-- Verification query
SELECT 
    up.id,
    au.email,
    up.role,
    up.base_salary,
    up.commission_percentage,
    b.name as business_name
FROM user_profiles up
JOIN auth.users au ON au.id = up.user_id
LEFT JOIN businesses b ON b.id = up.business_id
WHERE au.email = 'mhm313@yahoo.com';
