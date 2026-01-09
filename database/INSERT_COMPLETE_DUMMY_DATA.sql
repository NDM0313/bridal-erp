-- ============================================================================
-- COMPLETE DUMMY DATA INSERT - Full ERP System
-- Auto mode - No manual steps required
-- ============================================================================

BEGIN;

DO $$
DECLARE
    -- Business & Owner
    v_business_id INTEGER := 1;
    v_owner_id UUID;
    
    -- Branches (already exist, just get IDs)
    v_branch_main INTEGER;
    v_branch_city INTEGER;
    v_branch_warehouse INTEGER;
    
    -- Categories & Units
    v_cat_electronics INTEGER;
    v_cat_clothing INTEGER;
    v_cat_grocery INTEGER;
    v_unit_piece INTEGER;
    v_unit_kg INTEGER;
    v_unit_box INTEGER;
    
    -- Contacts
    v_cust_1 INTEGER; v_cust_2 INTEGER; v_cust_3 INTEGER; v_cust_4 INTEGER; v_cust_5 INTEGER;
    v_supp_1 INTEGER; v_supp_2 INTEGER; v_supp_3 INTEGER;
    
    -- Products
    v_prod_1 INTEGER; v_prod_2 INTEGER; v_prod_3 INTEGER; 
    v_prod_4 INTEGER; v_prod_5 INTEGER; v_prod_6 INTEGER;
    
    -- Product Variations
    v_pvar_1 INTEGER; v_pvar_2 INTEGER; v_pvar_3 INTEGER;
    v_pvar_4 INTEGER; v_pvar_5 INTEGER; v_pvar_6 INTEGER;
    
    -- Financial Accounts
    v_acc_cash INTEGER;
    v_acc_bank INTEGER;
    v_acc_sales INTEGER;
    v_acc_expense INTEGER;
    
