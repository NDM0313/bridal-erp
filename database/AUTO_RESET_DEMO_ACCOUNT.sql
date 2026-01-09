-- ============================================================================
-- AUTOMATIC DEMO ACCOUNT RESET & SEED
-- Date: January 8, 2026
-- Purpose: Fully automatic cleanup and reseed of demo account data
-- ============================================================================
-- 
-- This script:
-- 1. Auto-identifies demo business
-- 2. Safely deletes ONLY demo data (respecting FK constraints)
-- 3. Reseeds fresh realistic demo data
-- 4. Validates branch isolation
-- 5. Reports results
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: AUTO-IDENTIFY DEMO BUSINESS
-- ============================================================================

DO $$
DECLARE
    v_demo_business_id INTEGER;
    v_demo_business_name TEXT;
    v_cleanup_count INTEGER := 0;
BEGIN
    -- Identify demo business (first business, or one named "Studio Rently POS")
    SELECT id, name INTO v_demo_business_id, v_demo_business_name
    FROM businesses
    WHERE name ILIKE '%studio%' OR name ILIKE '%rently%' OR id = 1
    ORDER BY id
    LIMIT 1;
    
    IF v_demo_business_id IS NULL THEN
        -- Fallback: use first business
        SELECT id, name INTO v_demo_business_id, v_demo_business_name
        FROM businesses
        ORDER BY id
        LIMIT 1;
    END IF;
    
    RAISE NOTICE '🎯 IDENTIFIED DEMO BUSINESS: % (ID: %)', v_demo_business_name, v_demo_business_id;
    
    -- Store in temp table for use in subsequent blocks
    CREATE TEMP TABLE IF NOT EXISTS temp_demo_business (
        business_id INTEGER,
        business_name TEXT
    );
    
    DELETE FROM temp_demo_business;
    INSERT INTO temp_demo_business VALUES (v_demo_business_id, v_demo_business_name);
    
END $$;

-- ============================================================================
-- PHASE 2: SAFE DEMO DATA CLEANUP (Respecting FK Dependencies)
-- ============================================================================

DO $$
DECLARE
    v_business_id INTEGER;
    v_count INTEGER;
