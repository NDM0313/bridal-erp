-- ============================================
-- CREATE BUSINESS AND USER PROFILE
-- Pehle yeh run karo agar business nahi hai
-- ============================================
-- 
-- INSTRUCTIONS:
-- 1. Agar aapko apna user_id pata hai, to line 20 par set karo
-- 2. Ya pehle auth.users se user_id get karo (line 15-17)
-- 3. Phir yeh script run karo
-- ============================================

-- ============================================
-- STEP 1: GET YOUR USER_ID
-- ============================================
-- Option A: Get from auth.users (if you have access)
SELECT 
    id as user_id,
    email
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Option B: Get from existing user_profiles
SELECT 
    user_id,
    business_id
FROM user_profiles
LIMIT 5;

-- ============================================
-- STEP 2: CREATE BUSINESS (Replace YOUR_USER_UUID)
-- ============================================
DO $$
DECLARE
    v_user_id UUID;
    v_business_id INTEGER;
    v_location_id INTEGER;
BEGIN
    -- ⚠️ REPLACE THIS WITH YOUR ACTUAL USER UUID
    -- Get from: SELECT id FROM auth.users WHERE email = 'your-email@example.com';
    -- Or use the first user from auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No user found in auth.users. Please create a user first or manually set v_user_id.';
    END IF;
    
    RAISE NOTICE 'Using user_id: %', v_user_id;
    
    -- Create business
    INSERT INTO businesses (
        name, 
        owner_id,
        currency_id,
        accounting_method,
        sell_price_tax
    ) VALUES (
        'Din Collection',  -- Business name
        v_user_id,
        NULL,  -- Set currency_id if you have currencies table
        'fifo',
        'includes'
    ) RETURNING id INTO v_business_id;
    
    RAISE NOTICE 'Business created with ID: %', v_business_id;
    
    -- Create business location
    INSERT INTO business_locations (
        business_id,
        name,
        city,
        country
    ) VALUES (
        v_business_id,
        'Main Store',
        'Lahore',
        'Pakistan'
    ) RETURNING id INTO v_location_id;
    
    RAISE NOTICE 'Location created with ID: %', v_location_id;
    
    -- Create user profile (link user to business)
    INSERT INTO user_profiles (
        user_id,
        business_id,
        role
    ) VALUES (
        v_user_id,
        v_business_id,
        'owner'
    ) ON CONFLICT (user_id) DO UPDATE SET
        business_id = EXCLUDED.business_id,
        role = EXCLUDED.role;
    
    RAISE NOTICE 'User profile created/updated';
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'SETUP COMPLETE!';
    RAISE NOTICE 'Business ID: %', v_business_id;
    RAISE NOTICE 'Location ID: %', v_location_id;
    RAISE NOTICE 'User ID: %', v_user_id;
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Ab aap DEMO_DATA_INSERT.sql run kar sakte hain!';
    
END $$;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
    b.id as business_id,
    b.name as business_name,
    up.user_id,
    up.role,
    bl.id as location_id,
    bl.name as location_name
FROM businesses b
LEFT JOIN user_profiles up ON up.business_id = b.id
LEFT JOIN business_locations bl ON bl.business_id = b.id
ORDER BY b.created_at DESC
LIMIT 1;

