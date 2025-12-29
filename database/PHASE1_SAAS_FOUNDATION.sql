-- ============================================
-- PHASE 1: SAAS FOUNDATION
-- Backward Compatible Schema Changes
-- ============================================
-- 
-- GOAL: Add SaaS infrastructure without breaking existing tenants
-- STRATEGY: All changes are additive and nullable
-- 
-- SAFETY:
-- - organization_id is nullable (existing businesses unaffected)
-- - get_user_business_id() supports both modes
-- - RLS policies work with both modes
-- - No data migration in this phase
-- ============================================

-- ============================================
-- TASK 1: CREATE ORGANIZATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,  -- URL-friendly identifier
    subscription_plan VARCHAR(50) NOT NULL DEFAULT 'free' 
        CHECK (subscription_plan IN ('free', 'basic', 'pro', 'enterprise')),
    subscription_status VARCHAR(50) NOT NULL DEFAULT 'trial' 
        CHECK (subscription_status IN ('trial', 'active', 'suspended', 'cancelled')),
    trial_ends_at TIMESTAMP NULL,
    subscription_ends_at TIMESTAMP NULL,
    
    -- Plan limits
    max_businesses INTEGER DEFAULT 1,
    max_users INTEGER DEFAULT 3,
    max_locations INTEGER DEFAULT 1,
    max_transactions_per_month INTEGER DEFAULT 100,
    max_storage_gb INTEGER DEFAULT 1,
    max_api_requests_per_hour INTEGER DEFAULT 1000,
    
    -- White-label (for future phases)
    white_label_enabled BOOLEAN DEFAULT false,
    custom_domain VARCHAR(255) NULL,
    custom_domain_verified BOOLEAN DEFAULT false,
    
    -- Branding (for future phases)
    branding_logo_url VARCHAR(500) NULL,
    branding_primary_color VARCHAR(7) NULL,
    branding_secondary_color VARCHAR(7) NULL,
    branding_company_name VARCHAR(255) NULL,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status ON organizations(subscription_status);

COMMENT ON TABLE organizations IS 'SaaS tenants. Each organization is a subscription customer.';
COMMENT ON COLUMN organizations.slug IS 'URL-friendly identifier for custom domains and routing.';

-- ============================================
-- TASK 2: ADD organization_id TO businesses
-- ============================================

-- Add organization_id column (nullable for backward compatibility)
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS organization_id INTEGER NULL REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_businesses_organization_id ON businesses(organization_id);

COMMENT ON COLUMN businesses.organization_id IS 'Links business to SaaS organization. NULL for legacy businesses (backward compatible).';

-- ============================================
-- TASK 3: CREATE organization_users TABLE
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
-- TASK 4: CREATE FEATURE TABLES
-- ============================================

