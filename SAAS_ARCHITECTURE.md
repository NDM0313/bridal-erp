# SaaS Architecture Design

## 🎯 OVERVIEW

This document outlines the architecture for evolving the POS system into a scalable multi-tenant SaaS platform.

**Current State**: Single-tenant POS with business-level isolation  
**Target State**: Multi-tenant SaaS with subscription management, white-labeling, and operational controls

---

## ✅ TASK 1 — SAAS TENANT MODEL

### Business vs Organization

#### Current Model (Single-Tenant)

**Structure**:
```
businesses (1) → business_locations (N) → transactions (N)
```

**Isolation**: `business_id` in all tables, RLS enforces isolation

#### Proposed SaaS Model (Multi-Tenant)

**Structure**:
```
organizations (1) → businesses (N) → business_locations (N) → transactions (N)
```

**New Concepts**:
- **Organization**: SaaS tenant (subscription owner)
- **Business**: Store/branch within organization
- **User**: Belongs to organization, can access multiple businesses

### Tenant Model Design

#### Option A: Organization-Centric (Recommended)

**Schema**:
```sql
-- Organizations table (SaaS tenants)
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,  -- URL-friendly identifier
    subscription_plan VARCHAR(50) NOT NULL,  -- 'free', 'basic', 'pro'
    subscription_status VARCHAR(50) NOT NULL,  -- 'trial', 'active', 'suspended', 'cancelled'
    trial_ends_at TIMESTAMP NULL,
    subscription_ends_at TIMESTAMP NULL,
    max_businesses INTEGER DEFAULT 1,  -- Plan limit
    max_users INTEGER DEFAULT 3,  -- Plan limit
    max_locations INTEGER DEFAULT 1,  -- Plan limit
    white_label_enabled BOOLEAN DEFAULT false,
    custom_domain VARCHAR(255) NULL,
    branding_logo_url VARCHAR(500) NULL,
    branding_primary_color VARCHAR(7) NULL,  -- Hex color
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Link businesses to organizations
ALTER TABLE businesses ADD COLUMN organization_id INTEGER REFERENCES organizations(id);
CREATE INDEX idx_businesses_organization_id ON businesses(organization_id);

-- Link users to organizations (multi-business access)
CREATE TABLE organization_users (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,  -- 'owner', 'admin', 'manager', 'cashier'
    is_organization_admin BOOLEAN DEFAULT false,  -- Can manage org settings
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, user_id)
);

-- User-business access (many-to-many)
CREATE TABLE user_business_access (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,  -- Role for this specific business
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, business_id)
);
```

**Benefits**:
- ✅ Clear tenant boundary (organization)
- ✅ Supports multi-store organizations
- ✅ Flexible user-business access
- ✅ Easy subscription management

#### Option B: Business-Centric (Simpler, Less Flexible)

**Schema**:
```sql
-- Add subscription fields to businesses
ALTER TABLE businesses ADD COLUMN subscription_plan VARCHAR(50);
ALTER TABLE businesses ADD COLUMN subscription_status VARCHAR(50);
ALTER TABLE businesses ADD COLUMN organization_id INTEGER;  -- For grouping
```

**Benefits**:
- ✅ Minimal schema changes
- ✅ Backward compatible
- ❌ Less flexible for multi-store orgs

**Recommendation**: **Option A** (Organization-Centric)

### Data Isolation Strategy

#### Current Isolation (Business-Level)

**RLS Policy**:
```sql
CREATE POLICY "Users access own business" ON products
FOR ALL USING (business_id = get_user_business_id());
```

#### Proposed Isolation (Organization-Level)

**RLS Policy** (Updated):
```sql
-- Helper function: Get user's organization_id
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS INTEGER AS $$
  SELECT o.id
  FROM organizations o
  JOIN organization_users ou ON o.id = ou.organization_id
  WHERE ou.user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Updated RLS policy (organization-level)
CREATE POLICY "Users access own organization" ON products
FOR ALL USING (
  business_id IN (
    SELECT id FROM businesses
    WHERE organization_id = get_user_organization_id()
  )
);
```

**Isolation Levels**:
1. **Organization-level**: All businesses in org share data (recommended for SaaS)
2. **Business-level**: Each business isolated (current model)
3. **Hybrid**: Organization-level with business-level permissions

**Recommendation**: **Organization-level** with business-level permissions

---

## ✅ TASK 2 — SUBSCRIPTION & BILLING STRATEGY

