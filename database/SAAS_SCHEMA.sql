-- ============================================
-- SAAS SCHEMA EXTENSIONS
-- Adds organization-level multi-tenancy
-- Backward compatible with existing business-level isolation
-- ============================================

-- ============================================
-- ORGANIZATIONS TABLE (SaaS Tenants)
-- ============================================

CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,  -- URL-friendly identifier (e.g., 'acme-corp')
    subscription_plan VARCHAR(50) NOT NULL DEFAULT 'free' CHECK (subscription_plan IN ('free', 'basic', 'pro', 'enterprise')),
    subscription_status VARCHAR(50) NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'suspended', 'cancelled')),
    trial_ends_at TIMESTAMP NULL,
    subscription_ends_at TIMESTAMP NULL,
    
    -- Plan limits
    max_businesses INTEGER DEFAULT 1,
    max_users INTEGER DEFAULT 3,
    max_locations INTEGER DEFAULT 1,
    max_transactions_per_month INTEGER DEFAULT 100,
    max_storage_gb INTEGER DEFAULT 1,
    max_api_requests_per_hour INTEGER DEFAULT 1000,
    
    -- White-label features
    white_label_enabled BOOLEAN DEFAULT false,
    custom_domain VARCHAR(255) NULL,
    custom_domain_verified BOOLEAN DEFAULT false,
    custom_domain_ssl_enabled BOOLEAN DEFAULT false,
    
    -- Branding
    branding_logo_url VARCHAR(500) NULL,
    branding_primary_color VARCHAR(7) NULL,  -- Hex color: #3B82F6
    branding_secondary_color VARCHAR(7) NULL,
    branding_favicon_url VARCHAR(500) NULL,
    branding_company_name VARCHAR(255) NULL,
    branding_support_email VARCHAR(255) NULL,
    branding_support_phone VARCHAR(50) NULL,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status ON organizations(subscription_status);
CREATE INDEX IF NOT EXISTS idx_organizations_custom_domain ON organizations(custom_domain) WHERE custom_domain IS NOT NULL;

COMMENT ON TABLE organizations IS 'SaaS tenants. Each organization is a subscription customer.';
COMMENT ON COLUMN organizations.slug IS 'URL-friendly identifier for custom domains and routing.';
COMMENT ON COLUMN organizations.subscription_plan IS 'Current subscription plan: free, basic, pro, enterprise.';
COMMENT ON COLUMN organizations.subscription_status IS 'Subscription state: trial, active, suspended, cancelled.';

-- ============================================
-- LINK BUSINESSES TO ORGANIZATIONS
-- ============================================

-- Add organization_id to businesses (nullable for backward compatibility)
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS organization_id INTEGER NULL REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_businesses_organization_id ON businesses(organization_id);

COMMENT ON COLUMN businesses.organization_id IS 'Links business to SaaS organization. NULL for legacy businesses (backward compatibility).';

-- ============================================
-- ORGANIZATION USERS (Organization-Level Access)
-- ============================================

CREATE TABLE IF NOT EXISTS organization_users (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'cashier', 'auditor')),
    is_organization_admin BOOLEAN DEFAULT false,  -- Can manage org settings, subscription
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_users_org_id ON organization_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_users_user_id ON organization_users(user_id);

COMMENT ON TABLE organization_users IS 'Links users to organizations. Users can belong to one organization.';
COMMENT ON COLUMN organization_users.is_organization_admin IS 'Can manage organization settings, subscription, billing.';

-- ============================================
-- USER BUSINESS ACCESS (Business-Level Access)
-- ============================================

CREATE TABLE IF NOT EXISTS user_business_access (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'cashier', 'auditor')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_user_business_access_user_id ON user_business_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_business_access_business_id ON user_business_access(business_id);

COMMENT ON TABLE user_business_access IS 'Many-to-many: Users can access multiple businesses within their organization.';

-- ============================================
-- FEATURE DEFINITIONS
-- ============================================

