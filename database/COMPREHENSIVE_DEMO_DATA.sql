-- ============================================
-- COMPREHENSIVE DEMO DATA - FULLY LINKED
-- All transactions linked with invoice numbers, SKUs, payment IDs, etc.
-- ============================================
-- 
-- IMPORTANT: 
-- 1. Make sure demo account exists: demo@pos.com / demo123456
--    (Run CREATE_DEMO_ACCOUNT.sql if needed)
-- 2. If you have old demo data, run CLEAR_DEMO_DATA.sql first
-- 3. Run this script in Supabase SQL Editor
-- 4. Creates complete linked demo data for demo@pos.com:
--    - Purchases (Cash, Bank, Due)
--    - Sales (POS Cash, Regular Cash, Bank, Credit)
--    - Rentals (Reserved, Out, Returned, Pending payments)
--    - Production Orders (Different vendors, pending items)
--    - All linked with proper IDs and references
-- ============================================

DO $$
DECLARE
    v_user_email TEXT := 'demo@pos.com';  -- Demo account email
    v_user_id UUID;
    v_business_id INTEGER;
    v_location_id INTEGER;
    v_unit_id INTEGER;
    v_category_id INTEGER;
    v_brand_id INTEGER;
    v_cash_account_id INTEGER;
    v_bank_account_id INTEGER;
    v_walkin_customer_id INTEGER;
    
    -- Product and Variation IDs
    v_product_ids INTEGER[] := ARRAY[]::INTEGER[];
    v_variation_ids INTEGER[] := ARRAY[]::INTEGER[];
    v_product_variation_id INTEGER;
    
    -- Contact IDs
    v_customer_ids INTEGER[] := ARRAY[]::INTEGER[];
    v_supplier_ids INTEGER[] := ARRAY[]::INTEGER[];
    v_vendor_ids INTEGER[] := ARRAY[]::INTEGER[];
    
    -- Transaction IDs
    v_purchase_ids INTEGER[] := ARRAY[]::INTEGER[];
    v_sale_ids INTEGER[] := ARRAY[]::INTEGER[];
    v_rental_ids INTEGER[] := ARRAY[]::INTEGER[];
    v_production_ids INTEGER[] := ARRAY[]::INTEGER[];
    
    -- Temporary variables
    v_temp_id INTEGER;
    v_current_product_id INTEGER;
    v_invoice_counter INTEGER := 1;
    v_purchase_counter INTEGER := 1;
    v_production_counter INTEGER := 1;
    v_line_product_id INTEGER;  -- For getting product_id from variation
    
    -- Column existence checks
    v_has_financial_accounts BOOLEAN;
    v_has_rental_bookings BOOLEAN;
    v_has_production_orders BOOLEAN;
    v_has_product_variations BOOLEAN;
    v_has_assigned_vendor_id BOOLEAN;
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
    
    -- Check which tables/columns exist
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_accounts') INTO v_has_financial_accounts;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rental_bookings') INTO v_has_rental_bookings;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_orders') INTO v_has_production_orders;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_variations') INTO v_has_product_variations;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'production_orders' AND column_name = 'assigned_vendor_id') INTO v_has_assigned_vendor_id;
    
    -- ============================================
    -- STEP 1: GET OR CREATE DEFAULT ACCOUNTS
    -- ============================================
    IF v_has_financial_accounts THEN
        -- Cash in Hand
        SELECT id INTO v_cash_account_id
        FROM financial_accounts
        WHERE business_id = v_business_id AND name = 'Cash in Hand' AND type = 'cash'
        LIMIT 1;
        
        IF v_cash_account_id IS NULL THEN
            INSERT INTO financial_accounts (business_id, name, type, current_balance, opening_balance, is_active, created_by)
            VALUES (v_business_id, 'Cash in Hand', 'cash', 100000, 100000, true, v_user_id)
            RETURNING id INTO v_cash_account_id;
        END IF;
        
        -- Bank Account
        SELECT id INTO v_bank_account_id
        FROM financial_accounts
        WHERE business_id = v_business_id AND name = 'Bank Account' AND type = 'bank'
        LIMIT 1;
        
        IF v_bank_account_id IS NULL THEN
            INSERT INTO financial_accounts (business_id, name, type, current_balance, opening_balance, is_active, created_by)
            VALUES (v_business_id, 'Bank Account', 'bank', 200000, 200000, true, v_user_id)
            RETURNING id INTO v_bank_account_id;
        END IF;
        
        RAISE NOTICE '✅ Accounts: Cash (%), Bank (%)', v_cash_account_id, v_bank_account_id;
    END IF;
    
    -- ============================================
    -- STEP 2: GET OR CREATE WALK-IN CUSTOMER
    -- ============================================
    SELECT id INTO v_walkin_customer_id
    FROM contacts
    WHERE business_id = v_business_id AND name = 'Walk-in Customer' AND type = 'customer'
    LIMIT 1;
    
    IF v_walkin_customer_id IS NULL THEN
        INSERT INTO contacts (business_id, type, name, mobile, email, created_by)
        VALUES (v_business_id, 'customer', 'Walk-in Customer', NULL, NULL, v_user_id)
        RETURNING id INTO v_walkin_customer_id;
    END IF;
    
    -- ============================================
    -- STEP 3: GET OR CREATE UNITS, CATEGORIES, BRANDS
    -- ============================================
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
    END IF;
    
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
    END IF;
    
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
    END IF;
    
    -- ============================================
    -- STEP 4: CREATE PRODUCTS AND VARIATIONS (5 products)
    -- ============================================
    -- Product 1: Red Bridal Gown
    INSERT INTO products (business_id, name, sku, category_id, brand_id, unit_id, enable_stock, created_by)
    VALUES (v_business_id, 'Red Bridal Gown', 'BG-RED-001', v_category_id, v_brand_id, v_unit_id, true, v_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_current_product_id;
    
    IF v_current_product_id IS NOT NULL THEN
        v_product_ids := array_append(v_product_ids, v_current_product_id);
        
        IF v_has_product_variations THEN
            INSERT INTO product_variations (product_id, name, is_dummy)
            VALUES (v_current_product_id, 'Size', true)
            ON CONFLICT DO NOTHING
            RETURNING id INTO v_product_variation_id;
            
            IF v_product_variation_id IS NULL THEN
                SELECT id INTO v_product_variation_id FROM product_variations WHERE product_id = v_current_product_id LIMIT 1;
            END IF;
        END IF;
        
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
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'variation_location_details' AND column_name = 'product_id') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'variation_location_details' AND column_name = 'product_variation_id') THEN
                INSERT INTO variation_location_details (variation_id, product_id, product_variation_id, location_id, qty_available)
                VALUES (v_temp_id, v_current_product_id, v_product_variation_id, v_location_id, 15)
                ON CONFLICT DO NOTHING;
            ELSE
                INSERT INTO variation_location_details (variation_id, product_id, location_id, qty_available)
                VALUES (v_temp_id, v_current_product_id, v_location_id, 15)
                ON CONFLICT DO NOTHING;
            END IF;
        ELSE
            INSERT INTO variation_location_details (variation_id, location_id, qty_available)
            VALUES (v_temp_id, v_location_id, 15)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    -- Product 2: Blue Lehenga
    INSERT INTO products (business_id, name, sku, category_id, brand_id, unit_id, enable_stock, created_by)
    VALUES (v_business_id, 'Blue Lehenga', 'LHN-BLUE-001', v_category_id, v_brand_id, v_unit_id, true, v_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_current_product_id;
    
    IF v_current_product_id IS NOT NULL THEN
        v_product_ids := array_append(v_product_ids, v_current_product_id);
        
        IF v_has_product_variations THEN
            INSERT INTO product_variations (product_id, name, is_dummy)
            VALUES (v_current_product_id, 'Size', true)
            ON CONFLICT DO NOTHING
            RETURNING id INTO v_product_variation_id;
            
            IF v_product_variation_id IS NULL THEN
                SELECT id INTO v_product_variation_id FROM product_variations WHERE product_id = v_current_product_id LIMIT 1;
            END IF;
        END IF;
        
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
    
    -- Product 3: Green Gharara
    INSERT INTO products (business_id, name, sku, category_id, brand_id, unit_id, enable_stock, created_by)
    VALUES (v_business_id, 'Green Gharara', 'GHR-GRN-001', v_category_id, v_brand_id, v_unit_id, true, v_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_current_product_id;
    
    IF v_current_product_id IS NOT NULL THEN
        v_product_ids := array_append(v_product_ids, v_current_product_id);
        
        IF v_has_product_variations THEN
            INSERT INTO product_variations (product_id, name, is_dummy)
            VALUES (v_current_product_id, 'Size', true)
            ON CONFLICT DO NOTHING
            RETURNING id INTO v_product_variation_id;
            
            IF v_product_variation_id IS NULL THEN
                SELECT id INTO v_product_variation_id FROM product_variations WHERE product_id = v_current_product_id LIMIT 1;
            END IF;
        END IF;
        
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
    
    -- Product 4: Gold Sherwani
    INSERT INTO products (business_id, name, sku, category_id, brand_id, unit_id, enable_stock, created_by)
    VALUES (v_business_id, 'Gold Sherwani', 'SHW-GOLD-001', v_category_id, v_brand_id, v_unit_id, true, v_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_current_product_id;
    
    IF v_current_product_id IS NOT NULL THEN
        v_product_ids := array_append(v_product_ids, v_current_product_id);
        
        IF v_has_product_variations THEN
            INSERT INTO product_variations (product_id, name, is_dummy)
            VALUES (v_current_product_id, 'Size', true)
            ON CONFLICT DO NOTHING
            RETURNING id INTO v_product_variation_id;
            
            IF v_product_variation_id IS NULL THEN
                SELECT id INTO v_product_variation_id FROM product_variations WHERE product_id = v_current_product_id LIMIT 1;
            END IF;
        END IF;
        
        IF v_has_product_variations AND v_product_variation_id IS NOT NULL THEN
            INSERT INTO variations (product_id, product_variation_id, name, sub_sku, retail_price, wholesale_price, default_purchase_price)
            VALUES (v_current_product_id, v_product_variation_id, 'Size XL', 'SHW-GOLD-001-XL', 40000, 32000, 20000)
            RETURNING id INTO v_temp_id;
        ELSE
            INSERT INTO variations (product_id, name, sub_sku, retail_price, wholesale_price, default_purchase_price)
            VALUES (v_current_product_id, 'Size XL', 'SHW-GOLD-001-XL', 40000, 32000, 20000)
            RETURNING id INTO v_temp_id;
        END IF;
        
        v_variation_ids := array_append(v_variation_ids, v_temp_id);
        
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
    
    -- Product 5: Maroon Lehenga
    INSERT INTO products (business_id, name, sku, category_id, brand_id, unit_id, enable_stock, created_by)
    VALUES (v_business_id, 'Maroon Lehenga', 'LHN-MRN-001', v_category_id, v_brand_id, v_unit_id, true, v_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_current_product_id;
    
    IF v_current_product_id IS NOT NULL THEN
        v_product_ids := array_append(v_product_ids, v_current_product_id);
        
        IF v_has_product_variations THEN
            INSERT INTO product_variations (product_id, name, is_dummy)
            VALUES (v_current_product_id, 'Size', true)
            ON CONFLICT DO NOTHING
            RETURNING id INTO v_product_variation_id;
            
            IF v_product_variation_id IS NULL THEN
                SELECT id INTO v_product_variation_id FROM product_variations WHERE product_id = v_current_product_id LIMIT 1;
            END IF;
        END IF;
        
        IF v_has_product_variations AND v_product_variation_id IS NOT NULL THEN
            INSERT INTO variations (product_id, product_variation_id, name, sub_sku, retail_price, wholesale_price, default_purchase_price)
            VALUES (v_current_product_id, v_product_variation_id, 'Size M', 'LHN-MRN-001-M', 42000, 33000, 21000)
            RETURNING id INTO v_temp_id;
        ELSE
            INSERT INTO variations (product_id, name, sub_sku, retail_price, wholesale_price, default_purchase_price)
            VALUES (v_current_product_id, 'Size M', 'LHN-MRN-001-M', 42000, 33000, 21000)
            RETURNING id INTO v_temp_id;
        END IF;
        
        v_variation_ids := array_append(v_variation_ids, v_temp_id);
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'variation_location_details' AND column_name = 'product_id') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'variation_location_details' AND column_name = 'product_variation_id') THEN
                INSERT INTO variation_location_details (variation_id, product_id, product_variation_id, location_id, qty_available)
                VALUES (v_temp_id, v_current_product_id, v_product_variation_id, v_location_id, 6)
                ON CONFLICT DO NOTHING;
            ELSE
                INSERT INTO variation_location_details (variation_id, product_id, location_id, qty_available)
                VALUES (v_temp_id, v_current_product_id, v_location_id, 6)
                ON CONFLICT DO NOTHING;
            END IF;
        ELSE
            INSERT INTO variation_location_details (variation_id, location_id, qty_available)
            VALUES (v_temp_id, v_location_id, 6)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    RAISE NOTICE '✅ Created % products with variations', array_length(v_product_ids, 1);
    
    -- ============================================
    -- STEP 5: CREATE CONTACTS (Customers, Suppliers, Vendors)
    -- ============================================
    -- Customer 1: Mrs. Fatima Ahmed
    INSERT INTO contacts (business_id, type, name, mobile, email, created_by)
    VALUES (v_business_id, 'customer', 'Mrs. Fatima Ahmed', '+92 300 1234567', 'fatima@example.com', v_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_temp_id;
    
    IF v_temp_id IS NOT NULL THEN
        v_customer_ids := array_append(v_customer_ids, v_temp_id);
    END IF;
    
    -- Customer 2: Ali Textiles (Wholesale)
    INSERT INTO contacts (business_id, type, name, mobile, email, created_by)
    VALUES (v_business_id, 'customer', 'Ali Textiles', '+92 300 4567890', 'ali@textiles.com', v_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_temp_id;
    
    IF v_temp_id IS NOT NULL THEN
        v_customer_ids := array_append(v_customer_ids, v_temp_id);
    END IF;
    
    -- Customer 3: Zara Boutique
    INSERT INTO contacts (business_id, type, name, mobile, email, created_by)
    VALUES (v_business_id, 'customer', 'Zara Boutique', '+92 300 7890123', 'zara@boutique.com', v_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_temp_id;
    
    IF v_temp_id IS NOT NULL THEN
        v_customer_ids := array_append(v_customer_ids, v_temp_id);
    END IF;
    
    -- Supplier 1: Ali Dyer
    INSERT INTO contacts (business_id, type, name, mobile, email, created_by)
    VALUES (v_business_id, 'supplier', 'Ali Dyer', '+92 300 1112222', 'ali@dyer.com', v_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_temp_id;
    
    IF v_temp_id IS NOT NULL THEN
        v_supplier_ids := array_append(v_supplier_ids, v_temp_id);
    END IF;
    
    -- Supplier 2: Fabric Supplier
    INSERT INTO contacts (business_id, type, name, mobile, email, created_by)
    VALUES (v_business_id, 'supplier', 'Fabric Supplier', '+92 300 2223333', 'fabric@supplier.com', v_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_temp_id;
    
    IF v_temp_id IS NOT NULL THEN
        v_supplier_ids := array_append(v_supplier_ids, v_temp_id);
    END IF;
    
    -- Vendor 1: Master Tailor
    INSERT INTO contacts (business_id, type, name, mobile, email, created_by)
    VALUES (v_business_id, 'supplier', 'Master Tailor', '+92 300 3334444', 'tailor@master.com', v_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_temp_id;
    
    IF v_temp_id IS NOT NULL THEN
        v_vendor_ids := array_append(v_vendor_ids, v_temp_id);
    END IF;
    
    -- Vendor 2: Handwork Specialist
    INSERT INTO contacts (business_id, type, name, mobile, email, created_by)
    VALUES (v_business_id, 'supplier', 'Handwork Specialist', '+92 300 4445555', 'handwork@specialist.com', v_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_temp_id;
    
    IF v_temp_id IS NOT NULL THEN
        v_vendor_ids := array_append(v_vendor_ids, v_temp_id);
    END IF;
    
    RAISE NOTICE '✅ Created contacts: % customers, % suppliers, % vendors', 
        array_length(v_customer_ids, 1), array_length(v_supplier_ids, 1), array_length(v_vendor_ids, 1);
    
    -- ============================================
    -- STEP 6: CREATE PURCHASE TRANSACTIONS
    -- ============================================
    -- Purchase 1: Cash Payment (Fully Paid)
    INSERT INTO transactions (
        business_id, location_id, type, status, payment_status,
        contact_id, ref_no, transaction_date,
        total_before_tax, tax_amount, discount_amount, final_total, created_by
    )
    VALUES (
        v_business_id, v_location_id, 'purchase', 'final', 'paid',
        v_supplier_ids[1], 'PUR-202501-0001', CURRENT_TIMESTAMP - INTERVAL '5 days',
        50000, 5000, 0, 55000, v_user_id
    )
    RETURNING id INTO v_temp_id;
    
    IF v_temp_id IS NOT NULL THEN
        v_purchase_ids := array_append(v_purchase_ids, v_temp_id);
        
        -- Get product_id from variation
        SELECT product_id INTO v_line_product_id FROM variations WHERE id = v_variation_ids[1];
        
        -- If product_id is NULL, skip this purchase line
        IF v_line_product_id IS NULL THEN
            RAISE NOTICE '⚠️ Variation % has no product_id, skipping purchase line', v_variation_ids[1];
        ELSE
            -- Create purchase line
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_lines' AND column_name = 'line_discount_amount') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_lines' AND column_name = 'unit_id') THEN
                INSERT INTO purchase_lines (
                    transaction_id, variation_id, product_id, quantity, unit_id,
                    purchase_price, purchase_price_inc_tax, line_discount_amount, item_tax, line_total
                )
                VALUES (
                    v_temp_id, v_variation_ids[1], v_line_product_id, 2, v_unit_id,
                    25000, 27500, 0, 5000, 55000
                );
            ELSE
                INSERT INTO purchase_lines (
                    transaction_id, variation_id, product_id, quantity,
                    purchase_price, purchase_price_inc_tax, line_discount_amount, item_tax, line_total
                )
                VALUES (
                    v_temp_id, v_variation_ids[1], v_line_product_id, 2,
                    25000, 27500, 0, 5000, 55000
                );
            END IF;
        ELSE
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_lines' AND column_name = 'unit_id') THEN
                INSERT INTO purchase_lines (
                    transaction_id, variation_id, product_id, quantity, unit_id,
                    purchase_price, purchase_price_inc_tax, item_tax, line_total
                )
                VALUES (
                    v_temp_id, v_variation_ids[1], v_line_product_id, 2, v_unit_id,
                    25000, 27500, 5000, 55000
                );
            ELSE
                INSERT INTO purchase_lines (
                    transaction_id, variation_id, product_id, quantity,
                    purchase_price, purchase_price_inc_tax, item_tax, line_total
                )
                VALUES (
                    v_temp_id, v_variation_ids[1], v_line_product_id, 2,
                    25000, 27500, 5000, 55000
                );
            END IF;
        END IF;
        END IF;  -- End of v_line_product_id IS NOT NULL check
        
        -- Create account transaction (Cash - debit)
        IF v_has_financial_accounts AND v_cash_account_id IS NOT NULL THEN
            INSERT INTO account_transactions (
                account_id, business_id, type, amount, reference_type, reference_id,
                description, transaction_date, created_by
            )
            VALUES (
                v_cash_account_id, v_business_id, 'debit', 55000, 'purchase', v_temp_id,
                'Purchase - PUR-202501-0001 (Cash)', CURRENT_TIMESTAMP - INTERVAL '5 days', v_user_id
            );
        END IF;
    END IF;
    
    -- Purchase 2: Bank Payment (Fully Paid)
    INSERT INTO transactions (
        business_id, location_id, type, status, payment_status,
        contact_id, ref_no, transaction_date,
        total_before_tax, tax_amount, discount_amount, final_total, created_by
    )
    VALUES (
        v_business_id, v_location_id, 'purchase', 'final', 'paid',
        v_supplier_ids[2], 'PUR-202501-0002', CURRENT_TIMESTAMP - INTERVAL '3 days',
        44000, 4400, 0, 48400, v_user_id
    )
    RETURNING id INTO v_temp_id;
    
    IF v_temp_id IS NOT NULL THEN
        v_purchase_ids := array_append(v_purchase_ids, v_temp_id);
        
        -- Get product_id from variation
        SELECT product_id INTO v_line_product_id FROM variations WHERE id = v_variation_ids[2];
        
        -- If product_id is NULL, skip this purchase line
        IF v_line_product_id IS NULL THEN
            RAISE NOTICE '⚠️ Variation % has no product_id, skipping purchase line', v_variation_ids[2];
        ELSE
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_lines' AND column_name = 'line_discount_amount') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_lines' AND column_name = 'unit_id') THEN
                INSERT INTO purchase_lines (
                    transaction_id, variation_id, product_id, quantity, unit_id,
                    purchase_price, purchase_price_inc_tax, line_discount_amount, item_tax, line_total
                )
                VALUES (
                    v_temp_id, v_variation_ids[2], v_line_product_id, 2, v_unit_id,
                    22000, 24200, 0, 4400, 48400
                );
            ELSE
                INSERT INTO purchase_lines (
                    transaction_id, variation_id, product_id, quantity,
                    purchase_price, purchase_price_inc_tax, line_discount_amount, item_tax, line_total
                )
                VALUES (
                    v_temp_id, v_variation_ids[2], v_line_product_id, 2,
                    22000, 24200, 0, 4400, 48400
                );
            END IF;
        ELSE
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_lines' AND column_name = 'unit_id') THEN
                INSERT INTO purchase_lines (
                    transaction_id, variation_id, product_id, quantity, unit_id,
                    purchase_price, purchase_price_inc_tax, item_tax, line_total
                )
                VALUES (
                    v_temp_id, v_variation_ids[2], v_line_product_id, 2, v_unit_id,
                    22000, 24200, 4400, 48400
                );
            ELSE
                INSERT INTO purchase_lines (
                    transaction_id, variation_id, product_id, quantity,
                    purchase_price, purchase_price_inc_tax, item_tax, line_total
                )
                VALUES (
                    v_temp_id, v_variation_ids[2], v_line_product_id, 2,
                    22000, 24200, 4400, 48400
                );
            END IF;
        END IF;
        END IF;  -- End of v_line_product_id IS NOT NULL check
        
        -- Create account transaction (Bank - debit)
        IF v_has_financial_accounts AND v_bank_account_id IS NOT NULL THEN
            INSERT INTO account_transactions (
                account_id, business_id, type, amount, reference_type, reference_id,
                description, transaction_date, created_by
            )
            VALUES (
                v_bank_account_id, v_business_id, 'debit', 48400, 'purchase', v_temp_id,
                'Purchase - PUR-202501-0002 (Bank)', CURRENT_TIMESTAMP - INTERVAL '3 days', v_user_id
            );
        END IF;
    END IF;
    
    -- Purchase 3: Due Payment (Partially Paid)
    INSERT INTO transactions (
        business_id, location_id, type, status, payment_status,
        contact_id, ref_no, transaction_date,
        total_before_tax, tax_amount, discount_amount, final_total, created_by
    )
    VALUES (
        v_business_id, v_location_id, 'purchase', 'final', 'partial',
        v_supplier_ids[1], 'PUR-202501-0003', CURRENT_TIMESTAMP - INTERVAL '1 day',
        36000, 3600, 0, 39600, v_user_id
    )
    RETURNING id INTO v_temp_id;
    
    IF v_temp_id IS NOT NULL THEN
        v_purchase_ids := array_append(v_purchase_ids, v_temp_id);
        
        -- Get product_id from variation
        SELECT product_id INTO v_line_product_id FROM variations WHERE id = v_variation_ids[3];
        
        -- If product_id is NULL, skip this purchase line
        IF v_line_product_id IS NULL THEN
            RAISE NOTICE '⚠️ Variation % has no product_id, skipping purchase line', v_variation_ids[3];
        ELSE
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_lines' AND column_name = 'line_discount_amount') THEN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_lines' AND column_name = 'unit_id') THEN
                    INSERT INTO purchase_lines (
                        transaction_id, variation_id, product_id, quantity, unit_id,
                        purchase_price, purchase_price_inc_tax, line_discount_amount, item_tax, line_total
                    )
                    VALUES (
                        v_temp_id, v_variation_ids[3], v_line_product_id, 2, v_unit_id,
                        18000, 19800, 0, 3600, 39600
                    );
                ELSE
                    INSERT INTO purchase_lines (
                        transaction_id, variation_id, product_id, quantity,
                        purchase_price, purchase_price_inc_tax, line_discount_amount, item_tax, line_total
                    )
                    VALUES (
                        v_temp_id, v_variation_ids[3], v_line_product_id, 2,
                        18000, 19800, 0, 3600, 39600
                    );
                END IF;
            ELSE
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_lines' AND column_name = 'unit_id') THEN
                    INSERT INTO purchase_lines (
                        transaction_id, variation_id, product_id, quantity, unit_id,
                        purchase_price, purchase_price_inc_tax, item_tax, line_total
                    )
                    VALUES (
                        v_temp_id, v_variation_ids[3], v_line_product_id, 2, v_unit_id,
                        18000, 19800, 3600, 39600
                    );
                ELSE
                    INSERT INTO purchase_lines (
                        transaction_id, variation_id, product_id, quantity,
                        purchase_price, purchase_price_inc_tax, item_tax, line_total
                    )
                    VALUES (
                        v_temp_id, v_variation_ids[3], v_line_product_id, 2,
                        18000, 19800, 3600, 39600
                    );
                END IF;
            END IF;
        END IF;  -- End of v_line_product_id IS NOT NULL check
        
        -- Create partial payment account transaction (Cash - debit)
        IF v_has_financial_accounts AND v_cash_account_id IS NOT NULL THEN
            INSERT INTO account_transactions (
                account_id, business_id, type, amount, reference_type, reference_id,
                description, transaction_date, created_by
            )
            VALUES (
                v_cash_account_id, v_business_id, 'debit', 20000, 'purchase', v_temp_id,
                'Purchase - PUR-202501-0003 (Partial Cash)', CURRENT_TIMESTAMP - INTERVAL '1 day', v_user_id
            );
        END IF;
    END IF;
    
    RAISE NOTICE '✅ Created % purchase transactions', array_length(v_purchase_ids, 1);
    
    -- ============================================
    -- STEP 7: CREATE SALES TRANSACTIONS
    -- ============================================
    -- Sale 1: POS Cash Sale (Walk-in Customer)
    INSERT INTO transactions (
        business_id, location_id, type, status, payment_status,
        contact_id, customer_type, invoice_no, transaction_date,
        total_before_tax, tax_amount, discount_amount, final_total, created_by
    )
    VALUES (
        v_business_id, v_location_id, 'sell', 'final', 'paid',
        v_walkin_customer_id, 'retail', 'INV-202501-0001', CURRENT_TIMESTAMP - INTERVAL '4 days',
        50000, 5000, 0, 55000, v_user_id
    )
    RETURNING id INTO v_temp_id;
    
    IF v_temp_id IS NOT NULL THEN
        v_sale_ids := array_append(v_sale_ids, v_temp_id);
        
        -- Get product_id from variation
        SELECT product_id INTO v_line_product_id FROM variations WHERE id = v_variation_ids[1];
        
        IF v_line_product_id IS NOT NULL THEN
            INSERT INTO transaction_sell_lines (
                transaction_id, variation_id, product_id, quantity, unit_id,
                unit_price, unit_price_inc_tax, line_discount_amount, item_tax, line_total
            )
            VALUES (
                v_temp_id, v_variation_ids[1], v_line_product_id, 1, v_unit_id,
                50000, 55000, 0, 5000, 55000
            );
        END IF;
        
        -- Create account transaction (Cash - credit)
        IF v_has_financial_accounts AND v_cash_account_id IS NOT NULL THEN
            INSERT INTO account_transactions (
                account_id, business_id, type, amount, reference_type, reference_id,
                description, transaction_date, created_by
            )
            VALUES (
                v_cash_account_id, v_business_id, 'credit', 55000, 'sell', v_temp_id,
                'Sale - INV-202501-0001 (POS Cash)', CURRENT_TIMESTAMP - INTERVAL '4 days', v_user_id
            );
        END IF;
    END IF;
    
    -- Sale 2: Regular Cash Sale (Customer)
    INSERT INTO transactions (
        business_id, location_id, type, status, payment_status,
        contact_id, customer_type, invoice_no, transaction_date,
        total_before_tax, tax_amount, discount_amount, final_total, created_by
    )
    VALUES (
        v_business_id, v_location_id, 'sell', 'final', 'paid',
        v_customer_ids[1], 'retail', 'INV-202501-0002', CURRENT_TIMESTAMP - INTERVAL '3 days',
        45000, 4500, 0, 49500, v_user_id
    )
    RETURNING id INTO v_temp_id;
    
    IF v_temp_id IS NOT NULL THEN
        v_sale_ids := array_append(v_sale_ids, v_temp_id);
        
        -- Get product_id from variation
        SELECT product_id INTO v_line_product_id FROM variations WHERE id = v_variation_ids[2];
        
        IF v_line_product_id IS NOT NULL THEN
            INSERT INTO transaction_sell_lines (
                transaction_id, variation_id, product_id, quantity, unit_id,
                unit_price, unit_price_inc_tax, line_discount_amount, item_tax, line_total
            )
            VALUES (
                v_temp_id, v_variation_ids[2], v_line_product_id, 1, v_unit_id,
                45000, 49500, 0, 4500, 49500
            );
        END IF;
        
        -- Create account transaction (Cash - credit)
        IF v_has_financial_accounts AND v_cash_account_id IS NOT NULL THEN
            INSERT INTO account_transactions (
                account_id, business_id, type, amount, reference_type, reference_id,
                description, transaction_date, created_by
            )
            VALUES (
                v_cash_account_id, v_business_id, 'credit', 49500, 'sell', v_temp_id,
                'Sale - INV-202501-0002 (Cash)', CURRENT_TIMESTAMP - INTERVAL '3 days', v_user_id
            );
        END IF;
    END IF;
    
    -- Sale 3: Bank Transfer Sale
    INSERT INTO transactions (
        business_id, location_id, type, status, payment_status,
        contact_id, customer_type, invoice_no, transaction_date,
        total_before_tax, tax_amount, discount_amount, final_total, created_by
    )
    VALUES (
        v_business_id, v_location_id, 'sell', 'final', 'paid',
        v_customer_ids[2], 'wholesale', 'INV-202501-0003', CURRENT_TIMESTAMP - INTERVAL '2 days',
        70000, 7000, 0, 77000, v_user_id
    )
    RETURNING id INTO v_temp_id;
    
    IF v_temp_id IS NOT NULL THEN
        v_sale_ids := array_append(v_sale_ids, v_temp_id);
        
        -- Get product_id from variation for first line
        SELECT product_id INTO v_line_product_id FROM variations WHERE id = v_variation_ids[1];
        
        IF v_line_product_id IS NOT NULL THEN
            INSERT INTO transaction_sell_lines (
                transaction_id, variation_id, product_id, quantity, unit_id,
                unit_price, unit_price_inc_tax, line_discount_amount, item_tax, line_total
            )
            VALUES (
                v_temp_id, v_variation_ids[1], v_line_product_id, 1, v_unit_id,
                40000, 44000, 0, 4000, 44000
            );
        END IF;
        
        -- Get product_id from variation for second line
        SELECT product_id INTO v_line_product_id FROM variations WHERE id = v_variation_ids[2];
        
        IF v_line_product_id IS NOT NULL THEN
            INSERT INTO transaction_sell_lines (
                transaction_id, variation_id, product_id, quantity, unit_id,
                unit_price, unit_price_inc_tax, line_discount_amount, item_tax, line_total
            )
            VALUES (
                v_temp_id, v_variation_ids[2], v_line_product_id, 1, v_unit_id,
                30000, 33000, 0, 3000, 33000
            );
        END IF;
        
        -- Create account transaction (Bank - credit)
        IF v_has_financial_accounts AND v_bank_account_id IS NOT NULL THEN
            INSERT INTO account_transactions (
                account_id, business_id, type, amount, reference_type, reference_id,
                description, transaction_date, created_by
            )
            VALUES (
                v_bank_account_id, v_business_id, 'credit', 77000, 'sell', v_temp_id,
                'Sale - INV-202501-0003 (Bank)', CURRENT_TIMESTAMP - INTERVAL '2 days', v_user_id
            );
        END IF;
    END IF;
    
    -- Sale 4: Credit Sale (Due)
    INSERT INTO transactions (
        business_id, location_id, type, status, payment_status,
        contact_id, customer_type, invoice_no, transaction_date,
        total_before_tax, tax_amount, discount_amount, final_total, created_by
    )
    VALUES (
        v_business_id, v_location_id, 'sell', 'final', 'due',
        v_customer_ids[3], 'retail', 'INV-202501-0004', CURRENT_TIMESTAMP - INTERVAL '1 day',
        35000, 3500, 0, 38500, v_user_id
    )
    RETURNING id INTO v_temp_id;
    
    IF v_temp_id IS NOT NULL THEN
        v_sale_ids := array_append(v_sale_ids, v_temp_id);
        
        -- Get product_id from variation
        SELECT product_id INTO v_line_product_id FROM variations WHERE id = v_variation_ids[3];
        
        IF v_line_product_id IS NOT NULL THEN
            INSERT INTO transaction_sell_lines (
                transaction_id, variation_id, product_id, quantity, unit_id,
                unit_price, unit_price_inc_tax, line_discount_amount, item_tax, line_total
            )
            VALUES (
                v_temp_id, v_variation_ids[3], v_line_product_id, 1, v_unit_id,
                35000, 38500, 0, 3500, 38500
            );
        END IF;
    END IF;
    
    -- Sale 5: Partial Payment Sale
    INSERT INTO transactions (
        business_id, location_id, type, status, payment_status,
        contact_id, customer_type, invoice_no, transaction_date,
        total_before_tax, tax_amount, discount_amount, final_total, created_by
    )
    VALUES (
        v_business_id, v_location_id, 'sell', 'final', 'partial',
        v_customer_ids[1], 'retail', 'INV-202501-0005', CURRENT_TIMESTAMP,
        84000, 8400, 0, 92400, v_user_id
    )
    RETURNING id INTO v_temp_id;
    
    IF v_temp_id IS NOT NULL THEN
        v_sale_ids := array_append(v_sale_ids, v_temp_id);
        
        -- Get product_id from variation for first line
        SELECT product_id INTO v_line_product_id FROM variations WHERE id = v_variation_ids[4];
        
        IF v_line_product_id IS NOT NULL THEN
            INSERT INTO transaction_sell_lines (
                transaction_id, variation_id, product_id, quantity, unit_id,
                unit_price, unit_price_inc_tax, line_discount_amount, item_tax, line_total
            )
            VALUES (
                v_temp_id, v_variation_ids[4], v_line_product_id, 1, v_unit_id,
                40000, 44000, 0, 4000, 44000
            );
        END IF;
        
        -- Get product_id from variation for second line
        SELECT product_id INTO v_line_product_id FROM variations WHERE id = v_variation_ids[5];
        
        IF v_line_product_id IS NOT NULL THEN
            INSERT INTO transaction_sell_lines (
                transaction_id, variation_id, product_id, quantity, unit_id,
                unit_price, unit_price_inc_tax, line_discount_amount, item_tax, line_total
            )
            VALUES (
                v_temp_id, v_variation_ids[5], v_line_product_id, 1, v_unit_id,
                40000, 44000, 0, 4000, 44000
            );
        END IF;
        
        -- Create partial payment account transaction (Cash - credit)
        IF v_has_financial_accounts AND v_cash_account_id IS NOT NULL THEN
            INSERT INTO account_transactions (
                account_id, business_id, type, amount, reference_type, reference_id,
                description, transaction_date, created_by
            )
            VALUES (
                v_cash_account_id, v_business_id, 'credit', 50000, 'sell', v_temp_id,
                'Sale - INV-202501-0005 (Partial Cash)', CURRENT_TIMESTAMP, v_user_id
            );
        END IF;
    END IF;
    
    RAISE NOTICE '✅ Created % sales transactions', array_length(v_sale_ids, 1);
    
    -- ============================================
    -- STEP 8: CREATE RENTAL BOOKINGS
    -- ============================================
    IF v_has_rental_bookings AND array_length(v_product_ids, 1) > 0 AND array_length(v_variation_ids, 1) > 0 AND array_length(v_customer_ids, 1) > 0 THEN
        -- Rental 1: Reserved (Upcoming)
        -- Get product_id from variation
        SELECT product_id INTO v_line_product_id FROM variations WHERE id = v_variation_ids[1];
        
        IF v_line_product_id IS NOT NULL THEN
            INSERT INTO rental_bookings (
                business_id, contact_id, product_id, variation_id,
                pickup_date, return_date, rental_amount, security_deposit_amount, security_type,
                status, notes, created_by
            )
            VALUES (
                v_business_id, v_customer_ids[1], v_line_product_id, v_variation_ids[1],
                CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE + INTERVAL '5 days',
                15000, 50000, 'cash', 'reserved', 'Bridal event booking - Reserved', v_user_id
            )
            RETURNING id INTO v_temp_id;
        
            IF v_temp_id IS NOT NULL THEN
                v_rental_ids := array_append(v_rental_ids, v_temp_id);
            END IF;
        END IF;
        
        -- Rental 2: Out (Currently Rented - Payment Pending)
        -- Get product_id from variation
        SELECT product_id INTO v_line_product_id FROM variations WHERE id = v_variation_ids[2];
        
        IF v_line_product_id IS NOT NULL THEN
            INSERT INTO rental_bookings (
                business_id, contact_id, product_id, variation_id,
                pickup_date, return_date, rental_amount, security_deposit_amount, security_type,
                status, notes, created_by
            )
            VALUES (
                v_business_id, v_customer_ids[2], v_line_product_id, v_variation_ids[2],
                CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '3 days',
                12000, 40000, 'cash', 'out', 'Currently rented - Payment due', v_user_id
            )
            RETURNING id INTO v_temp_id;
        
            IF v_temp_id IS NOT NULL THEN
                v_rental_ids := array_append(v_rental_ids, v_temp_id);
            END IF;
        END IF;
        
        -- Rental 3: Returned (Fully Paid)
        -- Get product_id from variation
        SELECT product_id INTO v_line_product_id FROM variations WHERE id = v_variation_ids[3];
        
        IF v_line_product_id IS NOT NULL THEN
            INSERT INTO rental_bookings (
                business_id, contact_id, product_id, variation_id,
                pickup_date, return_date, actual_return_date,
                rental_amount, security_deposit_amount, security_type,
                status, penalty_amount, notes, created_by
            )
            VALUES (
                v_business_id, v_customer_ids[3], v_line_product_id, v_variation_ids[3],
                CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '5 days',
                10000, 35000, 'cash', 'returned', 0, 'Returned on time - Fully paid', v_user_id
            )
            RETURNING id INTO v_temp_id;
            
            IF v_temp_id IS NOT NULL THEN
                v_rental_ids := array_append(v_rental_ids, v_temp_id);
            END IF;
        END IF;
        
        RAISE NOTICE '✅ Created % rental bookings', array_length(v_rental_ids, 1);
    END IF;
    
    -- ============================================
    -- STEP 9: CREATE PRODUCTION ORDERS
    -- ============================================
    IF v_has_production_orders AND array_length(v_customer_ids, 1) > 0 AND array_length(v_vendor_ids, 1) > 0 THEN
        -- Production Order 1: New (Assigned to Tailor)
        -- Check if order already exists
        SELECT id INTO v_temp_id FROM production_orders 
        WHERE business_id = v_business_id AND order_no = 'PROD-202501-0001';
        
        IF v_temp_id IS NULL THEN
            IF v_has_assigned_vendor_id THEN
                INSERT INTO production_orders (
                    business_id, order_no, customer_id,
                    status, deadline_date,
                    total_cost, final_price, description, assigned_vendor_id, created_by
                )
                VALUES (
                    v_business_id, 'PROD-202501-0001', v_customer_ids[1],
                    'new', CURRENT_DATE + INTERVAL '7 days',
                    20000, 30000, 'Custom bridal gown order - Pending at Tailor', v_vendor_ids[1], v_user_id
                )
                RETURNING id INTO v_temp_id;
            ELSE
                INSERT INTO production_orders (
                    business_id, order_no, customer_id,
                    status, deadline_date,
                    total_cost, final_price, description, created_by
                )
                VALUES (
                    v_business_id, 'PROD-202501-0001', v_customer_ids[1],
                    'new', CURRENT_DATE + INTERVAL '7 days',
                    20000, 30000, 'Custom bridal gown order - Pending at Tailor', v_user_id
                )
                RETURNING id INTO v_temp_id;
            END IF;
        END IF;
        
        IF v_temp_id IS NOT NULL THEN
            v_production_ids := array_append(v_production_ids, v_temp_id);
        END IF;
        
        -- Production Order 2: Dyeing (Assigned to Dyer)
        -- Check if order already exists
        SELECT id INTO v_temp_id FROM production_orders 
        WHERE business_id = v_business_id AND order_no = 'PROD-202501-0002';
        
        IF v_temp_id IS NULL THEN
            IF v_has_assigned_vendor_id THEN
                INSERT INTO production_orders (
                    business_id, order_no, customer_id,
                    status, deadline_date,
                    total_cost, final_price, description, assigned_vendor_id, created_by
                )
                VALUES (
                    v_business_id, 'PROD-202501-0002', v_customer_ids[2],
                    'dyeing', CURRENT_DATE + INTERVAL '5 days',
                    18000, 28000, 'Lehenga in production - At Dyer', v_supplier_ids[1], v_user_id
                )
                RETURNING id INTO v_temp_id;
            ELSE
                INSERT INTO production_orders (
                    business_id, order_no, customer_id,
                    status, deadline_date,
                    total_cost, final_price, description, created_by
                )
                VALUES (
                    v_business_id, 'PROD-202501-0002', v_customer_ids[2],
                    'dyeing', CURRENT_DATE + INTERVAL '5 days',
                    18000, 28000, 'Lehenga in production - At Dyer', v_user_id
                )
                RETURNING id INTO v_temp_id;
            END IF;
        END IF;
        
        IF v_temp_id IS NOT NULL THEN
            v_production_ids := array_append(v_production_ids, v_temp_id);
        END IF;
        
        -- Production Order 3: Stitching (Assigned to Tailor)
        -- Check if order already exists
        SELECT id INTO v_temp_id FROM production_orders 
        WHERE business_id = v_business_id AND order_no = 'PROD-202501-0003';
        
        IF v_temp_id IS NULL THEN
            IF v_has_assigned_vendor_id THEN
                INSERT INTO production_orders (
                    business_id, order_no, customer_id,
                    status, deadline_date,
                    total_cost, final_price, description, assigned_vendor_id, created_by
                )
                VALUES (
                    v_business_id, 'PROD-202501-0003', v_customer_ids[3],
                    'stitching', CURRENT_DATE + INTERVAL '3 days',
                    22000, 32000, 'Sherwani stitching - At Tailor', v_vendor_ids[1], v_user_id
                )
                RETURNING id INTO v_temp_id;
            ELSE
                INSERT INTO production_orders (
                    business_id, order_no, customer_id,
                    status, deadline_date,
                    total_cost, final_price, description, created_by
                )
                VALUES (
                    v_business_id, 'PROD-202501-0003', v_customer_ids[3],
                    'stitching', CURRENT_DATE + INTERVAL '3 days',
                    22000, 32000, 'Sherwani stitching - At Tailor', v_user_id
                )
                RETURNING id INTO v_temp_id;
            END IF;
        END IF;
        
        IF v_temp_id IS NOT NULL THEN
            v_production_ids := array_append(v_production_ids, v_temp_id);
        END IF;
        
        -- Production Order 4: Handwork (Assigned to Handwork Specialist)
        -- Check if order already exists
        SELECT id INTO v_temp_id FROM production_orders 
        WHERE business_id = v_business_id AND order_no = 'PROD-202501-0004';
        
        IF v_temp_id IS NULL THEN
            IF v_has_assigned_vendor_id THEN
                INSERT INTO production_orders (
                    business_id, order_no, customer_id,
                    status, deadline_date,
                    total_cost, final_price, description, assigned_vendor_id, created_by
                )
                VALUES (
                    v_business_id, 'PROD-202501-0004', v_customer_ids[1],
                    'handwork', CURRENT_DATE + INTERVAL '4 days',
                    15000, 25000, 'Embroidery work - At Handwork Specialist', v_vendor_ids[2], v_user_id
                )
                RETURNING id INTO v_temp_id;
            ELSE
                INSERT INTO production_orders (
                    business_id, order_no, customer_id,
                    status, deadline_date,
                    total_cost, final_price, description, created_by
                )
                VALUES (
                    v_business_id, 'PROD-202501-0004', v_customer_ids[1],
                    'handwork', CURRENT_DATE + INTERVAL '4 days',
                    15000, 25000, 'Embroidery work - At Handwork Specialist', v_user_id
                )
                RETURNING id INTO v_temp_id;
            END IF;
        END IF;
        
        IF v_temp_id IS NOT NULL THEN
            v_production_ids := array_append(v_production_ids, v_temp_id);
        END IF;
        
        RAISE NOTICE '✅ Created % production orders', array_length(v_production_ids, 1);
    END IF;
    
    -- ============================================
    -- STEP 10: SUMMARY
    -- ============================================
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ COMPREHENSIVE DEMO DATA CREATED!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '  - Products: %', array_length(v_product_ids, 1);
    RAISE NOTICE '  - Variations: %', array_length(v_variation_ids, 1);
    RAISE NOTICE '  - Customers: %', array_length(v_customer_ids, 1);
    RAISE NOTICE '  - Suppliers: %', array_length(v_supplier_ids, 1);
    RAISE NOTICE '  - Vendors: %', array_length(v_vendor_ids, 1);
    RAISE NOTICE '  - Purchases: % (Cash: 1, Bank: 1, Due: 1)', array_length(v_purchase_ids, 1);
    RAISE NOTICE '  - Sales: % (POS Cash: 1, Cash: 1, Bank: 1, Credit: 1, Partial: 1)', array_length(v_sale_ids, 1);
    RAISE NOTICE '  - Rentals: % (Reserved: 1, Out: 1, Returned: 1)', array_length(v_rental_ids, 1);
    RAISE NOTICE '  - Production Orders: % (New: 1, Dyeing: 1, Stitching: 1, Handwork: 1)', array_length(v_production_ids, 1);
    RAISE NOTICE '============================================';
    RAISE NOTICE 'All transactions are linked with:';
    RAISE NOTICE '  - Invoice Numbers (INV-202501-XXXX)';
    RAISE NOTICE '  - Purchase Ref Numbers (PUR-202501-XXXX)';
    RAISE NOTICE '  - Production Order Numbers (PROD-202501-XXXX)';
    RAISE NOTICE '  - SKUs and Sub-SKUs';
    RAISE NOTICE '  - Account Transactions';
    RAISE NOTICE '  - Payment Statuses (Paid, Due, Partial)';
    RAISE NOTICE '============================================';
    
END $$;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
SELECT 
    'Demo Data Status' as status,
    (SELECT COUNT(*) FROM financial_accounts WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com'))) as accounts,
    (SELECT COUNT(*) FROM contacts WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com'))) as contacts,
    (SELECT COUNT(*) FROM products WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com'))) as products,
    (SELECT COUNT(*) FROM transactions WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com')) AND type = 'sell') as sales,
    (SELECT COUNT(*) FROM transactions WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com')) AND type = 'purchase') as purchases,
    (SELECT COUNT(*) FROM rental_bookings WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com'))) as rentals,
    (SELECT COUNT(*) FROM production_orders WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com'))) as production_orders,
    (SELECT COUNT(*) FROM account_transactions WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com'))) as account_transactions,
    (SELECT COALESCE(SUM(current_balance), 0) FROM financial_accounts WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ndm313@yahoo.com'))) as total_balance;

