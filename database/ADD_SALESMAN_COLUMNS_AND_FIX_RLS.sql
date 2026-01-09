-- ============================================================================
-- Fix Salesman Issues:
-- 1. Add base_salary and commission_percentage columns
-- 2. Fix RLS policy to allow admin users to insert user_profiles
-- ============================================================================

-- Step 1: Add salesman columns to user_profiles
-- ============================================================================

-- Add base_salary column (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'base_salary'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN base_salary DECIMAL(10,2) DEFAULT 0;
        
        RAISE NOTICE '✅ Added base_salary column';
    ELSE
        RAISE NOTICE '⚠️  base_salary column already exists';
    END IF;
END $$;

-- Add commission_percentage column (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'commission_percentage'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN commission_percentage DECIMAL(5,2) DEFAULT 0;
        
        RAISE NOTICE '✅ Added commission_percentage column';
    ELSE
        RAISE NOTICE '⚠️  commission_percentage column already exists';
    END IF;
END $$;

-- Step 2: Fix RLS Policy for user_profiles INSERT
-- ============================================================================

-- Drop existing INSERT policy if exists
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage users in their business" ON user_profiles;

-- Create new policy: Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile"
ON user_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create policy: Allow admins/managers to insert user profiles in their business
CREATE POLICY "Admins can insert users in their business"
ON user_profiles
FOR INSERT
WITH CHECK (
    business_id = get_user_business_id()
    AND EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'manager', 'owner')
        AND business_id = get_user_business_id()
    )
);

-- Step 3: Verify columns exist
-- ============================================================================

SELECT 
    column_name, 
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name IN ('base_salary', 'commission_percentage')
ORDER BY column_name;

-- Step 4: Verify RLS policies
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

RAISE NOTICE '';
RAISE NOTICE '============================================';
RAISE NOTICE '✅ SALESMAN COLUMNS AND RLS FIXED!';
RAISE NOTICE '============================================';
RAISE NOTICE '1. base_salary column added';
RAISE NOTICE '2. commission_percentage column added';
RAISE NOTICE '3. RLS policy updated for admin insert';
RAISE NOTICE '============================================';