BEGIN
    -- Get owner ID
    SELECT owner_id INTO v_owner_id FROM businesses WHERE id = v_business_id;
    
    -- Get existing branch IDs
    SELECT id INTO v_branch_main FROM business_locations WHERE business_id = v_business_id ORDER BY id LIMIT 1;
    SELECT id INTO v_branch_city FROM business_locations WHERE business_id = v_business_id ORDER BY id LIMIT 1 OFFSET 1;
    SELECT id INTO v_branch_warehouse FROM business_locations WHERE business_id = v_business_id ORDER BY id LIMIT 1 OFFSET 2;
    
    RAISE NOTICE '🎯 Demo Business: %, Owner: %', v_business_id, v_owner_id;
    RAISE NOTICE '🏢 Branches: Main=%, City=%, Warehouse=%', v_branch_main, v_branch_city, v_branch_warehouse;
    RAISE NOTICE '';
    RAISE NOTICE '📦 Inserting complete dummy data...';
    
    -- ========================================================================
    -- 1. CATEGORIES & UNITS
    -- ========================================================================
    
    INSERT INTO categories (business_id, name, short_code, created_by, created_at, updated_at)
    VALUES 
        (v_business_id, 'Electronics', 'ELEC', v_owner_id, NOW(), NOW()),
        (v_business_id, 'Clothing', 'CLOTH', v_owner_id, NOW(), NOW()),
        (v_business_id, 'Grocery', 'GROC', v_owner_id, NOW(), NOW())
    RETURNING id INTO v_cat_electronics, v_cat_clothing, v_cat_grocery;
    
    INSERT INTO units (business_id, actual_name, short_name, allow_decimal, created_by, created_at, updated_at)
    VALUES 
        (v_business_id, 'Piece', 'Pc', FALSE, v_owner_id, NOW(), NOW()),
        (v_business_id, 'Kilogram', 'Kg', TRUE, v_owner_id, NOW(), NOW()),
        (v_business_id, 'Box', 'Box', FALSE, v_owner_id, NOW(), NOW())
    RETURNING id INTO v_unit_piece, v_unit_kg, v_unit_box;
    
    RAISE NOTICE '  ✅ Categories (3) & Units (3)';
    
    -- ========================================================================
    -- 2. CONTACTS (Customers & Suppliers)
    -- ========================================================================
    
    INSERT INTO contacts (business_id, type, name, mobile, email, city, created_by, created_at, updated_at)
    VALUES 
        (v_business_id, 'customer', 'Ahmed Khan', '+92-300-1111111', 'ahmed@example.com', 'Rawalpindi', v_owner_id, NOW(), NOW()),
        (v_business_id, 'customer', 'Fatima Ali', '+92-300-2222222', 'fatima@example.com', 'Islamabad', v_owner_id, NOW(), NOW()),
        (v_business_id, 'customer', 'Hassan Raza', '+92-300-3333333', 'hassan@example.com', 'Rawalpindi', v_owner_id, NOW(), NOW()),
        (v_business_id, 'customer', 'Ayesha Malik', '+92-300-4444444', 'ayesha@example.com', 'Islamabad', v_owner_id, NOW(), NOW()),
        (v_business_id, 'customer', 'Walk-in Customer', NULL, NULL, NULL, v_owner_id, NOW(), NOW())
    RETURNING id INTO v_cust_1, v_cust_2, v_cust_3, v_cust_4, v_cust_5;
    
    INSERT INTO contacts (business_id, type, name, mobile, email, city, created_by, created_at, updated_at)
    VALUES 
        (v_business_id, 'supplier', 'Tech Suppliers Ltd', '+92-51-1234567', 'tech@suppliers.com', 'Islamabad', v_owner_id, NOW(), NOW()),
        (v_business_id, 'supplier', 'Wholesale Traders', '+92-51-2345678', 'wholesale@traders.com', 'Rawalpindi', v_owner_id, NOW(), NOW()),
        (v_business_id, 'supplier', 'Import House Pvt Ltd', '+92-51-3456789', 'import@house.com', 'Islamabad', v_owner_id, NOW(), NOW())
    RETURNING id INTO v_supp_1, v_supp_2, v_supp_3;
    
    RAISE NOTICE '  ✅ Contacts: 5 Customers + 3 Suppliers';
    
    -- ========================================================================
    -- 3. PRODUCTS (6 products)
    -- ========================================================================
    
    INSERT INTO products (name, business_id, type, unit_id, sku, category_id, alert_quantity, created_by, created_at, updated_at)
    VALUES 
        ('Laptop HP ProBook 450', v_business_id, 'single', v_unit_piece, 'LAP-HP-450', v_cat_electronics, 5, v_owner_id, NOW(), NOW()),
        ('Samsung Galaxy A54', v_business_id, 'single', v_unit_piece, 'MOB-SAM-A54', v_cat_electronics, 10, v_owner_id, NOW(), NOW()),
        ('T-Shirt Cotton Premium', v_business_id, 'single', v_unit_piece, 'TSH-COT-001', v_cat_clothing, 20, v_owner_id, NOW(), NOW()),
        ('Jeans Denim Blue', v_business_id, 'single', v_unit_piece, 'JNS-DEN-BLU', v_cat_clothing, 15, v_owner_id, NOW(), NOW()),
        ('Basmati Rice Super', v_business_id, 'single', v_unit_kg, 'RICE-BAS-5KG', v_cat_grocery, 50, v_owner_id, NOW(), NOW()),
        ('Cooking Oil 5L', v_business_id, 'single', v_unit_piece, 'OIL-COK-5L', v_cat_grocery, 30, v_owner_id, NOW(), NOW())
    RETURNING id INTO v_prod_1, v_prod_2, v_prod_3, v_prod_4, v_prod_5, v_prod_6;
    
    RAISE NOTICE '  ✅ Products: 6 created';
    
    -- ========================================================================
    -- 4. PRODUCT VARIATIONS (Required for inventory)
    -- ========================================================================
    
    -- Create product_variations first (parent table)
    INSERT INTO product_variations (product_id, name, is_dummy, created_at, updated_at)
    VALUES 
        (v_prod_1, 'DUMMY', 1, NOW(), NOW()),
        (v_prod_2, 'DUMMY', 1, NOW(), NOW()),
        (v_prod_3, 'DUMMY', 1, NOW(), NOW()),
        (v_prod_4, 'DUMMY', 1, NOW(), NOW()),
        (v_prod_5, 'DUMMY', 1, NOW(), NOW()),
        (v_prod_6, 'DUMMY', 1, NOW(), NOW())
    RETURNING id INTO v_pvar_1, v_pvar_2, v_pvar_3, v_pvar_4, v_pvar_5, v_pvar_6;
    
    -- Now create variations (child table) with proper references
    INSERT INTO variations (
        name, product_id, product_variation_id, sub_sku,
        default_purchase_price, default_sell_price,
        dpp_inc_tax, profit_percent, retail_price, wholesale_price,
        created_at, updated_at
    ) VALUES 
        ('DUMMY', v_prod_1, v_pvar_1, 'LAP-HP-450', 85000, 95000, 85000, 11.76, 95000, 92000, NOW(), NOW()),
        ('DUMMY', v_prod_2, v_pvar_2, 'MOB-SAM-A54', 55000, 62000, 55000, 12.73, 62000, 60000, NOW(), NOW()),
        ('DUMMY', v_prod_3, v_pvar_3, 'TSH-COT-001', 800, 1200, 800, 50.00, 1200, 1100, NOW(), NOW()),
        ('DUMMY', v_prod_4, v_pvar_4, 'JNS-DEN-BLU', 2000, 2800, 2000, 40.00, 2800, 2600, NOW(), NOW()),
        ('DUMMY', v_prod_5, v_pvar_5, 'RICE-BAS-5KG', 450, 550, 450, 22.22, 550, 520, NOW(), NOW()),
        ('DUMMY', v_prod_6, v_pvar_6, 'OIL-COK-5L', 950, 1150, 950, 21.05, 1150, 1100, NOW(), NOW());
    
    RAISE NOTICE '  ✅ Variations: 6 created (with product_variations)';
    
    -- ========================================================================
    -- 5. INVENTORY (variation_location_details) - Branch-wise stock
    -- ========================================================================
    
    -- Main Branch Inventory
    INSERT INTO variation_location_details (
        product_id, product_variation_id, variation_id, location_id, 
        qty_available, created_at, updated_at
    ) VALUES 
        (v_prod_1, v_pvar_1, v_pvar_1, v_branch_main, 8.00, NOW(), NOW()),
        (v_prod_2, v_pvar_2, v_pvar_2, v_branch_main, 15.00, NOW(), NOW()),
        (v_prod_3, v_pvar_3, v_pvar_3, v_branch_main, 45.00, NOW(), NOW()),
        (v_prod_4, v_pvar_4, v_pvar_4, v_branch_main, 30.00, NOW(), NOW()),
        (v_prod_5, v_pvar_5, v_pvar_5, v_branch_main, 120.00, NOW(), NOW()),
        (v_prod_6, v_pvar_6, v_pvar_6, v_branch_main, 50.00, NOW(), NOW());
    
    -- City Outlet Inventory (different quantities)
    INSERT INTO variation_location_details (
        product_id, product_variation_id, variation_id, location_id,
        qty_available, created_at, updated_at
    ) VALUES 
        (v_prod_1, v_pvar_1, v_pvar_1, v_branch_city, 5.00, NOW(), NOW()),
        (v_prod_2, v_pvar_2, v_pvar_2, v_branch_city, 25.00, NOW(), NOW()),
        (v_prod_3, v_pvar_3, v_pvar_3, v_branch_city, 60.00, NOW(), NOW()),
        (v_prod_4, v_pvar_4, v_pvar_4, v_branch_city, 20.00, NOW(), NOW()),
        (v_prod_5, v_pvar_5, v_pvar_5, v_branch_city, 80.00, NOW(), NOW()),
        (v_prod_6, v_pvar_6, v_pvar_6, v_branch_city, 40.00, NOW(), NOW());
    
    -- Warehouse Inventory (highest quantities - storage)
    INSERT INTO variation_location_details (
        product_id, product_variation_id, variation_id, location_id,
        qty_available, created_at, updated_at
    ) VALUES 
        (v_prod_1, v_pvar_1, v_pvar_1, v_branch_warehouse, 20.00, NOW(), NOW()),
        (v_prod_2, v_pvar_2, v_pvar_2, v_branch_warehouse, 50.00, NOW(), NOW()),
        (v_prod_3, v_pvar_3, v_pvar_3, v_branch_warehouse, 200.00, NOW(), NOW()),
        (v_prod_4, v_pvar_4, v_pvar_4, v_branch_warehouse, 100.00, NOW(), NOW()),
        (v_prod_5, v_pvar_5, v_pvar_5, v_branch_warehouse, 500.00, NOW(), NOW()),
        (v_prod_6, v_pvar_6, v_pvar_6, v_branch_warehouse, 300.00, NOW(), NOW());
    
    RAISE NOTICE '  ✅ Inventory: 18 records (6 products × 3 branches)';
    
    -- ========================================================================
    -- 6. PURCHASES (from suppliers)
    -- ========================================================================
    
    INSERT INTO transactions (
        type, business_id, location_id, contact_id, 
        transaction_date, status, payment_status, 
        final_total, created_by, created_at, updated_at
    ) VALUES 
        ('purchase', v_business_id, v_branch_main, v_supp_1, NOW() - INTERVAL '15 days', 'final', 'paid', 425000.00, v_owner_id, NOW() - INTERVAL '15 days', NOW()),
        ('purchase', v_business_id, v_branch_city, v_supp_2, NOW() - INTERVAL '10 days', 'final', 'paid', 280000.00, v_owner_id, NOW() - INTERVAL '10 days', NOW()),
        ('purchase', v_business_id, v_branch_main, v_supp_3, NOW() - INTERVAL '7 days', 'final', 'partial', 45000.00, v_owner_id, NOW() - INTERVAL '7 days', NOW());
    
    RAISE NOTICE '  ✅ Purchases: 3 orders';
    
    -- ========================================================================
    -- 7. SALES (Main Branch & City Outlet only, NO warehouse sales)
    -- ========================================================================
    
    INSERT INTO transactions (
        type, business_id, location_id, contact_id,
        transaction_date, status, payment_status, invoice_no,
        final_total, created_by, created_at, updated_at
    ) VALUES 
        -- Main Branch Sales
        ('sell', v_business_id, v_branch_main, v_cust_1, NOW() - INTERVAL '6 days', 'final', 'paid', 'INV-MB-001', 95000.00, v_owner_id, NOW() - INTERVAL '6 days', NOW()),
        ('sell', v_business_id, v_branch_main, v_cust_3, NOW() - INTERVAL '4 days', 'final', 'paid', 'INV-MB-002', 7350.00, v_owner_id, NOW() - INTERVAL '4 days', NOW()),
        ('sell', v_business_id, v_branch_main, v_cust_4, NOW() - INTERVAL '1 day', 'final', 'paid', 'INV-MB-003', 62000.00, v_owner_id, NOW() - INTERVAL '1 day', NOW()),
        ('sell', v_business_id, v_branch_main, v_cust_5, NOW(), 'final', 'paid', 'INV-MB-004', 3950.00, v_owner_id, NOW(), NOW()),
        
        -- City Outlet Sales
        ('sell', v_business_id, v_branch_city, v_cust_2, NOW() - INTERVAL '5 days', 'final', 'paid', 'INV-CO-001', 65500.00, v_owner_id, NOW() - INTERVAL '5 days', NOW()),
        ('sell', v_business_id, v_branch_city, v_cust_4, NOW() - INTERVAL '3 days', 'final', 'paid', 'INV-CO-002', 5950.00, v_owner_id, NOW() - INTERVAL '3 days', NOW()),
        ('sell', v_business_id, v_branch_city, v_cust_5, NOW() - INTERVAL '2 days', 'final', 'paid', 'INV-CO-003', 1150.00, v_owner_id, NOW() - INTERVAL '2 days', NOW());
    
    RAISE NOTICE '  ✅ Sales: 7 transactions (4 Main Branch + 3 City Outlet)';
    RAISE NOTICE '     💡 Warehouse has NO sales (storage only)';
    
    -- ========================================================================
    -- 8. FINANCIAL ACCOUNTS
    -- ========================================================================
    
    INSERT INTO financial_accounts (
        business_id, name, account_number, account_type, 
        created_by, created_at, updated_at
    ) VALUES 
        (v_business_id, 'Cash in Hand', 'CASH-001', 'current_asset', v_owner_id, NOW(), NOW()),
        (v_business_id, 'Bank Account - HBL', 'BANK-HBL-001', 'bank', v_owner_id, NOW(), NOW()),
        (v_business_id, 'Sales Revenue', 'REV-SALES-001', 'income', v_owner_id, NOW(), NOW()),
        (v_business_id, 'Operating Expenses', 'EXP-OPR-001', 'expense', v_owner_id, NOW(), NOW())
    RETURNING id INTO v_acc_cash, v_acc_bank, v_acc_sales, v_acc_expense;
    
    RAISE NOTICE '  ✅ Financial Accounts: 4 created';
    
    -- ========================================================================
    -- 9. EXPENSES (Branch-wise)
    -- ========================================================================
    
    -- Get expense category first
    DECLARE
        v_exp_cat_rent INTEGER;
        v_exp_cat_utility INTEGER;
        v_exp_cat_salary INTEGER;
    BEGIN
        INSERT INTO expense_categories (business_id, name, created_by, created_at, updated_at)
        VALUES 
            (v_business_id, 'Rent', v_owner_id, NOW(), NOW()),
            (v_business_id, 'Utilities', v_owner_id, NOW(), NOW()),
            (v_business_id, 'Salaries', v_owner_id, NOW(), NOW())
        RETURNING id INTO v_exp_cat_rent, v_exp_cat_utility, v_exp_cat_salary;
        
        -- Create expense transactions
        INSERT INTO transactions (
            type, business_id, location_id, 
            transaction_date, status, payment_status,
            final_total, created_by, created_at, updated_at
        ) VALUES 
            ('expense', v_business_id, v_branch_main, NOW() - INTERVAL '1 month', 'final', 'paid', 25000.00, v_owner_id, NOW() - INTERVAL '1 month', NOW()),
            ('expense', v_business_id, v_branch_city, NOW() - INTERVAL '1 month', 'final', 'paid', 20000.00, v_owner_id, NOW() - INTERVAL '1 month', NOW()),
            ('expense', v_business_id, v_branch_main, NOW() - INTERVAL '20 days', 'final', 'paid', 3500.00, v_owner_id, NOW() - INTERVAL '20 days', NOW()),
            ('expense', v_business_id, v_branch_city, NOW() - INTERVAL '15 days', 'final', 'paid', 2800.00, v_owner_id, NOW() - INTERVAL '15 days', NOW());
        
        RAISE NOTICE '  ✅ Expenses: 4 transactions (rent, utilities)';
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ COMPLETE DUMMY DATA INSERTED SUCCESSFULLY!';
    
