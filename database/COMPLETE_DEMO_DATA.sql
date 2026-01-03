-- ============================================
-- COMPLETE DEMO DATA SETUP
-- This script creates comprehensive demo data for testing all functionality
-- ============================================
-- 
-- USAGE: 
-- 1. Change v_user_email to your email (default: ndm313@yahoo.com)
-- 2. Run this script in Supabase SQL Editor
-- 3. It will create:
--    - Default accounts (Cash in Hand, Bank Account)
--    - Default customer (Walk-in Customer)
--    - Products, Categories, Brands, Units
--    - Sales transactions
--    - Purchase transactions
--    - Rental bookings
--    - Production orders
--    - Account transactions
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
    v_cash_account_id INTEGER;
    v_bank_account_id INTEGER;
    v_walkin_customer_id INTEGER;
    v_product_ids INTEGER[] := ARRAY[]::INTEGER[];
    v_variation_ids INTEGER[] := ARRAY[]::INTEGER[];
    v_customer_ids INTEGER[] := ARRAY[]::INTEGER[];
    v_supplier_ids INTEGER[] := ARRAY[]::INTEGER[];
    v_transaction_ids INTEGER[] := ARRAY[]::INTEGER[];
    v_rental_ids INTEGER[] := ARRAY[]::INTEGER[];
    v_production_ids INTEGER[] := ARRAY[]::INTEGER[];
    v_temp_id INTEGER;
    v_current_product_id INTEGER;
    
    -- Column existence checks
    v_has_owner_id BOOLEAN;
    v_has_created_by BOOLEAN;
    v_has_fy_start_month BOOLEAN;
    v_has_financial_accounts BOOLEAN;
    v_has_rental_bookings BOOLEAN;
    v_has_production_orders BOOLEAN;
    v_has_product_variations BOOLEAN;
    v_product_variation_id INTEGER;
