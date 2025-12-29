-- ============================================
-- RBAC (Role-Based Access Control) Setup
-- Extends user_profiles table with role support
-- ============================================

-- ============================================
-- STEP 1: UPDATE user_profiles TABLE
-- ============================================

-- Add role column if it doesn't exist (it already exists, but ensure it has proper constraints)
DO $$ 
BEGIN
    -- Check if role column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN role VARCHAR(50) DEFAULT 'cashier';
    END IF;
END $$;

-- Update role column with CHECK constraint for valid roles
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS chk_user_profiles_role;

ALTER TABLE user_profiles 
ADD CONSTRAINT chk_user_profiles_role 
CHECK (role IN ('admin', 'manager', 'cashier', 'auditor'));

-- Set default role to 'cashier' if NULL
UPDATE user_profiles 
SET role = 'cashier' 
WHERE role IS NULL OR role NOT IN ('admin', 'manager', 'cashier', 'auditor');

-- ============================================
-- STEP 2: CREATE HELPER FUNCTION
-- ============================================

-- Function to get user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS VARCHAR(50)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_role VARCHAR(50);
BEGIN
    SELECT role INTO user_role
    FROM user_profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    RETURN COALESCE(user_role, 'cashier'); -- Default to cashier if not found
END;
$$;

COMMENT ON FUNCTION get_user_role() IS 'Returns the role for the current authenticated user from user_profiles table.';

-- ============================================
-- STEP 3: UPDATE RLS POLICIES FOR ROLE-BASED ACCESS
-- ============================================

-- Note: RLS policies remain business-scoped
-- Role checks are handled at application level (backend API)
-- RLS ensures business isolation, roles ensure permission boundaries

-- ============================================
-- STEP 4: CREATE AUDIT LOGS TABLE (if not exists)
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    user_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NULL,
    details JSONB NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_audit_logs_role CHECK (user_role IN ('admin', 'manager', 'cashier', 'auditor'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_business_id ON audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view audit logs from their own business
CREATE POLICY "Users view own business audit logs" ON audit_logs
FOR SELECT USING (business_id = get_user_business_id());

-- Policy: Only backend (service_role) can insert audit logs
-- Frontend cannot create audit logs directly (security)
-- This is handled by backend API

COMMENT ON TABLE audit_logs IS 'Immutable audit trail for role-sensitive actions. Only backend can insert.';

-- ============================================
-- STEP 5: VERIFICATION
-- ============================================

-- Check role column exists and has constraint
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
    AND column_name = 'role';

-- Check function exists
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name = 'get_user_role';

-- Check audit_logs table exists
SELECT 
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name = 'audit_logs';

-- ============================================
-- NOTES
-- ============================================
-- 
-- 1. Roles are business-scoped (stored in user_profiles with business_id)
-- 2. Role values: 'admin', 'manager', 'cashier', 'auditor'
-- 3. get_user_role() function returns user's role
-- 4. RLS ensures business isolation
-- 5. Role checks are handled at application level (backend API)
-- 6. Audit logs are immutable (only backend can insert)
-- 
-- ============================================

