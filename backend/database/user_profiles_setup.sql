-- ============================================
-- USER PROFILES TABLE SETUP
-- Implements get_user_business_id() function using user_profiles table
-- ============================================

-- Create user_profiles table
-- This table links Supabase Auth users to businesses
CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'user',  -- 'owner', 'admin', 'user', etc.
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_profiles_user_id UNIQUE (user_id)
);

-- Index for fast lookups
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_business_id ON user_profiles(business_id);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile"
ON user_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON user_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Only system admins can insert/delete (or implement based on your needs)
-- For now, allow inserts (will be handled by application)
CREATE POLICY "Users can insert their own profile"
ON user_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- UPDATE get_user_business_id() FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_business_id INTEGER;
BEGIN
    -- Get business_id from user_profiles table
    SELECT business_id INTO user_business_id
    FROM user_profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    RETURN user_business_id;
END;
$$;

COMMENT ON FUNCTION get_user_business_id() IS 'Returns the business_id for the current authenticated user from user_profiles table.';

-- ============================================
-- HELPER FUNCTION: Create user profile
-- ============================================
-- This function can be called when a user signs up
-- or when linking a user to a business

CREATE OR REPLACE FUNCTION create_user_profile(
    p_user_id UUID,
    p_business_id INTEGER,
    p_role VARCHAR(50) DEFAULT 'user'
)
RETURNS user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_profile user_profiles;
BEGIN
    INSERT INTO user_profiles (user_id, business_id, role)
    VALUES (p_user_id, p_business_id, p_role)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        business_id = EXCLUDED.business_id,
        role = EXCLUDED.role,
        updated_at = CURRENT_TIMESTAMP
    RETURNING * INTO new_profile;
    
    RETURN new_profile;
END;
$$;

COMMENT ON FUNCTION create_user_profile(UUID, INTEGER, VARCHAR) IS 'Creates or updates a user profile linking a user to a business.';

-- ============================================
-- EXAMPLE: Create a user profile
-- ============================================
-- Replace user_id and business_id with actual values
/*
SELECT create_user_profile(
    'user-uuid-from-supabase-auth'::UUID,
    1,  -- business_id
    'owner'  -- role
);
*/

-- ============================================
-- VERIFICATION
-- ============================================

-- Check if table exists
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name = 'user_profiles';

-- Check if function exists
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name = 'get_user_business_id';

-- ============================================
-- NOTES
-- ============================================
-- 
-- 1. user_profiles table links Supabase Auth users to businesses
-- 2. get_user_business_id() function now reads from user_profiles
-- 3. RLS policies ensure users can only see their own profile
-- 4. Use create_user_profile() function to link users to businesses
-- 5. This approach is clean and allows one user to belong to one business
--    (can be extended to support multiple businesses if needed)
-- 
-- ============================================

