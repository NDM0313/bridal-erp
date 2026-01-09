-- ============================================================================
-- DEMO DATA VERIFICATION QUERIES
-- Purpose: Verify that demo data was seeded correctly
-- Date: January 8, 2026
-- ============================================================================

-- ============================================================================
-- 1. OVERALL COUNTS
-- ============================================================================

SELECT '========== OVERALL DATA COUNTS ==========' as section;

SELECT 
    'Overall Counts' as summary,
    (SELECT COUNT(*) FROM businesses) as businesses,
    (SELECT COUNT(*) FROM business_locations WHERE deleted_at IS NULL) as branches,
    (SELECT COUNT(*) FROM products) as products,
    (SELECT COUNT(*) FROM variations) as variations,
    (SELECT COUNT(*) FROM contacts) as contacts,
    (SELECT COUNT(*) FROM categories) as categories,
    (SELECT COUNT(*) FROM units) as units,
    (SELECT COUNT(*) FROM variation_location_details) as inventory_records,
    (SELECT COUNT(*) FROM transactions WHERE type = 'sell') as sales,
    (SELECT COUNT(*) FROM transactions WHERE type = 'purchase') as purchases,
    (SELECT COUNT(*) FROM transaction_sell_lines) as sale_line_items,
    (SELECT COUNT(*) FROM transaction_purchase_lines) as purchase_line_items;

-- ============================================================================
-- 2. BRANCH-WISE DATA DISTRIBUTION
-- ============================================================================

SELECT '========== BRANCH-WISE DISTRIBUTION ==========' as section;

SELECT 
    bl.name as branch_name,
    bl.custom_field1 as branch_code,
    COUNT(DISTINCT vld.id) as inventory_items,
    COALESCE(SUM(vld.qty_available), 0) as total_stock_quantity,
    COUNT(DISTINCT t.id) FILTER (WHERE t.type = 'sell') as sales_count,
    COUNT(DISTINCT t.id) FILTER (WHERE t.type = 'purchase') as purchase_count,
    COALESCE(SUM(t.final_total) FILTER (WHERE t.type = 'sell'), 0) as total_sales_revenue
FROM business_locations bl
LEFT JOIN variation_location_details vld ON vld.location_id = bl.id
LEFT JOIN transactions t ON t.location_id = bl.id
WHERE bl.deleted_at IS NULL
GROUP BY bl.id, bl.name, bl.custom_field1
ORDER BY bl.id;

-- ============================================================================
-- 3. PRODUCT INVENTORY BY BRANCH
-- ============================================================================

SELECT '========== PRODUCT INVENTORY BY BRANCH ==========' as section;

SELECT 
    p.name as product_name,
    p.sku,
    bl.name as branch_name,
    vld.qty_available,
    v.default_sell_price as sell_price
FROM variation_location_details vld
JOIN variations v ON v.id = vld.variation_id
JOIN products p ON p.id = vld.product_id
JOIN business_locations bl ON bl.id = vld.location_id
WHERE bl.deleted_at IS NULL
ORDER BY p.name, bl.id;

-- ============================================================================
-- 4. RECENT SALES TRANSACTIONS
-- ============================================================================

SELECT '========== RECENT SALES TRANSACTIONS ==========' as section;

SELECT 
    t.invoice_no,
    bl.name as branch,
    c.name as customer,
    t.transaction_date::date as date,
    t.final_total as amount,
    t.payment_status,
    COUNT(tsl.id) as line_items
FROM transactions t
LEFT JOIN business_locations bl ON bl.id = t.location_id
LEFT JOIN contacts c ON c.id = t.contact_id
LEFT JOIN transaction_sell_lines tsl ON tsl.transaction_id = t.id
WHERE t.type = 'sell'
GROUP BY t.id, t.invoice_no, bl.name, c.name, t.transaction_date, t.final_total, t.payment_status
ORDER BY t.transaction_date DESC;

-- ============================================================================
-- 5. PURCHASE ORDERS
-- ============================================================================

SELECT '========== PURCHASE ORDERS ==========' as section;

SELECT 
    t.id as purchase_id,
    bl.name as branch,
    c.name as supplier,
    t.transaction_date::date as date,
    t.final_total as amount,
    t.payment_status,
    COUNT(tpl.id) as line_items
FROM transactions t
LEFT JOIN business_locations bl ON bl.id = t.location_id
LEFT JOIN contacts c ON c.id = t.contact_id
LEFT JOIN transaction_purchase_lines tpl ON tpl.transaction_id = t.id
WHERE t.type = 'purchase'
GROUP BY t.id, bl.name, c.name, t.transaction_date, t.final_total, t.payment_status
ORDER BY t.transaction_date DESC;

-- ============================================================================
-- 6. CUSTOMER & SUPPLIER COUNTS
-- ============================================================================

SELECT '========== CONTACTS SUMMARY ==========' as section;

SELECT 
    type,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE email IS NOT NULL) as with_email,
    COUNT(*) FILTER (WHERE mobile IS NOT NULL) as with_mobile
FROM contacts
GROUP BY type;

-- ============================================================================
-- 7. DATA QUALITY CHECKS
-- ============================================================================

SELECT '========== DATA QUALITY CHECKS ==========' as section;

-- Check for NULL location_ids
SELECT 
    'NULL location_id in transactions' as check_name,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM transactions
WHERE location_id IS NULL;

SELECT 
    'NULL location_id in inventory' as check_name,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM variation_location_details
WHERE location_id IS NULL;

-- Check for orphaned records
SELECT 
    'Orphaned transaction_sell_lines' as check_name,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ WARN' END as status
FROM transaction_sell_lines tsl
LEFT JOIN transactions t ON t.id = tsl.transaction_id
WHERE t.id IS NULL;

SELECT 
    'Orphaned variations' as check_name,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ WARN' END as status
FROM variations v
LEFT JOIN products p ON p.id = v.product_id
WHERE p.id IS NULL;

-- ============================================================================
-- 8. REVENUE SUMMARY
-- ============================================================================

SELECT '========== REVENUE SUMMARY ==========' as section;

SELECT 
    'Total Sales Revenue' as metric,
    COALESCE(SUM(final_total), 0) as amount
FROM transactions
WHERE type = 'sell' AND status = 'final';

SELECT 
    'Total Purchase Cost' as metric,
    COALESCE(SUM(final_total), 0) as amount
FROM transactions
WHERE type = 'purchase' AND status = 'final';

SELECT 
    'Gross Profit' as metric,
    COALESCE(
        (SELECT SUM(final_total) FROM transactions WHERE type = 'sell' AND status = 'final') -
        (SELECT SUM(final_total) FROM transactions WHERE type = 'purchase' AND status = 'final'),
        0
    ) as amount;

-- ============================================================================
-- 9. CATEGORY-WISE PRODUCT COUNT
-- ============================================================================

SELECT '========== CATEGORY-WISE PRODUCTS ==========' as section;

SELECT 
    c.name as category,
    COUNT(p.id) as product_count,
    SUM(vld.qty_available) as total_stock_across_branches
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
LEFT JOIN variations v ON v.product_id = p.id
LEFT JOIN variation_location_details vld ON vld.variation_id = v.id
GROUP BY c.id, c.name
ORDER BY product_count DESC;

-- ============================================================================
-- END OF VERIFICATION QUERIES
-- ============================================================================

SELECT '========== VERIFICATION COMPLETE ==========' as section;
