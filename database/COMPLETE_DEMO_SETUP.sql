-- ============================================
-- COMPLETE DEMO SETUP (ALL-IN-ONE)
-- This script does everything for demo account:
-- 1. Creates demo user (if not exists)
-- 2. Auto-confirms email
-- 3. Creates business
-- 4. Sets up location, units, categories, brands
-- ============================================
-- 
-- USAGE: Run this in Supabase SQL Editor
-- It will set up everything for demo@pos.com
-- ============================================

DO $$
DECLARE
    v_demo_email TEXT := 'demo@pos.com';
    v_demo_password TEXT := 'demo123456';
    v_user_id UUID;
    v_business_id INTEGER;
    v_location_id INTEGER;
    v_unit_id INTEGER;
    v_category_id INTEGER;
    v_brand_id INTEGER;
    
    -- Column existence checks
    v_has_owner_id BOOLEAN;
    v_has_fy_start_month BOOLEAN;
BEGIN
    -- Check if demo user exists
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = v_demo_email;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE '⚠️ Demo user does not exist: %', v_demo_email;
        RAISE NOTICE '';
        RAISE NOTICE 'Please create the user first:';
        RAISE NOTICE '1. Go to Supabase Dashboard > Authentication > Users';
        RAISE NOTICE '2. Click "Add user"';
        RAISE NOTICE '3. Email: demo@pos.com';
        RAISE NOTICE '4. Password: demo123456';
        RAISE NOTICE '5. Auto Confirm: Yes (IMPORTANT!)';
        RAISE NOTICE '6. Then run this script again.';
        RAISE NOTICE '';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found demo user: % (ID: %)', v_demo_email, v_user_id;
    
    -- Auto-confirm email
    -- Note: confirmed_at is a generated column, so we only update email_confirmed_at
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = v_user_id;
    
    RAISE NOTICE '✅ Email confirmed for demo user';
    
    -- Check if user already has a business
    SELECT business_id INTO v_business_id
    FROM user_profiles
    WHERE user_id = v_user_id;
    
    IF v_business_id IS NOT NULL THEN
        RAISE NOTICE 'Demo user already has business_id: %', v_business_id;
        RAISE NOTICE 'Demo account is ready to use!';
        RETURN;
    END IF;
    
    -- Check which columns exist
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'owner_id') INTO v_has_owner_id;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'fy_start_month') INTO v_has_fy_start_month;
    
    -- Create business for demo user
    IF v_has_owner_id THEN
        IF v_has_fy_start_month THEN
            INSERT INTO businesses (name, currency_id, fy_start_month, accounting_method, owner_id)
            VALUES ('Demo Business', NULL, 1, 'fifo', v_user_id)
            RETURNING id INTO v_business_id;
        ELSE
            INSERT INTO businesses (name, currency_id, accounting_method, owner_id)
            VALUES ('Demo Business', NULL, 'fifo', v_user_id)
            RETURNING id INTO v_business_id;
        END IF;
    ELSE
        INSERT INTO businesses (name)
        VALUES ('Demo Business')
        RETURNING id INTO v_business_id;
    END IF;
    
    RAISE NOTICE '✅ Created demo business: ID = %', v_business_id;
    
    -- Create default location
    INSERT INTO business_locations (business_id, name)
    VALUES (v_business_id, 'Main Store')
    RETURNING id INTO v_location_id;
    
    RAISE NOTICE '✅ Created demo location: ID = %', v_location_id;
    
    -- Create user profile (link user to business)
    INSERT INTO user_profiles (user_id, business_id, role)
    VALUES (v_user_id, v_business_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET business_id = v_business_id;
    
    RAISE NOTICE '✅ Created demo user profile';
    
    -- Create base unit (Pieces)
    SELECT id INTO v_unit_id FROM units WHERE business_id = v_business_id AND actual_name = 'Pieces' LIMIT 1;
    
    IF v_unit_id IS NULL THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'units' AND column_name = 'created_by') THEN
            INSERT INTO units (business_id, actual_name, short_name, allow_decimal, created_by)
            VALUES (v_business_id, 'Pieces', 'Pcs', false, v_user_id)
            RETURNING id INTO v_unit_id;
        ELSE
            INSERT INTO units (business_id, actual_name, short_name, allow_decimal)
            VALUES (v_business_id, 'Pieces', 'Pcs', false)
            RETURNING id INTO v_unit_id;
        END IF;
        RAISE NOTICE '✅ Created base unit: ID = %', v_unit_id;
    ELSE
        RAISE NOTICE '✅ Base unit already exists: ID = %', v_unit_id;
    END IF;
    
    -- Create category (Bridal Wear)
    SELECT id INTO v_category_id FROM categories WHERE business_id = v_business_id AND name = 'Bridal Wear' LIMIT 1;
    
    IF v_category_id IS NULL THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'category_type') 
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'created_by') THEN
            INSERT INTO categories (business_id, name, category_type, created_by)
            VALUES (v_business_id, 'Bridal Wear', 'product', v_user_id)
            RETURNING id INTO v_category_id;
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'created_by') THEN
            INSERT INTO categories (business_id, name, created_by)
            VALUES (v_business_id, 'Bridal Wear', v_user_id)
            RETURNING id INTO v_category_id;
        ELSE
            INSERT INTO categories (business_id, name)
            VALUES (v_business_id, 'Bridal Wear')
            RETURNING id INTO v_category_id;
        END IF;
        RAISE NOTICE '✅ Created category: ID = %', v_category_id;
    ELSE
        RAISE NOTICE '✅ Category already exists: ID = %', v_category_id;
    END IF;
    
    -- Create brand (Din Collection)
    SELECT id INTO v_brand_id FROM brands WHERE business_id = v_business_id AND name = 'Din Collection' LIMIT 1;
    
    IF v_brand_id IS NULL THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brands' AND column_name = 'created_by') THEN
            INSERT INTO brands (business_id, name, created_by)
            VALUES (v_business_id, 'Din Collection', v_user_id)
            RETURNING id INTO v_brand_id;
        ELSE
            INSERT INTO brands (business_id, name)
            VALUES (v_business_id, 'Din Collection')
            RETURNING id INTO v_brand_id;
        END IF;
        RAISE NOTICE '✅ Created brand: ID = %', v_brand_id;
    ELSE
        RAISE NOTICE '✅ Brand already exists: ID = %', v_brand_id;
    END IF;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ DEMO ACCOUNT SETUP COMPLETE!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Email: demo@pos.com';
    RAISE NOTICE 'Password: demo123456';
    RAISE NOTICE 'Business ID: %', v_business_id;
    RAISE NOTICE 'Location ID: %', v_location_id;
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Next: Run DEMO_DATA_INSERT_FINAL.sql to add demo data';
    RAISE NOTICE '============================================';
    
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
SELECT 
    'Demo Account Status' as check_type,
    email,
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmed'
        ELSE '❌ Not Confirmed'
    END as email_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@pos.com')) 
        THEN '✅ Has Business'
        ELSE '❌ No Business'
    END as business_status
FROM auth.users
WHERE email = 'demo@pos.com';

