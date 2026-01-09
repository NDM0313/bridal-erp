-- ============================================================================
-- RESET AND SEED DEMO DATA FOR POS/ERP SYSTEM
-- Date: January 8, 2026
-- Purpose: Clean old demo data and insert fresh, realistic test data
-- ============================================================================

-- ============================================================================
-- PHASE 1: SAFE DEMO DATA CLEANUP (Respecting FK constraints)
-- ============================================================================

BEGIN;

-- Step 1: Delete transaction line items first (deepest children)
DELETE FROM transaction_sell_lines;
DELETE FROM transaction_purchase_lines;
DELETE FROM sale_items;
DELETE FROM purchase_items;
DELETE FROM purchase_lines;
DELETE FROM stock_adjustment_lines;
DELETE FROM stock_transfer_lines;

RAISE NOTICE '✅ Deleted transaction line items';

-- Step 2: Delete parent transactions
DELETE FROM transactions;
DELETE FROM sales;
DELETE FROM purchases;

RAISE NOTICE '✅ Deleted transactions, sales, purchases';

-- Step 3: Delete inventory and stock data
DELETE FROM variation_location_details;
DELETE FROM branch_inventory;

RAISE NOTICE '✅ Deleted inventory data';

-- Step 4: Delete product variations and products
DELETE FROM variations;
DELETE FROM products;

RAISE NOTICE '✅ Deleted products and variations';

-- Step 5: Delete contacts (customers & suppliers)
DELETE FROM contacts;

RAISE NOTICE '✅ Deleted contacts';

-- Step 6: Delete financial/accounting data
DELETE FROM account_transactions;
DELETE FROM fund_transfers;
DELETE FROM salesman_ledgers;

RAISE NOTICE '✅ Deleted accounting data';

-- Step 7: Delete categories and units (but keep if needed)
DELETE FROM categories WHERE business_id IS NOT NULL;
DELETE FROM units WHERE business_id IS NOT NULL;

RAISE NOTICE '✅ Deleted categories and units';

