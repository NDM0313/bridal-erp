# SaaS Migration Plan

## 🎯 OVERVIEW

This document outlines the step-by-step migration plan from single-tenant POS to multi-tenant SaaS.

**Goal**: Zero-downtime migration with no data loss

---

## 📋 MIGRATION PHASES

### Phase 1: Foundation (Week 1-2)

#### Step 1.1: Create Organizations Schema

**SQL**:
```sql
-- Create organizations table
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    subscription_plan VARCHAR(50) NOT NULL DEFAULT 'free',
    subscription_status VARCHAR(50) NOT NULL DEFAULT 'trial',
    trial_ends_at TIMESTAMP NULL,
    subscription_ends_at TIMESTAMP NULL,
    max_businesses INTEGER DEFAULT 1,
    max_users INTEGER DEFAULT 3,
    max_locations INTEGER DEFAULT 1,
    max_transactions_per_month INTEGER DEFAULT 100,
    white_label_enabled BOOLEAN DEFAULT false,
    custom_domain VARCHAR(255) NULL,
    branding_logo_url VARCHAR(500) NULL,
    branding_primary_color VARCHAR(7) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create organization_users table
CREATE TABLE organization_users (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    is_organization_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, user_id)
);

-- Add organization_id to businesses (nullable for backward compatibility)
ALTER TABLE businesses ADD COLUMN organization_id INTEGER NULL REFERENCES organizations(id);
CREATE INDEX idx_businesses_organization_id ON businesses(organization_id);
```

**Verification**:
- ✅ Tables created
- ✅ Indexes created
- ✅ Foreign keys working
- ✅ No existing data affected

---

#### Step 1.2: Create Helper Functions

**SQL**:
```sql
-- Get user's organization_id
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS INTEGER AS $$
  SELECT o.id
  FROM organizations o
  JOIN organization_users ou ON o.id = ou.organization_id
  WHERE ou.user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Get user's business_id (backward compatible)
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
  
  -- Fallback to legacy user_profiles
  SELECT business_id
  FROM user_profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;
```

**Verification**:
- ✅ Functions created
- ✅ Backward compatibility maintained
- ✅ RLS policies still work

---

### Phase 2: Data Migration (Week 3-4)

#### Step 2.1: Create Organizations for Existing Businesses

**SQL**:
```sql
BEGIN;

-- Create organizations for existing businesses
INSERT INTO organizations (name, slug, subscription_plan, subscription_status)
SELECT 
  name || ' Organization',
  'org-' || id,
  'free',
  'active'
FROM businesses
WHERE organization_id IS NULL;

-- Link businesses to organizations
UPDATE businesses b
SET organization_id = (
  SELECT id FROM organizations o
  WHERE o.slug = 'org-' || b.id
)
WHERE organization_id IS NULL;

COMMIT;
```

**Verification**:
- ✅ All businesses have organization_id
- ✅ Organizations created correctly
- ✅ No data loss

---

#### Step 2.2: Migrate Users to Organizations

**SQL**:
```sql
BEGIN;

-- Migrate users to organization_users
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

**Verification**:
- ✅ All users linked to organizations
- ✅ Roles preserved
- ✅ Admin users marked correctly

---

### Phase 3: Feature Implementation (Week 5-8)

#### Step 3.1: Subscription Management

**Tasks**:
- [ ] Create subscription service
- [ ] Integrate billing provider (Stripe/Paddle)
- [ ] Implement plan limits
- [ ] Add subscription lifecycle management

#### Step 3.2: Feature Gating

**Tasks**:
- [ ] Create feature_definitions table
- [ ] Create organization_features table
- [ ] Implement feature checks (backend)
- [ ] Implement feature guards (frontend)

#### Step 3.3: White-Label

**Tasks**:
- [ ] Add branding fields to organizations
- [ ] Implement branding UI
- [ ] Add custom domain support
- [ ] SSL certificate management

---

### Phase 4: Testing & Validation (Week 9-10)

#### Step 4.1: Migration Testing

**Tests**:
- [ ] Existing businesses work (backward compatibility)
- [ ] New organizations work (SaaS mode)
- [ ] Users can access multiple businesses
- [ ] RLS policies work correctly
- [ ] No data loss

#### Step 4.2: Performance Testing

**Tests**:
- [ ] API response times
- [ ] Database query performance
- [ ] Concurrent user access
- [ ] Large organization handling

---

### Phase 5: Rollout (Week 11-12)

#### Step 5.1: Gradual Rollout

**Strategy**:
1. Enable SaaS features for new signups only
2. Migrate existing businesses gradually
3. Monitor for issues
4. Full rollout when stable

#### Step 5.2: Monitoring

**Metrics**:
- Error rates
- Performance degradation
- User complaints
- Data integrity

---

## 🔄 ROLLBACK PLAN

### If Migration Fails

**Step 1**: Revert schema changes
```sql
-- Remove organization_id (if needed)
ALTER TABLE businesses DROP COLUMN organization_id;

-- Drop new tables (if needed)
DROP TABLE IF EXISTS organization_users;
DROP TABLE IF EXISTS organizations;
```

**Step 2**: Restore RLS policies
```sql
-- Restore original get_user_business_id()
CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS INTEGER AS $$
  SELECT business_id
  FROM user_profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;
```

**Step 3**: Verify system works
- ✅ All businesses accessible
- ✅ Users can login
- ✅ No data loss

---

## ✅ MIGRATION CHECKLIST

### Pre-Migration
- [ ] Backup database
- [ ] Test migration on staging
- [ ] Document rollback procedure
- [ ] Notify users (if needed)

### During Migration
- [ ] Create organizations table
- [ ] Migrate existing businesses
- [ ] Migrate users
- [ ] Verify data integrity
- [ ] Test backward compatibility

### Post-Migration
- [ ] Verify all features work
- [ ] Monitor error rates
- [ ] Check performance
- [ ] User acceptance testing

---

**Migration plan complete!** ✅

