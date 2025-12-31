-- ============================================
-- SETUP USER BUSINESS
-- This script sets up business and user profile for a specific user
-- ============================================
-- 
-- USAGE: 
-- 1. Change v_user_email to your email (default: ndm313@yahoo.com)
-- 2. Run this script in Supabase SQL Editor
-- 3. It will create business, location, and link user to business
-- ============================================

DO $$
DECLARE
    v_user_email TEXT := 'ndm313@yahoo.com';  -- Change this to your email
    v_user_id UUID;
    v_business_id INTEGER;
    v_location_id INTEGER;
    v_unit_id INTEGER;
    v_category_id INTEGER;
    v_brand_id INTEGER;
    
    -- Column existence checks
    v_has_owner_id BOOLEAN;
    v_has_created_by BOOLEAN;
    v_has_fy_start_month BOOLEAN;
BEGIN
    -- Get user_id from auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = v_user_email;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found: %. Please register first at /register', v_user_email;
    END IF;
    
    RAISE NOTICE 'Found user: % (ID: %)', v_user_email, v_user_id;
    
    -- Check if user already has a business
    SELECT business_id INTO v_business_id
    FROM user_profiles
    WHERE user_id = v_user_id;
    
    IF v_business_id IS NOT NULL THEN
        RAISE NOTICE 'User already has business_id: %. Skipping business creation.', v_business_id;
        
        -- Get existing location, unit, category, brand
        SELECT id INTO v_location_id FROM business_locations WHERE business_id = v_business_id LIMIT 1;
        SELECT id INTO v_unit_id FROM units WHERE business_id = v_business_id AND actual_name = 'Pieces' LIMIT 1;
        SELECT id INTO v_category_id FROM categories WHERE business_id = v_business_id AND name = 'Bridal Wear' LIMIT 1;
        SELECT id INTO v_brand_id FROM brands WHERE business_id = v_business_id AND name = 'Din Collection' LIMIT 1;
        
        RAISE NOTICE 'Existing setup: Location=%, Unit=%, Category=%, Brand=%', v_location_id, v_unit_id, v_category_id, v_brand_id;
        RETURN;
    END IF;
    
    -- Check which columns exist in businesses table
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'owner_id') INTO v_has_owner_id;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'created_by') INTO v_has_created_by;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'fy_start_month') INTO v_has_fy_start_month;
    
    -- Create business
    IF v_has_owner_id THEN
        -- Use owner_id (newer schema)
        IF v_has_fy_start_month THEN
            INSERT INTO businesses (name, currency_id, fy_start_month, accounting_method, owner_id)
            VALUES (
                'My Business',
                NULL, -- currency_id (can be set later)
                1, -- January
                'fifo',
                v_user_id
            )
            RETURNING id INTO v_business_id;
        ELSE
            INSERT INTO businesses (name, currency_id, accounting_method, owner_id)
            VALUES (
                'My Business',
                NULL,
                'fifo',
                v_user_id
            )
            RETURNING id INTO v_business_id;
        END IF;
    ELSIF v_has_created_by THEN
        -- Use created_by (older schema)
        INSERT INTO businesses (name, currency_id, accounting_method, created_by)
        VALUES (
            'My Business',
            NULL,
            'fifo',
            v_user_id
        )
        RETURNING id INTO v_business_id;
    ELSE
        -- Minimal insert (just name)
        INSERT INTO businesses (name)
        VALUES ('My Business')
        RETURNING id INTO v_business_id;
    END IF;
    
    RAISE NOTICE '✅ Created business: ID = %', v_business_id;
    
    -- Create default location
    -- business_locations table doesn't have is_default or created_by in standard schema
    INSERT INTO business_locations (business_id, name)
    VALUES (v_business_id, 'Main Store')
    RETURNING id INTO v_location_id;
    
    RAISE NOTICE '✅ Created location: ID = %', v_location_id;
    
    -- Create user profile (link user to business)
    INSERT INTO user_profiles (user_id, business_id, role)
    VALUES (v_user_id, v_business_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET business_id = v_business_id;
    
    RAISE NOTICE '✅ Created user profile: user_id = %, business_id = %', v_user_id, v_business_id;
    
    -- Create base unit (Pieces)
    SELECT id INTO v_unit_id FROM units WHERE business_id = v_business_id AND actual_name = 'Pieces' LIMIT 1;
    
    IF v_unit_id IS NULL THEN
        -- Check if created_by column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'units' AND column_name = 'created_by') THEN
            INSERT INTO units (business_id, actual_name, short_name, allow_decimal, created_by)
            VALUES (v_business_id, 'Pieces', 'Pcs', false, v_user_id)
            RETURNING id INTO v_unit_id;
        ELSE
            INSERT INTO units (business_id, actual_name, short_name, allow_decimal)
            VALUES (v_business_id, 'Pieces', 'Pcs', false)
            RETURNING id INTO v_unit_id;
        END IF;
        
        RAISE NOTICE '✅ Created base unit (Pieces): ID = %', v_unit_id;
    ELSE
        RAISE NOTICE '✅ Base unit already exists: ID = %', v_unit_id;
    END IF;
    
    -- Create category (Bridal Wear)
    SELECT id INTO v_category_id FROM categories WHERE business_id = v_business_id AND name = 'Bridal Wear' LIMIT 1;
    
    IF v_category_id IS NULL THEN
        -- Check if category_type and created_by columns exist
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
        -- Check if created_by column exists
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
    RAISE NOTICE '✅ SETUP COMPLETE!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'User: %', v_user_email;
    RAISE NOTICE 'Business ID: %', v_business_id;
    RAISE NOTICE 'Location ID: %', v_location_id;
    RAISE NOTICE 'Unit ID: %', v_unit_id;
    RAISE NOTICE 'Category ID: %', v_category_id;
    RAISE NOTICE 'Brand ID: %', v_brand_id;
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run DEMO_DATA_INSERT_FINAL.sql to add demo data';
    RAISE NOTICE '2. Refresh your dashboard';
    RAISE NOTICE '============================================';
    
END $$;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
SELECT 
    'Setup Status' as status,
    (SELECT COUNT(*) FROM businesses WHERE id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com'))) as businesses,
    (SELECT COUNT(*) FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com')) as user_profiles,
    (SELECT COUNT(*) FROM business_locations WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com'))) as locations,
    (SELECT COUNT(*) FROM units WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com'))) as units,
    (SELECT COUNT(*) FROM categories WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com'))) as categories,
    (SELECT COUNT(*) FROM brands WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com'))) as brands;

