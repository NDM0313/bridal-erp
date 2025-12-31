-- ============================================
-- DEMO DATA INSERT SCRIPT (FINAL VERSION)
-- Setup complete hai, ab demo data insert karo
-- ============================================
-- 
-- STATUS: ✅ Business, Location, User Profile, Unit, Category, Brand - All Created
-- 
-- USAGE: Direct run karo - yeh automatically sab data insert kar dega
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
    v_product_variation_ids INTEGER[] := ARRAY[]::INTEGER[];
    
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
    v_temp_product_variation_id INTEGER;
    v_invoice_counter INTEGER;
    
    -- Check if tables exist
    v_has_financial_accounts BOOLEAN;
    v_has_rental_bookings BOOLEAN;
    v_has_production_orders BOOLEAN;
    v_has_rental_columns BOOLEAN;
    v_has_product_variations BOOLEAN;
    v_has_assigned_vendor_id BOOLEAN;
BEGIN
    -- Get existing setup
    SELECT business_id, user_id INTO v_business_id, v_user_id
    FROM user_profiles
    LIMIT 1;
    
    IF v_business_id IS NULL OR v_user_id IS NULL THEN
        RAISE EXCEPTION 'Setup incomplete. Please run QUICK_SETUP.sql first.';
    END IF;
    
    RAISE NOTICE 'Using business_id: %, user_id: %', v_business_id, v_user_id;
    
    -- Get existing location, unit, category, brand
    SELECT id INTO v_location_id FROM business_locations WHERE business_id = v_business_id LIMIT 1;
    SELECT id INTO v_unit_id FROM units WHERE business_id = v_business_id AND actual_name = 'Pieces' LIMIT 1;
    SELECT id INTO v_category_id FROM categories WHERE business_id = v_business_id AND name = 'Bridal Wear' LIMIT 1;
    SELECT id INTO v_brand_id FROM brands WHERE business_id = v_business_id AND name = 'Din Collection' LIMIT 1;
    
    IF v_location_id IS NULL OR v_unit_id IS NULL OR v_category_id IS NULL OR v_brand_id IS NULL THEN
        RAISE EXCEPTION 'Setup incomplete. Missing location, unit, category, or brand. Please run QUICK_SETUP.sql first.';
    END IF;
    
    RAISE NOTICE 'Found: Location=%, Unit=%, Category=%, Brand=%', v_location_id, v_unit_id, v_category_id, v_brand_id;
    
    -- Check which tables/columns exist
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_accounts') INTO v_has_financial_accounts;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rental_bookings') INTO v_has_rental_bookings;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_orders') INTO v_has_production_orders;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_rentable') INTO v_has_rental_columns;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_variations') INTO v_has_product_variations;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'production_orders' AND column_name = 'assigned_vendor_id') INTO v_has_assigned_vendor_id;
    
    -- Check if product_variations table exists (required for variations.product_variation_id)
    IF NOT v_has_product_variations THEN
        RAISE EXCEPTION 'product_variations table missing. Your schema requires product_variations table for variations. Please check your database schema.';
    END IF;
    
    RAISE NOTICE 'Tables: Financial=% Rental=% Production=% RentalColumns=% ProductVariations=%', 
        v_has_financial_accounts, v_has_rental_bookings, v_has_production_orders, v_has_rental_columns, v_has_product_variations;
    
    -- ============================================
    -- INSERT PRODUCTS (10 items)
    -- ============================================
    
    -- Product 1: Red Bridal Lehenga
    IF v_has_rental_columns THEN
        INSERT INTO products (
            business_id, name, type, unit_id, category_id, brand_id,
            sku, enable_stock, alert_quantity, is_rentable, rental_price,
            security_deposit_amount, rent_duration_unit, created_by
        ) VALUES (
            v_business_id, 'Red Bridal Lehenga', 'single', v_unit_id, v_category_id, v_brand_id,
            'LEH-RED-001', true, 5, true, 15000.00, 50000.00, 'day', v_user_id
        ) RETURNING id INTO v_temp_id;
    ELSE
        INSERT INTO products (
            business_id, name, type, unit_id, category_id, brand_id,
            sku, enable_stock, alert_quantity, created_by
        ) VALUES (
            v_business_id, 'Red Bridal Lehenga', 'single', v_unit_id, v_category_id, v_brand_id,
            'LEH-RED-001', true, 5, v_user_id
        ) RETURNING id INTO v_temp_id;
    END IF;
    v_product_ids := array_append(v_product_ids, v_temp_id);
    
    -- Create product_variation (dummy for single products)
    INSERT INTO product_variations (product_id, name, is_dummy)
    VALUES (v_temp_id, 'Default', true)
    RETURNING id INTO v_temp_product_variation_id;
    v_product_variation_ids := array_append(v_product_variation_ids, v_temp_product_variation_id);
    
    INSERT INTO variations (
        product_id, product_variation_id, name, sub_sku, retail_price, wholesale_price,
        default_purchase_price, dpp_inc_tax
    ) VALUES (
        v_temp_id, v_temp_product_variation_id, 'Default', 'LEH-RED-001-V1', 85000.00, 75000.00, 45000.00, 45000.00
    ) RETURNING id INTO v_temp_variation_id;
    v_variation_ids := array_append(v_variation_ids, v_temp_variation_id);
    
    -- Check if variation_location_details has product_variation_id column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'variation_location_details' AND column_name = 'product_variation_id') THEN
        INSERT INTO variation_location_details (variation_id, product_id, product_variation_id, location_id, qty_available)
        VALUES (v_temp_variation_id, v_temp_id, v_temp_product_variation_id, v_location_id, 3)
        ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 3;
    ELSE
        INSERT INTO variation_location_details (variation_id, product_id, location_id, qty_available)
        VALUES (v_temp_variation_id, v_temp_id, v_location_id, 3)
        ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 3;
    END IF;
    
    -- Product 2: Gold Bridal Lehenga
    IF v_has_rental_columns THEN
        INSERT INTO products (
            business_id, name, type, unit_id, category_id, brand_id,
            sku, enable_stock, alert_quantity, is_rentable, rental_price,
            security_deposit_amount, rent_duration_unit, created_by
        ) VALUES (
            v_business_id, 'Gold Bridal Lehenga', 'single', v_unit_id, v_category_id, v_brand_id,
            'LEH-GOLD-002', true, 5, true, 18000.00, 60000.00, 'day', v_user_id
        ) RETURNING id INTO v_temp_id;
    ELSE
        INSERT INTO products (
            business_id, name, type, unit_id, category_id, brand_id,
            sku, enable_stock, alert_quantity, created_by
        ) VALUES (
            v_business_id, 'Gold Bridal Lehenga', 'single', v_unit_id, v_category_id, v_brand_id,
            'LEH-GOLD-002', true, 5, v_user_id
        ) RETURNING id INTO v_temp_id;
    END IF;
    v_product_ids := array_append(v_product_ids, v_temp_id);
    
    -- Create product_variation (dummy for single products)
    INSERT INTO product_variations (product_id, name, is_dummy)
    VALUES (v_temp_id, 'Default', true)
    RETURNING id INTO v_temp_product_variation_id;
    v_product_variation_ids := array_append(v_product_variation_ids, v_temp_product_variation_id);
    
    INSERT INTO variations (
        product_id, product_variation_id, name, sub_sku, retail_price, wholesale_price,
        default_purchase_price, dpp_inc_tax
    ) VALUES (
        v_temp_id, v_temp_product_variation_id, 'Default', 'LEH-GOLD-002-V1', 95000.00, 85000.00, 50000.00, 50000.00
    ) RETURNING id INTO v_temp_variation_id;
    v_variation_ids := array_append(v_variation_ids, v_temp_variation_id);
    
    -- Check if variation_location_details has product_variation_id column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'variation_location_details' AND column_name = 'product_variation_id') THEN
        INSERT INTO variation_location_details (variation_id, product_id, product_variation_id, location_id, qty_available)
        VALUES (v_temp_variation_id, v_temp_id, v_temp_product_variation_id, v_location_id, 8)
        ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 8;
    ELSE
        INSERT INTO variation_location_details (variation_id, product_id, location_id, qty_available)
        VALUES (v_temp_variation_id, v_temp_id, v_location_id, 8)
        ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 8;
    END IF;
    
    -- Product 3: Maroon Bridal Lehenga (Low stock)
    IF v_has_rental_columns THEN
        INSERT INTO products (
            business_id, name, type, unit_id, category_id, brand_id,
            sku, enable_stock, alert_quantity, is_rentable, rental_price,
            security_deposit_amount, rent_duration_unit, created_by
        ) VALUES (
            v_business_id, 'Maroon Bridal Lehenga', 'single', v_unit_id, v_category_id, v_brand_id,
            'LEH-MAR-003', true, 5, true, 12000.00, 40000.00, 'day', v_user_id
        ) RETURNING id INTO v_temp_id;
    ELSE
        INSERT INTO products (
            business_id, name, type, unit_id, category_id, brand_id,
            sku, enable_stock, alert_quantity, created_by
        ) VALUES (
            v_business_id, 'Maroon Bridal Lehenga', 'single', v_unit_id, v_category_id, v_brand_id,
            'LEH-MAR-003', true, 5, v_user_id
        ) RETURNING id INTO v_temp_id;
    END IF;
    v_product_ids := array_append(v_product_ids, v_temp_id);
    
    -- Create product_variation (dummy for single products)
    INSERT INTO product_variations (product_id, name, is_dummy)
    VALUES (v_temp_id, 'Default', true)
    RETURNING id INTO v_temp_product_variation_id;
    v_product_variation_ids := array_append(v_product_variation_ids, v_temp_product_variation_id);
    
    INSERT INTO variations (
        product_id, product_variation_id, name, sub_sku, retail_price, wholesale_price,
        default_purchase_price, dpp_inc_tax
    ) VALUES (
        v_temp_id, v_temp_product_variation_id, 'Default', 'LEH-MAR-003-V1', 75000.00, 65000.00, 35000.00, 35000.00
    ) RETURNING id INTO v_temp_variation_id;
    v_variation_ids := array_append(v_variation_ids, v_temp_variation_id);
    
    -- Check if variation_location_details has product_variation_id column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'variation_location_details' AND column_name = 'product_variation_id') THEN
        INSERT INTO variation_location_details (variation_id, product_id, product_variation_id, location_id, qty_available)
        VALUES (v_temp_variation_id, v_temp_id, v_temp_product_variation_id, v_location_id, 2)
        ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 2;
    ELSE
        INSERT INTO variation_location_details (variation_id, product_id, location_id, qty_available)
        VALUES (v_temp_variation_id, v_temp_id, v_location_id, 2)
        ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 2;
    END IF;
    
    -- Product 4: Grooms Sherwani - Black
    IF v_has_rental_columns THEN
        INSERT INTO products (
            business_id, name, type, unit_id, category_id, brand_id,
            sku, enable_stock, alert_quantity, is_rentable, rental_price,
            security_deposit_amount, rent_duration_unit, created_by
        ) VALUES (
            v_business_id, 'Grooms Sherwani - Black', 'single', v_unit_id, v_category_id, v_brand_id,
            'SHW-BLK-004', true, 3, true, 8000.00, 25000.00, 'day', v_user_id
        ) RETURNING id INTO v_temp_id;
    ELSE
        INSERT INTO products (
            business_id, name, type, unit_id, category_id, brand_id,
            sku, enable_stock, alert_quantity, created_by
        ) VALUES (
            v_business_id, 'Grooms Sherwani - Black', 'single', v_unit_id, v_category_id, v_brand_id,
            'SHW-BLK-004', true, 3, v_user_id
        ) RETURNING id INTO v_temp_id;
    END IF;
    v_product_ids := array_append(v_product_ids, v_temp_id);
    
    -- Create product_variation (dummy for single products)
    INSERT INTO product_variations (product_id, name, is_dummy)
    VALUES (v_temp_id, 'Default', true)
    RETURNING id INTO v_temp_product_variation_id;
    v_product_variation_ids := array_append(v_product_variation_ids, v_temp_product_variation_id);
    
    INSERT INTO variations (
        product_id, product_variation_id, name, sub_sku, retail_price, wholesale_price,
        default_purchase_price, dpp_inc_tax
    ) VALUES (
        v_temp_id, v_temp_product_variation_id, 'Default', 'SHW-BLK-004-V1', 45000.00, 40000.00, 20000.00, 20000.00
    ) RETURNING id INTO v_temp_variation_id;
    v_variation_ids := array_append(v_variation_ids, v_temp_variation_id);
    
    -- Check if variation_location_details has product_variation_id column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'variation_location_details' AND column_name = 'product_variation_id') THEN
        INSERT INTO variation_location_details (variation_id, product_id, product_variation_id, location_id, qty_available)
        VALUES (v_temp_variation_id, v_temp_id, v_temp_product_variation_id, v_location_id, 15)
        ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 15;
    ELSE
        INSERT INTO variation_location_details (variation_id, product_id, location_id, qty_available)
        VALUES (v_temp_variation_id, v_temp_id, v_location_id, 15)
        ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 15;
    END IF;
    
    -- Product 5: Grooms Sherwani - White
    IF v_has_rental_columns THEN
        INSERT INTO products (
            business_id, name, type, unit_id, category_id, brand_id,
            sku, enable_stock, alert_quantity, is_rentable, rental_price,
            security_deposit_amount, rent_duration_unit, created_by
        ) VALUES (
            v_business_id, 'Grooms Sherwani - White', 'single', v_unit_id, v_category_id, v_brand_id,
            'SHW-WHT-005', true, 3, true, 8000.00, 25000.00, 'day', v_user_id
        ) RETURNING id INTO v_temp_id;
    ELSE
        INSERT INTO products (
            business_id, name, type, unit_id, category_id, brand_id,
            sku, enable_stock, alert_quantity, created_by
        ) VALUES (
            v_business_id, 'Grooms Sherwani - White', 'single', v_unit_id, v_category_id, v_brand_id,
            'SHW-WHT-005', true, 3, v_user_id
        ) RETURNING id INTO v_temp_id;
    END IF;
    v_product_ids := array_append(v_product_ids, v_temp_id);
    
    -- Create product_variation (dummy for single products)
    INSERT INTO product_variations (product_id, name, is_dummy)
    VALUES (v_temp_id, 'Default', true)
    RETURNING id INTO v_temp_product_variation_id;
    v_product_variation_ids := array_append(v_product_variation_ids, v_temp_product_variation_id);
    
    INSERT INTO variations (
        product_id, product_variation_id, name, sub_sku, retail_price, wholesale_price,
        default_purchase_price, dpp_inc_tax
    ) VALUES (
        v_temp_id, v_temp_product_variation_id, 'Default', 'SHW-WHT-005-V1', 45000.00, 40000.00, 20000.00, 20000.00
    ) RETURNING id INTO v_temp_variation_id;
    v_variation_ids := array_append(v_variation_ids, v_temp_variation_id);
    
    -- Check if variation_location_details has product_variation_id column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'variation_location_details' AND column_name = 'product_variation_id') THEN
        INSERT INTO variation_location_details (variation_id, product_id, product_variation_id, location_id, qty_available)
        VALUES (v_temp_variation_id, v_temp_id, v_temp_product_variation_id, v_location_id, 12)
        ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 12;
    ELSE
        INSERT INTO variation_location_details (variation_id, product_id, location_id, qty_available)
        VALUES (v_temp_variation_id, v_temp_id, v_location_id, 12)
        ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 12;
    END IF;
    
    -- Product 6: Grooms Sherwani - Gold
    IF v_has_rental_columns THEN
        INSERT INTO products (
            business_id, name, type, unit_id, category_id, brand_id,
            sku, enable_stock, alert_quantity, is_rentable, rental_price,
            security_deposit_amount, rent_duration_unit, created_by
        ) VALUES (
            v_business_id, 'Grooms Sherwani - Gold', 'single', v_unit_id, v_category_id, v_brand_id,
            'SHW-GLD-006', true, 3, true, 10000.00, 30000.00, 'day', v_user_id
        ) RETURNING id INTO v_temp_id;
    ELSE
        INSERT INTO products (
            business_id, name, type, unit_id, category_id, brand_id,
            sku, enable_stock, alert_quantity, created_by
        ) VALUES (
            v_business_id, 'Grooms Sherwani - Gold', 'single', v_unit_id, v_category_id, v_brand_id,
            'SHW-GLD-006', true, 3, v_user_id
        ) RETURNING id INTO v_temp_id;
    END IF;
    v_product_ids := array_append(v_product_ids, v_temp_id);
    
    -- Create product_variation (dummy for single products)
    INSERT INTO product_variations (product_id, name, is_dummy)
    VALUES (v_temp_id, 'Default', true)
    RETURNING id INTO v_temp_product_variation_id;
    v_product_variation_ids := array_append(v_product_variation_ids, v_temp_product_variation_id);
    
    INSERT INTO variations (
        product_id, product_variation_id, name, sub_sku, retail_price, wholesale_price,
        default_purchase_price, dpp_inc_tax
    ) VALUES (
        v_temp_id, v_temp_product_variation_id, 'Default', 'SHW-GLD-006-V1', 55000.00, 50000.00, 25000.00, 25000.00
    ) RETURNING id INTO v_temp_variation_id;
    v_variation_ids := array_append(v_variation_ids, v_temp_variation_id);
    
    -- Check if variation_location_details has product_variation_id column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'variation_location_details' AND column_name = 'product_variation_id') THEN
        INSERT INTO variation_location_details (variation_id, product_id, product_variation_id, location_id, qty_available)
        VALUES (v_temp_variation_id, v_temp_id, v_temp_product_variation_id, v_location_id, 4)
        ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 4;
    ELSE
        INSERT INTO variation_location_details (variation_id, product_id, location_id, qty_available)
        VALUES (v_temp_variation_id, v_temp_id, v_location_id, 4)
        ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 4;
    END IF;
    
    -- Product 7: Bridal Dupatta - Red
    INSERT INTO products (
        business_id, name, type, unit_id, category_id, brand_id,
        sku, enable_stock, alert_quantity, created_by
    ) VALUES (
        v_business_id, 'Bridal Dupatta - Red', 'single', v_unit_id, v_category_id, v_brand_id,
        'DUP-RED-007', true, 10, v_user_id
    ) RETURNING id INTO v_temp_id;
    v_product_ids := array_append(v_product_ids, v_temp_id);
    
    -- Create product_variation (dummy for single products)
    INSERT INTO product_variations (product_id, name, is_dummy)
    VALUES (v_temp_id, 'Default', true)
    RETURNING id INTO v_temp_product_variation_id;
    v_product_variation_ids := array_append(v_product_variation_ids, v_temp_product_variation_id);
    
    INSERT INTO variations (
        product_id, product_variation_id, name, sub_sku, retail_price, wholesale_price,
        default_purchase_price, dpp_inc_tax
    ) VALUES (
        v_temp_id, v_temp_product_variation_id, 'Default', 'DUP-RED-007-V1', 15000.00, 12000.00, 6000.00, 6000.00
    ) RETURNING id INTO v_temp_variation_id;
    v_variation_ids := array_append(v_variation_ids, v_temp_variation_id);
    
    -- Check if variation_location_details has product_variation_id column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'variation_location_details' AND column_name = 'product_variation_id') THEN
        INSERT INTO variation_location_details (variation_id, product_id, product_variation_id, location_id, qty_available)
        VALUES (v_temp_variation_id, v_temp_id, v_temp_product_variation_id, v_location_id, 25)
        ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 25;
    ELSE
        INSERT INTO variation_location_details (variation_id, product_id, location_id, qty_available)
        VALUES (v_temp_variation_id, v_temp_id, v_location_id, 25)
        ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 25;
    END IF;
    
    -- Product 8: Bridal Dupatta - Gold (Low stock)
    INSERT INTO products (
        business_id, name, type, unit_id, category_id, brand_id,
        sku, enable_stock, alert_quantity, created_by
    ) VALUES (
        v_business_id, 'Bridal Dupatta - Gold', 'single', v_unit_id, v_category_id, v_brand_id,
        'DUP-GLD-008', true, 10, v_user_id
    ) RETURNING id INTO v_temp_id;
    v_product_ids := array_append(v_product_ids, v_temp_id);
    
    -- Create product_variation (dummy for single products)
    INSERT INTO product_variations (product_id, name, is_dummy)
    VALUES (v_temp_id, 'Default', true)
    RETURNING id INTO v_temp_product_variation_id;
    v_product_variation_ids := array_append(v_product_variation_ids, v_temp_product_variation_id);
    
    INSERT INTO variations (
        product_id, product_variation_id, name, sub_sku, retail_price, wholesale_price,
        default_purchase_price, dpp_inc_tax
    ) VALUES (
        v_temp_id, v_temp_product_variation_id, 'Default', 'DUP-GLD-008-V1', 18000.00, 15000.00, 8000.00, 8000.00
    ) RETURNING id INTO v_temp_variation_id;
    v_variation_ids := array_append(v_variation_ids, v_temp_variation_id);
    
    -- Check if variation_location_details has product_variation_id column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'variation_location_details' AND column_name = 'product_variation_id') THEN
        INSERT INTO variation_location_details (variation_id, product_id, product_variation_id, location_id, qty_available)
        VALUES (v_temp_variation_id, v_temp_id, v_temp_product_variation_id, v_location_id, 7)
        ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 7;
    ELSE
        INSERT INTO variation_location_details (variation_id, product_id, location_id, qty_available)
        VALUES (v_temp_variation_id, v_temp_id, v_location_id, 7)
        ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 7;
    END IF;
    
    -- Product 9: Bridal Jewelry Set
    INSERT INTO products (
        business_id, name, type, unit_id, category_id, brand_id,
        sku, enable_stock, alert_quantity, created_by
    ) VALUES (
        v_business_id, 'Bridal Jewelry Set', 'single', v_unit_id, v_category_id, v_brand_id,
        'JWL-SET-009', true, 5, v_user_id
    ) RETURNING id INTO v_temp_id;
    v_product_ids := array_append(v_product_ids, v_temp_id);
    
    -- Create product_variation (dummy for single products)
    INSERT INTO product_variations (product_id, name, is_dummy)
    VALUES (v_temp_id, 'Default', true)
    RETURNING id INTO v_temp_product_variation_id;
    v_product_variation_ids := array_append(v_product_variation_ids, v_temp_product_variation_id);
    
    INSERT INTO variations (
        product_id, product_variation_id, name, sub_sku, retail_price, wholesale_price,
        default_purchase_price, dpp_inc_tax
    ) VALUES (
        v_temp_id, v_temp_product_variation_id, 'Default', 'JWL-SET-009-V1', 25000.00, 22000.00, 12000.00, 12000.00
    ) RETURNING id INTO v_temp_variation_id;
    v_variation_ids := array_append(v_variation_ids, v_temp_variation_id);
    
    -- Check if variation_location_details has product_variation_id column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'variation_location_details' AND column_name = 'product_variation_id') THEN
        INSERT INTO variation_location_details (variation_id, product_id, product_variation_id, location_id, qty_available)
        VALUES (v_temp_variation_id, v_temp_id, v_temp_product_variation_id, v_location_id, 18)
        ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 18;
    ELSE
        INSERT INTO variation_location_details (variation_id, product_id, location_id, qty_available)
        VALUES (v_temp_variation_id, v_temp_id, v_location_id, 18)
        ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 18;
    END IF;
    
    -- Product 10: Bridal Shoes - Red (Low stock)
    INSERT INTO products (
        business_id, name, type, unit_id, category_id, brand_id,
        sku, enable_stock, alert_quantity, created_by
    ) VALUES (
        v_business_id, 'Bridal Shoes - Red', 'single', v_unit_id, v_category_id, v_brand_id,
        'SHO-RED-010', true, 8, v_user_id
    ) RETURNING id INTO v_temp_id;
    v_product_ids := array_append(v_product_ids, v_temp_id);
    
    -- Create product_variation (dummy for single products)
    INSERT INTO product_variations (product_id, name, is_dummy)
    VALUES (v_temp_id, 'Default', true)
    RETURNING id INTO v_temp_product_variation_id;
    v_product_variation_ids := array_append(v_product_variation_ids, v_temp_product_variation_id);
    
    INSERT INTO variations (
        product_id, product_variation_id, name, sub_sku, retail_price, wholesale_price,
        default_purchase_price, dpp_inc_tax
    ) VALUES (
        v_temp_id, v_temp_product_variation_id, 'Default', 'SHO-RED-010-V1', 8000.00, 7000.00, 3500.00, 3500.00
    ) RETURNING id INTO v_temp_variation_id;
    v_variation_ids := array_append(v_variation_ids, v_temp_variation_id);
    
    -- Check if variation_location_details has product_variation_id column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'variation_location_details' AND column_name = 'product_variation_id') THEN
        INSERT INTO variation_location_details (variation_id, product_id, product_variation_id, location_id, qty_available)
        VALUES (v_temp_variation_id, v_temp_id, v_temp_product_variation_id, v_location_id, 6)
        ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 6;
    ELSE
        INSERT INTO variation_location_details (variation_id, product_id, location_id, qty_available)
        VALUES (v_temp_variation_id, v_temp_id, v_location_id, 6)
        ON CONFLICT (variation_id, location_id) DO UPDATE SET qty_available = 6;
    END IF;
    
    RAISE NOTICE '✅ Inserted 10 products with variations and stock';
    
    -- ============================================
    -- INSERT CONTACTS (5 Customers + 3 Suppliers)
    -- ============================================
    
    INSERT INTO contacts (business_id, type, name, mobile, email, customer_type, created_by)
    VALUES (v_business_id, 'customer', 'Mrs. Fatima Ahmed', '+92 300 1234567', 'fatima@example.com', 'retail', v_user_id)
    RETURNING id INTO v_temp_id;
    v_customer_ids := array_append(v_customer_ids, v_temp_id);
    
    INSERT INTO contacts (business_id, type, name, mobile, email, customer_type, created_by)
    VALUES (v_business_id, 'customer', 'Ms. Ayesha Khan', '+92 321 2345678', 'ayesha@example.com', 'retail', v_user_id)
    RETURNING id INTO v_temp_id;
    v_customer_ids := array_append(v_customer_ids, v_temp_id);
    
    INSERT INTO contacts (business_id, type, name, mobile, email, customer_type, created_by)
    VALUES (v_business_id, 'customer', 'Bridal Boutique', '+92 333 3456789', 'boutique@example.com', 'wholesale', v_user_id)
    RETURNING id INTO v_temp_id;
    v_customer_ids := array_append(v_customer_ids, v_temp_id);
    
    INSERT INTO contacts (business_id, type, name, mobile, email, customer_type, created_by)
    VALUES (v_business_id, 'customer', 'Ali Textiles', '+92 300 4567890', 'ali@textiles.com', 'wholesale', v_user_id)
    RETURNING id INTO v_temp_id;
    v_customer_ids := array_append(v_customer_ids, v_temp_id);
    
    INSERT INTO contacts (business_id, type, name, mobile, email, customer_type, created_by)
    VALUES (v_business_id, 'customer', 'Mrs. Zara Ahmed', '+92 321 5678901', 'zara@example.com', 'retail', v_user_id)
    RETURNING id INTO v_temp_id;
    v_customer_ids := array_append(v_customer_ids, v_temp_id);
    
    INSERT INTO contacts (business_id, type, name, mobile, email, created_by)
    VALUES (v_business_id, 'supplier', 'Silk Traders', '+92 300 7778888', 'purchase@silktraders.com', v_user_id)
    RETURNING id INTO v_temp_id;
    v_supplier_ids := array_append(v_supplier_ids, v_temp_id);
    
    INSERT INTO contacts (business_id, type, name, mobile, email, created_by)
    VALUES (v_business_id, 'supplier', 'Ali Dyer', '+92 300 1112222', 'ali@dyer.com', v_user_id)
    RETURNING id INTO v_temp_id;
    v_supplier_ids := array_append(v_supplier_ids, v_temp_id);
    
    INSERT INTO contacts (business_id, type, name, mobile, email, created_by)
    VALUES (v_business_id, 'supplier', 'Master Sahab', '+92 321 3334444', 'master@tailor.com', v_user_id)
    RETURNING id INTO v_temp_id;
    v_supplier_ids := array_append(v_supplier_ids, v_temp_id);
    
    RAISE NOTICE '✅ Inserted 5 customers and 3 suppliers';
    
    -- ============================================
    -- INSERT FINANCIAL ACCOUNTS (if table exists)
    -- ============================================
    IF v_has_financial_accounts THEN
        INSERT INTO financial_accounts (
            business_id, name, type, current_balance, opening_balance, created_by
        ) VALUES (
            v_business_id, 'Cash Till', 'cash', 50000.00, 50000.00, v_user_id
        ) ON CONFLICT (business_id, name) DO UPDATE SET
            current_balance = 50000.00,
            opening_balance = 50000.00
        RETURNING id INTO v_cash_account_id;
        
        INSERT INTO financial_accounts (
            business_id, name, type, bank_name, account_number, current_balance, opening_balance, created_by
        ) VALUES (
            v_business_id, 'Meezan Bank', 'bank', 'Meezan Bank', 'PK12MEZN0001234567890123', 150000.00, 150000.00, v_user_id
        ) ON CONFLICT (business_id, name) DO UPDATE SET
            current_balance = 150000.00,
            opening_balance = 150000.00
        RETURNING id INTO v_bank_account_id;
        
        RAISE NOTICE '✅ Inserted financial accounts: Cash Till (%), Meezan Bank (%)', v_cash_account_id, v_bank_account_id;
    ELSE
        RAISE NOTICE '⚠️ financial_accounts table missing. Skipping. Run MODERN_ERP_EXTENSION.sql if needed.';
    END IF;
    
    -- ============================================
    -- INSERT SALES TRANSACTIONS (5 recent sales)
    -- ============================================
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_no FROM 5) AS INTEGER)), 0) + 1
    INTO v_invoice_counter
    FROM transactions
    WHERE business_id = v_business_id AND invoice_no LIKE 'INV-%';
    
    -- Sale 1 (Fully Paid)
    INSERT INTO transactions (
        business_id, location_id, type, status, payment_status, contact_id, customer_type,
        invoice_no, transaction_date, final_total, created_by
    ) VALUES (
        v_business_id, v_location_id, 'sell', 'final', 'paid', v_customer_ids[1], 'retail',
        'INV-' || LPAD(v_invoice_counter::TEXT, 6, '0'),
        CURRENT_DATE - INTERVAL '2 days', 85000.00, v_user_id
    ) RETURNING id INTO v_temp_id;
    v_transaction_ids := array_append(v_transaction_ids, v_temp_id);
    v_invoice_counter := v_invoice_counter + 1;
    
    INSERT INTO transaction_sell_lines (
        transaction_id, product_id, variation_id, quantity, unit_id,
        unit_price, unit_price_inc_tax, line_total
    ) VALUES (
        v_transaction_ids[1], v_product_ids[1], v_variation_ids[1], 1, v_unit_id,
        85000.00, 85000.00, 85000.00
    );
    
    -- Sale 2 (Partial Payment)
    INSERT INTO transactions (
        business_id, location_id, type, status, payment_status, contact_id, customer_type,
        invoice_no, transaction_date, final_total, created_by
    ) VALUES (
        v_business_id, v_location_id, 'sell', 'final', 'partial', v_customer_ids[2], 'retail',
        'INV-' || LPAD(v_invoice_counter::TEXT, 6, '0'),
        CURRENT_DATE - INTERVAL '1 day', 95000.00, v_user_id
    ) RETURNING id INTO v_temp_id;
    v_transaction_ids := array_append(v_transaction_ids, v_temp_id);
    v_invoice_counter := v_invoice_counter + 1;
    
    INSERT INTO transaction_sell_lines (
        transaction_id, product_id, variation_id, quantity, unit_id,
        unit_price, unit_price_inc_tax, line_total
    ) VALUES (
        v_transaction_ids[2], v_product_ids[2], v_variation_ids[2], 1, v_unit_id,
        95000.00, 95000.00, 95000.00
    );
    
    -- Sale 3 (Fully Paid)
    INSERT INTO transactions (
        business_id, location_id, type, status, payment_status, contact_id, customer_type,
        invoice_no, transaction_date, final_total, created_by
    ) VALUES (
        v_business_id, v_location_id, 'sell', 'final', 'paid', v_customer_ids[3], 'wholesale',
        'INV-' || LPAD(v_invoice_counter::TEXT, 6, '0'),
        CURRENT_DATE - INTERVAL '3 days', 150000.00, v_user_id
    ) RETURNING id INTO v_temp_id;
    v_transaction_ids := array_append(v_transaction_ids, v_temp_id);
    v_invoice_counter := v_invoice_counter + 1;
    
    INSERT INTO transaction_sell_lines (
        transaction_id, product_id, variation_id, quantity, unit_id,
        unit_price, unit_price_inc_tax, line_total
    ) VALUES (
        v_transaction_ids[3], v_product_ids[1], v_variation_ids[1], 2, v_unit_id,
        75000.00, 75000.00, 150000.00
    );
    
    -- Sale 4 (Fully Paid)
    INSERT INTO transactions (
        business_id, location_id, type, status, payment_status, contact_id, customer_type,
        invoice_no, transaction_date, final_total, created_by
    ) VALUES (
        v_business_id, v_location_id, 'sell', 'final', 'paid', v_customer_ids[5], 'retail',
        'INV-' || LPAD(v_invoice_counter::TEXT, 6, '0'),
        CURRENT_DATE, 75000.00, v_user_id
    ) RETURNING id INTO v_temp_id;
    v_transaction_ids := array_append(v_transaction_ids, v_temp_id);
    v_invoice_counter := v_invoice_counter + 1;
    
    INSERT INTO transaction_sell_lines (
        transaction_id, product_id, variation_id, quantity, unit_id,
        unit_price, unit_price_inc_tax, line_total
    ) VALUES (
        v_transaction_ids[4], v_product_ids[3], v_variation_ids[3], 1, v_unit_id,
        75000.00, 75000.00, 75000.00
    );
    
    -- Sale 5 (Partial Payment)
    INSERT INTO transactions (
        business_id, location_id, type, status, payment_status, contact_id, customer_type,
        invoice_no, transaction_date, final_total, created_by
    ) VALUES (
        v_business_id, v_location_id, 'sell', 'final', 'partial', v_customer_ids[4], 'wholesale',
        'INV-' || LPAD(v_invoice_counter::TEXT, 6, '0'),
        CURRENT_DATE - INTERVAL '5 days', 214000.00, v_user_id
    ) RETURNING id INTO v_temp_id;
    v_transaction_ids := array_append(v_transaction_ids, v_temp_id);
    
    INSERT INTO transaction_sell_lines (
        transaction_id, product_id, variation_id, quantity, unit_id,
        unit_price, unit_price_inc_tax, line_total
    ) VALUES (
        v_transaction_ids[5], v_product_ids[2], v_variation_ids[2], 2, v_unit_id,
        85000.00, 85000.00, 170000.00
    );
    
    INSERT INTO transaction_sell_lines (
        transaction_id, product_id, variation_id, quantity, unit_id,
        unit_price, unit_price_inc_tax, line_total
    ) VALUES (
        v_transaction_ids[5], v_product_ids[9], v_variation_ids[9], 2, v_unit_id,
        22000.00, 22000.00, 44000.00
    );
    
    RAISE NOTICE '✅ Inserted 5 sales transactions with line items';
    
    -- ============================================
    -- INSERT RENTAL BOOKINGS (if table exists)
    -- ============================================
    IF v_has_rental_bookings AND array_length(v_customer_ids, 1) > 0 AND array_length(v_product_ids, 1) > 0 THEN
        INSERT INTO rental_bookings (
            business_id, contact_id, product_id, variation_id,
            booking_date, pickup_date, return_date, status,
            rental_amount, security_deposit_amount, security_type, created_by
        ) VALUES (
            v_business_id, v_customer_ids[1], v_product_ids[1], v_variation_ids[1],
            CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '2 days', 'out',
            15000.00, 50000.00, 'cash', v_user_id
        );
        
        INSERT INTO rental_bookings (
            business_id, contact_id, product_id, variation_id,
            booking_date, pickup_date, return_date, status,
            rental_amount, security_deposit_amount, security_type, created_by
        ) VALUES (
            v_business_id, v_customer_ids[2], v_product_ids[2], v_variation_ids[2],
            CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '4 days', 'reserved',
            18000.00, 60000.00, 'both', v_user_id
        );
        
        INSERT INTO rental_bookings (
            business_id, contact_id, product_id, variation_id,
            booking_date, pickup_date, return_date, status,
            rental_amount, security_deposit_amount, security_type, created_by
        ) VALUES (
            v_business_id, v_customer_ids[5], v_product_ids[3], v_variation_ids[3],
            CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE, 'out',
            12000.00, 40000.00, 'id_card', v_user_id
        );
        
        RAISE NOTICE '✅ Inserted 3 rental bookings';
    ELSE
        RAISE NOTICE '⚠️ rental_bookings table missing. Skipping. Run MODERN_ERP_EXTENSION.sql if needed.';
    END IF;
    
    -- ============================================
    -- INSERT PRODUCTION ORDERS (if table exists)
    -- ============================================
    IF v_has_production_orders AND array_length(v_customer_ids, 1) > 0 THEN
        INSERT INTO production_orders (
            business_id, customer_id, order_no, status, deadline_date,
            total_cost, final_price, description, created_by
        ) VALUES (
            v_business_id, v_customer_ids[3], 'ORD-8822', 'new', CURRENT_DATE + INTERVAL '15 days',
            30000.00, 85000.00, '10x Chiffon Suits', v_user_id
        );
        
        -- Production Order 2: In Dyeing stage (with vendor if column exists)
        IF v_has_assigned_vendor_id THEN
            INSERT INTO production_orders (
                business_id, customer_id, order_no, status, deadline_date,
                total_cost, final_price, description, assigned_vendor_id, created_by
            ) VALUES (
                v_business_id, v_customer_ids[1], 'ORD-8821', 'dyeing', CURRENT_DATE + INTERVAL '12 days',
                25000.00, 75000.00, 'Red Bridal Lehenga', v_supplier_ids[2], v_user_id
            );
        ELSE
            INSERT INTO production_orders (
                business_id, customer_id, order_no, status, deadline_date,
                total_cost, final_price, description, created_by
            ) VALUES (
                v_business_id, v_customer_ids[1], 'ORD-8821', 'dyeing', CURRENT_DATE + INTERVAL '12 days',
                25000.00, 75000.00, 'Red Bridal Lehenga', v_user_id
            );
        END IF;
        
        -- Production Order 3: In Stitching stage (with vendor if column exists)
        IF v_has_assigned_vendor_id THEN
            INSERT INTO production_orders (
                business_id, customer_id, order_no, status, deadline_date,
                total_cost, final_price, description, assigned_vendor_id, created_by
            ) VALUES (
                v_business_id, v_customer_ids[2], 'ORD-8823', 'stitching', CURRENT_DATE + INTERVAL '10 days',
                20000.00, 65000.00, 'Velvet Shawl', v_supplier_ids[3], v_user_id
            );
        ELSE
            INSERT INTO production_orders (
                business_id, customer_id, order_no, status, deadline_date,
                total_cost, final_price, description, created_by
            ) VALUES (
                v_business_id, v_customer_ids[2], 'ORD-8823', 'stitching', CURRENT_DATE + INTERVAL '10 days',
                20000.00, 65000.00, 'Velvet Shawl', v_user_id
            );
        END IF;
        
        RAISE NOTICE '✅ Inserted 3 production orders';
    ELSE
        RAISE NOTICE '⚠️ production_orders table missing. Skipping. Run MODERN_ERP_EXTENSION.sql if needed.';
    END IF;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ DEMO DATA INSERTION COMPLETE!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Products: 10 items (5 with low stock)';
    RAISE NOTICE 'Contacts: 5 customers (3 retail, 2 wholesale) + 3 suppliers';
    IF v_has_financial_accounts THEN
        RAISE NOTICE 'Financial Accounts: Cash Till (50,000 PKR), Meezan Bank (150,000 PKR)';
    END IF;
    RAISE NOTICE 'Sales: 5 recent transactions';
    IF v_has_rental_bookings THEN
        RAISE NOTICE 'Rentals: 3 active bookings';
    END IF;
    IF v_has_production_orders THEN
        RAISE NOTICE 'Production Orders: 3 orders (Cutting, Dyeing, Stitching)';
    END IF;
    RAISE NOTICE '============================================';
    
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