-- Feature definitions (catalog)
CREATE TABLE IF NOT EXISTS feature_definitions (
    key VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    plan_requirements VARCHAR(50)[] NOT NULL,  -- Array of plans that include this feature
    default_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default feature definitions (idempotent)
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

-- Organization features (per-tenant toggles)
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
-- TASK 5: UPDATE get_user_business_id() FOR DUAL-MODE
-- ============================================
-- 
-- CRITICAL: This function must support both modes:
-- 1. Organization-based (SaaS mode): User → Organization → Businesses
-- 2. Legacy mode: User → user_profiles → Business
-- 
-- Strategy: Try organization-based first, fallback to legacy
-- ============================================

CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_business_id INTEGER;
    user_org_id INTEGER;
BEGIN
    -- MODE 1: Try organization-based (SaaS mode)
    -- Get user's organization_id
    SELECT organization_id INTO user_org_id
    FROM organization_users
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    -- If user belongs to an organization, get first business from that org
    IF user_org_id IS NOT NULL THEN
        SELECT id INTO user_business_id
        FROM businesses
        WHERE organization_id = user_org_id
        ORDER BY id ASC  -- Get first business (can be enhanced later)
        LIMIT 1;
        
        -- If found, return it
        IF user_business_id IS NOT NULL THEN
            RETURN user_business_id;
        END IF;
    END IF;
    
    -- MODE 2: Fallback to legacy user_profiles (backward compatibility)
    SELECT business_id INTO user_business_id
    FROM user_profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    RETURN user_business_id;
END;
$$;

COMMENT ON FUNCTION get_user_business_id() IS 'Returns business_id for current user. Supports both organization-based (SaaS) and legacy (user_profiles) modes.';

-- ============================================
-- TASK 6: CREATE get_user_organization_id() FUNCTION
-- ============================================

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

COMMENT ON FUNCTION get_user_organization_id() IS 'Returns the organization_id for the current authenticated user. Returns NULL if user is not in organization mode.';

-- ============================================
-- TASK 7: UPDATE RLS POLICIES FOR DUAL-MODE
-- ============================================
-- 
-- STRATEGY: Update policies to support both modes
-- - If business has organization_id → check organization access
-- - Else → use existing business_id check (backward compatible)
-- 
-- NOTE: We update the USING clause to check both conditions
-- ============================================

-- Update products table policy (example - same pattern for all tables)
-- The existing policy already works because get_user_business_id() handles dual-mode
-- But we add an additional policy for organization-level access

-- Products: Support both organization-based and business-based access
DROP POLICY IF EXISTS "users_manage_products_org" ON products;
CREATE POLICY "users_manage_products_org" ON products
FOR ALL
USING (
    -- Organization-based access (SaaS mode)
    (
        organization_id IS NOT NULL
        AND organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
        )
    )
    OR
    -- Legacy business-based access (backward compatibility)
    (
        organization_id IS NULL
        AND business_id = get_user_business_id()
    )
)
WITH CHECK (
    -- Same logic for INSERT/UPDATE
    (
        organization_id IS NOT NULL
        AND organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
        )
    )
    OR
    (
        organization_id IS NULL
        AND business_id = get_user_business_id()
    )
);

-- Note: Keep existing policies for backward compatibility
-- The new policy above is additive and works alongside existing policies

-- ============================================
-- TASK 8: ENABLE RLS ON NEW TABLES
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_definitions ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can view their own organization
DROP POLICY IF EXISTS "users_view_own_organization" ON organizations;
CREATE POLICY "users_view_own_organization" ON organizations
FOR SELECT
USING (id = get_user_organization_id());

-- Organization users: Users can view their own org membership
DROP POLICY IF EXISTS "users_view_own_org_membership" ON organization_users;
CREATE POLICY "users_view_own_org_membership" ON organization_users
FOR SELECT
USING (user_id = auth.uid() OR organization_id = get_user_organization_id());

-- Organization features: Users can view features for their organization
DROP POLICY IF EXISTS "users_view_own_org_features" ON organization_features;
CREATE POLICY "users_view_own_org_features" ON organization_features
FOR SELECT
USING (organization_id = get_user_organization_id());

-- Feature definitions: Public read (all authenticated users can see feature catalog)
DROP POLICY IF EXISTS "users_view_feature_definitions" ON feature_definitions;
CREATE POLICY "users_view_feature_definitions" ON feature_definitions
FOR SELECT
USING (auth.uid() IS NOT NULL);  -- Any authenticated user

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check tables created
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('organizations', 'organization_users', 'feature_definitions', 'organization_features')
ORDER BY table_name;

-- Check organization_id column added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'businesses'
    AND column_name = 'organization_id';

-- Check functions created
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('get_user_business_id', 'get_user_organization_id')
ORDER BY routine_name;

-- Check RLS enabled
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('organizations', 'organization_users', 'organization_features', 'feature_definitions')
ORDER BY tablename;

-- ============================================
-- NOTES
-- ============================================
-- 
-- 1. All changes are backward compatible
-- 2. organization_id is nullable (existing businesses unaffected)
-- 3. get_user_business_id() supports both modes automatically
-- 4. RLS policies work with both modes
-- 5. No data migration in this phase (schema only)
-- 6. Existing POS flows continue to work unchanged
-- 
-- NEXT PHASE: Data migration (create organizations for existing businesses)
-- 
-- ============================================