CREATE TABLE IF NOT EXISTS feature_definitions (
    key VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    plan_requirements VARCHAR(50)[] NOT NULL,  -- Array of plans that include this feature
    default_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default feature definitions
INSERT INTO feature_definitions (key, name, description, plan_requirements, default_enabled) VALUES
('basic_reports', 'Basic Reports', 'Daily, monthly, and product-wise sales reports', ARRAY['free', 'basic', 'pro', 'enterprise'], true),
('advanced_reports', 'Advanced Reports', 'Profit/margin, stock valuation, top products', ARRAY['basic', 'pro', 'enterprise'], false),
('white_label', 'White Label Branding', 'Custom logo, colors, company name', ARRAY['pro', 'enterprise'], false),
('custom_domain', 'Custom Domain', 'Use your own domain (e.g., pos.yourdomain.com)', ARRAY['pro', 'enterprise'], false),
('api_access', 'API Access', 'Programmatic access via REST API', ARRAY['pro', 'enterprise'], false),
('whatsapp_automation', 'WhatsApp Automation', 'Automated notifications and commands', ARRAY['basic', 'pro', 'enterprise'], false),
('multi_business', 'Multiple Businesses', 'Manage multiple stores/branches', ARRAY['basic', 'pro', 'enterprise'], false),
('unlimited_users', 'Unlimited Users', 'Add unlimited team members', ARRAY['pro', 'enterprise'], false),
('priority_support', 'Priority Support', 'Priority email and chat support', ARRAY['pro', 'enterprise'], false)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE feature_definitions IS 'Catalog of available features and their plan requirements.';

-- ============================================
-- ORGANIZATION FEATURES (Per-Tenant Feature Toggles)
-- ============================================

CREATE TABLE IF NOT EXISTS organization_features (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL REFERENCES feature_definitions(key) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT false,
    config JSONB NULL,  -- Feature-specific configuration
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_organization_features_org_id ON organization_features(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_features_feature_key ON organization_features(feature_key);

COMMENT ON TABLE organization_features IS 'Per-tenant feature toggles. Features are enabled based on subscription plan.';

-- ============================================
-- SUBSCRIPTION EVENTS (Audit Trail)
-- ============================================

CREATE TABLE IF NOT EXISTS subscription_events (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,  -- 'trial_started', 'subscription_activated', 'payment_failed', etc.
    event_data JSONB NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_org_id ON subscription_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON subscription_events(created_at);

COMMENT ON TABLE subscription_events IS 'Audit trail for subscription lifecycle events.';

-- ============================================
-- BILLING HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS billing_history (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_method VARCHAR(50) NULL,
    invoice_url VARCHAR(500) NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_history_org_id ON billing_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_status ON billing_history(status);
CREATE INDEX IF NOT EXISTS idx_billing_history_period ON billing_history(period_start, period_end);

COMMENT ON TABLE billing_history IS 'Historical billing records for subscriptions.';

-- ============================================
-- ORGANIZATION FLAGS (Abuse Prevention)
-- ============================================

CREATE TABLE IF NOT EXISTS organization_flags (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    flag_type VARCHAR(50) NOT NULL,  -- 'abuse', 'fraud', 'suspicious', 'rate_limit'
    reason TEXT,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    auto_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP NULL,
    resolved_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_organization_flags_org_id ON organization_flags(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_flags_severity ON organization_flags(severity);
CREATE INDEX IF NOT EXISTS idx_organization_flags_created_at ON organization_flags(created_at);

COMMENT ON TABLE organization_flags IS 'Flags for abuse, fraud, or suspicious activity. Critical flags trigger auto-suspension.';

-- ============================================
-- USAGE TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS organization_usage (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,  -- 'transactions', 'api_requests', 'storage', 'users', 'businesses'
    metric_value NUMERIC(10, 2) NOT NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, metric_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_organization_usage_org_id ON organization_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_usage_metric_type ON organization_usage(metric_type);
CREATE INDEX IF NOT EXISTS idx_organization_usage_period ON organization_usage(period_start, period_end);

COMMENT ON TABLE organization_usage IS 'Tracks usage metrics per organization for fair usage enforcement.';

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get user's organization_id
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_org_id INTEGER;
BEGIN
    SELECT organization_id INTO user_org_id
    FROM organization_users
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    RETURN user_org_id;
END;
$$;

COMMENT ON FUNCTION get_user_organization_id() IS 'Returns the organization_id for the current authenticated user.';

-- Get user's business_id (backward compatible)
CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_business_id INTEGER;
BEGIN
    -- Try organization-based first (SaaS mode)
    SELECT b.id INTO user_business_id
    FROM businesses b
    JOIN organizations o ON b.organization_id = o.id
    JOIN organization_users ou ON o.id = ou.organization_id
    WHERE ou.user_id = auth.uid()
    LIMIT 1;
    
    -- Fallback to legacy user_profiles (backward compatibility)
    IF user_business_id IS NULL THEN
        SELECT business_id INTO user_business_id
        FROM user_profiles
        WHERE user_id = auth.uid()
        LIMIT 1;
    END IF;
    
    RETURN user_business_id;
END;
$$;

COMMENT ON FUNCTION get_user_business_id() IS 'Returns business_id for current user. Supports both organization-based (SaaS) and legacy (user_profiles) modes.';

-- ============================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_business_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_usage ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can view their own organization
CREATE POLICY "Users view own organization" ON organizations
FOR SELECT USING (id = get_user_organization_id());

-- Organization users: Users can view their own org membership
CREATE POLICY "Users view own org membership" ON organization_users
FOR SELECT USING (user_id = auth.uid() OR organization_id = get_user_organization_id());

-- User business access: Users can view their own access
CREATE POLICY "Users view own business access" ON user_business_access
FOR SELECT USING (user_id = auth.uid());

-- Organization features: Users can view features for their organization
CREATE POLICY "Users view own org features" ON organization_features
FOR SELECT USING (organization_id = get_user_organization_id());

-- Subscription events: Users can view events for their organization
CREATE POLICY "Users view own org subscription events" ON subscription_events
FOR SELECT USING (organization_id = get_user_organization_id());

-- Billing history: Users can view billing for their organization (org admins only)
CREATE POLICY "Org admins view own billing" ON billing_history
FOR SELECT USING (
  organization_id = get_user_organization_id()
  AND EXISTS (
    SELECT 1 FROM organization_users
    WHERE organization_id = get_user_organization_id()
      AND user_id = auth.uid()
      AND is_organization_admin = true
  )
);

-- Organization flags: Only system can view (backend only)
CREATE POLICY "System view organization flags" ON organization_flags
FOR SELECT USING (false);  -- Backend uses service_role

-- Organization usage: Users can view usage for their organization
CREATE POLICY "Users view own org usage" ON organization_usage
FOR SELECT USING (organization_id = get_user_organization_id());

-- ============================================
-- AUTO-SUSPEND ON CRITICAL FLAGS
-- ============================================

CREATE OR REPLACE FUNCTION auto_suspend_abuse()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.severity = 'critical' THEN
    UPDATE organizations
    SET subscription_status = 'suspended'
    WHERE id = NEW.organization_id;
    
    -- Log event
    INSERT INTO subscription_events (organization_id, event_type, event_data)
    VALUES (
      NEW.organization_id,
      'auto_suspended',
      jsonb_build_object('reason', NEW.reason, 'flag_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_critical_flag
AFTER INSERT ON organization_flags
FOR EACH ROW
WHEN (NEW.severity = 'critical')
EXECUTE FUNCTION auto_suspend_abuse();

COMMENT ON FUNCTION auto_suspend_abuse() IS 'Automatically suspends organization on critical abuse flags.';

-- ============================================
-- VERIFICATION
-- ============================================

-- Check tables created
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('organizations', 'organization_users', 'user_business_access', 'feature_definitions', 'organization_features')
ORDER BY table_name;

-- Check functions created
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('get_user_organization_id', 'get_user_business_id')
ORDER BY routine_name;

-- ============================================
-- NOTES
-- ============================================
-- 
-- 1. This schema is backward compatible with existing business-level isolation
-- 2. organization_id is nullable in businesses table (supports legacy businesses)
-- 3. get_user_business_id() supports both organization-based and legacy modes
-- 4. RLS policies maintain security at both organization and business levels
-- 5. All new tables have RLS enabled
-- 6. Feature gating is plan-based with per-tenant overrides
-- 7. Abuse prevention includes auto-suspension on critical flags
-- 
-- ============================================

