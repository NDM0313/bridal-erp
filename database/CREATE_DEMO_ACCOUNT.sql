-- ============================================
-- CREATE DEMO ACCOUNT
-- This script creates a demo account with business setup
-- ============================================
-- 
-- USAGE: Run this in Supabase SQL Editor
-- It will create demo@pos.com user with business and demo data
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
    -- Check if demo user already exists
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = v_demo_email;
    
    IF v_user_id IS NOT NULL THEN
        RAISE NOTICE 'Demo user already exists: % (ID: %)', v_demo_email, v_user_id;
        
        -- Check if business exists
        SELECT business_id INTO v_business_id
        FROM user_profiles
        WHERE user_id = v_user_id;
        
        IF v_business_id IS NOT NULL THEN
            RAISE NOTICE 'Demo user already has business_id: %', v_business_id;
            RAISE NOTICE 'Demo account is ready to use!';
            RETURN;
        END IF;
    ELSE
        RAISE NOTICE 'Demo user does not exist. Please create it manually in Supabase Auth Dashboard:';
        RAISE NOTICE '1. Go to Authentication > Users';
        RAISE NOTICE '2. Click "Add user"';
        RAISE NOTICE '3. Email: demo@pos.com';
        RAISE NOTICE '4. Password: demo123456';
        RAISE NOTICE '5. Auto Confirm: Yes';
        RAISE NOTICE '';
        RAISE NOTICE 'Then run this script again.';
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
        -- Fallback: minimal insert
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
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'units' AND column_name = 'created_by') THEN
        INSERT INTO units (business_id, actual_name, short_name, allow_decimal, created_by)
        VALUES (v_business_id, 'Pieces', 'Pcs', false, v_user_id)
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_unit_id;
    ELSE
        INSERT INTO units (business_id, actual_name, short_name, allow_decimal)
        VALUES (v_business_id, 'Pieces', 'Pcs', false)
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_unit_id;
    END IF;
    
    -- Create category
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'category_type') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'created_by') THEN
        INSERT INTO categories (business_id, name, category_type, created_by)
        VALUES (v_business_id, 'Bridal Wear', 'product', v_user_id)
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_category_id;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'created_by') THEN
        INSERT INTO categories (business_id, name, created_by)
        VALUES (v_business_id, 'Bridal Wear', v_user_id)
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_category_id;
    ELSE
        INSERT INTO categories (business_id, name)
        VALUES (v_business_id, 'Bridal Wear')
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_category_id;
    END IF;
    
    -- Create brand
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brands' AND column_name = 'created_by') THEN
        INSERT INTO brands (business_id, name, created_by)
        VALUES (v_business_id, 'Din Collection', v_user_id)
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_brand_id;
    ELSE
        INSERT INTO brands (business_id, name)
        VALUES (v_business_id, 'Din Collection')
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_brand_id;
    END IF;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ DEMO ACCOUNT SETUP COMPLETE!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Email: demo@pos.com';
    RAISE NOTICE 'Password: demo123456';
    RAISE NOTICE 'Business ID: %', v_business_id;
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Next: Run DEMO_DATA_INSERT_FINAL.sql to add demo data';
    RAISE NOTICE '============================================';
    
END $$;