### Subscription Plans

#### Plan Tiers

**Free Plan**:
- 1 business
- 1 location
- 2 users
- Basic features only
- No white-label
- Limited transactions (100/month)

**Basic Plan** ($29/month):
- 3 businesses
- 5 locations
- 10 users
- All POS features
- Basic reports
- Email support
- 1,000 transactions/month

**Pro Plan** ($99/month):
- Unlimited businesses
- Unlimited locations
- Unlimited users
- Advanced reports
- White-label enabled
- Custom domain
- Priority support
- Unlimited transactions

**Enterprise Plan** (Custom):
- Everything in Pro
- Dedicated support
- SLA guarantees
- Custom integrations
- On-premise option

### Feature Gating

#### Implementation Strategy

**Database Schema**:
```sql
-- Feature flags per organization
CREATE TABLE organization_features (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL,  -- 'advanced_reports', 'white_label', etc.
    enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, feature_key)
);

-- Feature definitions
CREATE TABLE feature_definitions (
    key VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    plan_requirements VARCHAR(50)[] NOT NULL,  -- ['basic', 'pro']
    default_enabled BOOLEAN DEFAULT false
);
```

**Backend Check**:
```javascript
// Check if organization has feature
async function hasFeature(organizationId, featureKey) {
  const { data } = await supabase
    .from('organization_features')
    .select('enabled')
    .eq('organization_id', organizationId)
    .eq('feature_key', featureKey)
    .single();
  
  return data?.enabled || false;
}

// Middleware to check feature
export function requireFeature(featureKey) {
  return async (req, res, next) => {
    const orgId = req.organizationId;
    const hasAccess = await hasFeature(orgId, featureKey);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FEATURE_NOT_AVAILABLE',
          message: `Feature '${featureKey}' not available on your plan`,
        },
      });
    }
    
    next();
  };
}
```

**Frontend Check**:
```typescript
// Hook to check features
export function useFeature(featureKey: string) {
  const { organization } = useOrganization();
  const [hasFeature, setHasFeature] = useState(false);
  
  useEffect(() => {
    checkFeature(organization.id, featureKey).then(setHasFeature);
  }, [organization.id, featureKey]);
  
  return hasFeature;
}

// Guard component
<FeatureGuard feature="advanced_reports">
  <AdvancedReportsTab />
</FeatureGuard>
```

### Billing Lifecycle

#### States

**Trial**:
- 14-day free trial
- Full feature access
- Auto-converts to paid or cancels

**Active**:
- Paid subscription
- Full feature access
- Auto-renewal enabled

**Suspended**:
- Payment failed
- Read-only access
- 7-day grace period

**Cancelled**:
- Subscription ended
- Read-only access (30 days)
- Data export available

#### Lifecycle Management

**Database Schema**:
```sql
-- Subscription events
CREATE TABLE subscription_events (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,  -- 'trial_started', 'subscription_activated', 'payment_failed', etc.
    event_data JSONB NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Billing history
CREATE TABLE billing_history (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL,  -- 'pending', 'paid', 'failed', 'refunded'
    payment_method VARCHAR(50) NULL,
    invoice_url VARCHAR(500) NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Workflow**:
1. **Trial Start**: Organization created → `subscription_status = 'trial'`
2. **Trial End**: Check if payment method added → Activate or Cancel
3. **Payment Failed**: `subscription_status = 'suspended'` → Grace period
4. **Cancellation**: `subscription_status = 'cancelled'` → Read-only access

---

## ✅ TASK 3 — WHITE-LABEL CONSIDERATIONS

### Branding

#### Branding Fields

**Database Schema**:
```sql
-- Organizations table (already includes)
-- branding_logo_url VARCHAR(500)
-- branding_primary_color VARCHAR(7)
-- branding_secondary_color VARCHAR(7)
-- branding_favicon_url VARCHAR(500)
-- branding_company_name VARCHAR(255)
```

**Frontend Implementation**:
```typescript
// Load organization branding
const { organization } = useOrganization();

