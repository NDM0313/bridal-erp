-- ============================================
-- ADD SALESMAN COLUMNS TO USER_PROFILES
-- Adds base_salary and commission_percentage columns
-- ============================================

-- Add salesman-specific columns
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS base_salary NUMERIC(22, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5, 2) DEFAULT 0;

-- Add comments
COMMENT ON COLUMN user_profiles.base_salary IS 'Fixed monthly salary for salesmen';
COMMENT ON COLUMN user_profiles.commission_percentage IS 'Sales commission percentage (0-100)';

-- Grant permissions
GRANT SELECT, UPDATE ON user_profiles TO authenticated;

-- ============================================
-- USAGE
-- ============================================
-- Run this in Supabase SQL Editor to add the columns
-- After running, user creation will include salary and commission fields