SELECT 
    'Demo Data Summary' as summary,
    (SELECT COUNT(*) FROM products WHERE business_id = (SELECT business_id FROM user_profiles LIMIT 1)) as products,
    (SELECT COUNT(*) FROM contacts WHERE business_id = (SELECT business_id FROM user_profiles LIMIT 1)) as contacts,
    (SELECT COUNT(*) FROM transactions WHERE business_id = (SELECT business_id FROM user_profiles LIMIT 1) AND type = 'sell') as sales,
    (SELECT COUNT(*) FROM rental_bookings WHERE business_id = (SELECT business_id FROM user_profiles LIMIT 1)) as rentals,
    (SELECT COUNT(*) FROM production_orders WHERE business_id = (SELECT business_id FROM user_profiles LIMIT 1)) as production_orders;

-- Check low stock products
SELECT 
    p.name,
    p.sku,
    vld.qty_available as stock,
    p.alert_quantity as min_stock
FROM products p
JOIN variations v ON v.product_id = p.id
JOIN variation_location_details vld ON vld.variation_id = v.id
WHERE p.business_id = (SELECT business_id FROM user_profiles LIMIT 1)
  AND vld.qty_available < p.alert_quantity
  AND p.enable_stock = true
ORDER BY vld.qty_available ASC;

