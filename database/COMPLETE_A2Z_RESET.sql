-- ============================================================================
-- COMPLETE A TO Z RESET - Demo Account
-- Everything including branches will be cleaned and recreated
-- ============================================================================

BEGIN;

DO $$
DECLARE
    v_business_id INTEGER := 1;
    v_owner_id UUID;
    v_branch_main INTEGER;
    v_branch_city INTEGER;
    v_branch_warehouse INTEGER;
BEGIN
    -- Get owner ID
    SELECT owner_id INTO v_owner_id FROM businesses WHERE id = v_business_id;
    
    RAISE NOTICE '🎯 Demo Business ID: %, Owner: %', v_business_id, v_owner_id;
    RAISE NOTICE '🧹 COMPLETE CLEANUP - Including Branches...';
    
    -- ========================================================================
    -- PHASE 1: COMPLETE CLEANUP (A to Z)
    -- ========================================================================
    
    -- Delete all transaction-related data
    DELETE FROM transaction_sell_lines WHERE transaction_id IN (SELECT id FROM transactions WHERE business_id = v_business_id);
    DELETE FROM transaction_purchase_lines WHERE transaction_id IN (SELECT id FROM transactions WHERE business_id = v_business_id);
    DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE business_id = v_business_id);
    DELETE FROM purchase_items WHERE purchase_id IN (SELECT id FROM purchases WHERE business_id = v_business_id);
    DELETE FROM purchase_lines WHERE transaction_id IN (SELECT id FROM transactions WHERE business_id = v_business_id);
    DELETE FROM stock_adjustment_lines WHERE transaction_id IN (SELECT id FROM transactions WHERE business_id = v_business_id);
    DELETE FROM stock_transfer_lines WHERE transaction_id IN (SELECT id FROM transactions WHERE business_id = v_business_id);
    DELETE FROM transactions WHERE business_id = v_business_id;
    DELETE FROM sales WHERE business_id = v_business_id;
    DELETE FROM purchases WHERE business_id = v_business_id;
    
    RAISE NOTICE '  ✅ Transactions deleted';
    
    -- Delete inventory (must happen before branches)
    DELETE FROM variation_location_details WHERE location_id IN (SELECT id FROM business_locations WHERE business_id = v_business_id);
    DELETE FROM branch_inventory WHERE branch_id IN (SELECT id FROM business_locations WHERE business_id = v_business_id);
    
    RAISE NOTICE '  ✅ Inventory deleted';
    
    -- Delete products and variations
    DELETE FROM variations WHERE product_id IN (SELECT id FROM products WHERE business_id = v_business_id);
    DELETE FROM products WHERE business_id = v_business_id;
    
    RAISE NOTICE '  ✅ Products deleted';
    
    -- Delete contacts
    DELETE FROM contacts WHERE business_id = v_business_id;
    
    RAISE NOTICE '  ✅ Contacts deleted';
    
    -- Delete financial records
    DELETE FROM account_transactions WHERE account_id IN (SELECT id FROM financial_accounts WHERE business_id = v_business_id);
    DELETE FROM salesman_ledgers WHERE salesman_id IN (SELECT id FROM user_profiles WHERE business_id = v_business_id);
    
    RAISE NOTICE '  ✅ Financial records deleted';
    
    -- Delete categories and units
    DELETE FROM categories WHERE business_id = v_business_id;
    DELETE FROM units WHERE business_id = v_business_id;
    
    RAISE NOTICE '  ✅ Categories & Units deleted';
    
    -- NOW DELETE BRANCHES (This is the key difference)
    DELETE FROM business_locations WHERE business_id = v_business_id;
    
    RAISE NOTICE '  ✅ ALL BRANCHES DELETED';
    RAISE NOTICE '✅ COMPLETE CLEANUP DONE - Everything A to Z cleared!';
    
    -- ========================================================================
    -- PHASE 2: CREATE FRESH BRANCHES FROM SCRATCH
    -- ========================================================================
    
    RAISE NOTICE '';
    RAISE NOTICE '🏢 Creating fresh branches from scratch...';
    
    -- Branch 1: Main Branch
    INSERT INTO business_locations (
        business_id, name, landmark, custom_field1, mobile, 
        country, city, state, zip_code,
        created_at, updated_at
    ) VALUES (
        v_business_id, 
        'Main Branch', 
        'Downtown Plaza, Main Street, Rawalpindi',
        'MB-001',
        '+92-300-1234567',
        'Pakistan',
        'Rawalpindi',
        'Punjab',
        '46000',
        NOW(),
        NOW()
    ) RETURNING id INTO v_branch_main;
    
    -- Branch 2: City Outlet
    INSERT INTO business_locations (
        business_id, name, landmark, custom_field1, mobile,
        country, city, state, zip_code,
        created_at, updated_at
    ) VALUES (
        v_business_id,
        'City Outlet',
        'Shopping Mall, 2nd Floor, Islamabad',
        'CO-002',
        '+92-300-2345678',
        'Pakistan',
        'Islamabad',
        'Federal Capital',
        '44000',
        NOW(),
        NOW()
    ) RETURNING id INTO v_branch_city;
    
    -- Branch 3: Warehouse
    INSERT INTO business_locations (
        business_id, name, landmark, custom_field1, mobile,
        country, city, state, zip_code,
        created_at, updated_at
    ) VALUES (
        v_business_id,
        'Warehouse',
        'Industrial Area, Sector 15, Rawalpindi',
        'WH-003',
        '+92-300-3456789',
        'Pakistan',
        'Rawalpindi',
        'Punjab',
        '46200',
        NOW(),
        NOW()
    ) RETURNING id INTO v_branch_warehouse;
    
    RAISE NOTICE '  ✅ Fresh Branches Created:';
    RAISE NOTICE '     - Main Branch (ID: %)', v_branch_main;
    RAISE NOTICE '     - City Outlet (ID: %)', v_branch_city;
    RAISE NOTICE '     - Warehouse (ID: %)', v_branch_warehouse;
    
    -- ========================================================================
    -- PHASE 3: INSERT FRESH DUMMY DATA
    -- ========================================================================
    
    RAISE NOTICE '';
    RAISE NOTICE '📦 Inserting fresh dummy data...';
    
    -- Categories
    DECLARE
        v_cat_electronics INTEGER;
        v_cat_clothing INTEGER;
        v_cat_food INTEGER;
    BEGIN
        INSERT INTO categories (business_id, name, short_code, created_by, created_at, updated_at)
        VALUES (v_business_id, 'Electronics', 'ELEC', v_owner_id, NOW(), NOW()) RETURNING id INTO v_cat_electronics;
        
        INSERT INTO categories (business_id, name, short_code, created_by, created_at, updated_at)
        VALUES (v_business_id, 'Clothing', 'CLOTH', v_owner_id, NOW(), NOW()) RETURNING id INTO v_cat_clothing;
        
        INSERT INTO categories (business_id, name, short_code, created_by, created_at, updated_at)
        VALUES (v_business_id, 'Food & Beverages', 'FOOD', v_owner_id, NOW(), NOW()) RETURNING id INTO v_cat_food;
        
        RAISE NOTICE '  ✅ Categories: 3 created';
        
        -- Units
        DECLARE
            v_unit_piece INTEGER;
            v_unit_kg INTEGER;
        BEGIN
            INSERT INTO units (business_id, actual_name, short_name, allow_decimal, created_by, created_at, updated_at)
            VALUES (v_business_id, 'Piece', 'Pc', FALSE, v_owner_id, NOW(), NOW()) RETURNING id INTO v_unit_piece;
            
            INSERT INTO units (business_id, actual_name, short_name, allow_decimal, created_by, created_at, updated_at)
            VALUES (v_business_id, 'Kilogram', 'Kg', TRUE, v_owner_id, NOW(), NOW()) RETURNING id INTO v_unit_kg;
            
            RAISE NOTICE '  ✅ Units: 2 created';
            
            -- Contacts
            DECLARE
                v_cust_1 INTEGER; v_cust_2 INTEGER; v_cust_3 INTEGER; v_cust_4 INTEGER; v_cust_5 INTEGER;
                v_supp_1 INTEGER; v_supp_2 INTEGER; v_supp_3 INTEGER;
            BEGIN
                INSERT INTO contacts (business_id, type, name, mobile, email, city, created_by, created_at, updated_at)
                VALUES (v_business_id, 'customer', 'Ahmed Khan', '+92-300-1111111', 'ahmed@example.com', 'Rawalpindi', v_owner_id, NOW(), NOW())
                RETURNING id INTO v_cust_1;
                
                INSERT INTO contacts (business_id, type, name, mobile, email, city, created_by, created_at, updated_at)
                VALUES (v_business_id, 'customer', 'Fatima Ali', '+92-300-2222222', 'fatima@example.com', 'Islamabad', v_owner_id, NOW(), NOW())
                RETURNING id INTO v_cust_2;
                
                INSERT INTO contacts (business_id, type, name, mobile, email, city, created_by, created_at, updated_at)
                VALUES (v_business_id, 'customer', 'Hassan Raza', '+92-300-3333333', 'hassan@example.com', 'Rawalpindi', v_owner_id, NOW(), NOW())
                RETURNING id INTO v_cust_3;
                
                INSERT INTO contacts (business_id, type, name, mobile, email, city, created_by, created_at, updated_at)
                VALUES (v_business_id, 'customer', 'Ayesha Malik', '+92-300-4444444', 'ayesha@example.com', 'Islamabad', v_owner_id, NOW(), NOW())
                RETURNING id INTO v_cust_4;
                
                INSERT INTO contacts (business_id, type, name, mobile, created_by, created_at, updated_at)
                VALUES (v_business_id, 'customer', 'Walk-in Customer', NULL, v_owner_id, NOW(), NOW())
                RETURNING id INTO v_cust_5;
                
                INSERT INTO contacts (business_id, type, name, mobile, email, city, created_by, created_at, updated_at)
                VALUES (v_business_id, 'supplier', 'Tech Suppliers Ltd', '+92-51-1234567', 'tech@example.com', 'Islamabad', v_owner_id, NOW(), NOW())
                RETURNING id INTO v_supp_1;
                
                INSERT INTO contacts (business_id, type, name, mobile, email, city, created_by, created_at, updated_at)
                VALUES (v_business_id, 'supplier', 'Wholesale Traders', '+92-51-2345678', 'wholesale@example.com', 'Rawalpindi', v_owner_id, NOW(), NOW())
                RETURNING id INTO v_supp_2;
                
                INSERT INTO contacts (business_id, type, name, mobile, email, city, created_by, created_at, updated_at)
                VALUES (v_business_id, 'supplier', 'Import House', '+92-51-3456789', 'import@example.com', 'Islamabad', v_owner_id, NOW(), NOW())
                RETURNING id INTO v_supp_3;
                
                RAISE NOTICE '  ✅ Contacts: 8 created (5 customers + 3 suppliers)';
                
                -- Products with variations (simple single type)
                DECLARE
                    v_prod_1 INTEGER; v_prod_2 INTEGER; v_prod_3 INTEGER; v_prod_4 INTEGER; v_prod_5 INTEGER;
                BEGIN
                    -- Product 1: Laptop
                    INSERT INTO products (name, business_id, type, unit_id, sku, category_id, alert_quantity, created_by, created_at, updated_at)
                    VALUES ('Laptop HP ProBook', v_business_id, 'single', v_unit_piece, 'LAP-HP-001', v_cat_electronics, 5, v_owner_id, NOW(), NOW())
                    RETURNING id INTO v_prod_1;
                    
                    -- Product 2: Mobile
                    INSERT INTO products (name, business_id, type, unit_id, sku, category_id, alert_quantity, created_by, created_at, updated_at)
                    VALUES ('Samsung Galaxy A54', v_business_id, 'single', v_unit_piece, 'MOB-SAM-001', v_cat_electronics, 10, v_owner_id, NOW(), NOW())
                    RETURNING id INTO v_prod_2;
                    
                    -- Product 3: T-Shirt
                    INSERT INTO products (name, business_id, type, unit_id, sku, category_id, alert_quantity, created_by, created_at, updated_at)
                    VALUES ('Cotton T-Shirt', v_business_id, 'single', v_unit_piece, 'CLO-TSH-001', v_cat_clothing, 20, v_owner_id, NOW(), NOW())
                    RETURNING id INTO v_prod_3;
                    
                    -- Product 4: Rice
                    INSERT INTO products (name, business_id, type, unit_id, sku, category_id, alert_quantity, created_by, created_at, updated_at)
                    VALUES ('Basmati Rice 5kg', v_business_id, 'single', v_unit_kg, 'FOOD-RICE-001', v_cat_food, 50, v_owner_id, NOW(), NOW())
                    RETURNING id INTO v_prod_4;
                    
                    -- Product 5: Headphones
                    INSERT INTO products (name, business_id, type, unit_id, sku, category_id, alert_quantity, created_by, created_at, updated_at)
                    VALUES ('Wireless Headphones', v_business_id, 'single', v_unit_piece, 'ELEC-HP-001', v_cat_electronics, 15, v_owner_id, NOW(), NOW())
                    RETURNING id INTO v_prod_5;
                    
                    RAISE NOTICE '  ✅ Products: 5 created';
                    
                    -- Inventory (variation_location_details only - skip variations table for now)
                    -- Main Branch
                    INSERT INTO variation_location_details (product_id, variation_id, location_id, qty_available, created_at, updated_at)
                    SELECT v_prod_1, v_prod_1, v_branch_main, 8.00, NOW(), NOW()
                    WHERE EXISTS (SELECT 1);
                    
                    INSERT INTO variation_location_details (product_id, variation_id, location_id, qty_available, created_at, updated_at)
                    SELECT v_prod_2, v_prod_2, v_branch_main, 15.00, NOW(), NOW()
                    WHERE EXISTS (SELECT 1);
                    
                    INSERT INTO variation_location_details (product_id, variation_id, location_id, qty_available, created_at, updated_at)
                    SELECT v_prod_3, v_prod_3, v_branch_main, 45.00, NOW(), NOW()
                    WHERE EXISTS (SELECT 1);
                    
                    INSERT INTO variation_location_details (product_id, variation_id, location_id, qty_available, created_at, updated_at)
                    SELECT v_prod_4, v_prod_4, v_branch_main, 120.00, NOW(), NOW()
                    WHERE EXISTS (SELECT 1);
                    
                    INSERT INTO variation_location_details (product_id, variation_id, location_id, qty_available, created_at, updated_at)
                    SELECT v_prod_5, v_prod_5, v_branch_main, 20.00, NOW(), NOW()
                    WHERE EXISTS (SELECT 1);
                    
                    -- City Outlet
                    INSERT INTO variation_location_details (product_id, variation_id, location_id, qty_available, created_at, updated_at)
                    SELECT v_prod_1, v_prod_1, v_branch_city, 5.00, NOW(), NOW()
                    WHERE EXISTS (SELECT 1);
                    
                    INSERT INTO variation_location_details (product_id, variation_id, location_id, qty_available, created_at, updated_at)
                    SELECT v_prod_2, v_prod_2, v_branch_city, 25.00, NOW(), NOW()
                    WHERE EXISTS (SELECT 1);
                    
                    INSERT INTO variation_location_details (product_id, variation_id, location_id, qty_available, created_at, updated_at)
                    SELECT v_prod_3, v_prod_3, v_branch_city, 60.00, NOW(), NOW()
                    WHERE EXISTS (SELECT 1);
                    
                    INSERT INTO variation_location_details (product_id, variation_id, location_id, qty_available, created_at, updated_at)
                    SELECT v_prod_4, v_prod_4, v_branch_city, 80.00, NOW(), NOW()
                    WHERE EXISTS (SELECT 1);
                    
                    INSERT INTO variation_location_details (product_id, variation_id, location_id, qty_available, created_at, updated_at)
                    SELECT v_prod_5, v_prod_5, v_branch_city, 12.00, NOW(), NOW()
                    WHERE EXISTS (SELECT 1);
                    
                    -- Warehouse
                    INSERT INTO variation_location_details (product_id, variation_id, location_id, qty_available, created_at, updated_at)
                    SELECT v_prod_1, v_prod_1, v_branch_warehouse, 20.00, NOW(), NOW()
                    WHERE EXISTS (SELECT 1);
                    
                    INSERT INTO variation_location_details (product_id, variation_id, location_id, qty_available, created_at, updated_at)
                    SELECT v_prod_2, v_prod_2, v_branch_warehouse, 50.00, NOW(), NOW()
                    WHERE EXISTS (SELECT 1);
                    
                    INSERT INTO variation_location_details (product_id, variation_id, location_id, qty_available, created_at, updated_at)
                    SELECT v_prod_3, v_prod_3, v_branch_warehouse, 200.00, NOW(), NOW()
                    WHERE EXISTS (SELECT 1);
                    
                    INSERT INTO variation_location_details (product_id, variation_id, location_id, qty_available, created_at, updated_at)
                    SELECT v_prod_4, v_prod_4, v_branch_warehouse, 500.00, NOW(), NOW()
                    WHERE EXISTS (SELECT 1);
                    
                    INSERT INTO variation_location_details (product_id, variation_id, location_id, qty_available, created_at, updated_at)
                    SELECT v_prod_5, v_prod_5, v_branch_warehouse, 80.00, NOW(), NOW()
                    WHERE EXISTS (SELECT 1);
                    
                    RAISE NOTICE '  ✅ Inventory: 15 records across 3 branches';
                    
                    -- Transactions (Sales)
                    INSERT INTO transactions (type, business_id, location_id, contact_id, transaction_date, status, payment_status, invoice_no, final_total, created_by, created_at, updated_at)
                    VALUES 
                        ('sell', v_business_id, v_branch_main, v_cust_1, NOW() - INTERVAL '5 days', 'final', 'paid', 'INV-MB-001', 95000.00, v_owner_id, NOW() - INTERVAL '5 days', NOW()),
                        ('sell', v_business_id, v_branch_city, v_cust_2, NOW() - INTERVAL '3 days', 'final', 'paid', 'INV-CO-001', 65500.00, v_owner_id, NOW() - INTERVAL '3 days', NOW()),
                        ('sell', v_business_id, v_branch_main, v_cust_3, NOW() - INTERVAL '2 days', 'final', 'paid', 'INV-MB-002', 4150.00, v_owner_id, NOW() - INTERVAL '2 days', NOW()),
                        ('sell', v_business_id, v_branch_city, v_cust_5, NOW() - INTERVAL '1 day', 'final', 'paid', 'INV-CO-002', 3500.00, v_owner_id, NOW() - INTERVAL '1 day', NOW()),
                        ('sell', v_business_id, v_branch_main, v_cust_4, NOW(), 'final', 'paid', 'INV-MB-003', 62000.00, v_owner_id, NOW(), NOW());
                    
                    RAISE NOTICE '  ✅ Sales: 5 transactions created';
                    
                    -- Purchases
                    INSERT INTO transactions (type, business_id, location_id, contact_id, transaction_date, status, payment_status, final_total, created_by, created_at, updated_at)
                    VALUES 
                        ('purchase', v_business_id, v_branch_main, v_supp_1, NOW() - INTERVAL '10 days', 'final', 'paid', 425000.00, v_owner_id, NOW() - INTERVAL '10 days', NOW()),
                        ('purchase', v_business_id, v_branch_city, v_supp_2, NOW() - INTERVAL '7 days', 'final', 'paid', 180000.00, v_owner_id, NOW() - INTERVAL '7 days', NOW());
                    
                    RAISE NOTICE '  ✅ Purchases: 2 orders created';
                    
                END;
            END;
        END;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ COMPLETE A TO Z RESET SUCCESSFUL!';
    RAISE NOTICE '   - Old branches: DELETED';
    RAISE NOTICE '   - New branches: CREATED (3)';
    RAISE NOTICE '   - Fresh data: INSERTED';
    RAISE NOTICE '   - Demo account: FULL ACCESS';
    
