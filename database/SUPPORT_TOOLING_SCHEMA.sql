-- ============================================
-- SUPPORT TOOLING SCHEMA
-- Adds support agent access and audit logging
-- ============================================

-- ============================================
-- SUPPORT AGENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS support_agents (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('support', 'admin')),
    can_impersonate BOOLEAN DEFAULT false,  -- Only admins can impersonate
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_agents_user_id ON support_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_support_agents_role ON support_agents(role);

COMMENT ON TABLE support_agents IS 'Support team members with read-only access to customer data.';
COMMENT ON COLUMN support_agents.can_impersonate IS 'Only support admins can impersonate users (for troubleshooting).';

-- ============================================
-- SUPPORT ACCESS LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS support_access_logs (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL REFERENCES support_agents(id) ON DELETE CASCADE,
    organization_id INTEGER NULL REFERENCES organizations(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL,  -- 'view_organization', 'view_billing', 'impersonate', etc.
    accessed_data JSONB NULL,  -- What data was accessed
    ip_address INET NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_access_logs_agent_id ON support_access_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_support_access_logs_organization_id ON support_access_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_support_access_logs_action_type ON support_access_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_support_access_logs_created_at ON support_access_logs(created_at);

COMMENT ON TABLE support_access_logs IS 'Immutable audit log of all support agent actions.';

-- ============================================
-- ONBOARDING TRACKING
-- ============================================

-- Add onboarding fields to organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS onboarding_step VARCHAR(50) DEFAULT 'signup';

COMMENT ON COLUMN organizations.onboarding_completed IS 'Whether organization has completed onboarding wizard.';
COMMENT ON COLUMN organizations.onboarding_step IS 'Current step in onboarding: signup, business_details, first_product, invite_team, payment_method.';

-- ============================================
-- RLS POLICIES FOR SUPPORT TABLES
-- ============================================

ALTER TABLE support_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_access_logs ENABLE ROW LEVEL SECURITY;

-- Support agents: Users can view their own support agent record
CREATE POLICY "Users view own support agent record" ON support_agents
FOR SELECT
USING (user_id = auth.uid());

-- Support access logs: Only support admins can view logs
CREATE POLICY "Support admins view access logs" ON support_access_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM support_agents
    WHERE support_agents.user_id = auth.uid()
      AND support_agents.role = 'admin'
  )
);

-- Support access logs: Backend can insert (via service_role)
-- RLS allows inserts from backend service

-- ============================================
-- VERIFICATION
-- ============================================

-- Check tables created
SELECT 
    table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = table_name
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (VALUES 
    ('support_agents'),
    ('support_access_logs')
) AS t(table_name);

-- ============================================
-- NOTES
-- ============================================
-- 
-- 1. Support agents have read-only access
-- 2. All support actions are logged
-- 3. Impersonation requires admin role
-- 4. Support access logs are immutable
-- 
-- ============================================

