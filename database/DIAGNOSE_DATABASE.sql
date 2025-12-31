-- ============================================
-- DATABASE DIAGNOSTIC SCRIPT
-- Pehle yeh run karo to check karo ke kya missing hai
-- ============================================

-- ============================================
-- STEP 1: CHECK REQUIRED TABLES
-- ============================================
SELECT 
    'Required Tables Check' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'businesses') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING - Run MODERN_ERP_EXTENSION.sql' 
    END as businesses,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_locations') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as business_locations,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as user_profiles,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'units') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as units,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as categories,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'brands') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as brands,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as products,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'variations') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as variations,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'variation_location_details') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as variation_location_details,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as contacts,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financial_accounts') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING - Run MODERN_ERP_EXTENSION.sql' 
    END as financial_accounts,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as transactions,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transaction_sell_lines') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as transaction_sell_lines,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rental_bookings') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING - Run MODERN_ERP_EXTENSION.sql' 
    END as rental_bookings,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'production_orders') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING - Run MODERN_ERP_EXTENSION.sql' 
    END as production_orders;

-- ============================================
-- STEP 2: CHECK PRODUCTS TABLE RENTAL COLUMNS
-- ============================================
SELECT 
    'Products Rental Columns' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_rentable') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING - Run MODERN_ERP_EXTENSION.sql' 
    END as is_rentable,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'rental_price') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING - Run MODERN_ERP_EXTENSION.sql' 
    END as rental_price,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'security_deposit_amount') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING - Run MODERN_ERP_EXTENSION.sql' 
    END as security_deposit_amount,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'rent_duration_unit') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING - Run MODERN_ERP_EXTENSION.sql' 
    END as rent_duration_unit;

-- ============================================
-- STEP 3: CHECK EXISTING DATA
-- ============================================
SELECT 
    'Data Check' as check_type,
    (SELECT COUNT(*) FROM businesses) as businesses_count,
    (SELECT COUNT(*) FROM user_profiles) as user_profiles_count,
    (SELECT COUNT(*) FROM business_locations) as locations_count,
    (SELECT COUNT(*) FROM products) as products_count,
    (SELECT COUNT(*) FROM contacts) as contacts_count,
    (SELECT COUNT(*) FROM financial_accounts) as accounts_count;

-- ============================================
-- STEP 4: GET YOUR BUSINESS_ID AND USER_ID
-- ============================================
SELECT 
    'Your IDs' as check_type,
    up.user_id::text as user_id,
    up.business_id,
    b.name as business_name
FROM user_profiles up
LEFT JOIN businesses b ON b.id = up.business_id
ORDER BY up.created_at DESC
LIMIT 1;

-- ============================================
-- STEP 5: LIST ALL YOUR TABLES (42 tables check)
-- ============================================
SELECT 
    COUNT(*) as total_tables,
    string_agg(table_name, ', ' ORDER BY table_name) as table_names
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- ============================================
-- RECOMMENDATIONS
-- ============================================
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM businesses) = 0
        THEN '⚠️ BUSINESS MISSING! Run QUICK_SETUP.sql first to create business and user profile'
        WHEN (SELECT COUNT(*) FROM user_profiles) = 0
        THEN '⚠️ USER_PROFILE MISSING! Run QUICK_SETUP.sql to create user profile'
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_accounts')
        THEN '⚠️ Run MODERN_ERP_EXTENSION.sql to add financial_accounts, rental_bookings, production_orders tables'
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rental_bookings')
        THEN '⚠️ Run MODERN_ERP_EXTENSION.sql to add rental_bookings table'
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_orders')
        THEN '⚠️ Run MODERN_ERP_EXTENSION.sql to add production_orders table'
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_rentable')
        THEN '⚠️ Run MODERN_ERP_EXTENSION.sql to add rental columns to products table'
        ELSE '✅ Database looks ready! You can run DEMO_DATA_INSERT.sql'
    END as recommendation,
    CASE 
        WHEN (SELECT COUNT(*) FROM businesses) = 0
        THEN 'QUICK_SETUP.sql'
        WHEN (SELECT COUNT(*) FROM user_profiles) = 0
        THEN 'QUICK_SETUP.sql'
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_accounts')
        THEN 'MODERN_ERP_EXTENSION.sql'
        ELSE 'DEMO_DATA_INSERT.sql'
    END as next_script_to_run;

