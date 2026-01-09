-- ============================================================================
-- FIXED AUTOMATIC DEMO ACCOUNT RESET (With created_by)
-- ============================================================================

BEGIN;

DO $$
DECLARE
    v_business_id INTEGER := 1;
    v_owner_id UUID;
    v_branch_1 INTEGER;
    v_branch_2 INTEGER;
    v_branch_3 INTEGER;
    v_cat_1 INTEGER;
    v_cat_2 INTEGER;
    v_cat_3 INTEGER;
    v_unit_1 INTEGER;
    v_unit_2 INTEGER;
    v_cust_1 INTEGER;
    v_cust_2 INTEGER;
    v_cust_3 INTEGER;
    v_cust_4 INTEGER;
    v_cust_5 INTEGER;
    v_supp_1 INTEGER;
    v_supp_2 INTEGER;
    v_supp_3 INTEGER;
    v_prod_1 INTEGER;
    v_prod_2 INTEGER;
    v_prod_3 INTEGER;
    v_prod_4 INTEGER;
    v_prod_5 INTEGER;
    v_var_1 INTEGER;
    v_var_2 INTEGER;
    v_var_3 INTEGER;
    v_var_4 INTEGER;
    v_var_5 INTEGER;
BEGIN
    -- Get owner_id
    SELECT owner_id INTO v_owner_id FROM businesses WHERE id = v_business_id;
    
    RAISE NOTICE '🎯 Demo Business: % (Owner: %)', v_business_id, v_owner_id;
    
    -- ========================================================================
    -- CLEANUP
    -- ========================================================================
    
    RAISE NOTICE '🧹 Cleaning old data...';
    
    DELETE FROM transaction_sell_lines WHERE transaction_id IN (SELECT id FROM transactions WHERE business_id = v_business_id);
    DELETE FROM transaction_purchase_lines WHERE transaction_id IN (SELECT id FROM transactions WHERE business_id = v_business_id);
    DELETE FROM transactions WHERE business_id = v_business_id;
    DELETE FROM variation_location_details WHERE location_id IN (SELECT id FROM business_locations WHERE business_id = v_business_id);
    DELETE FROM variations WHERE product_id IN (SELECT id FROM products WHERE business_id = v_business_id);
    DELETE FROM products WHERE business_id = v_business_id;
    DELETE FROM contacts WHERE business_id = v_business_id;
    DELETE FROM account_transactions WHERE account_id IN (SELECT id FROM financial_accounts WHERE business_id = v_business_id);
    DELETE FROM categories WHERE business_id = v_business_id;
    DELETE FROM units WHERE business_id = v_business_id;
    
    RAISE NOTICE '✅ Cleanup complete';
    
    -- ========================================================================
    -- SEED FRESH DATA
    -- ========================================================================
    
    RAISE NOTICE '🌱 Seeding fresh data...';
    
    -- Branches
    SELECT id INTO v_branch_1 FROM business_locations WHERE business_id = v_business_id ORDER BY id LIMIT 1;
    UPDATE business_locations SET name='Main Branch', landmark='Downtown Plaza', custom_field1='MB-001', mobile='+92-300-1234567', deleted_at=NULL WHERE id=v_branch_1;
    
    SELECT id INTO v_branch_2 FROM business_locations WHERE business_id = v_business_id AND id != v_branch_1 ORDER BY id LIMIT 1;
    IF v_branch_2 IS NULL THEN
        INSERT INTO business_locations (business_id, name, landmark, custom_field1, mobile)
        VALUES (v_business_id, 'City Outlet', 'Shopping Mall', 'CO-002', '+92-300-2345678')
        RETURNING id INTO v_branch_2;
    ELSE
        UPDATE business_locations SET name='City Outlet', landmark='Shopping Mall', custom_field1='CO-002', mobile='+92-300-2345678', deleted_at=NULL WHERE id=v_branch_2;
    END IF;
    
    SELECT id INTO v_branch_3 FROM business_locations WHERE business_id = v_business_id AND id NOT IN (v_branch_1, v_branch_2) ORDER BY id LIMIT 1;
    IF v_branch_3 IS NULL THEN
        INSERT INTO business_locations (business_id, name, landmark, custom_field1, mobile)
        VALUES (v_business_id, 'Warehouse', 'Industrial Area', 'WH-003', '+92-300-3456789')
        RETURNING id INTO v_branch_3;
    ELSE
        UPDATE business_locations SET name='Warehouse', landmark='Industrial Area', custom_field1='WH-003', mobile='+92-300-3456789', deleted_at=NULL WHERE id=v_branch_3;
    END IF;
    
    RAISE NOTICE '  ✅ Branches: %, %, %', v_branch_1, v_branch_2, v_branch_3;
    
    -- Categories (with created_by)
    INSERT INTO categories (business_id, name, short_code, created_by, created_at)
    VALUES (v_business_id, 'Electronics', 'ELEC', v_owner_id, NOW()) RETURNING id INTO v_cat_1;
    INSERT INTO categories (business_id, name, short_code, created_by, created_at)
    VALUES (v_business_id, 'Clothing', 'CLOTH', v_owner_id, NOW()) RETURNING id INTO v_cat_2;
    INSERT INTO categories (business_id, name, short_code, created_by, created_at)
    VALUES (v_business_id, 'Food', 'FOOD', v_owner_id, NOW()) RETURNING id INTO v_cat_3;
    
    -- Units (with created_by)
    INSERT INTO units (business_id, actual_name, short_name, allow_decimal, created_by, created_at)
    VALUES (v_business_id, 'Piece', 'Pc', FALSE, v_owner_id, NOW()) RETURNING id INTO v_unit_1;
    INSERT INTO units (business_id, actual_name, short_name, allow_decimal, created_by, created_at)
    VALUES (v_business_id, 'Kilogram', 'Kg', TRUE, v_owner_id, NOW()) RETURNING id INTO v_unit_2;
    
    RAISE NOTICE '  ✅ Categories & Units created';
    
    -- Contacts (with created_by) - Insert one by one
    INSERT INTO contacts (business_id, type, name, mobile, created_by, created_at)
    VALUES (v_business_id, 'customer', 'Ahmed Khan', '+92-300-1111111', v_owner_id, NOW())
    RETURNING id INTO v_cust_1;
    
    INSERT INTO contacts (business_id, type, name, mobile, created_by, created_at)
    VALUES (v_business_id, 'customer', 'Fatima Ali', '+92-300-2222222', v_owner_id, NOW())
    RETURNING id INTO v_cust_2;
    
    INSERT INTO contacts (business_id, type, name, mobile, created_by, created_at)
    VALUES (v_business_id, 'customer', 'Hassan Raza', '+92-300-3333333', v_owner_id, NOW())
    RETURNING id INTO v_cust_3;
    
    INSERT INTO contacts (business_id, type, name, mobile, created_by, created_at)
    VALUES (v_business_id, 'customer', 'Ayesha Malik', '+92-300-4444444', v_owner_id, NOW())
    RETURNING id INTO v_cust_4;
    
    INSERT INTO contacts (business_id, type, name, mobile, created_by, created_at)
    VALUES (v_business_id, 'customer', 'Walk-in', NULL, v_owner_id, NOW())
    RETURNING id INTO v_cust_5;
    
    INSERT INTO contacts (business_id, type, name, mobile, created_by, created_at)
    VALUES (v_business_id, 'supplier', 'Tech Suppliers Ltd', '+92-51-1234567', v_owner_id, NOW())
    RETURNING id INTO v_supp_1;
    
    INSERT INTO contacts (business_id, type, name, mobile, created_by, created_at)
    VALUES (v_business_id, 'supplier', 'Wholesale Traders', '+92-51-2345678', v_owner_id, NOW())
    RETURNING id INTO v_supp_2;
    
    INSERT INTO contacts (business_id, type, name, mobile, created_by, created_at)
    VALUES (v_business_id, 'supplier', 'Import House', '+92-51-3456789', v_owner_id, NOW())
    RETURNING id INTO v_supp_3;
    
    RAISE NOTICE '  ✅ Contacts: 8';
    
    -- Products (with created_by)
    INSERT INTO products (name, business_id, type, unit_id, sku, category_id, alert_quantity, created_by, created_at)
    VALUES ('Laptop HP ProBook', v_business_id, 'single', v_unit_1, 'LAP-HP-001', v_cat_1, 5, v_owner_id, NOW()) RETURNING id INTO v_prod_1;
    INSERT INTO variations (name, product_id, sub_sku, default_purchase_price, default_sell_price, created_at)
    VALUES ('DUMMY', v_prod_1, 'LAP-HP-001', 85000, 95000, NOW()) RETURNING id INTO v_var_1;
    
    INSERT INTO products (name, business_id, type, unit_id, sku, category_id, alert_quantity, created_by, created_at)
    VALUES ('Samsung Galaxy A54', v_business_id, 'single', v_unit_1, 'MOB-SAM-001', v_cat_1, 10, v_owner_id, NOW()) RETURNING id INTO v_prod_2;
    INSERT INTO variations (name, product_id, sub_sku, default_purchase_price, default_sell_price, created_at)
    VALUES ('DUMMY', v_prod_2, 'MOB-SAM-001', 55000, 62000, NOW()) RETURNING id INTO v_var_2;
    
    INSERT INTO products (name, business_id, type, unit_id, sku, category_id, alert_quantity, created_by, created_at)
    VALUES ('Cotton T-Shirt', v_business_id, 'single', v_unit_1, 'CLO-TSH-001', v_cat_2, 20, v_owner_id, NOW()) RETURNING id INTO v_prod_3;
    INSERT INTO variations (name, product_id, sub_sku, default_purchase_price, default_sell_price, created_at)
    VALUES ('DUMMY', v_prod_3, 'CLO-TSH-001', 800, 1200, NOW()) RETURNING id INTO v_var_3;
    
    INSERT INTO products (name, business_id, type, unit_id, sku, category_id, alert_quantity, created_by, created_at)
    VALUES ('Basmati Rice 5kg', v_business_id, 'single', v_unit_2, 'FOOD-RICE-001', v_cat_3, 50, v_owner_id, NOW()) RETURNING id INTO v_prod_4;
    INSERT INTO variations (name, product_id, sub_sku, default_purchase_price, default_sell_price, created_at)
    VALUES ('DUMMY', v_prod_4, 'FOOD-RICE-001', 450, 550, NOW()) RETURNING id INTO v_var_4;
    
    INSERT INTO products (name, business_id, type, unit_id, sku, category_id, alert_quantity, created_by, created_at)
    VALUES ('Wireless Headphones', v_business_id, 'single', v_unit_1, 'ELEC-HP-001', v_cat_1, 15, v_owner_id, NOW()) RETURNING id INTO v_prod_5;
    INSERT INTO variations (name, product_id, sub_sku, default_purchase_price, default_sell_price, created_at)
    VALUES ('DUMMY', v_prod_5, 'ELEC-HP-001', 2500, 3500, NOW()) RETURNING id INTO v_var_5;
    
    RAISE NOTICE '  ✅ Products: 5';
    
    -- Inventory
    INSERT INTO variation_location_details (product_id, product_variation_id, variation_id, location_id, qty_available, created_at)
    VALUES 
        (v_prod_1, v_var_1, v_var_1, v_branch_1, 8, NOW()),
        (v_prod_2, v_var_2, v_var_2, v_branch_1, 15, NOW()),
        (v_prod_3, v_var_3, v_var_3, v_branch_1, 45, NOW()),
        (v_prod_4, v_var_4, v_var_4, v_branch_1, 120, NOW()),
        (v_prod_5, v_var_5, v_var_5, v_branch_1, 20, NOW()),
        (v_prod_1, v_var_1, v_var_1, v_branch_2, 5, NOW()),
        (v_prod_2, v_var_2, v_var_2, v_branch_2, 25, NOW()),
        (v_prod_3, v_var_3, v_var_3, v_branch_2, 60, NOW()),
        (v_prod_4, v_var_4, v_var_4, v_branch_2, 80, NOW()),
        (v_prod_5, v_var_5, v_var_5, v_branch_2, 12, NOW()),
        (v_prod_1, v_var_1, v_var_1, v_branch_3, 20, NOW()),
        (v_prod_2, v_var_2, v_var_2, v_branch_3, 50, NOW()),
        (v_prod_3, v_var_3, v_var_3, v_branch_3, 200, NOW()),
        (v_prod_4, v_var_4, v_var_4, v_branch_3, 500, NOW()),
        (v_prod_5, v_var_5, v_var_5, v_branch_3, 80, NOW());
    
    RAISE NOTICE '  ✅ Inventory: 15 records';
    
    -- Purchases (with created_by)
    INSERT INTO transactions (type, business_id, location_id, contact_id, transaction_date, status, payment_status, final_total, created_by, created_at)
    VALUES 
        ('purchase', v_business_id, v_branch_1, v_supp_1, NOW() - INTERVAL '10 days', 'final', 'paid', 425000, v_owner_id, NOW() - INTERVAL '10 days'),
        ('purchase', v_business_id, v_branch_2, v_supp_2, NOW() - INTERVAL '7 days', 'final', 'paid', 180000, v_owner_id, NOW() - INTERVAL '7 days');
    
    -- Sales (with created_by)
    INSERT INTO transactions (type, business_id, location_id, contact_id, transaction_date, status, payment_status, invoice_no, final_total, created_by, created_at)
    VALUES 
        ('sell', v_business_id, v_branch_1, v_cust_1, NOW() - INTERVAL '5 days', 'final', 'paid', 'INV-MB-001', 95000, v_owner_id, NOW() - INTERVAL '5 days'),
        ('sell', v_business_id, v_branch_2, v_cust_2, NOW() - INTERVAL '3 days', 'final', 'paid', 'INV-CO-001', 65500, v_owner_id, NOW() - INTERVAL '3 days'),
        ('sell', v_business_id, v_branch_1, v_cust_3, NOW() - INTERVAL '2 days', 'final', 'paid', 'INV-MB-002', 4150, v_owner_id, NOW() - INTERVAL '2 days'),
        ('sell', v_business_id, v_branch_2, v_cust_5, NOW() - INTERVAL '1 day', 'final', 'paid', 'INV-CO-002', 3500, v_owner_id, NOW() - INTERVAL '1 day'),
        ('sell', v_business_id, v_branch_1, v_cust_4, NOW(), 'final', 'paid', 'INV-MB-003', 62000, v_owner_id, NOW());
    
    -- Get sale IDs
    DECLARE
        v_sale_ids INTEGER[];
    BEGIN
        SELECT ARRAY_AGG(id ORDER BY id DESC) INTO v_sale_ids
        FROM transactions WHERE business_id = v_business_id AND type = 'sell' LIMIT 5;
        
        INSERT INTO transaction_sell_lines (transaction_id, product_id, variation_id, quantity, unit_price_inc_tax, created_at)
        VALUES 
            (v_sale_ids[5], v_prod_1, v_var_1, 1, 95000, NOW() - INTERVAL '5 days'),
            (v_sale_ids[4], v_prod_2, v_var_2, 1, 62000, NOW() - INTERVAL '3 days'),
            (v_sale_ids[4], v_prod_5, v_var_5, 1, 3500, NOW() - INTERVAL '3 days'),
            (v_sale_ids[3], v_prod_3, v_var_3, 3, 1200, NOW() - INTERVAL '2 days'),
            (v_sale_ids[3], v_prod_4, v_var_4, 1, 550, NOW() - INTERVAL '2 days'),
            (v_sale_ids[2], v_prod_5, v_var_5, 1, 3500, NOW() - INTERVAL '1 day'),
            (v_sale_ids[1], v_prod_2, v_var_2, 1, 62000, NOW());
    END;
    
    RAISE NOTICE '  ✅ Sales: 5 transactions';
    RAISE NOTICE '✅ FRESH DATA SEEDING COMPLETE!';
    
END $$;

COMMIT;

-- Verification
SELECT 
    'Demo Account' as summary,
    (SELECT COUNT(*) FROM products) as products,
    (SELECT COUNT(*) FROM contacts) as contacts,
    (SELECT COUNT(*) FROM transactions WHERE type='sell') as sales,
    (SELECT COUNT(*) FROM variation_location_details) as inventory;

SELECT 
    bl.name as branch,
    bl.custom_field1 as code,
    COUNT(DISTINCT vld.id) as items,
    COUNT(DISTINCT t.id) FILTER (WHERE t.type='sell') as sales
FROM business_locations bl
LEFT JOIN variation_location_details vld ON vld.location_id = bl.id
LEFT JOIN transactions t ON t.location_id = bl.id
WHERE bl.business_id = 1 AND bl.deleted_at IS NULL
GROUP BY bl.id, bl.name, bl.custom_field1
ORDER BY bl.id;
