-- Fix RLS Policy for user_profiles INSERT
-- Allow admins to insert user profiles in their business

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Admins can insert users in their business" ON user_profiles;

-- Create new policy: Allow admins/managers to insert user profiles in their business
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

-- Verify policy created
SELECT 
    policyname,
    cmd,
    with_check
FROM pg_policies
WHERE tablename = 'user_profiles'
AND policyname = 'Admins can insert users in their business';
