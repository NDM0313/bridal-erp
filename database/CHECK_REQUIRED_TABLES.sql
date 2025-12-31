-- ============================================
-- CHECK REQUIRED TABLES FOR DEMO DATA SCRIPT
-- Run this FIRST to see which tables are missing
-- ============================================

-- Check if all required tables exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'businesses') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as businesses,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_locations') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as business_locations,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as user_profiles,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'units') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as units,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categories') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as categories,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brands') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as brands,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as products,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'variations') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as variations,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'variation_location_details') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as variation_location_details,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as contacts,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_accounts') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as financial_accounts,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as transactions,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transaction_sell_lines') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as transaction_sell_lines,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rental_bookings') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as rental_bookings,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_orders') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as production_orders;

-- ============================================
-- LIST ALL YOUR TABLES
-- ============================================
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================
-- CHECK IF PRODUCTS TABLE HAS RENTAL COLUMNS
-- ============================================
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('is_rentable', 'rental_price', 'security_deposit_amount', 'rent_duration_unit')
ORDER BY column_name;

-- ============================================
-- CHECK IF BUSINESSES TABLE EXISTS AND HAS DATA
-- ============================================
SELECT 
    COUNT(*) as business_count,
    MIN(id) as first_business_id,
    MAX(id) as last_business_id
FROM businesses;

-- ============================================
-- CHECK IF USER_PROFILES HAS DATA
-- ============================================
SELECT 
    COUNT(*) as user_profile_count,
    COUNT(DISTINCT business_id) as unique_businesses
FROM user_profiles;

