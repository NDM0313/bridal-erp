-- ============================================
-- CLEAR DEMO DATA SCRIPT
-- This script deletes all demo data for a specific user
-- ============================================
-- 
-- USAGE: 
-- 1. Change v_user_email to your email (default: ndm313@yahoo.com)
-- 2. Run this script in Supabase SQL Editor
-- 3. It will delete all demo data (transactions, products, contacts, etc.)
-- ============================================

DO $$
DECLARE
    v_user_email TEXT := 'demo@pos.com';  -- Demo account email
    v_user_id UUID;
    v_business_id INTEGER;
BEGIN
    -- Get user_id from auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = v_user_email;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found: %', v_user_email;
    END IF;
    
    RAISE NOTICE 'Found user: % (ID: %)', v_user_email, v_user_id;
    
    -- Get business_id from user_profiles
    SELECT business_id INTO v_business_id
    FROM user_profiles
    WHERE user_id = v_user_id;
    
    IF v_business_id IS NULL THEN
        RAISE EXCEPTION 'Business not found for user: %', v_user_email;
    END IF;
    
    RAISE NOTICE 'Using business ID: %', v_business_id;
    RAISE NOTICE '⚠️ Starting data deletion...';
    
    -- Delete in reverse order of dependencies
    
    -- 1. Delete account transactions
    DELETE FROM account_transactions WHERE business_id = v_business_id;
    RAISE NOTICE '✅ Deleted account transactions';
    
    -- 2. Delete production orders (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_orders') THEN
        DELETE FROM production_orders WHERE business_id = v_business_id;
        RAISE NOTICE '✅ Deleted production orders';
    END IF;
    
    -- 3. Delete rental bookings (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rental_bookings') THEN
        DELETE FROM rental_bookings WHERE business_id = v_business_id;
        RAISE NOTICE '✅ Deleted rental bookings';
    END IF;
    
    -- 4. Delete transaction sell lines
    DELETE FROM transaction_sell_lines 
    WHERE transaction_id IN (SELECT id FROM transactions WHERE business_id = v_business_id);
    RAISE NOTICE '✅ Deleted transaction sell lines';
    
    -- 5. Delete purchase lines (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_lines') THEN
        DELETE FROM purchase_lines 
        WHERE transaction_id IN (SELECT id FROM transactions WHERE business_id = v_business_id);
        RAISE NOTICE '✅ Deleted purchase lines';
    END IF;
    
    -- 6. Delete transactions
    DELETE FROM transactions WHERE business_id = v_business_id;
    RAISE NOTICE '✅ Deleted transactions';
    
    -- 7. Delete variation location details (stock)
    DELETE FROM variation_location_details 
    WHERE variation_id IN (
        SELECT id FROM variations 
        WHERE product_id IN (SELECT id FROM products WHERE business_id = v_business_id)
    );
    RAISE NOTICE '✅ Deleted stock records';
    
    -- 8. Delete variations
    DELETE FROM variations 
    WHERE product_id IN (SELECT id FROM products WHERE business_id = v_business_id);
    RAISE NOTICE '✅ Deleted variations';
    
    -- 9. Delete product variations (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_variations') THEN
        DELETE FROM product_variations 
        WHERE product_id IN (SELECT id FROM products WHERE business_id = v_business_id);
        RAISE NOTICE '✅ Deleted product variations';
    END IF;
    
    -- 10. Delete products
    DELETE FROM products WHERE business_id = v_business_id;
    RAISE NOTICE '✅ Deleted products';
    
    -- 11. Delete contacts (except Walk-in Customer)
    DELETE FROM contacts 
    WHERE business_id = v_business_id 
    AND NOT (name = 'Walk-in Customer' AND type = 'customer');
    RAISE NOTICE '✅ Deleted contacts (kept Walk-in Customer)';
    
    -- 12. Delete financial accounts (except default ones)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_accounts') THEN
        DELETE FROM financial_accounts 
        WHERE business_id = v_business_id 
        AND NOT (name IN ('Cash in Hand', 'Bank Account') AND type IN ('cash', 'bank'));
        RAISE NOTICE '✅ Deleted financial accounts (kept default ones)';
    END IF;
    
    -- 13. Delete brands (except default)
    DELETE FROM brands 
    WHERE business_id = v_business_id 
    AND name != 'Din Collection';
    RAISE NOTICE '✅ Deleted brands (kept Din Collection)';
    
    -- 14. Delete categories (except default)
    DELETE FROM categories 
    WHERE business_id = v_business_id 
    AND name != 'Bridal Wear';
    RAISE NOTICE '✅ Deleted categories (kept Bridal Wear)';
    
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ ALL DEMO DATA DELETED!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Default resources kept:';
    RAISE NOTICE '  - Cash in Hand account';
    RAISE NOTICE '  - Bank Account';
    RAISE NOTICE '  - Walk-in Customer';
    RAISE NOTICE '  - Din Collection brand';
    RAISE NOTICE '  - Bridal Wear category';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Now you can run COMPREHENSIVE_DEMO_DATA.sql to create fresh demo data';
    RAISE NOTICE '============================================';
    
END $$;

-- Verification query
SELECT 
    'Data Status After Deletion' as status,
    (SELECT COUNT(*) FROM products WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@pos.com'))) as products,
    (SELECT COUNT(*) FROM transactions WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@pos.com'))) as transactions,
    (SELECT COUNT(*) FROM contacts WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@pos.com')) AND name != 'Walk-in Customer') as contacts,
    (SELECT COUNT(*) FROM rental_bookings WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@pos.com'))) as rentals,
    (SELECT COUNT(*) FROM production_orders WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@pos.com'))) as production_orders;

