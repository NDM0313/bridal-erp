-- ============================================
-- VERIFICATION QUERIES
-- Run these after setting up Supabase database
-- ============================================

-- ============================================
-- 1. VERIFY ALL TABLES EXIST
-- ============================================
-- Expected: 12 tables

SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Expected output:
-- brands
-- businesses
-- business_locations
-- categories
-- contacts
-- products
-- product_variations
-- transaction_sell_lines
-- transactions
-- units
-- variation_location_details
-- variations

-- ============================================
-- 2. VERIFY FOREIGN KEYS
-- ============================================

SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- 3. VERIFY INDEXES
-- ============================================

SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================
-- 4. VERIFY CRITICAL COLUMNS
-- ============================================
-- Check for Box/Pieces conversion and pricing columns

SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND (
        -- Units table: base_unit logic
        (table_name = 'units' AND column_name IN ('base_unit_id', 'base_unit_multiplier'))
        -- Variations table: dual pricing
        OR (table_name = 'variations' AND column_name IN ('retail_price', 'wholesale_price'))
        -- Stock table: qty_available
        OR (table_name = 'variation_location_details' AND column_name = 'qty_available')
        -- Contacts table: customer_type
        OR (table_name = 'contacts' AND column_name = 'customer_type')
        -- Transactions table: customer_type
        OR (table_name = 'transactions' AND column_name = 'customer_type')
        -- Transaction sell lines: unit_id for conversion
        OR (table_name = 'transaction_sell_lines' AND column_name IN ('quantity', 'unit_id'))
    )
ORDER BY table_name, column_name;

-- Expected output should show all critical columns exist

-- ============================================
-- 5. VERIFY RLS IS ENABLED
-- ============================================

SELECT 
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- All tables should show rls_enabled = true

-- ============================================
-- 6. VERIFY RLS POLICIES EXIST
-- ============================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd AS command,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END AS using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END AS with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Should show policies for all tables

-- ============================================
-- 7. VERIFY TABLE STRUCTURE (SAMPLE)
-- ============================================
-- Check units table structure (critical for Box/Pieces)

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'units'
ORDER BY ordinal_position;

-- ============================================
-- 8. VERIFY VARIATIONS TABLE STRUCTURE
-- ============================================
-- Check pricing columns exist

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'variations'
    AND column_name IN ('retail_price', 'wholesale_price', 'product_id', 'sub_sku')
ORDER BY column_name;

-- ============================================
-- 9. VERIFY STOCK TABLE STRUCTURE
-- ============================================
-- Check qty_available column

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'variation_location_details'
ORDER BY ordinal_position;

-- Verify qty_available is NUMERIC(22, 4) and NOT NULL

-- ============================================
-- 10. COUNT POLICIES PER TABLE
-- ============================================

SELECT 
    tablename,
    COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Each table should have at least one policy

-- ============================================
-- 11. VERIFY CONSTRAINTS
-- ============================================

SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints AS tc
LEFT JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'CHECK')
ORDER BY tc.table_name, tc.constraint_type;

-- ============================================
-- 12. VERIFY FUNCTION EXISTS
-- ============================================

SELECT 
    routine_name,
    routine_type,
    data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name = 'get_user_business_id';

-- Should return one row if function exists

-- ============================================
-- 13. TEST DATA INSERTION (OPTIONAL)
-- ============================================
-- Uncomment to test basic insertions
-- Replace IDs with actual values from your setup

/*
-- Test: Insert a business (requires owner_id from auth.users)
INSERT INTO businesses (name, owner_id, time_zone)
VALUES ('Test Business', 1, 'UTC')
RETURNING id;

-- Test: Insert base unit (Pieces)
INSERT INTO units (business_id, actual_name, short_name, allow_decimal, created_by)
VALUES (1, 'Pieces', 'Pcs', false, 1)
RETURNING id;

-- Test: Insert secondary unit (Box) - 1 Box = 12 Pieces
INSERT INTO units (business_id, actual_name, short_name, allow_decimal, base_unit_id, base_unit_multiplier, created_by)
VALUES (1, 'Box', 'Box', false, 1, 12, 1)
RETURNING id;
*/

-- ============================================
-- SUMMARY QUERY
-- ============================================
-- Get overview of database setup

SELECT 
    'Tables' AS item_type,
    COUNT(*)::TEXT AS count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
    'Foreign Keys' AS item_type,
    COUNT(DISTINCT constraint_name)::TEXT AS count
FROM information_schema.table_constraints
WHERE table_schema = 'public' AND constraint_type = 'FOREIGN KEY'

UNION ALL

SELECT 
    'Indexes' AS item_type,
    COUNT(*)::TEXT AS count
FROM pg_indexes
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'RLS Enabled Tables' AS item_type,
    COUNT(*)::TEXT AS count
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true

UNION ALL

SELECT 
    'RLS Policies' AS item_type,
    COUNT(*)::TEXT AS count
FROM pg_policies
WHERE schemaname = 'public';

-- Expected output:
-- Tables: 12
-- Foreign Keys: ~30-40 (approximate)
-- Indexes: ~50-60 (approximate)
-- RLS Enabled Tables: 12
-- RLS Policies: ~40-50 (approximate)

-- ============================================
-- END OF VERIFICATION QUERIES
-- ============================================

