-- ============================================
-- SOFT LAUNCH CONFIGURATION
-- Enables soft launch mode with user limits
-- ============================================

-- ============================================
-- SYSTEM SETTINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

COMMENT ON TABLE system_settings IS 'System-wide configuration settings for launch control.';

-- ============================================
-- INITIAL SETTINGS
-- ============================================

-- Signup enabled/disabled
INSERT INTO system_settings (key, value, description) VALUES
('signup_enabled', 'true'::jsonb, 'Enable/disable new user signups')
ON CONFLICT (key) DO NOTHING;

-- Soft launch user limit
INSERT INTO system_settings (key, value, description) VALUES
('soft_launch_user_limit', '10'::jsonb, 'Maximum number of users allowed during soft launch')
ON CONFLICT (key) DO NOTHING;

-- Soft launch mode (enable/disable)
INSERT INTO system_settings (key, value, description) VALUES
('soft_launch_mode', 'true'::jsonb, 'Enable/disable soft launch mode (user limits)')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get system setting
CREATE OR REPLACE FUNCTION get_system_setting(setting_key VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    setting_value JSONB;
BEGIN
    SELECT value INTO setting_value
    FROM system_settings
    WHERE key = setting_key;
    
    RETURN setting_value;
END;
$$;

COMMENT ON FUNCTION get_system_setting(VARCHAR) IS 'Returns system setting value by key.';

-- Check if signup is enabled
CREATE OR REPLACE FUNCTION is_signup_enabled()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN COALESCE((get_system_setting('signup_enabled')::text)::boolean, true);
END;
$$;

COMMENT ON FUNCTION is_signup_enabled() IS 'Returns true if new signups are enabled.';

-- Check if soft launch limit reached
CREATE OR REPLACE FUNCTION is_soft_launch_limit_reached()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_limit INTEGER;
    current_count INTEGER;
    soft_launch_enabled BOOLEAN;
BEGIN
    -- Check if soft launch mode is enabled
    soft_launch_enabled := COALESCE((get_system_setting('soft_launch_mode')::text)::boolean, false);
    
    IF NOT soft_launch_enabled THEN
        RETURN false; -- No limit if soft launch disabled
    END IF;
    
    -- Get user limit
    user_limit := COALESCE((get_system_setting('soft_launch_user_limit')::text)::integer, 10);
    
    -- Count current organizations (excluding soft_launch_user flag for simplicity)
    SELECT COUNT(*) INTO current_count
    FROM organizations;
    
    RETURN current_count >= user_limit;
END;
$$;

COMMENT ON FUNCTION is_soft_launch_limit_reached() IS 'Returns true if soft launch user limit is reached.';

-- ============================================
-- VERIFICATION
-- ============================================

-- Check settings created
SELECT 
    key,
    value,
    description,
    CASE WHEN key IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM system_settings
ORDER BY key;

-- ============================================
-- NOTES
-- ============================================
-- 
-- To disable signup:
-- UPDATE system_settings SET value = 'false'::jsonb WHERE key = 'signup_enabled';
-- 
-- To disable soft launch mode (unlimited users):
-- UPDATE system_settings SET value = 'false'::jsonb WHERE key = 'soft_launch_mode';
-- 
-- To change user limit:
-- UPDATE system_settings SET value = '20'::jsonb WHERE key = 'soft_launch_user_limit';
-- 
-- ============================================

