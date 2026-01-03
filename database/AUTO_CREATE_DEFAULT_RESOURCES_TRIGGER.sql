-- ============================================
-- AUTO CREATE DEFAULT RESOURCES TRIGGER
-- Automatically creates default accounts and walk-in customer when a business is created
-- ============================================
-- 
-- USAGE: 
-- Run this script in Supabase SQL Editor
-- This will create a trigger that automatically sets up default resources
-- ============================================

-- Function to create default resources for a new business
CREATE OR REPLACE FUNCTION create_default_business_resources()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_cash_account_id INTEGER;
    v_bank_account_id INTEGER;
    v_walkin_customer_id INTEGER;
    v_has_owner_id BOOLEAN;
    v_has_created_by BOOLEAN;
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
    
    -- Get user_id (prefer owner_id, fallback to created_by)
    IF v_has_owner_id AND v_has_created_by THEN
        v_user_id := COALESCE(NEW.owner_id, NEW.created_by);
    ELSIF v_has_owner_id THEN
        v_user_id := NEW.owner_id;
    ELSIF v_has_created_by THEN
        v_user_id := NEW.created_by;
    ELSE
        v_user_id := NULL;
    END IF;
    
    -- If still no user_id, try to get from user_profiles
    IF v_user_id IS NULL THEN
        SELECT user_id INTO v_user_id
        FROM user_profiles
        WHERE business_id = NEW.id
        LIMIT 1;
    END IF;
    
    -- If still no user_id, use a default UUID (system user)
    IF v_user_id IS NULL THEN
        v_user_id := '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
    
    RAISE NOTICE 'Creating default resources for business ID: %, User ID: %', NEW.id, v_user_id;
    
    -- Create Cash in Hand account (if financial_accounts table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_accounts') THEN
        -- Check if Cash in Hand already exists (shouldn't, but check anyway)
        SELECT id INTO v_cash_account_id
        FROM financial_accounts
        WHERE business_id = NEW.id 
        AND name = 'Cash in Hand' 
        AND type = 'cash'
        LIMIT 1;
        
        IF v_cash_account_id IS NULL THEN
            INSERT INTO financial_accounts (business_id, name, type, current_balance, opening_balance, is_active, created_by)
            VALUES (NEW.id, 'Cash in Hand', 'cash', 0, 0, true, v_user_id)
            RETURNING id INTO v_cash_account_id;
            RAISE NOTICE '  ✅ Created Cash in Hand account (ID: %)', v_cash_account_id;
        END IF;
        
        -- Check if Bank Account already exists
        SELECT id INTO v_bank_account_id
        FROM financial_accounts
        WHERE business_id = NEW.id 
        AND name = 'Bank Account' 
        AND type = 'bank'
        LIMIT 1;
        
        IF v_bank_account_id IS NULL THEN
            INSERT INTO financial_accounts (business_id, name, type, current_balance, opening_balance, is_active, created_by)
            VALUES (NEW.id, 'Bank Account', 'bank', 0, 0, true, v_user_id)
            RETURNING id INTO v_bank_account_id;
            RAISE NOTICE '  ✅ Created Bank Account (ID: %)', v_bank_account_id;
        END IF;
    END IF;
    
    -- Create Walk-in Customer contact
    SELECT id INTO v_walkin_customer_id
    FROM contacts
    WHERE business_id = NEW.id 
    AND name = 'Walk-in Customer' 
    AND type = 'customer'
    LIMIT 1;
    
    IF v_walkin_customer_id IS NULL THEN
        INSERT INTO contacts (business_id, type, name, mobile, email, created_by)
        VALUES (NEW.id, 'customer', 'Walk-in Customer', NULL, NULL, v_user_id)
        RETURNING id INTO v_walkin_customer_id;
        RAISE NOTICE '  ✅ Created Walk-in Customer (ID: %)', v_walkin_customer_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires after business is inserted
DROP TRIGGER IF EXISTS trigger_create_default_business_resources ON businesses;
CREATE TRIGGER trigger_create_default_business_resources
    AFTER INSERT ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION create_default_business_resources();

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Trigger created successfully!';
    RAISE NOTICE 'Default resources will now be created automatically when a new business is inserted.';
END $$;

-- Test query to verify trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_create_default_business_resources';

