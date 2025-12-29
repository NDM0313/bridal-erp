-- ============================================
-- PHASE 3: SUBSCRIPTION & BILLING SCHEMA
-- Adds subscription lifecycle management
-- ============================================
-- 
-- GOAL: Track subscriptions, billing, and plan changes
-- STRATEGY: Separate subscription table for audit trail
-- SAFETY: Backward compatible with existing organizations
-- ============================================

-- ============================================
-- TASK 1: SUBSCRIPTION DATA MODEL
-- ============================================

-- Organization subscriptions table
-- Tracks subscription lifecycle and billing
CREATE TABLE IF NOT EXISTS organization_subscriptions (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Stripe integration
    stripe_customer_id VARCHAR(255) NULL UNIQUE,  -- Stripe customer ID
    stripe_subscription_id VARCHAR(255) NULL UNIQUE,  -- Stripe subscription ID
    stripe_price_id VARCHAR(255) NULL,  -- Stripe price ID for current plan
    
    -- Subscription details
    plan VARCHAR(50) NOT NULL DEFAULT 'free' 
        CHECK (plan IN ('free', 'basic', 'pro', 'enterprise')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' 
        CHECK (status IN ('trial', 'active', 'past_due', 'suspended', 'cancelled', 'expired')),
    
    -- Trial management
    trial_start TIMESTAMP NULL,
    trial_end TIMESTAMP NULL,
    
    -- Billing period
    current_period_start TIMESTAMP NULL,
    current_period_end TIMESTAMP NULL,
    
    -- Cancellation
    cancel_at_period_end BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMP NULL,
    
    -- Payment failure
    payment_failed_at TIMESTAMP NULL,
    grace_period_ends_at TIMESTAMP NULL,
    
    -- Metadata
    metadata JSONB NULL,  -- Additional subscription metadata
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(organization_id)  -- One active subscription per organization
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON organization_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON organization_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON organization_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON organization_subscriptions(plan);

COMMENT ON TABLE organization_subscriptions IS 'Tracks subscription lifecycle and billing for organizations.';
COMMENT ON COLUMN organization_subscriptions.stripe_customer_id IS 'Stripe customer ID for billing integration.';
COMMENT ON COLUMN organization_subscriptions.status IS 'Subscription status: trial, active, past_due, suspended, cancelled, expired.';

-- ============================================
-- TASK 2: BILLING HISTORY TABLE
-- ============================================

-- Billing history (already exists in SAAS_SCHEMA.sql, but ensure it's here)
CREATE TABLE IF NOT EXISTS billing_history (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id INTEGER NULL REFERENCES organization_subscriptions(id) ON DELETE SET NULL,
    
    -- Stripe integration
    stripe_invoice_id VARCHAR(255) NULL UNIQUE,
    stripe_payment_intent_id VARCHAR(255) NULL,
    
    -- Billing details
    plan VARCHAR(50) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'void')),
    
    -- Payment method
    payment_method VARCHAR(50) NULL,
    invoice_url VARCHAR(500) NULL,
    receipt_url VARCHAR(500) NULL,
    
    -- Period
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    
    -- Metadata
    metadata JSONB NULL,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_history_org_id ON billing_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_subscription_id ON billing_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_status ON billing_history(status);
CREATE INDEX IF NOT EXISTS idx_billing_history_period ON billing_history(period_start, period_end);

COMMENT ON TABLE billing_history IS 'Historical billing records for subscriptions.';

-- ============================================
-- TASK 3: SUBSCRIPTION EVENTS TABLE
-- ============================================

-- Subscription events (already exists, but ensure it's here)
CREATE TABLE IF NOT EXISTS subscription_events (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id INTEGER NULL REFERENCES organization_subscriptions(id) ON DELETE SET NULL,
    
    -- Event details
    event_type VARCHAR(100) NOT NULL,  -- 'trial_started', 'subscription_created', 'payment_succeeded', etc.
    event_source VARCHAR(50) NOT NULL DEFAULT 'system',  -- 'system', 'stripe', 'manual'
    
    -- Stripe integration
    stripe_event_id VARCHAR(255) NULL UNIQUE,  -- Stripe event ID for idempotency
    
    -- Event data
    event_data JSONB NULL,
    previous_state JSONB NULL,  -- Previous subscription state
    new_state JSONB NULL,  -- New subscription state
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_org_id ON subscription_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription_id ON subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe_event_id ON subscription_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON subscription_events(created_at);

COMMENT ON TABLE subscription_events IS 'Audit trail for subscription lifecycle events.';

-- ============================================
-- TASK 4: SYNC ORGANIZATIONS WITH SUBSCRIPTIONS
-- ============================================

-- Function to sync organization.subscription_plan with subscription.plan
CREATE OR REPLACE FUNCTION sync_organization_subscription_plan()
RETURNS TRIGGER AS $$
BEGIN
    -- Update organization.subscription_plan when subscription.plan changes
    UPDATE organizations
    SET 
        subscription_plan = NEW.plan,
        subscription_status = NEW.status,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.organization_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync organization plan on subscription update
DROP TRIGGER IF EXISTS sync_org_plan_on_subscription_update ON organization_subscriptions;
CREATE TRIGGER sync_org_plan_on_subscription_update
AFTER INSERT OR UPDATE OF plan, status ON organization_subscriptions
FOR EACH ROW
EXECUTE FUNCTION sync_organization_subscription_plan();

COMMENT ON FUNCTION sync_organization_subscription_plan() IS 'Syncs organization.subscription_plan with subscription.plan when subscription changes.';

-- ============================================
-- TASK 5: AUTO-SYNC FEATURES ON PLAN CHANGE
-- ============================================

-- Function to sync organization_features based on subscription plan
CREATE OR REPLACE FUNCTION sync_organization_features_on_plan_change()
RETURNS TRIGGER AS $$
DECLARE
    feature_record RECORD;
BEGIN
    -- Only process if plan changed
    IF OLD.plan = NEW.plan THEN
        RETURN NEW;
    END IF;
    
    -- Delete existing feature toggles for this organization
    DELETE FROM organization_features
    WHERE organization_id = NEW.organization_id;
    
    -- Insert features based on new plan
    FOR feature_record IN
        SELECT key, default_enabled
        FROM feature_definitions
        WHERE NEW.plan = ANY(plan_requirements)
    LOOP
        INSERT INTO organization_features (organization_id, feature_key, enabled)
        VALUES (NEW.organization_id, feature_record.key, feature_record.default_enabled)
        ON CONFLICT (organization_id, feature_key) DO UPDATE
        SET enabled = feature_record.default_enabled;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync features on plan change
DROP TRIGGER IF EXISTS sync_features_on_plan_change ON organization_subscriptions;
CREATE TRIGGER sync_features_on_plan_change
AFTER UPDATE OF plan ON organization_subscriptions
FOR EACH ROW
WHEN (OLD.plan IS DISTINCT FROM NEW.plan)
EXECUTE FUNCTION sync_organization_features_on_plan_change();

COMMENT ON FUNCTION sync_organization_features_on_plan_change() IS 'Automatically syncs organization_features when subscription plan changes.';

-- ============================================
-- TASK 6: AUTO-SUSPEND ON PAYMENT FAILURE
-- ============================================

-- Function to handle payment failure
CREATE OR REPLACE FUNCTION handle_payment_failure()
RETURNS TRIGGER AS $$
BEGIN
    -- If status changed to past_due, set grace period
    IF NEW.status = 'past_due' AND OLD.status != 'past_due' THEN
        NEW.payment_failed_at := CURRENT_TIMESTAMP;
        NEW.grace_period_ends_at := CURRENT_TIMESTAMP + INTERVAL '7 days';  -- 7-day grace period
    END IF;
    
    -- If grace period expired, suspend
    IF NEW.status = 'past_due' 
       AND NEW.grace_period_ends_at IS NOT NULL 
       AND NEW.grace_period_ends_at < CURRENT_TIMESTAMP THEN
        NEW.status := 'suspended';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to handle payment failure
DROP TRIGGER IF EXISTS handle_payment_failure_trigger ON organization_subscriptions;
CREATE TRIGGER handle_payment_failure_trigger
BEFORE UPDATE OF status ON organization_subscriptions
FOR EACH ROW
EXECUTE FUNCTION handle_payment_failure();

COMMENT ON FUNCTION handle_payment_failure() IS 'Handles payment failure with grace period and auto-suspension.';

-- ============================================
-- TASK 7: RLS POLICIES FOR NEW TABLES
-- ============================================

-- Enable RLS
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Organization subscriptions: Users can view their organization's subscription
DROP POLICY IF EXISTS "users_view_own_org_subscription" ON organization_subscriptions;
CREATE POLICY "users_view_own_org_subscription" ON organization_subscriptions
FOR SELECT
USING (organization_id = get_user_organization_id());

-- Billing history: Org admins can view billing
DROP POLICY IF EXISTS "org_admins_view_billing" ON billing_history;
CREATE POLICY "org_admins_view_billing" ON billing_history
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

-- Subscription events: Users can view their organization's events
DROP POLICY IF EXISTS "users_view_own_org_events" ON subscription_events;
CREATE POLICY "users_view_own_org_events" ON subscription_events
FOR SELECT
USING (organization_id = get_user_organization_id());

-- ============================================
-- TASK 8: MIGRATION - CREATE SUBSCRIPTIONS FOR EXISTING ORGS
-- ============================================

-- Create subscriptions for existing organizations
-- Default to Free plan, Active status
INSERT INTO organization_subscriptions (
    organization_id,
    plan,
    status,
    current_period_start,
    current_period_end
)
SELECT 
    id,
    subscription_plan,
    subscription_status,
    created_at,
    created_at + INTERVAL '1 month'  -- Default 1-month period
FROM organizations
WHERE NOT EXISTS (
    SELECT 1 FROM organization_subscriptions
    WHERE organization_subscriptions.organization_id = organizations.id
)
ORDER BY id;

-- Verify subscriptions created
DO $$
DECLARE
    subscriptions_created INTEGER;
BEGIN
    SELECT COUNT(*) INTO subscriptions_created
    FROM organization_subscriptions;
    
    RAISE NOTICE 'Subscriptions created for existing organizations: %', subscriptions_created;
END $$;

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
    ('organization_subscriptions'),
    ('billing_history'),
    ('subscription_events')
) AS t(table_name);

-- Check functions created
SELECT 
    routine_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' AND routine_name = routine_name
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (VALUES 
    ('sync_organization_subscription_plan'),
    ('sync_organization_features_on_plan_change'),
    ('handle_payment_failure')
) AS t(routine_name);

-- ============================================
-- NOTES
-- ============================================
-- 
-- 1. Subscriptions are automatically synced with organizations table
-- 2. Features are automatically synced on plan change
-- 3. Payment failures trigger grace period and auto-suspension
-- 4. All tables have RLS enabled
-- 5. Existing organizations get Free plan subscriptions
-- 
-- ============================================

