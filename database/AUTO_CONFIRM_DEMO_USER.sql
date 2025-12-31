-- ============================================
-- AUTO-CONFIRM DEMO USER
-- This script confirms the demo@pos.com user email
-- ============================================
-- 
-- USAGE: Run this in Supabase SQL Editor
-- It will auto-confirm demo@pos.com so no email verification needed
-- ============================================

DO $$
DECLARE
    v_demo_email TEXT := 'demo@pos.com';
    v_user_id UUID;
BEGIN
    -- Get user_id from auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = v_demo_email;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'Demo user not found: %', v_demo_email;
        RAISE NOTICE 'Please create the user first in Supabase Auth Dashboard';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found demo user: % (ID: %)', v_demo_email, v_user_id;
    
    -- Update user to confirmed
    -- Note: confirmed_at is a generated column, so we only update email_confirmed_at
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = v_user_id;
    
    RAISE NOTICE '✅ Demo user email confirmed!';
    RAISE NOTICE 'User can now login without email verification.';
    
END $$;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
SELECT 
    email,
    email_confirmed_at,
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmed'
        ELSE '❌ Not Confirmed'
    END as status
FROM auth.users
WHERE email = 'demo@pos.com';