BEGIN
    SELECT business_id INTO v_business_id FROM temp_demo_business;
    
    RAISE NOTICE '🧹 PHASE 2: Cleaning demo data for business_id: %', v_business_id;
    
    -- Step 1: Delete transaction line items (deepest children)
    DELETE FROM transaction_sell_lines 
    WHERE transaction_id IN (
        SELECT id FROM transactions WHERE business_id = v_business_id
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Deleted % transaction_sell_lines', v_count;
    
    DELETE FROM transaction_purchase_lines 
    WHERE transaction_id IN (
        SELECT id FROM transactions WHERE business_id = v_business_id
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Deleted % transaction_purchase_lines', v_count;
    
    DELETE FROM sale_items 
    WHERE sale_id IN (
        SELECT id FROM sales WHERE business_id = v_business_id
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Deleted % sale_items', v_count;
    
    DELETE FROM purchase_items 
    WHERE purchase_id IN (
        SELECT id FROM purchases WHERE business_id = v_business_id
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Deleted % purchase_items', v_count;
    
    DELETE FROM purchase_lines 
    WHERE transaction_id IN (
        SELECT id FROM transactions WHERE business_id = v_business_id
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Deleted % purchase_lines', v_count;
    
    DELETE FROM stock_adjustment_lines 
    WHERE transaction_id IN (
        SELECT id FROM transactions WHERE business_id = v_business_id
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Deleted % stock_adjustment_lines', v_count;
    
    DELETE FROM stock_transfer_lines 
    WHERE transaction_id IN (
        SELECT id FROM transactions WHERE business_id = v_business_id
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Deleted % stock_transfer_lines', v_count;
    
    -- Step 2: Delete parent transactions
    DELETE FROM transactions WHERE business_id = v_business_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Deleted % transactions', v_count;
    
    DELETE FROM sales WHERE business_id = v_business_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Deleted % sales', v_count;
    
    DELETE FROM purchases WHERE business_id = v_business_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Deleted % purchases', v_count;
    
    -- Step 3: Delete inventory
    DELETE FROM variation_location_details 
    WHERE location_id IN (
        SELECT id FROM business_locations WHERE business_id = v_business_id
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Deleted % variation_location_details', v_count;
    
    DELETE FROM branch_inventory 
    WHERE branch_id IN (
        SELECT id FROM business_locations WHERE business_id = v_business_id
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Deleted % branch_inventory', v_count;
    
    -- Step 4: Delete products and variations
    DELETE FROM variations 
    WHERE product_id IN (
        SELECT id FROM products WHERE business_id = v_business_id
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Deleted % variations', v_count;
    
    DELETE FROM products WHERE business_id = v_business_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Deleted % products', v_count;
    
    -- Step 5: Delete contacts
    DELETE FROM contacts WHERE business_id = v_business_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Deleted % contacts', v_count;
    
    -- Step 6: Delete financial records
    DELETE FROM account_transactions 
    WHERE account_id IN (
        SELECT id FROM financial_accounts WHERE business_id = v_business_id
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Deleted % account_transactions', v_count;
    
    DELETE FROM fund_transfers WHERE business_id = v_business_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Deleted % fund_transfers', v_count;
    
    DELETE FROM salesman_ledgers 
    WHERE salesman_id IN (
        SELECT id FROM user_profiles WHERE business_id = v_business_id
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Deleted % salesman_ledgers', v_count;
    
    -- Step 7: Delete categories and units (only demo business)
    DELETE FROM categories WHERE business_id = v_business_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Deleted % categories', v_count;
    
    DELETE FROM units WHERE business_id = v_business_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Deleted % units', v_count;
    
    RAISE NOTICE '✅ CLEANUP COMPLETE - All demo data removed';
    
END $$;

-- ============================================================================
-- PHASE 3: AUTO-SEED FRESH DEMO DATA
-- ============================================================================

DO $$
DECLARE
    v_business_id INTEGER;
    v_branch_1_id INTEGER;
    v_branch_2_id INTEGER;
    v_branch_3_id INTEGER;
    
    v_cat_electronics INTEGER;
    v_cat_clothing INTEGER;
    v_cat_food INTEGER;
    
    v_unit_piece INTEGER;
    v_unit_kg INTEGER;
    
    v_customer_1 INTEGER;
    v_customer_2 INTEGER;
    v_customer_3 INTEGER;
    v_customer_4 INTEGER;
    v_customer_5 INTEGER;
    v_supplier_1 INTEGER;
    v_supplier_2 INTEGER;
    v_supplier_3 INTEGER;
    
    v_product_1 INTEGER;
    v_product_2 INTEGER;
    v_product_3 INTEGER;
    v_product_4 INTEGER;
    v_product_5 INTEGER;
    
    v_var_1 INTEGER;
    v_var_2 INTEGER;
    v_var_3 INTEGER;
    v_var_4 INTEGER;
    v_var_5 INTEGER;
BEGIN
    SELECT business_id INTO v_business_id FROM temp_demo_business;
    
    RAISE NOTICE '🌱 PHASE 3: Seeding fresh demo data for business_id: %', v_business_id;
    
    -- ========================================================================
    -- 3.1: Configure Branches
    -- ========================================================================
    
    -- Get or update branch 1
    SELECT id INTO v_branch_1_id
    FROM business_locations
    WHERE business_id = v_business_id
    ORDER BY id
    LIMIT 1;
    
    IF v_branch_1_id IS NOT NULL THEN
        UPDATE business_locations
        SET name = 'Main Branch',
            landmark = 'Downtown Plaza, Main Street',
            custom_field1 = 'MB-001',
            mobile = '+92-300-1234567',
            deleted_at = NULL
        WHERE id = v_branch_1_id;
    ELSE
        INSERT INTO business_locations (business_id, name, landmark, custom_field1, mobile)
        VALUES (v_business_id, 'Main Branch', 'Downtown Plaza, Main Street', 'MB-001', '+92-300-1234567')
        RETURNING id INTO v_branch_1_id;
    END IF;
    
    -- Get or create branch 2
    SELECT id INTO v_branch_2_id
    FROM business_locations
    WHERE business_id = v_business_id
    AND id != v_branch_1_id
    ORDER BY id
    LIMIT 1;
    
    IF v_branch_2_id IS NOT NULL THEN
        UPDATE business_locations
        SET name = 'City Outlet',
            landmark = 'Shopping Mall, 2nd Floor',
            custom_field1 = 'CO-002',
            mobile = '+92-300-2345678',
            deleted_at = NULL
        WHERE id = v_branch_2_id;
    ELSE
        INSERT INTO business_locations (business_id, name, landmark, custom_field1, mobile)
        VALUES (v_business_id, 'City Outlet', 'Shopping Mall, 2nd Floor', 'CO-002', '+92-300-2345678')
        RETURNING id INTO v_branch_2_id;
    END IF;
    
    -- Get or create branch 3
    SELECT id INTO v_branch_3_id
    FROM business_locations
    WHERE business_id = v_business_id
    AND id NOT IN (v_branch_1_id, v_branch_2_id)
    ORDER BY id
    LIMIT 1;
    
    IF v_branch_3_id IS NOT NULL THEN
        UPDATE business_locations
        SET name = 'Warehouse',
            landmark = 'Industrial Area, Sector 15',
            custom_field1 = 'WH-003',
            mobile = '+92-300-3456789',
            deleted_at = NULL
        WHERE id = v_branch_3_id;
    ELSE
        INSERT INTO business_locations (business_id, name, landmark, custom_field1, mobile)
        VALUES (v_business_id, 'Warehouse', 'Industrial Area, Sector 15', 'WH-003', '+92-300-3456789')
        RETURNING id INTO v_branch_3_id;
    END IF;
    
    RAISE NOTICE '  ✅ Branches: % (Main), % (City), % (Warehouse)', v_branch_1_id, v_branch_2_id, v_branch_3_id;
    
    -- ========================================================================
    -- 3.2: Insert Categories
    -- ========================================================================
    
    INSERT INTO categories (business_id, name, short_code, created_at)
    VALUES (v_business_id, 'Electronics', 'ELEC', NOW())
    RETURNING id INTO v_cat_electronics;
    
    INSERT INTO categories (business_id, name, short_code, created_at)
    VALUES (v_business_id, 'Clothing', 'CLOTH', NOW())
    RETURNING id INTO v_cat_clothing;
    
    INSERT INTO categories (business_id, name, short_code, created_at)
    VALUES (v_business_id, 'Food & Beverages', 'FOOD', NOW())
    RETURNING id INTO v_cat_food;
    
    RAISE NOTICE '  ✅ Categories created: 3';
    
    -- ========================================================================
    -- 3.3: Insert Units
    -- ========================================================================
    
    INSERT INTO units (business_id, actual_name, short_name, allow_decimal, created_at)
    VALUES (v_business_id, 'Piece', 'Pc', 0, NOW())
    RETURNING id INTO v_unit_piece;
    
    INSERT INTO units (business_id, actual_name, short_name, allow_decimal, created_at)
    VALUES (v_business_id, 'Kilogram', 'Kg', 1, NOW())
    RETURNING id INTO v_unit_kg;
    
    RAISE NOTICE '  ✅ Units created: 2';
    
    -- ========================================================================
    -- 3.4: Insert Contacts
    -- ========================================================================
    
    INSERT INTO contacts (business_id, type, name, mobile, email, city, created_at)
    VALUES 
        (v_business_id, 'customer', 'Ahmed Khan', '+92-300-1111111', 'ahmed@example.com', 'Rawalpindi', NOW()),
        (v_business_id, 'customer', 'Fatima Ali', '+92-300-2222222', 'fatima@example.com', 'Islamabad', NOW()),
        (v_business_id, 'customer', 'Hassan Raza', '+92-300-3333333', 'hassan@example.com', 'Rawalpindi', NOW()),
        (v_business_id, 'customer', 'Ayesha Malik', '+92-300-4444444', 'ayesha@example.com', 'Islamabad', NOW()),
        (v_business_id, 'customer', 'Walk-in Customer', NULL, NULL, NULL, NOW())
    RETURNING id INTO v_customer_1, v_customer_2, v_customer_3, v_customer_4, v_customer_5;
    
    INSERT INTO contacts (business_id, type, name, mobile, email, city, created_at)
    VALUES 
        (v_business_id, 'supplier', 'Tech Suppliers Ltd', '+92-51-1234567', 'info@techsuppliers.com', 'Islamabad', NOW()),
        (v_business_id, 'supplier', 'Wholesale Traders', '+92-51-2345678', 'sales@wholesalers.com', 'Rawalpindi', NOW()),
        (v_business_id, 'supplier', 'Import House', '+92-51-3456789', 'orders@importhouse.com', 'Islamabad', NOW())
    RETURNING id INTO v_supplier_1, v_supplier_2, v_supplier_3;
    
    RAISE NOTICE '  ✅ Contacts created: 8 (5 customers + 3 suppliers)';
    
    -- ========================================================================
    -- 3.5: Insert Products & Variations
    -- ========================================================================
    
    INSERT INTO products (name, business_id, type, unit_id, sku, category_id, alert_quantity, created_at)
    VALUES ('Laptop HP ProBook', v_business_id, 'single', v_unit_piece, 'LAP-HP-001', v_cat_electronics, 5, NOW())
    RETURNING id INTO v_product_1;
    INSERT INTO variations (name, product_id, sub_sku, default_purchase_price, default_sell_price, created_at)
    VALUES ('DUMMY', v_product_1, 'LAP-HP-001', 85000.00, 95000.00, NOW())
    RETURNING id INTO v_var_1;
    
    INSERT INTO products (name, business_id, type, unit_id, sku, category_id, alert_quantity, created_at)
    VALUES ('Samsung Galaxy A54', v_business_id, 'single', v_unit_piece, 'MOB-SAM-001', v_cat_electronics, 10, NOW())
    RETURNING id INTO v_product_2;
    INSERT INTO variations (name, product_id, sub_sku, default_purchase_price, default_sell_price, created_at)
    VALUES ('DUMMY', v_product_2, 'MOB-SAM-001', 55000.00, 62000.00, NOW())
    RETURNING id INTO v_var_2;
    
    INSERT INTO products (name, business_id, type, unit_id, sku, category_id, alert_quantity, created_at)
    VALUES ('Cotton T-Shirt', v_business_id, 'single', v_unit_piece, 'CLO-TSH-001', v_cat_clothing, 20, NOW())
    RETURNING id INTO v_product_3;
    INSERT INTO variations (name, product_id, sub_sku, default_purchase_price, default_sell_price, created_at)
    VALUES ('DUMMY', v_product_3, 'CLO-TSH-001', 800.00, 1200.00, NOW())
    RETURNING id INTO v_var_3;
    
    INSERT INTO products (name, business_id, type, unit_id, sku, category_id, alert_quantity, created_at)
    VALUES ('Basmati Rice 5kg', v_business_id, 'single', v_unit_kg, 'FOOD-RICE-001', v_cat_food, 50, NOW())
    RETURNING id INTO v_product_4;
    INSERT INTO variations (name, product_id, sub_sku, default_purchase_price, default_sell_price, created_at)
    VALUES ('DUMMY', v_product_4, 'FOOD-RICE-001', 450.00, 550.00, NOW())
    RETURNING id INTO v_var_4;
    
    INSERT INTO products (name, business_id, type, unit_id, sku, category_id, alert_quantity, created_at)
    VALUES ('Wireless Headphones', v_business_id, 'single', v_unit_piece, 'ELEC-HP-001', v_cat_electronics, 15, NOW())
    RETURNING id INTO v_product_5;
    INSERT INTO variations (name, product_id, sub_sku, default_purchase_price, default_sell_price, created_at)
    VALUES ('DUMMY', v_product_5, 'ELEC-HP-001', 2500.00, 3500.00, NOW())
    RETURNING id INTO v_var_5;
    
    RAISE NOTICE '  ✅ Products & Variations created: 5';
    
    -- ========================================================================
    -- 3.6: Insert Branch Inventory
    -- ========================================================================
    
    INSERT INTO variation_location_details (product_id, product_variation_id, variation_id, location_id, qty_available, created_at)
    VALUES 
        (v_product_1, v_var_1, v_var_1, v_branch_1_id, 8.00, NOW()),
        (v_product_2, v_var_2, v_var_2, v_branch_1_id, 15.00, NOW()),
        (v_product_3, v_var_3, v_var_3, v_branch_1_id, 45.00, NOW()),
        (v_product_4, v_var_4, v_var_4, v_branch_1_id, 120.00, NOW()),
        (v_product_5, v_var_5, v_var_5, v_branch_1_id, 20.00, NOW()),
        (v_product_1, v_var_1, v_var_1, v_branch_2_id, 5.00, NOW()),
        (v_product_2, v_var_2, v_var_2, v_branch_2_id, 25.00, NOW()),
        (v_product_3, v_var_3, v_var_3, v_branch_2_id, 60.00, NOW()),
        (v_product_4, v_var_4, v_var_4, v_branch_2_id, 80.00, NOW()),
        (v_product_5, v_var_5, v_var_5, v_branch_2_id, 12.00, NOW()),
        (v_product_1, v_var_1, v_var_1, v_branch_3_id, 20.00, NOW()),
        (v_product_2, v_var_2, v_var_2, v_branch_3_id, 50.00, NOW()),
        (v_product_3, v_var_3, v_var_3, v_branch_3_id, 200.00, NOW()),
        (v_product_4, v_var_4, v_var_4, v_branch_3_id, 500.00, NOW()),
        (v_product_5, v_var_5, v_var_5, v_branch_3_id, 80.00, NOW());
    
    RAISE NOTICE '  ✅ Inventory distributed: 15 records (5 products × 3 branches)';
    
    -- ========================================================================
    -- 3.7: Insert Purchases
    -- ========================================================================
    
    INSERT INTO transactions (type, business_id, location_id, contact_id, transaction_date, status, payment_status, final_total, created_at)
    VALUES 
        ('purchase', v_business_id, v_branch_1_id, v_supplier_1, NOW() - INTERVAL '10 days', 'final', 'paid', 425000.00, NOW() - INTERVAL '10 days'),
        ('purchase', v_business_id, v_branch_2_id, v_supplier_2, NOW() - INTERVAL '7 days', 'final', 'paid', 180000.00, NOW() - INTERVAL '7 days');
    
    -- Insert purchase lines for first purchase
    INSERT INTO transaction_purchase_lines (transaction_id, product_id, variation_id, quantity, purchase_price_inc_tax, created_at)
    SELECT CURRVAL('transactions_id_seq'), v_product_1, v_var_1, 5, 85000.00, NOW() - INTERVAL '10 days'
    WHERE CURRVAL('transactions_id_seq') = (SELECT id FROM transactions WHERE business_id = v_business_id ORDER BY id DESC LIMIT 1 OFFSET 1);
    
    -- Insert purchase lines for second purchase
    INSERT INTO transaction_purchase_lines (transaction_id, product_id, variation_id, quantity, purchase_price_inc_tax, created_at)
    SELECT CURRVAL('transactions_id_seq'), v_product_2, v_var_2, 20, 55000.00, NOW() - INTERVAL '7 days'
    WHERE CURRVAL('transactions_id_seq') = (SELECT id FROM transactions WHERE business_id = v_business_id ORDER BY id DESC LIMIT 1);
    
    RAISE NOTICE '  ✅ Purchases created: 2';
    
    -- ========================================================================
    -- 3.8: Insert Sales
    -- ========================================================================
    
    INSERT INTO transactions (type, business_id, location_id, contact_id, transaction_date, status, payment_status, invoice_no, final_total, created_at)
    VALUES 
        ('sell', v_business_id, v_branch_1_id, v_customer_1, NOW() - INTERVAL '5 days', 'final', 'paid', 'INV-MB-001', 95000.00, NOW() - INTERVAL '5 days'),
        ('sell', v_business_id, v_branch_2_id, v_customer_2, NOW() - INTERVAL '3 days', 'final', 'paid', 'INV-CO-001', 65500.00, NOW() - INTERVAL '3 days'),
        ('sell', v_business_id, v_branch_1_id, v_customer_3, NOW() - INTERVAL '2 days', 'final', 'paid', 'INV-MB-002', 4150.00, NOW() - INTERVAL '2 days'),
        ('sell', v_business_id, v_branch_2_id, v_customer_5, NOW() - INTERVAL '1 day', 'final', 'paid', 'INV-CO-002', 3500.00, NOW() - INTERVAL '1 day'),
        ('sell', v_business_id, v_branch_1_id, v_customer_4, NOW(), 'final', 'paid', 'INV-MB-003', 62000.00, NOW());
    
    -- Insert sale lines (simplified - just quantities for demo)
    DECLARE
        v_sale_ids INTEGER[];
    BEGIN
        SELECT ARRAY_AGG(id ORDER BY id DESC) INTO v_sale_ids
        FROM transactions
        WHERE business_id = v_business_id
        AND type = 'sell'
        LIMIT 5;
        
        -- Sale 1: Laptop
        INSERT INTO transaction_sell_lines (transaction_id, product_id, variation_id, quantity, unit_price_inc_tax, created_at)
        VALUES (v_sale_ids[5], v_product_1, v_var_1, 1, 95000.00, NOW() - INTERVAL '5 days');
        
        -- Sale 2: Mobile + Headphones
        INSERT INTO transaction_sell_lines (transaction_id, product_id, variation_id, quantity, unit_price_inc_tax, created_at)
        VALUES 
            (v_sale_ids[4], v_product_2, v_var_2, 1, 62000.00, NOW() - INTERVAL '3 days'),
            (v_sale_ids[4], v_product_5, v_var_5, 1, 3500.00, NOW() - INTERVAL '3 days');
        
        -- Sale 3: T-shirts + Rice
        INSERT INTO transaction_sell_lines (transaction_id, product_id, variation_id, quantity, unit_price_inc_tax, created_at)
        VALUES 
            (v_sale_ids[3], v_product_3, v_var_3, 3, 1200.00, NOW() - INTERVAL '2 days'),
            (v_sale_ids[3], v_product_4, v_var_4, 1, 550.00, NOW() - INTERVAL '2 days');
        
        -- Sale 4: Headphones
        INSERT INTO transaction_sell_lines (transaction_id, product_id, variation_id, quantity, unit_price_inc_tax, created_at)
        VALUES (v_sale_ids[2], v_product_5, v_var_5, 1, 3500.00, NOW() - INTERVAL '1 day');
        
        -- Sale 5: Mobile
        INSERT INTO transaction_sell_lines (transaction_id, product_id, variation_id, quantity, unit_price_inc_tax, created_at)
        VALUES (v_sale_ids[1], v_product_2, v_var_2, 1, 62000.00, NOW());
    END;
    
    RAISE NOTICE '  ✅ Sales created: 5 with line items';
    
    RAISE NOTICE '✅ FRESH DEMO DATA SEEDING COMPLETE';
    
END $$;

COMMIT;

-- ============================================================================
-- PHASE 4: AUTO-VALIDATION
-- ============================================================================

SELECT '========== VALIDATION REPORT ==========' as report;

DO $$
DECLARE
    v_business_id INTEGER;
    v_null_count INTEGER;
BEGIN
    SELECT business_id INTO v_business_id FROM temp_demo_business;
    
    -- Check for NULL location_ids
    SELECT COUNT(*) INTO v_null_count
    FROM transactions
    WHERE business_id = v_business_id
    AND location_id IS NULL;
    
    IF v_null_count > 0 THEN
        RAISE WARNING '❌ VALIDATION FAILED: % transactions have NULL location_id', v_null_count;
    ELSE
        RAISE NOTICE '✅ VALIDATION PASSED: All transactions have location_id';
    END IF;
    
    SELECT COUNT(*) INTO v_null_count
    FROM variation_location_details vld
    JOIN business_locations bl ON bl.id = vld.location_id
    WHERE bl.business_id = v_business_id
    AND vld.location_id IS NULL;
    
    IF v_null_count > 0 THEN
        RAISE WARNING '❌ VALIDATION FAILED: % inventory records have NULL location_id', v_null_count;
    ELSE
        RAISE NOTICE '✅ VALIDATION PASSED: All inventory has location_id';
    END IF;
    
END $$;

-- Branch-wise data distribution
SELECT 
    bl.name as branch_name,
    bl.custom_field1 as branch_code,
    COUNT(DISTINCT vld.id) as inventory_items,
    COALESCE(SUM(vld.qty_available), 0) as total_stock,
    COUNT(DISTINCT t.id) FILTER (WHERE t.type = 'sell') as sales_count,
    COALESCE(SUM(t.final_total) FILTER (WHERE t.type = 'sell'), 0) as sales_revenue
FROM business_locations bl
JOIN temp_demo_business tdb ON bl.business_id = tdb.business_id
LEFT JOIN variation_location_details vld ON vld.location_id = bl.id
LEFT JOIN transactions t ON t.location_id = bl.id
WHERE bl.deleted_at IS NULL
GROUP BY bl.id, bl.name, bl.custom_field1
ORDER BY bl.id;

-- Overall counts
SELECT 
    'Demo Account Summary' as summary,
    tdb.business_name as business,
    (SELECT COUNT(*) FROM business_locations WHERE business_id = tdb.business_id AND deleted_at IS NULL) as branches,
    (SELECT COUNT(*) FROM products WHERE business_id = tdb.business_id) as products,
    (SELECT COUNT(*) FROM contacts WHERE business_id = tdb.business_id) as contacts,
    (SELECT COUNT(*) FROM transactions WHERE business_id = tdb.business_id AND type = 'sell') as sales,
    (SELECT COUNT(*) FROM variation_location_details vld JOIN business_locations bl ON bl.id = vld.location_id WHERE bl.business_id = tdb.business_id) as inventory_records
FROM temp_demo_business tdb;

SELECT '========== VALIDATION COMPLETE ==========' as report;

-- Cleanup temp table
DROP TABLE IF EXISTS temp_demo_business;

-- ============================================================================
-- END OF AUTO-RESET SCRIPT
-- ============================================================================
