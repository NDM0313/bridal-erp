-- Simple Data Clean + Branch Update
BEGIN;

SELECT 'Starting cleanup for business_id = 1...' as status;

-- Clean all data
DELETE FROM transaction_sell_lines WHERE transaction_id IN (SELECT id FROM transactions WHERE business_id = 1);
DELETE FROM transaction_purchase_lines WHERE transaction_id IN (SELECT id FROM transactions WHERE business_id = 1);
DELETE FROM transactions WHERE business_id = 1;
DELETE FROM variation_location_details WHERE location_id IN (SELECT id FROM business_locations WHERE business_id = 1);
DELETE FROM products WHERE business_id = 1;
DELETE FROM contacts WHERE business_id = 1;
DELETE FROM categories WHERE business_id = 1;
DELETE FROM units WHERE business_id = 1;

SELECT '✅ All data deleted' as status;

-- Update Branch 1 (ID = 1)
UPDATE business_locations SET 
    name = 'Main Branch',
    custom_field1 = 'MB-001',
    landmark = 'Downtown Plaza, Main Street, Rawalpindi',
    city = 'Rawalpindi',
    state = 'Punjab',
    country = 'Pakistan',
    zip_code = '46000',
    mobile = '+92-300-1234567',
    deleted_at = NULL,
    updated_at = NOW()
WHERE id = 1 AND business_id = 1;

-- Update Branch 2 (ID = 3)
UPDATE business_locations SET 
    name = 'City Outlet',
    custom_field1 = 'CO-002',
    landmark = 'Shopping Mall, 2nd Floor, Islamabad',
    city = 'Islamabad',
    state = 'Federal Capital',
    country = 'Pakistan',
    zip_code = '44000',
    mobile = '+92-300-2345678',
    deleted_at = NULL,
    updated_at = NOW()
WHERE id = 3 AND business_id = 1;

-- Update Branch 3 (ID = 4)
UPDATE business_locations SET 
    name = 'Warehouse',
    custom_field1 = 'WH-003',
    landmark = 'Industrial Area, Sector 15, Rawalpindi',
    city = 'Rawalpindi',
    state = 'Punjab',
    country = 'Pakistan',
    zip_code = '46200',
    mobile = '+92-300-3456789',
    deleted_at = NULL,
    updated_at = NOW()
WHERE id = 4 AND business_id = 1;

SELECT '✅ Branches updated with fresh names!' as status;

COMMIT;

-- Verification
SELECT 
    id,
    name,
    custom_field1 as code,
    city,
    mobile
FROM business_locations 
WHERE business_id = 1 AND deleted_at IS NULL 
ORDER BY id;

SELECT '✅ CLEANUP COMPLETE - Ready for fresh data insert!' as final_status;
