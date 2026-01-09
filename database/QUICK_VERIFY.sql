-- Quick verification of demo account reset

SELECT '========== DEMO ACCOUNT STATUS ==========' as section;

-- Overall counts
SELECT 
    'Overall Counts' as metric,
    (SELECT COUNT(*) FROM products) as products,
    (SELECT COUNT(*) FROM contacts) as contacts,
    (SELECT COUNT(*) FROM transactions WHERE type = 'sell') as sales,
    (SELECT COUNT(*) FROM transactions WHERE type = 'purchase') as purchases,
    (SELECT COUNT(*) FROM variation_location_details) as inventory;

-- Branch-wise breakdown
SELECT 
    bl.name as branch,
    bl.custom_field1 as code,
    COUNT(DISTINCT vld.id) as inventory_items,
    COUNT(DISTINCT t.id) FILTER (WHERE t.type = 'sell') as sales
FROM business_locations bl
LEFT JOIN variation_location_details vld ON vld.location_id = bl.id
LEFT JOIN transactions t ON t.location_id = bl.id
WHERE bl.deleted_at IS NULL
GROUP BY bl.id, bl.name, bl.custom_field1
ORDER BY bl.id;

-- NULL location_id check
SELECT 
    'NULL Check' as test,
    (SELECT COUNT(*) FROM transactions WHERE location_id IS NULL) as null_transactions,
    (SELECT COUNT(*) FROM variation_location_details WHERE location_id IS NULL) as null_inventory,
    CASE 
        WHEN (SELECT COUNT(*) FROM transactions WHERE location_id IS NULL) = 0 
         AND (SELECT COUNT(*) FROM variation_location_details WHERE location_id IS NULL) = 0 
        THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as status;

SELECT '========== VERIFICATION COMPLETE ==========' as section;