-- Step 8: Keep businesses, business_locations, user_profiles, organizations
-- (These are the foundation - don't delete)

RAISE NOTICE '✅ CLEANUP COMPLETE - Schema, RLS, and businesses preserved';

COMMIT;

-- ============================================================================
-- PHASE 2: VERIFY CLEANUP
-- ============================================================================

SELECT 
    'After Cleanup' as phase,
    (SELECT COUNT(*) FROM businesses) as businesses,
    (SELECT COUNT(*) FROM business_locations) as branches,
    (SELECT COUNT(*) FROM user_profiles) as users,
    (SELECT COUNT(*) FROM products) as products,
    (SELECT COUNT(*) FROM contacts) as contacts,
    (SELECT COUNT(*) FROM transactions) as transactions,
    (SELECT COUNT(*) FROM variation_location_details) as inventory;

-- ============================================================================
-- PHASE 3: INSERT FRESH DEMO DATA
-- ============================================================================

BEGIN;

-- ============================================================================
-- 3.1: Get existing business and branches
-- ============================================================================

DO $$
DECLARE
    v_business_id INTEGER;
    v_branch_1_id INTEGER;
    v_branch_2_id INTEGER;
    v_branch_3_id INTEGER;
    v_owner_id UUID;
    
    -- Categories
    v_cat_electronics INTEGER;
    v_cat_clothing INTEGER;
    v_cat_food INTEGER;
    
    -- Units
    v_unit_piece INTEGER;
    v_unit_kg INTEGER;
    
    -- Contacts
    v_customer_1 INTEGER;
    v_customer_2 INTEGER;
    v_customer_3 INTEGER;
    v_customer_4 INTEGER;
    v_customer_5 INTEGER;
    v_supplier_1 INTEGER;
    v_supplier_2 INTEGER;
    v_supplier_3 INTEGER;
    
    -- Products
    v_product_1 INTEGER;
    v_product_2 INTEGER;
    v_product_3 INTEGER;
    v_product_4 INTEGER;
    v_product_5 INTEGER;
    
    -- Variations
    v_var_1 INTEGER;
    v_var_2 INTEGER;
    v_var_3 INTEGER;
    v_var_4 INTEGER;
    v_var_5 INTEGER;
    
    -- Transactions
    v_sale_1 INTEGER;
    v_sale_2 INTEGER;
    v_sale_3 INTEGER;
    v_purchase_1 INTEGER;
    v_purchase_2 INTEGER;

BEGIN
    -- Get first business (Studio Rently POS)
    SELECT id, owner_id INTO v_business_id, v_owner_id
    FROM businesses
    ORDER BY id
    LIMIT 1;
    
    RAISE NOTICE '📊 Using business_id: %', v_business_id;
    
    -- Ensure we have exactly 3 branches for this business
    -- Update existing branches or create new ones
    
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
            is_active = 1,
            deleted_at = NULL
        WHERE id = v_branch_1_id;
    ELSE
        INSERT INTO business_locations (business_id, name, landmark, custom_field1, mobile, is_active)
        VALUES (v_business_id, 'Main Branch', 'Downtown Plaza, Main Street', 'MB-001', '+92-300-1234567', 1)
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
            is_active = 1,
            deleted_at = NULL
        WHERE id = v_branch_2_id;
    ELSE
        INSERT INTO business_locations (business_id, name, landmark, custom_field1, mobile, is_active)
        VALUES (v_business_id, 'City Outlet', 'Shopping Mall, 2nd Floor', 'CO-002', '+92-300-2345678', 1)
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
            is_active = 1,
            deleted_at = NULL
        WHERE id = v_branch_3_id;
    ELSE
        INSERT INTO business_locations (business_id, name, landmark, custom_field1, mobile, is_active)
        VALUES (v_business_id, 'Warehouse', 'Industrial Area, Sector 15', 'WH-003', '+92-300-3456789', 1)
        RETURNING id INTO v_branch_3_id;
    END IF;
    
    RAISE NOTICE '🏢 Branches configured: %, %, %', v_branch_1_id, v_branch_2_id, v_branch_3_id;
    
    -- ============================================================================
    -- 3.2: Insert Categories
    -- ============================================================================
    
    INSERT INTO categories (business_id, name, short_code, created_at)
    VALUES (v_business_id, 'Electronics', 'ELEC', NOW())
    RETURNING id INTO v_cat_electronics;
    
    INSERT INTO categories (business_id, name, short_code, created_at)
    VALUES (v_business_id, 'Clothing', 'CLOTH', NOW())
    RETURNING id INTO v_cat_clothing;
    
    INSERT INTO categories (business_id, name, short_code, created_at)
    VALUES (v_business_id, 'Food & Beverages', 'FOOD', NOW())
    RETURNING id INTO v_cat_food;
    
    RAISE NOTICE '📁 Categories created';
    
    -- ============================================================================
    -- 3.3: Insert Units
    -- ============================================================================
    
    INSERT INTO units (business_id, actual_name, short_name, allow_decimal, created_at)
    VALUES (v_business_id, 'Piece', 'Pc', 0, NOW())
    RETURNING id INTO v_unit_piece;
    
    INSERT INTO units (business_id, actual_name, short_name, allow_decimal, created_at)
    VALUES (v_business_id, 'Kilogram', 'Kg', 1, NOW())
    RETURNING id INTO v_unit_kg;
    
    RAISE NOTICE '📏 Units created';
    
    -- ============================================================================
    -- 3.4: Insert Contacts (Customers & Suppliers)
    -- ============================================================================
    
    -- Customers
    INSERT INTO contacts (business_id, type, name, mobile, email, city, created_at)
    VALUES (v_business_id, 'customer', 'Ahmed Khan', '+92-300-1111111', 'ahmed@example.com', 'Rawalpindi', NOW())
    RETURNING id INTO v_customer_1;
    
    INSERT INTO contacts (business_id, type, name, mobile, email, city, created_at)
    VALUES (v_business_id, 'customer', 'Fatima Ali', '+92-300-2222222', 'fatima@example.com', 'Islamabad', NOW())
    RETURNING id INTO v_customer_2;
    
    INSERT INTO contacts (business_id, type, name, mobile, email, city, created_at)
    VALUES (v_business_id, 'customer', 'Hassan Raza', '+92-300-3333333', 'hassan@example.com', 'Rawalpindi', NOW())
    RETURNING id INTO v_customer_3;
    
    INSERT INTO contacts (business_id, type, name, mobile, email, city, created_at)
    VALUES (v_business_id, 'customer', 'Ayesha Malik', '+92-300-4444444', 'ayesha@example.com', 'Islamabad', NOW())
    RETURNING id INTO v_customer_4;
    
    INSERT INTO contacts (business_id, type, name, mobile, email, city, created_at)
    VALUES (v_business_id, 'customer', 'Walk-in Customer', NULL, NULL, NULL, NOW())
    RETURNING id INTO v_customer_5;
    
    -- Suppliers
    INSERT INTO contacts (business_id, type, name, mobile, email, city, created_at)
    VALUES (v_business_id, 'supplier', 'Tech Suppliers Ltd', '+92-51-1234567', 'info@techsuppliers.com', 'Islamabad', NOW())
    RETURNING id INTO v_supplier_1;
    
    INSERT INTO contacts (business_id, type, name, mobile, email, city, created_at)
    VALUES (v_business_id, 'supplier', 'Wholesale Traders', '+92-51-2345678', 'sales@wholesalers.com', 'Rawalpindi', NOW())
    RETURNING id INTO v_supplier_2;
    
    INSERT INTO contacts (business_id, type, name, mobile, email, city, created_at)
    VALUES (v_business_id, 'supplier', 'Import House', '+92-51-3456789', 'orders@importhouse.com', 'Islamabad', NOW())
    RETURNING id INTO v_supplier_3;
    
    RAISE NOTICE '👥 Contacts created: 5 customers, 3 suppliers';
    
    -- ============================================================================
    -- 3.5: Insert Products & Variations
    -- ============================================================================
    
    -- Product 1: Laptop
    INSERT INTO products (name, business_id, type, unit_id, sku, category_id, alert_quantity, created_at)
    VALUES ('Laptop HP ProBook', v_business_id, 'single', v_unit_piece, 'LAP-HP-001', v_cat_electronics, 5, NOW())
    RETURNING id INTO v_product_1;
    
    INSERT INTO variations (name, product_id, sub_sku, default_purchase_price, default_sell_price, created_at)
    VALUES ('DUMMY', v_product_1, 'LAP-HP-001', 85000.00, 95000.00, NOW())
    RETURNING id INTO v_var_1;
    
    -- Product 2: Mobile Phone
    INSERT INTO products (name, business_id, type, unit_id, sku, category_id, alert_quantity, created_at)
    VALUES ('Samsung Galaxy A54', v_business_id, 'single', v_unit_piece, 'MOB-SAM-001', v_cat_electronics, 10, NOW())
    RETURNING id INTO v_product_2;
    
    INSERT INTO variations (name, product_id, sub_sku, default_purchase_price, default_sell_price, created_at)
    VALUES ('DUMMY', v_product_2, 'MOB-SAM-001', 55000.00, 62000.00, NOW())
    RETURNING id INTO v_var_2;
    
    -- Product 3: T-Shirt
    INSERT INTO products (name, business_id, type, unit_id, sku, category_id, alert_quantity, created_at)
    VALUES ('Cotton T-Shirt', v_business_id, 'single', v_unit_piece, 'CLO-TSH-001', v_cat_clothing, 20, NOW())
    RETURNING id INTO v_product_3;
    
    INSERT INTO variations (name, product_id, sub_sku, default_purchase_price, default_sell_price, created_at)
    VALUES ('DUMMY', v_product_3, 'CLO-TSH-001', 800.00, 1200.00, NOW())
    RETURNING id INTO v_var_3;
    
    -- Product 4: Rice (5kg bag)
    INSERT INTO products (name, business_id, type, unit_id, sku, category_id, alert_quantity, created_at)
    VALUES ('Basmati Rice 5kg', v_business_id, 'single', v_unit_kg, 'FOOD-RICE-001', v_cat_food, 50, NOW())
    RETURNING id INTO v_product_4;
    
    INSERT INTO variations (name, product_id, sub_sku, default_purchase_price, default_sell_price, created_at)
    VALUES ('DUMMY', v_product_4, 'FOOD-RICE-001', 450.00, 550.00, NOW())
    RETURNING id INTO v_var_4;
    
    -- Product 5: Headphones
    INSERT INTO products (name, business_id, type, unit_id, sku, category_id, alert_quantity, created_at)
    VALUES ('Wireless Headphones', v_business_id, 'single', v_unit_piece, 'ELEC-HP-001', v_cat_electronics, 15, NOW())
    RETURNING id INTO v_product_5;
    
    INSERT INTO variations (name, product_id, sub_sku, default_purchase_price, default_sell_price, created_at)
    VALUES ('DUMMY', v_product_5, 'ELEC-HP-001', 2500.00, 3500.00, NOW())
    RETURNING id INTO v_var_5;
    
    RAISE NOTICE '📦 Products created: 5 products with variations';
    
    -- ============================================================================
    -- 3.6: Insert Branch Inventory (variation_location_details)
    -- ============================================================================
    
    -- Main Branch inventory
    INSERT INTO variation_location_details (product_id, product_variation_id, variation_id, location_id, qty_available, created_at)
    VALUES 
        (v_product_1, v_var_1, v_var_1, v_branch_1_id, 8.00, NOW()),
        (v_product_2, v_var_2, v_var_2, v_branch_1_id, 15.00, NOW()),
        (v_product_3, v_var_3, v_var_3, v_branch_1_id, 45.00, NOW()),
        (v_product_4, v_var_4, v_var_4, v_branch_1_id, 120.00, NOW()),
        (v_product_5, v_var_5, v_var_5, v_branch_1_id, 20.00, NOW());
    
    -- City Outlet inventory (different quantities)
    INSERT INTO variation_location_details (product_id, product_variation_id, variation_id, location_id, qty_available, created_at)
    VALUES 
        (v_product_1, v_var_1, v_var_1, v_branch_2_id, 5.00, NOW()),
        (v_product_2, v_var_2, v_var_2, v_branch_2_id, 25.00, NOW()),
        (v_product_3, v_var_3, v_var_3, v_branch_2_id, 60.00, NOW()),
        (v_product_4, v_var_4, v_var_4, v_branch_2_id, 80.00, NOW()),
        (v_product_5, v_var_5, v_var_5, v_branch_2_id, 12.00, NOW());
    
    -- Warehouse inventory (highest quantities)
    INSERT INTO variation_location_details (product_id, product_variation_id, variation_id, location_id, qty_available, created_at)
    VALUES 
        (v_product_1, v_var_1, v_var_1, v_branch_3_id, 20.00, NOW()),
        (v_product_2, v_var_2, v_var_2, v_branch_3_id, 50.00, NOW()),
        (v_product_3, v_var_3, v_var_3, v_branch_3_id, 200.00, NOW()),
        (v_product_4, v_var_4, v_var_4, v_branch_3_id, 500.00, NOW()),
        (v_product_5, v_var_5, v_var_5, v_branch_3_id, 80.00, NOW());
    
    RAISE NOTICE '📊 Inventory distributed across 3 branches';
    
    -- ============================================================================
    -- 3.7: Insert Purchases (from suppliers to branches)
    -- ============================================================================
    
    -- Purchase 1: To Main Branch
    INSERT INTO transactions (
        type, business_id, location_id, contact_id, 
        transaction_date, status, payment_status,
        final_total, created_at
    )
    VALUES (
        'purchase', v_business_id, v_branch_1_id, v_supplier_1,
        NOW() - INTERVAL '10 days', 'final', 'paid',
        425000.00, NOW() - INTERVAL '10 days'
    )
    RETURNING id INTO v_purchase_1;
    
    INSERT INTO transaction_purchase_lines (transaction_id, product_id, variation_id, quantity, purchase_price_inc_tax, created_at)
    VALUES 
        (v_purchase_1, v_product_1, v_var_1, 5, 85000.00, NOW() - INTERVAL '10 days'),
        (v_purchase_1, v_product_2, v_var_2, 0, 55000.00, NOW() - INTERVAL '10 days');
    
    -- Purchase 2: To City Outlet
    INSERT INTO transactions (
        type, business_id, location_id, contact_id,
        transaction_date, status, payment_status,
        final_total, created_at
    )
    VALUES (
        'purchase', v_business_id, v_branch_2_id, v_supplier_2,
        NOW() - INTERVAL '7 days', 'final', 'paid',
        180000.00, NOW() - INTERVAL '7 days'
    )
    RETURNING id INTO v_purchase_2;
    
    INSERT INTO transaction_purchase_lines (transaction_id, product_id, variation_id, quantity, purchase_price_inc_tax, created_at)
    VALUES 
        (v_purchase_2, v_product_2, v_var_2, 20, 55000.00, NOW() - INTERVAL '7 days'),
        (v_purchase_2, v_product_5, v_var_5, 40, 2500.00, NOW() - INTERVAL '7 days');
    
    RAISE NOTICE '🛒 Purchases created: 2 purchase orders';
    
    -- ============================================================================
    -- 3.8: Insert Sales (to customers from different branches)
    -- ============================================================================
    
    -- Sale 1: Main Branch - Laptop sale
    INSERT INTO transactions (
        type, business_id, location_id, contact_id,
        transaction_date, status, payment_status,
        invoice_no, final_total, created_at
    )
    VALUES (
        'sell', v_business_id, v_branch_1_id, v_customer_1,
        NOW() - INTERVAL '5 days', 'final', 'paid',
        'INV-MB-001', 95000.00, NOW() - INTERVAL '5 days'
    )
    RETURNING id INTO v_sale_1;
    
    INSERT INTO transaction_sell_lines (transaction_id, product_id, variation_id, quantity, unit_price_inc_tax, created_at)
    VALUES (v_sale_1, v_product_1, v_var_1, 1, 95000.00, NOW() - INTERVAL '5 days');
    
    -- Sale 2: City Outlet - Mobile + Headphones
    INSERT INTO transactions (
        type, business_id, location_id, contact_id,
        transaction_date, status, payment_status,
        invoice_no, final_total, created_at
    )
    VALUES (
        'sell', v_business_id, v_branch_2_id, v_customer_2,
        NOW() - INTERVAL '3 days', 'final', 'paid',
        'INV-CO-001', 65500.00, NOW() - INTERVAL '3 days'
    )
    RETURNING id INTO v_sale_2;
    
    INSERT INTO transaction_sell_lines (transaction_id, product_id, variation_id, quantity, unit_price_inc_tax, created_at)
    VALUES 
        (v_sale_2, v_product_2, v_var_2, 1, 62000.00, NOW() - INTERVAL '3 days'),
        (v_sale_2, v_product_5, v_var_5, 1, 3500.00, NOW() - INTERVAL '3 days');
    
    -- Sale 3: Main Branch - T-shirts + Rice
    INSERT INTO transactions (
        type, business_id, location_id, contact_id,
        transaction_date, status, payment_status,
        invoice_no, final_total, created_at
    )
    VALUES (
        'sell', v_business_id, v_branch_1_id, v_customer_3,
        NOW() - INTERVAL '2 days', 'final', 'paid',
        'INV-MB-002', 4150.00, NOW() - INTERVAL '2 days'
    )
    RETURNING id INTO v_sale_3;
    
    INSERT INTO transaction_sell_lines (transaction_id, product_id, variation_id, quantity, unit_price_inc_tax, created_at)
    VALUES 
        (v_sale_3, v_product_3, v_var_3, 3, 1200.00, NOW() - INTERVAL '2 days'),
        (v_sale_3, v_product_4, v_var_4, 1, 550.00, NOW() - INTERVAL '2 days');
    
    -- Sale 4: City Outlet - Walk-in customer
    INSERT INTO transactions (
        type, business_id, location_id, contact_id,
        transaction_date, status, payment_status,
        invoice_no, final_total, created_at
    )
    VALUES (
        'sell', v_business_id, v_branch_2_id, v_customer_5,
        NOW() - INTERVAL '1 day', 'final', 'paid',
        'INV-CO-002', 3500.00, NOW() - INTERVAL '1 day'
    );
    
    INSERT INTO transaction_sell_lines (transaction_id, product_id, variation_id, quantity, unit_price_inc_tax, created_at)
    VALUES (LASTVAL(), v_product_5, v_var_5, 1, 3500.00, NOW() - INTERVAL '1 day');
    
    -- Sale 5: Main Branch - Today's sale
    INSERT INTO transactions (
        type, business_id, location_id, contact_id,
        transaction_date, status, payment_status,
        invoice_no, final_total, created_at
    )
    VALUES (
        'sell', v_business_id, v_branch_1_id, v_customer_4,
        NOW(), 'final', 'paid',
        'INV-MB-003', 62000.00, NOW()
    );
    
    INSERT INTO transaction_sell_lines (transaction_id, product_id, variation_id, quantity, unit_price_inc_tax, created_at)
    VALUES (LASTVAL(), v_product_2, v_var_2, 1, 62000.00, NOW());
    
    RAISE NOTICE '💰 Sales created: 5 sales across branches';
    
    RAISE NOTICE '✅ FRESH DEMO DATA SEEDING COMPLETE';
    
END $$;

COMMIT;

-- ============================================================================
-- PHASE 4: DATA VALIDATION
-- ============================================================================

SELECT '========== DATA VALIDATION REPORT ==========' as report;

-- Check 1: Verify no NULL location_ids
SELECT 
    'NULL location_id check' as test_name,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PASS'
        ELSE '❌ FAIL: ' || COUNT(*) || ' records have NULL location_id'
    END as result
FROM (
    SELECT location_id FROM transactions WHERE location_id IS NULL
    UNION ALL
    SELECT location_id FROM variation_location_details WHERE location_id IS NULL
) nulls;

-- Check 2: Branch-wise data counts
SELECT 
    bl.name as branch_name,
    bl.custom_field1 as branch_code,
    COUNT(DISTINCT vld.id) as inventory_items,
    COUNT(DISTINCT t.id) FILTER (WHERE t.type = 'sell') as sales_count,
    COUNT(DISTINCT t.id) FILTER (WHERE t.type = 'purchase') as purchase_count,
    COALESCE(SUM(t.final_total) FILTER (WHERE t.type = 'sell'), 0) as total_sales_amount
FROM business_locations bl
LEFT JOIN variation_location_details vld ON vld.location_id = bl.id
LEFT JOIN transactions t ON t.location_id = bl.id
WHERE bl.deleted_at IS NULL
GROUP BY bl.id, bl.name, bl.custom_field1
ORDER BY bl.id;

-- Check 3: Overall table counts
SELECT 
    'Overall Counts' as summary,
    (SELECT COUNT(*) FROM businesses) as businesses,
    (SELECT COUNT(*) FROM business_locations WHERE deleted_at IS NULL) as branches,
    (SELECT COUNT(*) FROM products) as products,
    (SELECT COUNT(*) FROM variations) as variations,
    (SELECT COUNT(*) FROM contacts) as contacts,
    (SELECT COUNT(*) FROM categories) as categories,
    (SELECT COUNT(*) FROM variation_location_details) as inventory_records,
    (SELECT COUNT(*) FROM transactions WHERE type = 'sell') as sales,
    (SELECT COUNT(*) FROM transactions WHERE type = 'purchase') as purchases,
    (SELECT COUNT(*) FROM transaction_sell_lines) as sale_line_items,
    (SELECT COUNT(*) FROM transaction_purchase_lines) as purchase_line_items;

-- Check 4: Revenue by branch
SELECT 
    bl.name as branch,
    COALESCE(SUM(t.final_total), 0) as total_revenue,
    COUNT(t.id) as transaction_count
FROM business_locations bl
LEFT JOIN transactions t ON t.location_id = bl.id AND t.type = 'sell' AND t.status = 'final'
WHERE bl.deleted_at IS NULL
GROUP BY bl.id, bl.name
ORDER BY total_revenue DESC;

SELECT '========== VALIDATION COMPLETE ==========' as report;

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