BEGIN
    -- Get user_id from auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = v_user_email;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found: %. Please register first at /register', v_user_email;
    END IF;
    
    RAISE NOTICE 'Found user: % (ID: %)', v_user_email, v_user_id;
    
    -- Get business_id from user_profiles
    SELECT business_id INTO v_business_id
    FROM user_profiles
    WHERE user_id = v_user_id;
    
    IF v_business_id IS NULL THEN
        RAISE EXCEPTION 'Business not found. Please run SETUP_USER_BUSINESS.sql first.';
    END IF;
    
    RAISE NOTICE 'Using business ID: %', v_business_id;
    
    -- Get location_id
    SELECT id INTO v_location_id
    FROM business_locations
    WHERE business_id = v_business_id
    LIMIT 1;
    
    IF v_location_id IS NULL THEN
        RAISE EXCEPTION 'Location not found. Please run SETUP_USER_BUSINESS.sql first.';
    END IF;
    
    RAISE NOTICE 'Using location ID: %', v_location_id;
    
    -- Check which columns exist
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'owner_id') INTO v_has_owner_id;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'created_by') INTO v_has_created_by;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'fy_start_month') INTO v_has_fy_start_month;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_accounts') INTO v_has_financial_accounts;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rental_bookings') INTO v_has_rental_bookings;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_orders') INTO v_has_production_orders;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_variations') INTO v_has_product_variations;
    
    -- ============================================
    -- STEP 1: CREATE DEFAULT ACCOUNTS
    -- ============================================
    IF v_has_financial_accounts THEN
        -- Cash in Hand
        SELECT id INTO v_cash_account_id
        FROM financial_accounts
        WHERE business_id = v_business_id AND name = 'Cash in Hand' AND type = 'cash'
        LIMIT 1;
        
        IF v_cash_account_id IS NULL THEN
            INSERT INTO financial_accounts (business_id, name, type, current_balance, opening_balance, is_active, created_by)
            VALUES (v_business_id, 'Cash in Hand', 'cash', 50000, 50000, true, v_user_id)
            RETURNING id INTO v_cash_account_id;
            RAISE NOTICE '✅ Created Cash in Hand account (ID: %)', v_cash_account_id;
        ELSE
            RAISE NOTICE '✅ Cash in Hand account already exists (ID: %)', v_cash_account_id;
        END IF;
        
        -- Bank Account
        SELECT id INTO v_bank_account_id
        FROM financial_accounts
        WHERE business_id = v_business_id AND name = 'Bank Account' AND type = 'bank'
        LIMIT 1;
        
        IF v_bank_account_id IS NULL THEN
            INSERT INTO financial_accounts (business_id, name, type, current_balance, opening_balance, is_active, created_by)
            VALUES (v_business_id, 'Bank Account', 'bank', 150000, 150000, true, v_user_id)
            RETURNING id INTO v_bank_account_id;
            RAISE NOTICE '✅ Created Bank Account (ID: %)', v_bank_account_id;
        ELSE
            RAISE NOTICE '✅ Bank Account already exists (ID: %)', v_bank_account_id;
        END IF;
    ELSE
        RAISE NOTICE '⚠️ financial_accounts table not found. Skipping default accounts.';
    END IF;
    
    -- ============================================
    -- STEP 2: CREATE WALK-IN CUSTOMER
    -- ============================================
    SELECT id INTO v_walkin_customer_id
    FROM contacts
    WHERE business_id = v_business_id AND name = 'Walk-in Customer' AND type = 'customer'
    LIMIT 1;
    
    IF v_walkin_customer_id IS NULL THEN
        INSERT INTO contacts (business_id, type, name, mobile, email, created_by)
        VALUES (v_business_id, 'customer', 'Walk-in Customer', NULL, NULL, v_user_id)
        RETURNING id INTO v_walkin_customer_id;
        RAISE NOTICE '✅ Created Walk-in Customer (ID: %)', v_walkin_customer_id;
    ELSE
        RAISE NOTICE '✅ Walk-in Customer already exists (ID: %)', v_walkin_customer_id;
    END IF;
    
    -- ============================================
    -- STEP 3: CREATE UNITS, CATEGORIES, BRANDS
    -- ============================================
    -- Get or create base unit (Pieces)
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
        RAISE NOTICE '✅ Created base unit (Pieces): ID = %', v_unit_id;
    ELSE
        RAISE NOTICE '✅ Base unit already exists: ID = %', v_unit_id;
    END IF;
    
    -- Get or create category
    SELECT id INTO v_category_id FROM categories WHERE business_id = v_business_id AND name = 'Bridal Wear' LIMIT 1;
    
    IF v_category_id IS NULL THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'created_by') THEN
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
    
    -- Get or create brand
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
    
    -- ============================================
    -- STEP 4: CREATE PRODUCTS AND VARIATIONS
    -- ============================================
    -- Product 1: Bridal Gown
    INSERT INTO products (business_id, name, sku, category_id, brand_id, unit_id, enable_stock, created_by)
    VALUES (v_business_id, 'Bridal Gown - Red', 'BG-RED-001', v_category_id, v_brand_id, v_unit_id, true, v_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_current_product_id;
    
    IF v_current_product_id IS NOT NULL THEN
        v_product_ids := array_append(v_product_ids, v_current_product_id);
        
        -- Create product_variation if table exists
        IF v_has_product_variations THEN
            INSERT INTO product_variations (product_id, name, is_dummy)
            VALUES (v_current_product_id, 'Size', true)
            ON CONFLICT DO NOTHING
            RETURNING id INTO v_product_variation_id;
            
            IF v_product_variation_id IS NULL THEN
                SELECT id INTO v_product_variation_id
                FROM product_variations
                WHERE product_id = v_current_product_id
                LIMIT 1;
            END IF;
        END IF;
        
        -- Create variation (with or without product_variation_id)
        IF v_has_product_variations AND v_product_variation_id IS NOT NULL THEN
            INSERT INTO variations (product_id, product_variation_id, name, sub_sku, retail_price, wholesale_price, default_purchase_price)
            VALUES (v_current_product_id, v_product_variation_id, 'Size M', 'BG-RED-001-M', 50000, 40000, 25000)
            RETURNING id INTO v_temp_id;
        ELSE
            INSERT INTO variations (product_id, name, sub_sku, retail_price, wholesale_price, default_purchase_price)
            VALUES (v_current_product_id, 'Size M', 'BG-RED-001-M', 50000, 40000, 25000)
            RETURNING id INTO v_temp_id;
        END IF;
        
        v_variation_ids := array_append(v_variation_ids, v_temp_id);
        
        -- Create stock (check if product_id and product_variation_id are required)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'variation_location_details' AND column_name = 'product_id') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'variation_location_details' AND column_name = 'product_variation_id') THEN
                INSERT INTO variation_location_details (variation_id, product_id, product_variation_id, location_id, qty_available)
                VALUES (v_temp_id, v_current_product_id, v_product_variation_id, v_location_id, 10)
                ON CONFLICT DO NOTHING;
            ELSE
                INSERT INTO variation_location_details (variation_id, product_id, location_id, qty_available)
                VALUES (v_temp_id, v_current_product_id, v_location_id, 10)
                ON CONFLICT DO NOTHING;
            END IF;
        ELSE
            INSERT INTO variation_location_details (variation_id, location_id, qty_available)
            VALUES (v_temp_id, v_location_id, 10)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    -- Product 2: Lehenga
    INSERT INTO products (business_id, name, sku, category_id, brand_id, unit_id, enable_stock, created_by)
    VALUES (v_business_id, 'Lehenga - Blue', 'LHN-BLUE-001', v_category_id, v_brand_id, v_unit_id, true, v_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_current_product_id;
    
    IF v_current_product_id IS NOT NULL THEN
        v_product_ids := array_append(v_product_ids, v_current_product_id);
        
        -- Create product_variation if table exists
        IF v_has_product_variations THEN
            INSERT INTO product_variations (product_id, name, is_dummy)
            VALUES (v_current_product_id, 'Size', true)
            ON CONFLICT DO NOTHING
            RETURNING id INTO v_product_variation_id;
            
            IF v_product_variation_id IS NULL THEN
                SELECT id INTO v_product_variation_id
                FROM product_variations
                WHERE product_id = v_current_product_id
                LIMIT 1;
            END IF;
        END IF;
        
        -- Create variation
        IF v_has_product_variations AND v_product_variation_id IS NOT NULL THEN
            INSERT INTO variations (product_id, product_variation_id, name, sub_sku, retail_price, wholesale_price, default_purchase_price)
            VALUES (v_current_product_id, v_product_variation_id, 'Size L', 'LHN-BLUE-001-L', 45000, 35000, 22000)
            RETURNING id INTO v_temp_id;
        ELSE
            INSERT INTO variations (product_id, name, sub_sku, retail_price, wholesale_price, default_purchase_price)
            VALUES (v_current_product_id, 'Size L', 'LHN-BLUE-001-L', 45000, 35000, 22000)
            RETURNING id INTO v_temp_id;
        END IF;
        
        v_variation_ids := array_append(v_variation_ids, v_temp_id);
        
        -- Create stock
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'variation_location_details' AND column_name = 'product_id') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'variation_location_details' AND column_name = 'product_variation_id') THEN
                INSERT INTO variation_location_details (variation_id, product_id, product_variation_id, location_id, qty_available)
                VALUES (v_temp_id, v_current_product_id, v_product_variation_id, v_location_id, 8)
                ON CONFLICT DO NOTHING;
            ELSE
                INSERT INTO variation_location_details (variation_id, product_id, location_id, qty_available)
                VALUES (v_temp_id, v_current_product_id, v_location_id, 8)
                ON CONFLICT DO NOTHING;
            END IF;
        ELSE
            INSERT INTO variation_location_details (variation_id, location_id, qty_available)
            VALUES (v_temp_id, v_location_id, 8)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    -- Product 3: Gharara
    INSERT INTO products (business_id, name, sku, category_id, brand_id, unit_id, enable_stock, created_by)
    VALUES (v_business_id, 'Gharara - Green', 'GHR-GRN-001', v_category_id, v_brand_id, v_unit_id, true, v_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_current_product_id;
    
    IF v_current_product_id IS NOT NULL THEN
        v_product_ids := array_append(v_product_ids, v_current_product_id);
        
        -- Create product_variation if table exists
        IF v_has_product_variations THEN
            INSERT INTO product_variations (product_id, name, is_dummy)
            VALUES (v_current_product_id, 'Size', true)
            ON CONFLICT DO NOTHING
            RETURNING id INTO v_product_variation_id;
            
            IF v_product_variation_id IS NULL THEN
                SELECT id INTO v_product_variation_id
                FROM product_variations
                WHERE product_id = v_current_product_id
                LIMIT 1;
            END IF;
        END IF;
        
        -- Create variation
        IF v_has_product_variations AND v_product_variation_id IS NOT NULL THEN
            INSERT INTO variations (product_id, product_variation_id, name, sub_sku, retail_price, wholesale_price, default_purchase_price)
            VALUES (v_current_product_id, v_product_variation_id, 'Size S', 'GHR-GRN-001-S', 35000, 28000, 18000)
            RETURNING id INTO v_temp_id;
        ELSE
            INSERT INTO variations (product_id, name, sub_sku, retail_price, wholesale_price, default_purchase_price)
            VALUES (v_current_product_id, 'Size S', 'GHR-GRN-001-S', 35000, 28000, 18000)
            RETURNING id INTO v_temp_id;
        END IF;
        
        v_variation_ids := array_append(v_variation_ids, v_temp_id);
        
        -- Create stock
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'variation_location_details' AND column_name = 'product_id') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'variation_location_details' AND column_name = 'product_variation_id') THEN
                INSERT INTO variation_location_details (variation_id, product_id, product_variation_id, location_id, qty_available)
                VALUES (v_temp_id, v_current_product_id, v_product_variation_id, v_location_id, 12)
                ON CONFLICT DO NOTHING;
            ELSE
                INSERT INTO variation_location_details (variation_id, product_id, location_id, qty_available)
                VALUES (v_temp_id, v_current_product_id, v_location_id, 12)
                ON CONFLICT DO NOTHING;
            END IF;
        ELSE
            INSERT INTO variation_location_details (variation_id, location_id, qty_available)
            VALUES (v_temp_id, v_location_id, 12)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    RAISE NOTICE '✅ Created % products with variations', array_length(v_product_ids, 1);
    
    -- ============================================
    -- STEP 5: CREATE CUSTOMERS AND SUPPLIERS
    -- ============================================
    -- Customer 1
    INSERT INTO contacts (business_id, type, name, mobile, email, created_by)
    VALUES (v_business_id, 'customer', 'Mrs. Fatima Ahmed', '+92 300 1234567', 'fatima@example.com', v_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_temp_id;
    
    IF v_temp_id IS NOT NULL THEN
        v_customer_ids := array_append(v_customer_ids, v_temp_id);
    END IF;
    
    -- Customer 2
    INSERT INTO contacts (business_id, type, name, mobile, email, created_by)
    VALUES (v_business_id, 'customer', 'Ali Textiles', '+92 300 4567890', 'ali@textiles.com', v_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_temp_id;
    
    IF v_temp_id IS NOT NULL THEN
        v_customer_ids := array_append(v_customer_ids, v_temp_id);
    END IF;
    
    -- Supplier 1
    INSERT INTO contacts (business_id, type, name, mobile, email, created_by)
    VALUES (v_business_id, 'supplier', 'Ali Dyer', '+92 300 1112222', 'ali@dyer.com', v_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_temp_id;
    
    IF v_temp_id IS NOT NULL THEN
        v_supplier_ids := array_append(v_supplier_ids, v_temp_id);
    END IF;
    
    RAISE NOTICE '✅ Created customers and suppliers';
    
    -- ============================================
    -- STEP 6: CREATE SALES TRANSACTIONS
    -- ============================================
    IF array_length(v_variation_ids, 1) > 0 AND array_length(v_customer_ids, 1) > 0 THEN
        -- Sale 1: Cash payment
        INSERT INTO transactions (
            business_id, location_id, type, status, payment_status,
            contact_id, customer_type, invoice_no, transaction_date,
            total_before_tax, tax_amount, discount_amount, final_total, created_by
        )
        VALUES (
            v_business_id, v_location_id, 'sell', 'final', 'paid',
            v_customer_ids[1], 'retail', 'INV-202501-0001', CURRENT_TIMESTAMP - INTERVAL '2 days',
            50000, 5000, 0, 55000, v_user_id
        )
        RETURNING id INTO v_temp_id;
        
        IF v_temp_id IS NOT NULL THEN
            v_transaction_ids := array_append(v_transaction_ids, v_temp_id);
            
            -- Create sell line
            INSERT INTO transaction_sell_lines (
                transaction_id, variation_id, product_id, quantity, unit_id,
                unit_price, unit_price_inc_tax, line_discount_amount, item_tax, line_total
            )
            VALUES (
                v_temp_id, v_variation_ids[1], v_product_ids[1], 1, v_unit_id,
                50000, 55000, 0, 5000, 55000
            );
            
            -- Create account transaction (Cash)
            IF v_has_financial_accounts AND v_cash_account_id IS NOT NULL THEN
                INSERT INTO account_transactions (
                    account_id, business_id, type, amount, reference_type, reference_id,
                    description, transaction_date, created_by
                )
                VALUES (
                    v_cash_account_id, v_business_id, 'credit', 55000, 'sell', v_temp_id,
                    'Sale - Invoice INV-202501-0001', CURRENT_TIMESTAMP - INTERVAL '2 days', v_user_id
                );
            END IF;
        END IF;
        
        -- Sale 2: Card payment
        INSERT INTO transactions (
            business_id, location_id, type, status, payment_status,
            contact_id, customer_type, invoice_no, transaction_date,
            total_before_tax, tax_amount, discount_amount, final_total, created_by
        )
        VALUES (
            v_business_id, v_location_id, 'sell', 'final', 'paid',
            v_walkin_customer_id, 'retail', 'INV-202501-0002', CURRENT_TIMESTAMP - INTERVAL '1 day',
            45000, 4500, 0, 49500, v_user_id
        )
        RETURNING id INTO v_temp_id;
        
        IF v_temp_id IS NOT NULL THEN
            v_transaction_ids := array_append(v_transaction_ids, v_temp_id);
            
            INSERT INTO transaction_sell_lines (
                transaction_id, variation_id, product_id, quantity, unit_id,
                unit_price, unit_price_inc_tax, line_discount_amount, item_tax, line_total
            )
            VALUES (
                v_temp_id, v_variation_ids[2], v_product_ids[2], 1, v_unit_id,
                45000, 49500, 0, 4500, 49500
            );
            
            -- Create account transaction (Bank)
            IF v_has_financial_accounts AND v_bank_account_id IS NOT NULL THEN
                INSERT INTO account_transactions (
                    account_id, business_id, type, amount, reference_type, reference_id,
                    description, transaction_date, created_by
                )
                VALUES (
                    v_bank_account_id, v_business_id, 'credit', 49500, 'sell', v_temp_id,
                    'Sale - Invoice INV-202501-0002', CURRENT_TIMESTAMP - INTERVAL '1 day', v_user_id
                );
            END IF;
        END IF;
        
        -- Sale 3: Due payment
        INSERT INTO transactions (
            business_id, location_id, type, status, payment_status,
            contact_id, customer_type, invoice_no, transaction_date,
            total_before_tax, tax_amount, discount_amount, final_total, created_by
        )
        VALUES (
            v_business_id, v_location_id, 'sell', 'final', 'due',
            v_customer_ids[2], 'retail', 'INV-202501-0003', CURRENT_TIMESTAMP,
            35000, 3500, 0, 38500, v_user_id
        )
        RETURNING id INTO v_temp_id;
        
        IF v_temp_id IS NOT NULL THEN
            v_transaction_ids := array_append(v_transaction_ids, v_temp_id);
            
            INSERT INTO transaction_sell_lines (
                transaction_id, variation_id, product_id, quantity, unit_id,
                unit_price, unit_price_inc_tax, line_discount_amount, item_tax, line_total
            )
            VALUES (
                v_temp_id, v_variation_ids[3], v_product_ids[3], 1, v_unit_id,
                35000, 38500, 0, 3500, 38500
            );
        END IF;
        
        RAISE NOTICE '✅ Created % sales transactions', array_length(v_transaction_ids, 1);
    END IF;
    
    -- ============================================
    -- STEP 7: CREATE PURCHASE TRANSACTIONS
    -- ============================================
    IF array_length(v_variation_ids, 1) > 0 AND array_length(v_supplier_ids, 1) > 0 THEN
        -- Purchase 1: Cash payment
        INSERT INTO transactions (
            business_id, location_id, type, status, payment_status,
            contact_id, ref_no, transaction_date,
            total_before_tax, tax_amount, discount_amount, final_total, created_by
        )
        VALUES (
            v_business_id, v_location_id, 'purchase', 'final', 'paid',
            v_supplier_ids[1], 'PUR-202501-0001', CURRENT_TIMESTAMP - INTERVAL '3 days',
            25000, 2500, 0, 27500, v_user_id
        )
        RETURNING id INTO v_temp_id;
        
        IF v_temp_id IS NOT NULL THEN
            -- Create purchase line (check which columns exist)
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_lines' AND column_name = 'line_discount_amount') THEN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_lines' AND column_name = 'unit_id') THEN
                    INSERT INTO purchase_lines (
                        transaction_id, variation_id, product_id, quantity, unit_id,
                        purchase_price, purchase_price_inc_tax, line_discount_amount, item_tax, line_total
                    )
                    VALUES (
                        v_temp_id, v_variation_ids[1], v_product_ids[1], 2, v_unit_id,
                        25000, 27500, 0, 2500, 55000
                    );
                ELSE
                    INSERT INTO purchase_lines (
                        transaction_id, variation_id, product_id, quantity,
                        purchase_price, purchase_price_inc_tax, line_discount_amount, item_tax, line_total
                    )
                    VALUES (
                        v_temp_id, v_variation_ids[1], v_product_ids[1], 2,
                        25000, 27500, 0, 2500, 55000
                    );
                END IF;
            ELSE
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_lines' AND column_name = 'unit_id') THEN
                    INSERT INTO purchase_lines (
                        transaction_id, variation_id, product_id, quantity, unit_id,
                        purchase_price, purchase_price_inc_tax, item_tax, line_total
                    )
                    VALUES (
                        v_temp_id, v_variation_ids[1], v_product_ids[1], 2, v_unit_id,
                        25000, 27500, 2500, 55000
                    );
                ELSE
                    INSERT INTO purchase_lines (
                        transaction_id, variation_id, product_id, quantity,
                        purchase_price, purchase_price_inc_tax, item_tax, line_total
                    )
                    VALUES (
                        v_temp_id, v_variation_ids[1], v_product_ids[1], 2,
                        25000, 27500, 2500, 55000
                    );
                END IF;
            END IF;
            
            -- Create account transaction (Cash - debit)
            IF v_has_financial_accounts AND v_cash_account_id IS NOT NULL THEN
                INSERT INTO account_transactions (
                    account_id, business_id, type, amount, reference_type, reference_id,
                    description, transaction_date, created_by
                )
                VALUES (
                    v_cash_account_id, v_business_id, 'debit', 27500, 'purchase', v_temp_id,
                    'Purchase - Ref PUR-202501-0001', CURRENT_TIMESTAMP - INTERVAL '3 days', v_user_id
                );
            END IF;
        END IF;
        
        RAISE NOTICE '✅ Created purchase transactions';
    END IF;
    
    -- ============================================
    -- STEP 8: CREATE RENTAL BOOKINGS
    -- ============================================
    IF v_has_rental_bookings AND array_length(v_product_ids, 1) > 0 AND array_length(v_variation_ids, 1) > 0 AND array_length(v_customer_ids, 1) > 0 THEN
        -- Rental 1: Reserved
        INSERT INTO rental_bookings (
            business_id, contact_id, product_id, variation_id,
            pickup_date, return_date, rental_amount, security_deposit_amount, security_type,
            status, notes, created_by
        )
        VALUES (
            v_business_id, v_customer_ids[1], v_product_ids[1], v_variation_ids[1],
            CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE + INTERVAL '5 days',
            15000, 50000, 'cash', 'reserved', 'Bridal event booking', v_user_id
        )
        RETURNING id INTO v_temp_id;
        
        IF v_temp_id IS NOT NULL THEN
            v_rental_ids := array_append(v_rental_ids, v_temp_id);
        END IF;
        
        -- Rental 2: Out
        INSERT INTO rental_bookings (
            business_id, contact_id, product_id, variation_id,
            pickup_date, return_date, rental_amount, security_deposit_amount, security_type,
            status, notes, created_by
        )
        VALUES (
            v_business_id, v_customer_ids[2], v_product_ids[2], v_variation_ids[2],
            CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '3 days',
            12000, 40000, 'cash', 'out', 'Currently rented', v_user_id
        )
        RETURNING id INTO v_temp_id;
        
        IF v_temp_id IS NOT NULL THEN
            v_rental_ids := array_append(v_rental_ids, v_temp_id);
        END IF;
        
        RAISE NOTICE '✅ Created % rental bookings', array_length(v_rental_ids, 1);
    ELSE
        RAISE NOTICE '⚠️ rental_bookings table not found or missing dependencies. Skipping rentals.';
    END IF;
    
    -- ============================================
    -- STEP 9: CREATE PRODUCTION ORDERS
    -- ============================================
    IF v_has_production_orders AND array_length(v_product_ids, 1) > 0 AND array_length(v_customer_ids, 1) > 0 THEN
        -- Production Order 1: New
        INSERT INTO production_orders (
            business_id, order_no, customer_id,
            status, deadline_date,
            total_cost, final_price, description, created_by
        )
        VALUES (
            v_business_id, 'PROD-202501-0001', v_customer_ids[1],
            'new', CURRENT_DATE + INTERVAL '7 days',
            20000, 30000, 'Custom bridal gown order', v_user_id
        )
        RETURNING id INTO v_temp_id;
        
        IF v_temp_id IS NOT NULL THEN
            v_production_ids := array_append(v_production_ids, v_temp_id);
        END IF;
        
        -- Production Order 2: Dyeing
        INSERT INTO production_orders (
            business_id, order_no, customer_id,
            status, deadline_date,
            total_cost, final_price, description, created_by
        )
        VALUES (
            v_business_id, 'PROD-202501-0002', v_customer_ids[2],
            'dyeing', CURRENT_DATE + INTERVAL '5 days',
            18000, 28000, 'Lehenga in production', v_user_id
        )
        RETURNING id INTO v_temp_id;
        
        IF v_temp_id IS NOT NULL THEN
            v_production_ids := array_append(v_production_ids, v_temp_id);
        END IF;
        
        RAISE NOTICE '✅ Created % production orders', array_length(v_production_ids, 1);
    ELSE
        RAISE NOTICE '⚠️ production_orders table not found or missing dependencies. Skipping production.';
    END IF;
    
    -- ============================================
    -- STEP 10: CREATE ACCOUNT TRANSACTIONS (Income/Expense)
    -- ============================================
    IF v_has_financial_accounts AND v_cash_account_id IS NOT NULL THEN
        -- Income transaction (use NULL or 'adjustment' for reference_type since 'income' is not allowed)
        INSERT INTO account_transactions (
            account_id, business_id, type, amount, reference_type,
            description, transaction_date, created_by
        )
        VALUES (
            v_cash_account_id, v_business_id, 'credit', 5000, NULL,
            'Miscellaneous income', CURRENT_TIMESTAMP - INTERVAL '1 day', v_user_id
        );
        
        -- Expense transaction
        INSERT INTO account_transactions (
            account_id, business_id, type, amount, reference_type,
            description, transaction_date, created_by
        )
        VALUES (
            v_cash_account_id, v_business_id, 'debit', 2000, 'expense',
            'Office supplies', CURRENT_TIMESTAMP - INTERVAL '1 day', v_user_id
        );
        
        RAISE NOTICE '✅ Created income/expense transactions';
    END IF;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ COMPLETE DEMO DATA SETUP FINISHED!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '  - Default Accounts: Cash in Hand (%), Bank Account (%)', v_cash_account_id, v_bank_account_id;
    RAISE NOTICE '  - Walk-in Customer: %', v_walkin_customer_id;
    RAISE NOTICE '  - Products Created: %', array_length(v_product_ids, 1);
    RAISE NOTICE '  - Variations Created: %', array_length(v_variation_ids, 1);
    RAISE NOTICE '  - Customers Created: %', array_length(v_customer_ids, 1);
    RAISE NOTICE '  - Suppliers Created: %', array_length(v_supplier_ids, 1);
    RAISE NOTICE '  - Sales Transactions: %', array_length(v_transaction_ids, 1);
    RAISE NOTICE '  - Rental Bookings: %', array_length(v_rental_ids, 1);
    RAISE NOTICE '  - Production Orders: %', array_length(v_production_ids, 1);
    RAISE NOTICE '============================================';
    RAISE NOTICE 'All functionality is now ready to test!';
    RAISE NOTICE '============================================';
    
END $$;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
SELECT 
    'Demo Data Status' as status,
    (SELECT COUNT(*) FROM financial_accounts WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com'))) as accounts,
    (SELECT COUNT(*) FROM contacts WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com')) AND type = 'customer') as customers,
    (SELECT COUNT(*) FROM contacts WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com')) AND type = 'supplier') as suppliers,
    (SELECT COUNT(*) FROM products WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com'))) as products,
    (SELECT COUNT(*) FROM transactions WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com')) AND type = 'sell') as sales,
    (SELECT COUNT(*) FROM transactions WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com')) AND type = 'purchase') as purchases,
    (SELECT COUNT(*) FROM rental_bookings WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com'))) as rentals,
    (SELECT COUNT(*) FROM production_orders WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com'))) as production_orders,
    (SELECT COUNT(*) FROM account_transactions WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com'))) as account_transactions;

