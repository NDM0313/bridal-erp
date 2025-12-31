-- ============================================
-- DEMO DATA INSERT SCRIPT
-- Populates Supabase database with realistic demo data for visual testing
-- ============================================
-- 
-- USAGE: 
-- 1. Run this in Supabase SQL Editor
-- 2. OPTION A: If auth.uid() works, the script will auto-detect your business_id
-- 3. OPTION B: If auth.uid() returns NULL, manually set v_user_id and v_business_id below
-- ============================================

-- ============================================
-- MANUAL CONFIGURATION (If auth.uid() doesn't work)
-- ============================================
-- Uncomment and set these values if you get "auth.uid() returned NULL" error:
-- 
-- 1. Get your user_id from Supabase Auth:
--    - Go to Authentication > Users
--    - Copy your User UID
--
-- 2. Get your business_id:
--    - Run: SELECT id, name FROM businesses;
--    - Or: SELECT business_id FROM user_profiles WHERE user_id = 'your-user-uuid';
--
-- Then uncomment and set:
-- v_user_id := 'your-user-uuid-here'::UUID;
-- v_business_id := 1;  -- Replace with your actual business_id
-- ============================================

-- ============================================
-- STEP 1: GET BUSINESS ID AND USER ID
-- ============================================
DO $$
DECLARE
    v_business_id INTEGER;
    v_user_id UUID;
    v_location_id INTEGER;
    v_unit_id INTEGER;
    v_category_id INTEGER;
    v_brand_id INTEGER;
    
    -- Product IDs
    v_product_ids INTEGER[] := ARRAY[]::INTEGER[];
    v_variation_ids INTEGER[] := ARRAY[]::INTEGER[];
    
    -- Contact IDs
    v_customer_ids INTEGER[] := ARRAY[]::INTEGER[];
    v_supplier_ids INTEGER[] := ARRAY[]::INTEGER[];
    
    -- Account IDs
    v_cash_account_id INTEGER;
    v_bank_account_id INTEGER;
    
    -- Transaction IDs
    v_transaction_ids INTEGER[] := ARRAY[]::INTEGER[];
    
    -- Production Order IDs
    v_production_order_ids INTEGER[] := ARRAY[]::INTEGER[];
    
    -- Temporary variables
    v_temp_id INTEGER;
    v_temp_variation_id INTEGER;
    v_invoice_counter INTEGER;
BEGIN
    -- Try to get current user ID from auth context
    v_user_id := auth.uid();
    
    -- If auth.uid() returns NULL, you need to manually set these values
    -- Uncomment and set the lines below:
    -- v_user_id := 'your-user-uuid-here'::UUID;
    -- v_business_id := 1;  -- Replace with your actual business_id
    
    IF v_user_id IS NULL THEN
        -- Try to get first user from user_profiles as fallback
        SELECT user_id, business_id INTO v_user_id, v_business_id
        FROM user_profiles
        LIMIT 1;
        
        IF v_user_id IS NULL OR v_business_id IS NULL THEN
            RAISE EXCEPTION 'Could not determine user_id or business_id. Please manually set v_user_id and v_business_id in the script (see instructions at top of file).';
        END IF;
        
        RAISE NOTICE 'Using fallback: user_id = %, business_id = %', v_user_id, v_business_id;
    ELSE
        -- Get business_id from user_profiles
        SELECT business_id INTO v_business_id
        FROM user_profiles
        WHERE user_id = v_user_id
        LIMIT 1;
        
        IF v_business_id IS NULL THEN
            -- Try to get first business as fallback
            SELECT id INTO v_business_id
            FROM businesses
            LIMIT 1;
            
            IF v_business_id IS NULL THEN
                RAISE EXCEPTION 'No business found. Please create a business first or manually set v_business_id in the script.';
            END IF;
            
            RAISE NOTICE 'Using fallback business_id: %', v_business_id;
        END IF;
    END IF;
    
    -- Get or create default location
    SELECT id INTO v_location_id
    FROM business_locations
    WHERE business_id = v_business_id
    LIMIT 1;
    
    IF v_location_id IS NULL THEN
        INSERT INTO business_locations (business_id, name, city, country)
        VALUES (v_business_id, 'Main Store', 'Lahore', 'Pakistan')
        RETURNING id INTO v_location_id;
    END IF;
    
    -- Get or create base unit (Pieces)
    SELECT id INTO v_unit_id
    FROM units
    WHERE business_id = v_business_id AND actual_name = 'Pieces'
    LIMIT 1;
    
    IF v_unit_id IS NULL THEN
        INSERT INTO units (business_id, actual_name, short_name, allow_decimal)
        VALUES (v_business_id, 'Pieces', 'Pcs', false)
        RETURNING id INTO v_unit_id;
    END IF;
    
    -- Get or create category
    SELECT id INTO v_category_id
    FROM categories
    WHERE business_id = v_business_id AND name = 'Bridal Wear'
    LIMIT 1;
    
    IF v_category_id IS NULL THEN
        INSERT INTO categories (business_id, name, category_type)
        VALUES (v_business_id, 'Bridal Wear', 'product')
        RETURNING id INTO v_category_id;
    END IF;
    
    -- Get or create brand
    SELECT id INTO v_brand_id
    FROM brands
    WHERE business_id = v_business_id AND name = 'Din Collection'
    LIMIT 1;
    
    IF v_brand_id IS NULL THEN
        INSERT INTO brands (business_id, name)
        VALUES (v_business_id, 'Din Collection')
        RETURNING id INTO v_brand_id;
    END IF;
    
    RAISE NOTICE 'Using Business ID: %, Location ID: %, Unit ID: %', v_business_id, v_location_id, v_unit_id;
    
    -- ============================================
    -- STEP 2: INSERT PRODUCTS (10 items)
    -- ============================================
    
    -- Product 1: Red Bridal Lehenga
    INSERT INTO products (
        business_id, name, type, unit_id, category_id, brand_id,
        sku, enable_stock, alert_quantity, is_rentable, rental_price,
        security_deposit_amount, rent_duration_unit, created_by
    ) VALUES (
        v_business_id, 'Red Bridal Lehenga', 'single', v_unit_id, v_category_id, v_brand_id,
        'LEH-RED-001', true, 5, true, 15000.00, 50000.00, 'day', v_user_id
    ) RETURNING id INTO v_temp_id;
    v_product_ids := array_append(v_product_ids, v_temp_id);
    
    -- Variation for Red Bridal Lehenga
    INSERT INTO variations (
        product_id, name, sub_sku, retail_price, wholesale_price,
        default_purchase_price, dpp_inc_tax
    ) VALUES (
        v_temp_id, 'Default', 'LEH-RED-001-V1', 85000.00, 75000.00, 45000.00, 45000.00
    ) RETURNING id INTO v_temp_variation_id;
    v_variation_ids := array_append(v_variation_ids, v_temp_variation_id);
    
    -- Stock for Red Bridal Lehenga (Low stock: 3 pieces)
    INSERT INTO variation_location_details (variation_id, product_id, location_id, qty_available)
    VALUES (v_temp_variation_id, v_temp_id, v_location_id, 3)
    ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 3;
    
    -- Product 2: Gold Bridal Lehenga
    INSERT INTO products (
        business_id, name, type, unit_id, category_id, brand_id,
        sku, enable_stock, alert_quantity, is_rentable, rental_price,
        security_deposit_amount, rent_duration_unit, created_by
    ) VALUES (
        v_business_id, 'Gold Bridal Lehenga', 'single', v_unit_id, v_category_id, v_brand_id,
        'LEH-GOLD-002', true, 5, true, 18000.00, 60000.00, 'day', v_user_id
    ) RETURNING id INTO v_temp_id;
    v_product_ids := array_append(v_product_ids, v_temp_id);
    
    INSERT INTO variations (
        product_id, name, sub_sku, retail_price, wholesale_price,
        default_purchase_price, dpp_inc_tax
    ) VALUES (
        v_temp_id, 'Default', 'LEH-GOLD-002-V1', 95000.00, 85000.00, 50000.00, 50000.00
    ) RETURNING id INTO v_temp_variation_id;
    v_variation_ids := array_append(v_variation_ids, v_temp_variation_id);
    
    INSERT INTO variation_location_details (variation_id, product_id, location_id, qty_available)
    VALUES (v_temp_variation_id, v_temp_id, v_location_id, 8)
    ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 8;
    
    -- Product 3: Maroon Bridal Lehenga (Low stock)
    INSERT INTO products (
        business_id, name, type, unit_id, category_id, brand_id,
        sku, enable_stock, alert_quantity, is_rentable, rental_price,
        security_deposit_amount, rent_duration_unit, created_by
    ) VALUES (
        v_business_id, 'Maroon Bridal Lehenga', 'single', v_unit_id, v_category_id, v_brand_id,
        'LEH-MAR-003', true, 5, true, 12000.00, 40000.00, 'day', v_user_id
    ) RETURNING id INTO v_temp_id;
    v_product_ids := array_append(v_product_ids, v_temp_id);
    
    INSERT INTO variations (
        product_id, name, sub_sku, retail_price, wholesale_price,
        default_purchase_price, dpp_inc_tax
    ) VALUES (
        v_temp_id, 'Default', 'LEH-MAR-003-V1', 75000.00, 65000.00, 35000.00, 35000.00
    ) RETURNING id INTO v_temp_variation_id;
    v_variation_ids := array_append(v_variation_ids, v_temp_variation_id);
    
    INSERT INTO variation_location_details (variation_id, product_id, location_id, qty_available)
    VALUES (v_temp_variation_id, v_temp_id, v_location_id, 2)
    ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 2;
    
    -- Product 4: Grooms Sherwani - Black
    INSERT INTO products (
        business_id, name, type, unit_id, category_id, brand_id,
        sku, enable_stock, alert_quantity, is_rentable, rental_price,
        security_deposit_amount, rent_duration_unit, created_by
    ) VALUES (
        v_business_id, 'Grooms Sherwani - Black', 'single', v_unit_id, v_category_id, v_brand_id,
        'SHW-BLK-004', true, 3, true, 8000.00, 25000.00, 'day', v_user_id
    ) RETURNING id INTO v_temp_id;
    v_product_ids := array_append(v_product_ids, v_temp_id);
    
    INSERT INTO variations (
        product_id, name, sub_sku, retail_price, wholesale_price,
        default_purchase_price, dpp_inc_tax
    ) VALUES (
        v_temp_id, 'Default', 'SHW-BLK-004-V1', 45000.00, 40000.00, 20000.00, 20000.00
    ) RETURNING id INTO v_temp_variation_id;
    v_variation_ids := array_append(v_variation_ids, v_temp_variation_id);
    
    INSERT INTO variation_location_details (variation_id, product_id, location_id, qty_available)
    VALUES (v_temp_variation_id, v_temp_id, v_location_id, 15)
    ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 15;
    
    -- Product 5: Grooms Sherwani - White
    INSERT INTO products (
        business_id, name, type, unit_id, category_id, brand_id,
        sku, enable_stock, alert_quantity, is_rentable, rental_price,
        security_deposit_amount, rent_duration_unit, created_by
    ) VALUES (
        v_business_id, 'Grooms Sherwani - White', 'single', v_unit_id, v_category_id, v_brand_id,
        'SHW-WHT-005', true, 3, true, 8000.00, 25000.00, 'day', v_user_id
    ) RETURNING id INTO v_temp_id;
    v_product_ids := array_append(v_product_ids, v_temp_id);
    
    INSERT INTO variations (
        product_id, name, sub_sku, retail_price, wholesale_price,
        default_purchase_price, dpp_inc_tax
    ) VALUES (
        v_temp_id, 'Default', 'SHW-WHT-005-V1', 45000.00, 40000.00, 20000.00, 20000.00
    ) RETURNING id INTO v_temp_variation_id;
    v_variation_ids := array_append(v_variation_ids, v_temp_variation_id);
    
    INSERT INTO variation_location_details (variation_id, product_id, location_id, qty_available)
    VALUES (v_temp_variation_id, v_temp_id, v_location_id, 12)
    ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 12;
    
    -- Product 6: Grooms Sherwani - Gold
    INSERT INTO products (
        business_id, name, type, unit_id, category_id, brand_id,
        sku, enable_stock, alert_quantity, is_rentable, rental_price,
        security_deposit_amount, rent_duration_unit, created_by
    ) VALUES (
        v_business_id, 'Grooms Sherwani - Gold', 'single', v_unit_id, v_category_id, v_brand_id,
        'SHW-GLD-006', true, 3, true, 10000.00, 30000.00, 'day', v_user_id
    ) RETURNING id INTO v_temp_id;
    v_product_ids := array_append(v_product_ids, v_temp_id);
    
    INSERT INTO variations (
        product_id, name, sub_sku, retail_price, wholesale_price,
        default_purchase_price, dpp_inc_tax
    ) VALUES (
        v_temp_id, 'Default', 'SHW-GLD-006-V1', 55000.00, 50000.00, 25000.00, 25000.00
    ) RETURNING id INTO v_temp_variation_id;
    v_variation_ids := array_append(v_variation_ids, v_temp_variation_id);
    
    INSERT INTO variation_location_details (variation_id, product_id, location_id, qty_available)
    VALUES (v_temp_variation_id, v_temp_id, v_location_id, 4)
    ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 4;
    
    -- Product 7: Bridal Dupatta - Red
    INSERT INTO products (
        business_id, name, type, unit_id, category_id, brand_id,
        sku, enable_stock, alert_quantity, created_by
    ) VALUES (
        v_business_id, 'Bridal Dupatta - Red', 'single', v_unit_id, v_category_id, v_brand_id,
        'DUP-RED-007', true, 10, v_user_id
    ) RETURNING id INTO v_temp_id;
    v_product_ids := array_append(v_product_ids, v_temp_id);
    
    INSERT INTO variations (
        product_id, name, sub_sku, retail_price, wholesale_price,
        default_purchase_price, dpp_inc_tax
    ) VALUES (
        v_temp_id, 'Default', 'DUP-RED-007-V1', 15000.00, 12000.00, 6000.00, 6000.00
    ) RETURNING id INTO v_temp_variation_id;
    v_variation_ids := array_append(v_variation_ids, v_temp_variation_id);
    
    INSERT INTO variation_location_details (variation_id, product_id, location_id, qty_available)
    VALUES (v_temp_variation_id, v_temp_id, v_location_id, 25)
    ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 25;
    
    -- Product 8: Bridal Dupatta - Gold (Low stock)
    INSERT INTO products (
        business_id, name, type, unit_id, category_id, brand_id,
        sku, enable_stock, alert_quantity, created_by
    ) VALUES (
        v_business_id, 'Bridal Dupatta - Gold', 'single', v_unit_id, v_category_id, v_brand_id,
        'DUP-GLD-008', true, 10, v_user_id
    ) RETURNING id INTO v_temp_id;
    v_product_ids := array_append(v_product_ids, v_temp_id);
    
    INSERT INTO variations (
        product_id, name, sub_sku, retail_price, wholesale_price,
        default_purchase_price, dpp_inc_tax
    ) VALUES (
        v_temp_id, 'Default', 'DUP-GLD-008-V1', 18000.00, 15000.00, 8000.00, 8000.00
    ) RETURNING id INTO v_temp_variation_id;
    v_variation_ids := array_append(v_variation_ids, v_temp_variation_id);
    
    INSERT INTO variation_location_details (variation_id, product_id, location_id, qty_available)
    VALUES (v_temp_variation_id, v_temp_id, v_location_id, 7)
    ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 7;
    
    -- Product 9: Bridal Jewelry Set
    INSERT INTO products (
        business_id, name, type, unit_id, category_id, brand_id,
        sku, enable_stock, alert_quantity, created_by
    ) VALUES (
        v_business_id, 'Bridal Jewelry Set', 'single', v_unit_id, v_category_id, v_brand_id,
        'JWL-SET-009', true, 5, v_user_id
    ) RETURNING id INTO v_temp_id;
    v_product_ids := array_append(v_product_ids, v_temp_id);
    
    INSERT INTO variations (
        product_id, name, sub_sku, retail_price, wholesale_price,
        default_purchase_price, dpp_inc_tax
    ) VALUES (
        v_temp_id, 'Default', 'JWL-SET-009-V1', 25000.00, 22000.00, 12000.00, 12000.00
    ) RETURNING id INTO v_temp_variation_id;
    v_variation_ids := array_append(v_variation_ids, v_temp_variation_id);
    
    INSERT INTO variation_location_details (variation_id, product_id, location_id, qty_available)
    VALUES (v_temp_variation_id, v_temp_id, v_location_id, 18)
    ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 18;
    
    -- Product 10: Bridal Shoes - Red (Low stock)
    INSERT INTO products (
        business_id, name, type, unit_id, category_id, brand_id,
        sku, enable_stock, alert_quantity, created_by
    ) VALUES (
        v_business_id, 'Bridal Shoes - Red', 'single', v_unit_id, v_category_id, v_brand_id,
        'SHO-RED-010', true, 8, v_user_id
    ) RETURNING id INTO v_temp_id;
    v_product_ids := array_append(v_product_ids, v_temp_id);
    
    INSERT INTO variations (
        product_id, name, sub_sku, retail_price, wholesale_price,
        default_purchase_price, dpp_inc_tax
    ) VALUES (
        v_temp_id, 'Default', 'SHO-RED-010-V1', 8000.00, 7000.00, 3500.00, 3500.00
    ) RETURNING id INTO v_temp_variation_id;
    v_variation_ids := array_append(v_variation_ids, v_temp_variation_id);
    
    INSERT INTO variation_location_details (variation_id, product_id, location_id, qty_available)
    VALUES (v_temp_variation_id, v_temp_id, v_location_id, 6)
    ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 6;
    
    RAISE NOTICE 'Inserted 10 products with variations and stock';
    
    -- ============================================
    -- STEP 3: INSERT CONTACTS (5 Customers + 3 Suppliers)
    -- ============================================
    
    -- Customer 1: Retail Customer
    INSERT INTO contacts (business_id, type, name, mobile, email, customer_type, created_by)
    VALUES (v_business_id, 'customer', 'Mrs. Fatima Ahmed', '+92 300 1234567', 'fatima@example.com', 'retail', v_user_id)
    RETURNING id INTO v_temp_id;
    v_customer_ids := array_append(v_customer_ids, v_temp_id);
    
    -- Customer 2: Retail Customer
    INSERT INTO contacts (business_id, type, name, mobile, email, customer_type, created_by)
    VALUES (v_business_id, 'customer', 'Ms. Ayesha Khan', '+92 321 2345678', 'ayesha@example.com', 'retail', v_user_id)
    RETURNING id INTO v_temp_id;
    v_customer_ids := array_append(v_customer_ids, v_temp_id);
    
    -- Customer 3: Wholesale Customer
    INSERT INTO contacts (business_id, type, name, mobile, email, customer_type, created_by)
    VALUES (v_business_id, 'customer', 'Bridal Boutique', '+92 333 3456789', 'boutique@example.com', 'wholesale', v_user_id)
    RETURNING id INTO v_temp_id;
    v_customer_ids := array_append(v_customer_ids, v_temp_id);
    
    -- Customer 4: Wholesale Customer
    INSERT INTO contacts (business_id, type, name, mobile, email, customer_type, created_by)
    VALUES (v_business_id, 'customer', 'Ali Textiles', '+92 300 4567890', 'ali@textiles.com', 'wholesale', v_user_id)
    RETURNING id INTO v_temp_id;
    v_customer_ids := array_append(v_customer_ids, v_temp_id);
    
    -- Customer 5: Retail Customer
    INSERT INTO contacts (business_id, type, name, mobile, email, customer_type, created_by)
    VALUES (v_business_id, 'customer', 'Mrs. Zara Ahmed', '+92 321 5678901', 'zara@example.com', 'retail', v_user_id)
    RETURNING id INTO v_temp_id;
    v_customer_ids := array_append(v_customer_ids, v_temp_id);
    
    -- Supplier 1: Fabric Supplier
    INSERT INTO contacts (business_id, type, name, mobile, email, created_by)
    VALUES (v_business_id, 'supplier', 'Silk Traders', '+92 300 7778888', 'purchase@silktraders.com', v_user_id)
    RETURNING id INTO v_temp_id;
    v_supplier_ids := array_append(v_supplier_ids, v_temp_id);
    
    -- Supplier 2: Dyeing Vendor
    INSERT INTO contacts (business_id, type, name, mobile, email, created_by)
    VALUES (v_business_id, 'supplier', 'Ali Dyer', '+92 300 1112222', 'ali@dyer.com', v_user_id)
    RETURNING id INTO v_temp_id;
    v_supplier_ids := array_append(v_supplier_ids, v_temp_id);
    
    -- Supplier 3: Tailor Vendor
    INSERT INTO contacts (business_id, type, name, mobile, email, created_by)
    VALUES (v_business_id, 'supplier', 'Master Sahab', '+92 321 3334444', 'master@tailor.com', v_user_id)
    RETURNING id INTO v_temp_id;
    v_supplier_ids := array_append(v_supplier_ids, v_temp_id);
    
    RAISE NOTICE 'Inserted 5 customers and 3 suppliers';
    
    -- ============================================
    -- STEP 4: INSERT FINANCIAL ACCOUNTS
    -- ============================================
    
    -- Cash Till Account
    INSERT INTO financial_accounts (
        business_id, name, type, current_balance, opening_balance, created_by
    ) VALUES (
        v_business_id, 'Cash Till', 'cash', 50000.00, 50000.00, v_user_id
    ) ON CONFLICT (business_id, name) DO UPDATE SET
        current_balance = 50000.00,
        opening_balance = 50000.00
    RETURNING id INTO v_cash_account_id;
    
    -- Meezan Bank Account
    INSERT INTO financial_accounts (
        business_id, name, type, bank_name, account_number, current_balance, opening_balance, created_by
    ) VALUES (
        v_business_id, 'Meezan Bank', 'bank', 'Meezan Bank', 'PK12MEZN0001234567890123', 150000.00, 150000.00, v_user_id
    ) ON CONFLICT (business_id, name) DO UPDATE SET
        current_balance = 150000.00,
        opening_balance = 150000.00
    RETURNING id INTO v_bank_account_id;
    
    RAISE NOTICE 'Inserted financial accounts: Cash Till (%), Meezan Bank (%)', v_cash_account_id, v_bank_account_id;
    
    -- ============================================
    -- STEP 5: INSERT SALES TRANSACTIONS (5 recent sales)
    -- ============================================
    
    -- Get starting invoice number
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_no FROM 5) AS INTEGER)), 0) + 1
    INTO v_invoice_counter
    FROM transactions
    WHERE business_id = v_business_id AND invoice_no LIKE 'INV-%';
    
    -- Sale 1: Recent retail sale
    INSERT INTO transactions (
        business_id, location_id, type, status, contact_id, customer_type,
        invoice_no, transaction_date, final_total, paid_amount, created_by
    ) VALUES (
        v_business_id, v_location_id, 'sell', 'final', v_customer_ids[1], 'retail',
        'INV-' || LPAD(v_invoice_counter::TEXT, 6, '0'),
        CURRENT_DATE - INTERVAL '2 days', 85000.00, 85000.00, v_user_id
    ) RETURNING id INTO v_temp_id;
    v_transaction_ids := array_append(v_transaction_ids, v_temp_id);
    v_invoice_counter := v_invoice_counter + 1;
    
    -- Sale 2: Recent retail sale
    INSERT INTO transactions (
        business_id, location_id, type, status, contact_id, customer_type,
        invoice_no, transaction_date, final_total, paid_amount, created_by
    ) VALUES (
        v_business_id, v_location_id, 'sell', 'final', v_customer_ids[2], 'retail',
        'INV-' || LPAD(v_invoice_counter::TEXT, 6, '0'),
        CURRENT_DATE - INTERVAL '1 day', 95000.00, 50000.00, v_user_id
    ) RETURNING id INTO v_temp_id;
    v_transaction_ids := array_append(v_transaction_ids, v_temp_id);
    v_invoice_counter := v_invoice_counter + 1;
    
    -- Sale 3: Wholesale sale
    INSERT INTO transactions (
        business_id, location_id, type, status, contact_id, customer_type,
        invoice_no, transaction_date, final_total, paid_amount, created_by
    ) VALUES (
        v_business_id, v_location_id, 'sell', 'final', v_customer_ids[3], 'wholesale',
        'INV-' || LPAD(v_invoice_counter::TEXT, 6, '0'),
        CURRENT_DATE - INTERVAL '3 days', 150000.00, 150000.00, v_user_id
    ) RETURNING id INTO v_temp_id;
    v_transaction_ids := array_append(v_transaction_ids, v_temp_id);
    v_invoice_counter := v_invoice_counter + 1;
    
    -- Sale 4: Recent retail sale
    INSERT INTO transactions (
        business_id, location_id, type, status, contact_id, customer_type,
        invoice_no, transaction_date, final_total, paid_amount, created_by
    ) VALUES (
        v_business_id, v_location_id, 'sell', 'final', v_customer_ids[5], 'retail',
        'INV-' || LPAD(v_invoice_counter::TEXT, 6, '0'),
        CURRENT_DATE, 75000.00, 75000.00, v_user_id
    ) RETURNING id INTO v_temp_id;
    v_transaction_ids := array_append(v_transaction_ids, v_temp_id);
    v_invoice_counter := v_invoice_counter + 1;
    
    -- Sale 5: Wholesale sale (will be updated with correct total after line items)
    INSERT INTO transactions (
        business_id, location_id, type, status, contact_id, customer_type,
        invoice_no, transaction_date, final_total, paid_amount, created_by
    ) VALUES (
        v_business_id, v_location_id, 'sell', 'final', v_customer_ids[4], 'wholesale',
        'INV-' || LPAD(v_invoice_counter::TEXT, 6, '0'),
        CURRENT_DATE - INTERVAL '5 days', 214000.00, 100000.00, v_user_id
    ) RETURNING id INTO v_temp_id;
    v_transaction_ids := array_append(v_transaction_ids, v_temp_id);
    
    -- Insert transaction sell lines for each sale
    -- Sale 1: Red Bridal Lehenga
    INSERT INTO transaction_sell_lines (
        transaction_id, product_id, variation_id, quantity, unit_id,
        unit_price, unit_price_inc_tax, line_total
    ) VALUES (
        v_transaction_ids[1], v_product_ids[1], v_variation_ids[1], 1, v_unit_id,
        85000.00, 85000.00, 85000.00
    );
    
    -- Sale 2: Gold Bridal Lehenga
    INSERT INTO transaction_sell_lines (
        transaction_id, product_id, variation_id, quantity, unit_id,
        unit_price, unit_price_inc_tax, line_total
    ) VALUES (
        v_transaction_ids[2], v_product_ids[2], v_variation_ids[2], 1, v_unit_id,
        95000.00, 95000.00, 95000.00
    );
    
    -- Sale 3: Wholesale - Multiple items
    INSERT INTO transaction_sell_lines (
        transaction_id, product_id, variation_id, quantity, unit_id,
        unit_price, unit_price_inc_tax, line_total
    ) VALUES (
        v_transaction_ids[3], v_product_ids[1], v_variation_ids[1], 2, v_unit_id,
        75000.00, 75000.00, 150000.00
    );
    
    -- Sale 4: Maroon Bridal Lehenga
    INSERT INTO transaction_sell_lines (
        transaction_id, product_id, variation_id, quantity, unit_id,
        unit_price, unit_price_inc_tax, line_total
    ) VALUES (
        v_transaction_ids[4], v_product_ids[3], v_variation_ids[3], 1, v_unit_id,
        75000.00, 75000.00, 75000.00
    );
    
    -- Sale 5: Wholesale - Multiple items
    INSERT INTO transaction_sell_lines (
        transaction_id, product_id, variation_id, quantity, unit_id,
        unit_price, unit_price_inc_tax, line_total
    ) VALUES (
        v_transaction_ids[5], v_product_ids[2], v_variation_ids[2], 2, v_unit_id,
        85000.00, 85000.00, 170000.00
    );
    
    -- Add accessories to sale 5 (Jewelry Set - product index 9, array index 9)
    INSERT INTO transaction_sell_lines (
        transaction_id, product_id, variation_id, quantity, unit_id,
        unit_price, unit_price_inc_tax, line_total
    ) VALUES (
        v_transaction_ids[5], v_product_ids[9], v_variation_ids[9], 2, v_unit_id,
        22000.00, 22000.00, 44000.00
    );
    
    RAISE NOTICE 'Inserted 5 sales transactions with line items';
    
    -- ============================================
    -- STEP 6: INSERT RENTAL BOOKINGS (3 active rentals)
    -- ============================================
    
    -- Rental 1: Active (out)
    INSERT INTO rental_bookings (
        business_id, contact_id, product_id, variation_id,
        booking_date, pickup_date, return_date, status,
        rental_amount, security_deposit_amount, security_type, created_by
    ) VALUES (
        v_business_id, v_customer_ids[1], v_product_ids[1], v_variation_ids[1],
        CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '2 days', 'out',
        15000.00, 50000.00, 'cash', v_user_id
    );
    
    -- Rental 2: Reserved (upcoming)
    INSERT INTO rental_bookings (
        business_id, contact_id, product_id, variation_id,
        booking_date, pickup_date, return_date, status,
        rental_amount, security_deposit_amount, security_type, created_by
    ) VALUES (
        v_business_id, v_customer_ids[2], v_product_ids[2], v_variation_ids[2],
        CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '4 days', 'reserved',
        18000.00, 60000.00, 'both', v_user_id
    );
    
    -- Rental 3: Active (out)
    INSERT INTO rental_bookings (
        business_id, contact_id, product_id, variation_id,
        booking_date, pickup_date, return_date, status,
        rental_amount, security_deposit_amount, security_type, created_by
    ) VALUES (
        v_business_id, v_customer_ids[5], v_product_ids[3], v_variation_ids[3],
        CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE, 'out',
        12000.00, 40000.00, 'id_card', v_user_id
    );
    
    RAISE NOTICE 'Inserted 3 rental bookings';
    
    -- ============================================
    -- STEP 7: INSERT PRODUCTION ORDERS (3 orders at different stages)
    -- ============================================
    
    -- Production Order 1: In Cutting stage (status: new)
    INSERT INTO production_orders (
        business_id, customer_id, order_no, status, deadline_date,
        total_cost, final_price, description, created_by
    ) VALUES (
        v_business_id, v_customer_ids[3], 'ORD-8822', 'new', CURRENT_DATE + INTERVAL '15 days',
        30000.00, 85000.00, '10x Chiffon Suits', v_user_id
    ) RETURNING id INTO v_temp_id;
    v_production_order_ids := array_append(v_production_order_ids, v_temp_id);
    
    -- Production Order 2: In Dyeing stage
    INSERT INTO production_orders (
        business_id, customer_id, order_no, status, deadline_date,
        total_cost, final_price, description, assigned_vendor_id, created_by
    ) VALUES (
        v_business_id, v_customer_ids[1], 'ORD-8821', 'dyeing', CURRENT_DATE + INTERVAL '12 days',
        25000.00, 75000.00, 'Red Bridal Lehenga', v_supplier_ids[2], v_user_id
    ) RETURNING id INTO v_temp_id;
    v_production_order_ids := array_append(v_production_order_ids, v_temp_id);
    
    -- Production Order 3: In Stitching stage
    INSERT INTO production_orders (
        business_id, customer_id, order_no, status, deadline_date,
        total_cost, final_price, description, assigned_vendor_id, created_by
    ) VALUES (
        v_business_id, v_customer_ids[2], 'ORD-8823', 'stitching', CURRENT_DATE + INTERVAL '10 days',
        20000.00, 65000.00, 'Velvet Shawl', v_supplier_ids[3], v_user_id
    ) RETURNING id INTO v_temp_id;
    v_production_order_ids := array_append(v_production_order_ids, v_temp_id);
    
    RAISE NOTICE 'Inserted 3 production orders at different stages';
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'DEMO DATA INSERTION COMPLETE!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Products: 10 items (3 with low stock)';
    RAISE NOTICE 'Contacts: 5 customers (3 retail, 2 wholesale) + 3 suppliers';
    RAISE NOTICE 'Financial Accounts: Cash Till (50,000 PKR), Meezan Bank (150,000 PKR)';
    RAISE NOTICE 'Sales: 5 recent transactions';
    RAISE NOTICE 'Rentals: 3 active bookings';
    RAISE NOTICE 'Production Orders: 3 orders (Cutting, Dyeing, Stitching)';
    RAISE NOTICE '============================================';
    
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check products count
SELECT COUNT(*) as product_count FROM products WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1);

-- Check contacts count
SELECT 
    type,
    COUNT(*) as count
FROM contacts 
WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
GROUP BY type;

-- Check financial accounts
SELECT name, type, current_balance 
FROM financial_accounts 
WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1);

-- Check low stock products
SELECT p.name, p.sku, vld.qty_available, p.alert_quantity
FROM products p
JOIN variations v ON v.product_id = p.id
JOIN variation_location_details vld ON vld.variation_id = v.id
WHERE p.business_id = (SELECT business_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
  AND vld.qty_available < p.alert_quantity
  AND p.enable_stock = true;

-- Check rental bookings
SELECT rb.id, c.name as customer, p.name as product, rb.status, rb.pickup_date, rb.return_date
FROM rental_bookings rb
JOIN contacts c ON c.id = rb.contact_id
JOIN products p ON p.id = rb.product_id
WHERE rb.business_id = (SELECT business_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
ORDER BY rb.created_at DESC;

-- Check production orders
SELECT po.order_no, po.status, c.name as customer, po.item_name, po.deadline_date
FROM production_orders po
LEFT JOIN contacts c ON c.id = po.customer_id
WHERE po.business_id = (SELECT business_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
ORDER BY po.created_at DESC;

