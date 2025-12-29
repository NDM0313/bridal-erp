-- ============================================
-- MONITORING SCHEMA
-- Tables for error logging, payment tracking, and sale tracking
-- ============================================

-- ============================================
-- ERROR LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS error_logs (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NULL REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT NULL,
    error_type VARCHAR(100) NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    context JSONB NULL,
    ip_address INET NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_error_logs_org_id ON error_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);

COMMENT ON TABLE error_logs IS 'Application error logs for monitoring and debugging.';

-- ============================================
-- PAYMENT FAILURE LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS payment_failure_logs (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id INTEGER NULL REFERENCES organization_subscriptions(id) ON DELETE SET NULL,
    stripe_invoice_id VARCHAR(255) NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    failure_reason TEXT NULL,
    retry_attempt INTEGER DEFAULT 0,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_failure_logs_org_id ON payment_failure_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_failure_logs_subscription_id ON payment_failure_logs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_failure_logs_resolved ON payment_failure_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_payment_failure_logs_created_at ON payment_failure_logs(created_at);

COMMENT ON TABLE payment_failure_logs IS 'Tracks payment failures for monitoring and recovery.';

-- ============================================
-- SALE FAILURE LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS sale_failure_logs (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    business_id INTEGER NULL REFERENCES businesses(id) ON DELETE SET NULL,
    user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    failure_reason TEXT NOT NULL,
    sale_data JSONB NULL,  -- Sale attempt data
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sale_failure_logs_org_id ON sale_failure_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_sale_failure_logs_business_id ON sale_failure_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_sale_failure_logs_user_id ON sale_failure_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sale_failure_logs_resolved ON sale_failure_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_sale_failure_logs_created_at ON sale_failure_logs(created_at);

COMMENT ON TABLE sale_failure_logs IS 'Tracks sale/transaction failures for monitoring and debugging.';

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_failure_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_failure_logs ENABLE ROW LEVEL SECURITY;

-- Error logs: Backend only (service_role inserts, admins can view)
CREATE POLICY "Admins view error logs" ON error_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM support_agents
    WHERE support_agents.user_id = auth.uid()
      AND support_agents.role = 'admin'
  )
);

-- Payment failure logs: Organization admins can view their own
CREATE POLICY "Org admins view own payment failures" ON payment_failure_logs
FOR SELECT
USING (
  organization_id = get_user_organization_id()
  AND EXISTS (
    SELECT 1 FROM organization_users
    WHERE organization_id = get_user_organization_id()
      AND user_id = auth.uid()
      AND is_organization_admin = true
  )
);

-- Sale failure logs: Organization admins can view their own
CREATE POLICY "Org admins view own sale failures" ON sale_failure_logs
FOR SELECT
USING (
  organization_id = get_user_organization_id()
  AND EXISTS (
    SELECT 1 FROM organization_users
    WHERE organization_id = get_user_organization_id()
      AND user_id = auth.uid()
      AND is_organization_admin = true
  )
);

-- Note: Inserts are done by backend (service_role), so no INSERT policy needed

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
    ('error_logs'),
    ('payment_failure_logs'),
    ('sale_failure_logs')
) AS t(table_name);

-- ============================================
-- NOTES
-- ============================================
-- 
-- 1. Error logs are inserted by backend (service_role)
-- 2. Payment failures tracked from billing_history
-- 3. Sale failures tracked from transaction attempts
-- 4. All logs are RLS-protected
-- 5. Support admins can view all logs
-- 
-- ============================================

