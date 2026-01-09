-- ============================================================================
-- BRANCH ARCHITECTURE VERIFICATION QUERIES
-- Purpose: Verify branch architecture is correctly implemented
-- Date: January 8, 2026
-- ============================================================================

-- ============================================================================
-- 1. VERIFY SINGLE SOURCE OF TRUTH
-- ============================================================================

-- Check if business_locations table exists and has data
SELECT 
  'business_locations' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT business_id) as unique_businesses
FROM business_locations;

-- Check if deprecated branches table exists
SELECT 
  EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'branches'
  ) as branches_table_exists;

-- ============================================================================
-- 2. VERIFY FOREIGN KEY REFERENCES
-- ============================================================================

-- List all foreign keys pointing to business_locations
SELECT 
  tc.table_name as referencing_table,
  kcu.column_name as referencing_column,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON rc.unique_constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'business_locations'
ORDER BY tc.table_name;

-- List all foreign keys pointing to deprecated branches table (should be empty)
SELECT 
  tc.table_name as referencing_table,
  kcu.column_name as referencing_column,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON rc.unique_constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'branches'
ORDER BY tc.table_name;

-- ============================================================================
-- 3. DATA INTEGRITY CHECK
-- ============================================================================

-- Check for NULL location_id in transactions (sales/purchases)
SELECT 
  type,
  COUNT(*) as total_records,
  COUNT(location_id) as records_with_location,
  COUNT(*) - COUNT(location_id) as records_missing_location
FROM transactions
WHERE type IN ('sell', 'purchase')
GROUP BY type;

-- Check for NULL location_id in variation_location_details (inventory)
SELECT 
  COUNT(*) as total_records,
  COUNT(location_id) as records_with_location,
  COUNT(*) - COUNT(location_id) as records_missing_location
FROM variation_location_details;

-- ============================================================================
-- 4. RLS POLICY VERIFICATION
-- ============================================================================

-- List all RLS policies on business_locations
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'business_locations';

-- List all RLS policies that reference business_locations in their logic
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND (
    qual::text LIKE '%business_locations%' 
    OR with_check::text LIKE '%business_locations%'
  )
ORDER BY tablename, policyname;

-- Check if any RLS policies still reference deprecated branches table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual as using_expression
FROM pg_policies 
WHERE schemaname = 'public' 
  AND (
    qual::text LIKE '%branches%' 
    OR with_check::text LIKE '%branches%'
  )
  AND tablename != 'branches'; -- Exclude policies on the branches table itself

-- ============================================================================
-- 5. BUSINESS ISOLATION VERIFICATION
-- ============================================================================

-- Verify all business_locations are properly linked to businesses
SELECT 
  bl.business_id,
  b.name as business_name,
  COUNT(bl.id) as branch_count
FROM business_locations bl
LEFT JOIN businesses b ON b.id = bl.business_id
GROUP BY bl.business_id, b.name
ORDER BY bl.business_id;

-- Check for orphaned business_locations (no matching business)
SELECT 
  bl.id,
  bl.business_id,
  bl.name as branch_name
FROM business_locations bl
LEFT JOIN businesses b ON b.id = bl.business_id
WHERE b.id IS NULL;

-- ============================================================================
-- 6. BRANCH-WISE DATA DISTRIBUTION
-- ============================================================================

-- Sales by branch
SELECT 
  bl.name as branch_name,
  COUNT(t.id) as total_sales,
  SUM(t.final_total) as total_revenue
FROM business_locations bl
LEFT JOIN transactions t ON t.location_id = bl.id AND t.type = 'sell'
GROUP BY bl.id, bl.name
ORDER BY total_revenue DESC;

-- Purchases by branch
SELECT 
  bl.name as branch_name,
  COUNT(t.id) as total_purchases,
  SUM(t.final_total) as total_purchase_value
FROM business_locations bl
LEFT JOIN transactions t ON t.location_id = bl.id AND t.type = 'purchase'
GROUP BY bl.id, bl.name
ORDER BY total_purchase_value DESC;

-- Inventory by branch
SELECT 
  bl.name as branch_name,
  COUNT(vld.id) as total_inventory_records,
  SUM(vld.qty_available) as total_quantity
FROM business_locations bl
LEFT JOIN variation_location_details vld ON vld.location_id = bl.id
GROUP BY bl.id, bl.name
ORDER BY total_quantity DESC;

-- ============================================================================
-- 7. FINAL SUMMARY
-- ============================================================================

-- Comprehensive branch architecture summary
SELECT 
  'business_locations' as metric_name,
  COUNT(*) as value
FROM business_locations
UNION ALL
SELECT 
  'transactions_with_location_id',
  COUNT(*)
FROM transactions
WHERE location_id IS NOT NULL
UNION ALL
SELECT 
  'transactions_missing_location_id',
  COUNT(*)
FROM transactions
WHERE location_id IS NULL
UNION ALL
SELECT 
  'inventory_with_location_id',
  COUNT(*)
FROM variation_location_details
WHERE location_id IS NOT NULL
UNION ALL
SELECT 
  'inventory_missing_location_id',
  COUNT(*)
FROM variation_location_details
WHERE location_id IS NULL
UNION ALL
SELECT 
  'rls_policies_on_business_locations',
  COUNT(*)
FROM pg_policies
WHERE tablename = 'business_locations'
UNION ALL
SELECT 
  'foreign_keys_to_business_locations',
  COUNT(DISTINCT tc.constraint_name)
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON rc.unique_constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'business_locations';

-- ============================================================================
-- END OF VERIFICATION QUERIES
-- ============================================================================