END $$;

COMMIT;

-- ============================================================================
-- AUTOMATIC VALIDATION
-- ============================================================================

SELECT '========== DATA VALIDATION ==========' as section;

-- Check NULL location_ids
SELECT 
    'NULL Check' as test_name,
    (SELECT COUNT(*) FROM transactions WHERE business_id = 1 AND location_id IS NULL) as null_transactions,
    (SELECT COUNT(*) FROM variation_location_details vld 
     JOIN business_locations bl ON bl.id = vld.location_id 
     WHERE bl.business_id = 1 AND vld.location_id IS NULL) as null_inventory,
    CASE 
        WHEN (SELECT COUNT(*) FROM transactions WHERE business_id = 1 AND location_id IS NULL) = 0 
         AND (SELECT COUNT(*) FROM variation_location_details vld JOIN business_locations bl ON bl.id = vld.location_id WHERE bl.business_id = 1 AND vld.location_id IS NULL) = 0
        THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as status;

-- Summary counts
SELECT 
    'Summary' as report,
    (SELECT COUNT(*) FROM business_locations WHERE business_id = 1) as branches,
    (SELECT COUNT(*) FROM products WHERE business_id = 1) as products,
    (SELECT COUNT(*) FROM contacts WHERE business_id = 1) as contacts,
    (SELECT COUNT(*) FROM transactions WHERE business_id = 1 AND type = 'sell') as sales,
    (SELECT COUNT(*) FROM transactions WHERE business_id = 1 AND type = 'purchase') as purchases,
    (SELECT COUNT(*) FROM transactions WHERE business_id = 1 AND type = 'expense') as expenses,
    (SELECT COUNT(*) FROM variation_location_details vld 
     JOIN business_locations bl ON bl.id = vld.location_id 
     WHERE bl.business_id = 1) as inventory_records;

-- Branch-wise data distribution
SELECT 
    bl.name as branch_name,
    bl.custom_field1 as code,
    COUNT(DISTINCT vld.id) as inventory_items,
    COALESCE(SUM(vld.qty_available), 0) as total_stock,
    COUNT(DISTINCT t.id) FILTER (WHERE t.type = 'sell') as sales_count,
    COUNT(DISTINCT t.id) FILTER (WHERE t.type = 'purchase') as purchases_count,
    COUNT(DISTINCT t.id) FILTER (WHERE t.type = 'expense') as expenses_count,
    COALESCE(SUM(t.final_total) FILTER (WHERE t.type = 'sell'), 0) as total_sales_revenue
FROM business_locations bl
LEFT JOIN variation_location_details vld ON vld.location_id = bl.id
LEFT JOIN transactions t ON t.location_id = bl.id
WHERE bl.business_id = 1
GROUP BY bl.id, bl.name, bl.custom_field1
ORDER BY bl.id;

SELECT '========== VALIDATION COMPLETE ==========' as section;