// Apply branding
<style jsx global>{`
  :root {
    --primary-color: ${organization.branding_primary_color || '#3B82F6'};
    --secondary-color: ${organization.branding_secondary_color || '#1E40AF'};
  }
  
  .logo {
    background-image: url(${organization.branding_logo_url});
  }
`}</style>
```

### Custom Domains

#### Implementation Strategy

**Database Schema**:
```sql
-- Organizations table (already includes)
-- custom_domain VARCHAR(255)
-- custom_domain_verified BOOLEAN DEFAULT false
-- custom_domain_ssl_enabled BOOLEAN DEFAULT false
```

**DNS Requirements**:
- CNAME record: `pos.yourdomain.com` → `your-app.vercel.app`
- SSL certificate (automatic via Vercel)

**Vercel Configuration**:
```json
{
  "domains": [
    "your-app.vercel.app",
    "*.yourdomain.com"
  ]
}
```

**Backend Check**:
```javascript
// Middleware to verify custom domain
export function verifyCustomDomain(req, res, next) {
  const host = req.headers.host;
  const { data: org } = await supabase
    .from('organizations')
    .select('id, custom_domain')
    .eq('custom_domain', host)
    .single();
  
  if (org) {
    req.organizationId = org.id;
  }
  
  next();
}
```

### Feature Toggles Per Tenant

**Implementation**:
```sql
-- Organization feature toggles
CREATE TABLE organization_feature_toggles (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    config JSONB NULL,  -- Feature-specific configuration
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, feature_key)
);

-- Example features
INSERT INTO feature_definitions (key, name, plan_requirements) VALUES
('advanced_reports', 'Advanced Reports', ARRAY['basic', 'pro']),
('white_label', 'White Label', ARRAY['pro']),
('custom_domain', 'Custom Domain', ARRAY['pro']),
('api_access', 'API Access', ARRAY['pro']),
('whatsapp_automation', 'WhatsApp Automation', ARRAY['basic', 'pro']);
```

---

## ✅ TASK 4 — OPERATIONAL SCALE CONCERNS

### Tenant Limits

#### Plan-Based Limits

**Database Schema** (already in organizations table):
```sql
max_businesses INTEGER DEFAULT 1,
max_users INTEGER DEFAULT 3,
max_locations INTEGER DEFAULT 1,
max_transactions_per_month INTEGER DEFAULT 100,
```

**Enforcement**:
```javascript
// Check before creating business
async function canCreateBusiness(organizationId) {
  const { data: org } = await supabase
    .from('organizations')
    .select('max_businesses')
    .eq('id', organizationId)
    .single();
  
  const { count } = await supabase
    .from('businesses')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);
  
  return (count || 0) < org.max_businesses;
}
```

### Fair Usage Policies

#### Rate Limiting

**Per Organization**:
- API requests: 1000/hour (free), 10000/hour (basic), unlimited (pro)
- Transactions: 100/month (free), 1000/month (basic), unlimited (pro)
- Storage: 1GB (free), 10GB (basic), 100GB (pro)

**Implementation**:
```javascript
// Rate limiting middleware
import rateLimit from 'express-rate-limit';

const orgRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: async (req) => {
    const org = await getOrganization(req.organizationId);
    return org.plan === 'pro' ? 1000000 : 1000; // Unlimited for pro
  },
  keyGenerator: (req) => req.organizationId,
});
```

### Abuse Prevention

#### Monitoring

**Metrics to Track**:
- API request rate per organization
- Transaction volume per organization
- Storage usage per organization
- Failed authentication attempts
- Suspicious activity patterns

**Alerts**:
- Unusual API usage (> 10x normal)
- Rapid user creation (potential abuse)
- Cross-organization access attempts
- Payment fraud indicators

**Automated Actions**:
```sql
-- Flag suspicious organizations
CREATE TABLE organization_flags (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    flag_type VARCHAR(50) NOT NULL,  -- 'abuse', 'fraud', 'suspicious'
    reason TEXT,
    severity VARCHAR(20) NOT NULL,  -- 'low', 'medium', 'high', 'critical'
    auto_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Auto-suspend on critical flags
CREATE OR REPLACE FUNCTION auto_suspend_abuse()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.severity = 'critical' THEN
    UPDATE organizations
    SET subscription_status = 'suspended'
    WHERE id = NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_critical_flag
AFTER INSERT ON organization_flags
FOR EACH ROW
WHEN (NEW.severity = 'critical')
EXECUTE FUNCTION auto_suspend_abuse();
```

---

## ✅ TASK 5 — MIGRATION STRATEGY

### Existing Businesses → SaaS Tenants

#### Migration Approach

**Phase 1: Dual-Mode Operation**

**Strategy**: Support both models simultaneously

**Schema Changes**:
```sql
-- Make organization_id nullable (backward compatible)
ALTER TABLE businesses ADD COLUMN organization_id INTEGER NULL REFERENCES organizations(id);

-- Create default organization for existing businesses
INSERT INTO organizations (name, slug, subscription_plan, subscription_status)
SELECT 
  'Legacy Business ' || id,
  'legacy-' || id,
  'free',
  'active'
FROM businesses
WHERE organization_id IS NULL;

-- Link existing businesses to organizations
UPDATE businesses b
SET organization_id = (
  SELECT id FROM organizations o
  WHERE o.slug = 'legacy-' || b.id
)
WHERE organization_id IS NULL;
```

**RLS Policy** (Backward Compatible):
```sql
-- Support both business_id and organization_id
CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS INTEGER AS $$
  -- Try organization-based first
  SELECT b.id
  FROM businesses b
  JOIN organizations o ON b.organization_id = o.id
  JOIN organization_users ou ON o.id = ou.organization_id
  WHERE ou.user_id = auth.uid()
  LIMIT 1
  
  UNION
  
  -- Fallback to business-based (legacy)
  SELECT business_id
  FROM user_profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;
```

**Phase 2: Gradual Migration**

**Steps**:
1. Create organizations for existing businesses
2. Link businesses to organizations
3. Migrate users to organization_users
4. Update RLS policies
5. Deprecate legacy user_profiles (keep for compatibility)

**Phase 3: Full SaaS Mode**

**Steps**:
1. All new signups create organizations
2. Legacy businesses fully migrated
3. Remove legacy code paths
4. Enforce organization-based access only

### No Data Loss Guarantee

**Strategy**:
- ✅ All existing data preserved
- ✅ Backward-compatible schema changes
- ✅ Gradual migration (no downtime)
- ✅ Rollback capability

**Migration Script**:
```sql
-- Safe migration script
BEGIN;

-- 1. Create organizations for existing businesses
INSERT INTO organizations (name, slug, subscription_plan, subscription_status)
SELECT 
  name || ' Organization',
  'org-' || id,
  'free',
  'active'
FROM businesses
WHERE organization_id IS NULL;

-- 2. Link businesses to organizations
UPDATE businesses b
SET organization_id = (
  SELECT id FROM organizations o
  WHERE o.slug = 'org-' || b.id
)
WHERE organization_id IS NULL;

-- 3. Migrate users
INSERT INTO organization_users (organization_id, user_id, role, is_organization_admin)
SELECT DISTINCT
  b.organization_id,
  up.user_id,
  up.role,
  true  -- First user is org admin
FROM user_profiles up
JOIN businesses b ON up.business_id = b.id
WHERE NOT EXISTS (
  SELECT 1 FROM organization_users ou
  WHERE ou.organization_id = b.organization_id
    AND ou.user_id = up.user_id
);

COMMIT;
```

### Backward Compatibility

**Maintained Through**:
- ✅ Dual-mode RLS policies
- ✅ Legacy user_profiles table (read-only)
- ✅ Feature flags for SaaS features
- ✅ Gradual deprecation timeline

---

## 🎯 ARCHITECTURE SUMMARY

### Tenant Model

**Recommended**: Organization-Centric
- Organizations = SaaS tenants
- Businesses = Stores within organization
- Users = Organization members with business access

### Subscription Model

**Plans**: Free, Basic ($29), Pro ($99), Enterprise (Custom)  
**Features**: Gated by plan  
**Lifecycle**: Trial → Active → Suspended → Cancelled

### White-Label

**Branding**: Logo, colors, favicon  
**Custom Domains**: Verified domains with SSL  
**Feature Toggles**: Per-tenant configuration

### Operational Scale

**Limits**: Plan-based (businesses, users, locations, transactions)  
**Fair Usage**: Rate limiting, storage limits  
**Abuse Prevention**: Monitoring, auto-suspension

### Migration

**Strategy**: Gradual, backward-compatible  
**Phases**: Dual-mode → Migration → Full SaaS  
**Guarantee**: No data loss

---

## 📋 NEXT STEPS

1. **Review Architecture**: Validate design decisions
2. **Create Migration Plan**: Detailed step-by-step migration
3. **Implement Schema Changes**: Add organizations table
4. **Build Subscription System**: Billing integration
5. **Implement Feature Gating**: Plan-based features
6. **Add White-Label**: Branding system
7. **Monitor & Scale**: Operational controls

---

**SaaS architecture design complete!** ✅

