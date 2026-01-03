-- ============================================
-- CREATE DEFAULT BUSINESS RESOURCES
-- This script creates default accounts and walk-in customer for existing businesses
-- ============================================
-- 
-- USAGE: 
-- Run this script in Supabase SQL Editor
-- It will create default resources for all businesses that don't have them
-- ============================================

DO $$
DECLARE
    v_business RECORD;
    v_user_id UUID;
    v_cash_account_id INTEGER;
    v_bank_account_id INTEGER;
    v_walkin_customer_id INTEGER;
    v_has_owner_id BOOLEAN;
    v_has_created_by BOOLEAN;
    v_sql TEXT;
BEGIN
    -- Check which columns exist in businesses table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' AND column_name = 'owner_id'
    ) INTO v_has_owner_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' AND column_name = 'created_by'
    ) INTO v_has_created_by;
    
    -- Build dynamic query based on available columns
    IF v_has_owner_id AND v_has_created_by THEN
        v_sql := 'SELECT DISTINCT b.id, b.owner_id, b.created_by FROM businesses b';
    ELSIF v_has_owner_id THEN
        v_sql := 'SELECT DISTINCT b.id, b.owner_id, NULL::UUID as created_by FROM businesses b';
    ELSIF v_has_created_by THEN
        v_sql := 'SELECT DISTINCT b.id, NULL::UUID as owner_id, b.created_by FROM businesses b';
    ELSE
        v_sql := 'SELECT DISTINCT b.id, NULL::UUID as owner_id, NULL::UUID as created_by FROM businesses b';
    END IF;
    
    -- Loop through all businesses
    FOR v_business IN EXECUTE v_sql || ' WHERE NOT EXISTS (
            SELECT 1
            FROM financial_accounts fa1
            WHERE fa1.business_id = b.id 
            AND fa1.name = ''Cash in Hand'' 
            AND fa1.type = ''cash''
        )
        OR NOT EXISTS (
            SELECT 1
            FROM financial_accounts fa2
            WHERE fa2.business_id = b.id 
            AND fa2.name = ''Bank Account'' 
            AND fa2.type = ''bank''
        )
        OR NOT EXISTS (
            SELECT 1
            FROM contacts c
            WHERE c.business_id = b.id 
            AND c.name = ''Walk-in Customer'' 
            AND c.type = ''customer''
        )'
    LOOP
        -- Get user_id (prefer owner_id, fallback to created_by)
        v_user_id := COALESCE(v_business.owner_id, v_business.created_by);
        
        -- If still no user_id, try to get from user_profiles
        IF v_user_id IS NULL THEN
            SELECT user_id INTO v_user_id
            FROM user_profiles
            WHERE business_id = v_business.id
            LIMIT 1;
        END IF;
        
        -- If still no user_id, use a default UUID (system user)
        IF v_user_id IS NULL THEN
            v_user_id := '00000000-0000-0000-0000-000000000000'::UUID;
        END IF;
        
        RAISE NOTICE 'Processing business ID: %, User ID: %', v_business.id, v_user_id;
        
        -- Create Cash in Hand account (if financial_accounts table exists)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_accounts') THEN
            -- Check if Cash in Hand already exists
            SELECT id INTO v_cash_account_id
            FROM financial_accounts
            WHERE business_id = v_business.id 
            AND name = 'Cash in Hand' 
            AND type = 'cash'
            LIMIT 1;
            
            IF v_cash_account_id IS NULL THEN
                INSERT INTO financial_accounts (business_id, name, type, current_balance, opening_balance, is_active, created_by)
                VALUES (v_business.id, 'Cash in Hand', 'cash', 0, 0, true, v_user_id)
                RETURNING id INTO v_cash_account_id;
                RAISE NOTICE '  ✅ Created Cash in Hand account (ID: %)', v_cash_account_id;
            ELSE
                RAISE NOTICE '  ✅ Cash in Hand account already exists (ID: %)', v_cash_account_id;
            END IF;
            
            -- Check if Bank Account already exists
            SELECT id INTO v_bank_account_id
            FROM financial_accounts
            WHERE business_id = v_business.id 
            AND name = 'Bank Account' 
            AND type = 'bank'
            LIMIT 1;
            
            IF v_bank_account_id IS NULL THEN
                INSERT INTO financial_accounts (business_id, name, type, current_balance, opening_balance, is_active, created_by)
                VALUES (v_business.id, 'Bank Account', 'bank', 0, 0, true, v_user_id)
                RETURNING id INTO v_bank_account_id;
                RAISE NOTICE '  ✅ Created Bank Account (ID: %)', v_bank_account_id;
            ELSE
                RAISE NOTICE '  ✅ Bank Account already exists (ID: %)', v_bank_account_id;
            END IF;
        ELSE
            RAISE NOTICE '  ⚠️ financial_accounts table not found. Skipping default accounts.';
        END IF;
        
        -- Create Walk-in Customer contact
        SELECT id INTO v_walkin_customer_id
        FROM contacts
        WHERE business_id = v_business.id 
        AND name = 'Walk-in Customer' 
        AND type = 'customer'
        LIMIT 1;
        
        IF v_walkin_customer_id IS NULL THEN
            INSERT INTO contacts (business_id, type, name, mobile, email, created_by)
            VALUES (v_business.id, 'customer', 'Walk-in Customer', NULL, NULL, v_user_id)
            RETURNING id INTO v_walkin_customer_id;
            RAISE NOTICE '  ✅ Created Walk-in Customer (ID: %)', v_walkin_customer_id;
        ELSE
            RAISE NOTICE '  ✅ Walk-in Customer already exists (ID: %)', v_walkin_customer_id;
        END IF;
        
        RAISE NOTICE '  ✅ Completed setup for business ID: %', v_business.id;
    END LOOP;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ DEFAULT RESOURCES SETUP COMPLETE!';
    RAISE NOTICE '============================================';
    
END $$;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
SELECT 
    b.id as business_id,
    b.name as business_name,
    (SELECT COUNT(*) FROM financial_accounts WHERE business_id = b.id AND name = 'Cash in Hand' AND type = 'cash') as has_cash_account,
    (SELECT COUNT(*) FROM financial_accounts WHERE business_id = b.id AND name = 'Bank Account' AND type = 'bank') as has_bank_account,
    (SELECT COUNT(*) FROM contacts WHERE business_id = b.id AND name = 'Walk-in Customer' AND type = 'customer') as has_walkin_customer
FROM businesses b
ORDER BY b.id;

