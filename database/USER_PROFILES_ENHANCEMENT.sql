-- ============================================
-- USER PROFILES ENHANCEMENT
-- Add email and full_name to user_profiles for easier access
-- ============================================

-- Add columns to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMP;

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Create a function to sync user data from auth.users to user_profiles
CREATE OR REPLACE FUNCTION sync_user_profile_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user_profiles with auth.users data
  UPDATE user_profiles
  SET 
    email = NEW.email,
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    avatar_url = NEW.raw_user_meta_data->>'avatar_url',
    last_sign_in_at = NEW.last_sign_in_at,
    updated_at = NOW()
  WHERE user_id = NEW.id::text;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-sync on auth.users changes
DROP TRIGGER IF EXISTS trigger_sync_user_profile ON auth.users;
CREATE TRIGGER trigger_sync_user_profile
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_profile_data();

-- Backfill existing data (run this once to populate existing records)
-- Note: This requires superuser access, run manually if needed
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT 
      u.id,
      u.email,
      u.raw_user_meta_data->>'full_name' as full_name,
      u.raw_user_meta_data->>'avatar_url' as avatar_url,
      u.last_sign_in_at
    FROM auth.users u
  LOOP
    UPDATE user_profiles
    SET 
      email = user_record.email,
      full_name = COALESCE(user_record.full_name, user_record.email),
      avatar_url = user_record.avatar_url,
      last_sign_in_at = user_record.last_sign_in_at
    WHERE user_id = user_record.id::text;
  END LOOP;
END $$;

-- Grant necessary permissions
GRANT SELECT ON user_profiles TO authenticated;

COMMENT ON COLUMN user_profiles.email IS 'User email synced from auth.users';
COMMENT ON COLUMN user_profiles.full_name IS 'User full name synced from auth.users metadata';
COMMENT ON COLUMN user_profiles.avatar_url IS 'User avatar URL synced from auth.users metadata';
COMMENT ON COLUMN user_profiles.last_sign_in_at IS 'Last sign in timestamp synced from auth.users';

-- ============================================
-- USAGE
-- ============================================
-- After running this migration:
-- 1. User data will automatically sync from auth.users to user_profiles
-- 2. You can query user_profiles directly without needing admin API
-- 3. Email, name, and avatar will be available in user_profiles table