END $$;

COMMIT;

-- Verification
RAISE NOTICE '';
RAISE NOTICE '========== VERIFICATION ==========';

SELECT 
    'Summary' as type,
    (SELECT COUNT(*) FROM business_locations WHERE business_id = 1) as branches,
    (SELECT COUNT(*) FROM products WHERE business_id = 1) as products,
    (SELECT COUNT(*) FROM contacts WHERE business_id = 1) as contacts,
    (SELECT COUNT(*) FROM transactions WHERE business_id = 1 AND type = 'sell') as sales,
    (SELECT COUNT(*) FROM variation_location_details vld JOIN business_locations bl ON bl.id = vld.location_id WHERE bl.business_id = 1) as inventory;

SELECT 
    bl.id,
    bl.name as branch_name,
    bl.custom_field1 as branch_code,
    bl.city,
    COUNT(DISTINCT vld.id) as inventory_items,
    COALESCE(SUM(vld.qty_available), 0) as total_stock,
    COUNT(DISTINCT t.id) FILTER (WHERE t.type = 'sell') as sales_count,
    COALESCE(SUM(t.final_total) FILTER (WHERE t.type = 'sell'), 0) as sales_revenue
FROM business_locations bl
LEFT JOIN variation_location_details vld ON vld.location_id = bl.id
LEFT JOIN transactions t ON t.location_id = bl.id
WHERE bl.business_id = 1
GROUP BY bl.id, bl.name, bl.custom_field1, bl.city
ORDER BY bl.id;

SELECT '========== RESET COMPLETE ==========' as status;
