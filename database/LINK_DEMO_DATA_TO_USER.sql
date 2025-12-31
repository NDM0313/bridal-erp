-- ============================================
-- LINK DEMO DATA TO CURRENT USER
-- This script links existing demo data to your logged-in user
-- ============================================
-- 
-- USAGE: 
-- 1. Make sure you're logged in as ndm313@yahoo.com
-- 2. Run this script in Supabase SQL Editor
-- 3. It will update all demo data to use your business_id
-- ============================================

DO $$
DECLARE
    v_user_email TEXT := 'ndm313@yahoo.com';
    v_user_id UUID;
    v_business_id INTEGER;
    v_old_business_id INTEGER;
    v_location_id INTEGER;
    v_updated_count INTEGER;
BEGIN
    -- Get user_id from auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = v_user_email;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found: %. Please check the email address.', v_user_email;
    END IF;
    
    RAISE NOTICE 'Found user: % (ID: %)', v_user_email, v_user_id;
    
    -- Get business_id from user_profiles
    SELECT business_id INTO v_business_id
    FROM user_profiles
    WHERE user_id = v_user_id;
    
    IF v_business_id IS NULL THEN
        RAISE EXCEPTION 'Business not found for user: %. Please run QUICK_SETUP.sql first.', v_user_email;
    END IF;
    
    RAISE NOTICE 'Found business_id: %', v_business_id;
    
    -- Get the first business_id from demo data (the one that was used)
    SELECT DISTINCT business_id INTO v_old_business_id
    FROM products
    WHERE business_id != v_business_id
    LIMIT 1;
    
    IF v_old_business_id IS NULL THEN
        RAISE NOTICE 'No demo data found to migrate. Data might already be linked to your business.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found demo data with business_id: %. Migrating to business_id: %', v_old_business_id, v_business_id;
    
    -- Get location_id for the new business
    SELECT id INTO v_location_id
    FROM business_locations
    WHERE business_id = v_business_id
    LIMIT 1;
    
    IF v_location_id IS NULL THEN
        RAISE EXCEPTION 'Location not found for business_id: %. Please run QUICK_SETUP.sql first.', v_business_id;
    END IF;
    
    RAISE NOTICE 'Using location_id: %', v_location_id;
    
    -- Update products
    UPDATE products
    SET business_id = v_business_id
    WHERE business_id = v_old_business_id;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % products', v_updated_count;
    
    -- Update contacts
    UPDATE contacts
    SET business_id = v_business_id
    WHERE business_id = v_old_business_id;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % contacts', v_updated_count;
    
    -- Update transactions
    UPDATE transactions
    SET business_id = v_business_id
    WHERE business_id = v_old_business_id;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % transactions', v_updated_count;
    
    -- Update transaction_sell_lines (via transaction_id)
    UPDATE transaction_sell_lines tsl
    SET transaction_id = t.id
    FROM transactions t
    WHERE tsl.transaction_id IN (
        SELECT id FROM transactions WHERE business_id = v_old_business_id
    )
    AND t.business_id = v_business_id
    AND t.id = tsl.transaction_id;
    
    -- Update variation_location_details (update location_id to match new business)
    UPDATE variation_location_details vld
    SET location_id = v_location_id
    FROM variations v
    JOIN products p ON p.id = v.product_id
    WHERE vld.variation_id = v.id
    AND p.business_id = v_business_id
    AND vld.location_id != v_location_id;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % stock entries', v_updated_count;
    
    -- Update financial_accounts (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_accounts') THEN
        UPDATE financial_accounts
        SET business_id = v_business_id
        WHERE business_id = v_old_business_id;
        
        GET DIAGNOSTICS v_updated_count = ROW_COUNT;
        RAISE NOTICE 'Updated % financial accounts', v_updated_count;
    END IF;
    
    -- Update rental_bookings (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rental_bookings') THEN
        UPDATE rental_bookings
        SET business_id = v_business_id
        WHERE business_id = v_old_business_id;
        
        GET DIAGNOSTICS v_updated_count = ROW_COUNT;
        RAISE NOTICE 'Updated % rental bookings', v_updated_count;
    END IF;
    
    -- Update production_orders (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_orders') THEN
        UPDATE production_orders
        SET business_id = v_business_id
        WHERE business_id = v_old_business_id;
        
        GET DIAGNOSTICS v_updated_count = ROW_COUNT;
        RAISE NOTICE 'Updated % production orders', v_updated_count;
    END IF;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ DEMO DATA MIGRATION COMPLETE!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'All demo data has been linked to your business_id: %', v_business_id;
    RAISE NOTICE 'Refresh your dashboard to see the data!';
    RAISE NOTICE '============================================';
    
END $$;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Check if data is now linked to your business
SELECT 
    'Verification' as check_type,
    (SELECT COUNT(*) FROM products WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com'))) as products,
    (SELECT COUNT(*) FROM contacts WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com'))) as contacts,
    (SELECT COUNT(*) FROM transactions WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com'))) as transactions;

