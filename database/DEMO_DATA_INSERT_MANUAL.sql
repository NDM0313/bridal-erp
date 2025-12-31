-- ============================================
-- DEMO DATA INSERT SCRIPT (MANUAL VERSION)
-- Use this version if auth.uid() doesn't work in SQL Editor
-- ============================================
-- 
-- INSTRUCTIONS:
-- 1. Replace YOUR_USER_UUID_HERE with your actual user UUID from Supabase Auth
-- 2. Replace YOUR_BUSINESS_ID_HERE with your actual business_id
-- 3. Run this script in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: SET YOUR VALUES HERE
-- ============================================
DO $$
DECLARE
    -- ⚠️ REPLACE THESE VALUES:
    v_user_id UUID := 'YOUR_USER_UUID_HERE'::UUID;  -- Get from Authentication > Users
    v_business_id INTEGER := YOUR_BUSINESS_ID_HERE;  -- Get from: SELECT id FROM businesses;
    
    v_location_id INTEGER;
    v_unit_id INTEGER;
    v_category_id INTEGER;
    v_brand_id INTEGER;
    
    -- Product IDs
    v_product_ids INTEGER[] := ARRAY[]::INTEGER[];
    v_variation_ids INTEGER[] := ARRAY[]::INTEGER[];
    
    -- Contact IDs
    v_customer_ids INTEGER[] := ARRAY[]::INTEGER[];
    v_supplier_ids INTEGER[] := ARRAY[]::INTEGER[];
    
    -- Account IDs
    v_cash_account_id INTEGER;
    v_bank_account_id INTEGER;
    
    -- Transaction IDs
    v_transaction_ids INTEGER[] := ARRAY[]::INTEGER[];
    
    -- Production Order IDs
    v_production_order_ids INTEGER[] := ARRAY[]::INTEGER[];
    
    -- Temporary variables
    v_temp_id INTEGER;
    v_temp_variation_id INTEGER;
    v_invoice_counter INTEGER;
BEGIN
    -- Validate inputs
    IF v_user_id = 'YOUR_USER_UUID_HERE'::UUID THEN
        RAISE EXCEPTION 'Please replace YOUR_USER_UUID_HERE with your actual user UUID';
    END IF;
    
    IF v_business_id = 0 OR v_business_id IS NULL THEN
        RAISE EXCEPTION 'Please replace YOUR_BUSINESS_ID_HERE with your actual business_id';
    END IF;
    
    RAISE NOTICE 'Using user_id: %, business_id: %', v_user_id, v_business_id;

