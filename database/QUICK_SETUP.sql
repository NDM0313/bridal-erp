-- ============================================
-- QUICK SETUP - One Script Solution
-- Yeh script automatically sab kuch setup kar dega
-- ============================================
-- 
-- USAGE: Direct run karo - yeh automatically:
-- 1. First user from auth.users use karega
-- 2. Business create karega
-- 3. Location create karega
-- 4. User profile create karega
-- ============================================

DO $$
DECLARE
    v_user_id UUID;
    v_business_id INTEGER;
    v_location_id INTEGER;
    v_unit_id INTEGER;
    v_category_id INTEGER;
    v_brand_id INTEGER;
BEGIN
    -- Get first user from auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No user found in auth.users. Please create a user account first in Supabase Auth.';
    END IF;
    
    RAISE NOTICE 'Found user_id: %', v_user_id;
    
    -- Check if business already exists
    SELECT id INTO v_business_id
    FROM businesses
    LIMIT 1;
    
    IF v_business_id IS NULL THEN
        -- Create business
        INSERT INTO businesses (
            name, 
            owner_id,
            accounting_method,
            sell_price_tax
        ) VALUES (
            'Din Collection',
            v_user_id,
            'fifo',
            'includes'
        ) RETURNING id INTO v_business_id;
        
        RAISE NOTICE '✅ Business created: ID = %', v_business_id;
    ELSE
        RAISE NOTICE '✅ Business already exists: ID = %', v_business_id;
    END IF;
    
    -- Check if location exists
    SELECT id INTO v_location_id
    FROM business_locations
    WHERE business_id = v_business_id
    LIMIT 1;
    
    IF v_location_id IS NULL THEN
        -- Create location
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
        
        RAISE NOTICE '✅ Location created: ID = %', v_location_id;
    ELSE
        RAISE NOTICE '✅ Location already exists: ID = %', v_location_id;
    END IF;
    
    -- Create/Update user profile
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
    
    RAISE NOTICE '✅ User profile created/updated';
    
    -- Create base unit (Pieces) if not exists
    SELECT id INTO v_unit_id
    FROM units
    WHERE business_id = v_business_id AND actual_name = 'Pieces'
    LIMIT 1;
    
    IF v_unit_id IS NULL THEN
        INSERT INTO units (business_id, actual_name, short_name, allow_decimal, created_by)
        VALUES (v_business_id, 'Pieces', 'Pcs', false, v_user_id)
        RETURNING id INTO v_unit_id;
        
        RAISE NOTICE '✅ Base unit (Pieces) created: ID = %', v_unit_id;
    ELSE
        RAISE NOTICE '✅ Base unit already exists: ID = %', v_unit_id;
    END IF;
    
    -- Create category if not exists
    SELECT id INTO v_category_id
    FROM categories
    WHERE business_id = v_business_id AND name = 'Bridal Wear'
    LIMIT 1;
    
    IF v_category_id IS NULL THEN
        -- Check if categories table has category_type column
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'category_type') THEN
            -- With category_type and created_by
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'created_by') THEN
                INSERT INTO categories (business_id, name, category_type, created_by)
                VALUES (v_business_id, 'Bridal Wear', 'product', v_user_id)
                RETURNING id INTO v_category_id;
            ELSE
                INSERT INTO categories (business_id, name, category_type)
                VALUES (v_business_id, 'Bridal Wear', 'product')
                RETURNING id INTO v_category_id;
            END IF;
        ELSE
            -- Without category_type
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'created_by') THEN
                INSERT INTO categories (business_id, name, created_by)
                VALUES (v_business_id, 'Bridal Wear', v_user_id)
                RETURNING id INTO v_category_id;
            ELSE
                INSERT INTO categories (business_id, name)
                VALUES (v_business_id, 'Bridal Wear')
                RETURNING id INTO v_category_id;
            END IF;
        END IF;
        
        RAISE NOTICE '✅ Category created: ID = %', v_category_id;
    ELSE
        RAISE NOTICE '✅ Category already exists: ID = %', v_category_id;
    END IF;
    
    -- Create brand if not exists
    SELECT id INTO v_brand_id
    FROM brands
    WHERE business_id = v_business_id AND name = 'Din Collection'
    LIMIT 1;
    
    IF v_brand_id IS NULL THEN
        -- Check if brands table has created_by column
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brands' AND column_name = 'created_by') THEN
            INSERT INTO brands (business_id, name, created_by)
            VALUES (v_business_id, 'Din Collection', v_user_id)
            RETURNING id INTO v_brand_id;
        ELSE
            INSERT INTO brands (business_id, name)
            VALUES (v_business_id, 'Din Collection')
            RETURNING id INTO v_brand_id;
        END IF;
        
        RAISE NOTICE '✅ Brand created: ID = %', v_brand_id;
    ELSE
        RAISE NOTICE '✅ Brand already exists: ID = %', v_brand_id;
    END IF;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ SETUP COMPLETE!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Business ID: %', v_business_id;
    RAISE NOTICE 'Location ID: %', v_location_id;
    RAISE NOTICE 'User ID: %', v_user_id;
    RAISE NOTICE 'Unit ID: %', v_unit_id;
    RAISE NOTICE 'Category ID: %', v_category_id;
    RAISE NOTICE 'Brand ID: %', v_brand_id;
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Ab aap DEMO_DATA_INSERT.sql run kar sakte hain!';
    RAISE NOTICE '============================================';
    
END $$;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
SELECT 
    'Setup Status' as status,
    (SELECT COUNT(*) FROM businesses) as businesses,
    (SELECT COUNT(*) FROM user_profiles) as user_profiles,
    (SELECT COUNT(*) FROM business_locations) as locations,
    (SELECT COUNT(*) FROM units) as units,
    (SELECT COUNT(*) FROM categories) as categories,
    (SELECT COUNT(*) FROM brands) as brands;

