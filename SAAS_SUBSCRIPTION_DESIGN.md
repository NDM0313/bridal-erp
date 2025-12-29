# SaaS Subscription & Billing Design

## 🎯 OVERVIEW

This document outlines the subscription plans, billing strategy, and feature gating for the SaaS POS platform.

---

## 💳 SUBSCRIPTION PLANS

### Plan Comparison

| Feature | Free | Basic | Pro | Enterprise |
|---------|------|-------|-----|------------|
| **Price** | $0 | $29/mo | $99/mo | Custom |
| **Businesses** | 1 | 3 | Unlimited | Unlimited |
| **Locations** | 1 | 5 | Unlimited | Unlimited |
| **Users** | 2 | 10 | Unlimited | Unlimited |
| **Transactions/month** | 100 | 1,000 | Unlimited | Unlimited |
| **Storage** | 1 GB | 10 GB | 100 GB | Custom |
| **POS Features** | ✅ | ✅ | ✅ | ✅ |
| **Basic Reports** | ✅ | ✅ | ✅ | ✅ |
| **Advanced Reports** | ❌ | ✅ | ✅ | ✅ |
| **White Label** | ❌ | ❌ | ✅ | ✅ |
| **Custom Domain** | ❌ | ❌ | ✅ | ✅ |
| **API Access** | ❌ | ❌ | ✅ | ✅ |
| **WhatsApp Automation** | ❌ | ✅ | ✅ | ✅ |
| **Support** | Community | Email | Priority | Dedicated |
| **SLA** | - | - | 99.9% | 99.99% |

---

## 🔐 FEATURE GATING

### Feature Definitions

**Database Schema**:
```sql
CREATE TABLE feature_definitions (
    key VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    plan_requirements VARCHAR(50)[] NOT NULL,
    default_enabled BOOLEAN DEFAULT false
);

-- Insert feature definitions
INSERT INTO feature_definitions (key, name, plan_requirements) VALUES
('basic_reports', 'Basic Reports', ARRAY['free', 'basic', 'pro', 'enterprise']),
('advanced_reports', 'Advanced Reports', ARRAY['basic', 'pro', 'enterprise']),
('white_label', 'White Label Branding', ARRAY['pro', 'enterprise']),
('custom_domain', 'Custom Domain', ARRAY['pro', 'enterprise']),
('api_access', 'API Access', ARRAY['pro', 'enterprise']),
('whatsapp_automation', 'WhatsApp Automation', ARRAY['basic', 'pro', 'enterprise']),
('multi_business', 'Multiple Businesses', ARRAY['basic', 'pro', 'enterprise']),
('unlimited_users', 'Unlimited Users', ARRAY['pro', 'enterprise']),
('priority_support', 'Priority Support', ARRAY['pro', 'enterprise']);
```

### Feature Check Implementation

**Backend**:
```javascript
// Check if organization has feature
async function hasFeature(organizationId, featureKey) {
  // Get organization plan
  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_plan')
    .eq('id', organizationId)
    .single();
  
  // Get feature requirements
  const { data: feature } = await supabase
    .from('feature_definitions')
    .select('plan_requirements')
    .eq('key', featureKey)
    .single();
  
  // Check if plan includes feature
  return feature?.plan_requirements?.includes(org.subscription_plan) || false;
}

// Middleware
export function requireFeature(featureKey) {
  return async (req, res, next) => {
    const hasAccess = await hasFeature(req.organizationId, featureKey);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FEATURE_NOT_AVAILABLE',
          message: `Feature '${featureKey}' not available on your plan`,
          upgrade_required: true,
        },
      });
    }
    
    next();
  };
}
```

**Frontend**:
```typescript
// Feature hook
export function useFeature(featureKey: string) {
  const { organization } = useOrganization();
  const [hasFeature, setHasFeature] = useState(false);
  
  useEffect(() => {
    checkFeature(organization.id, featureKey).then(setHasFeature);
  }, [organization.id, featureKey]);
  
  return hasFeature;
}

// Feature guard component
export function FeatureGuard({ 
  feature, 
  children, 
  fallback 
}: { 
  feature: string; 
  children: ReactNode; 
  fallback?: ReactNode;
}) {
  const hasAccess = useFeature(feature);
  
  if (!hasAccess) {
    return <>{fallback || <UpgradePrompt feature={feature} />}</>;
  }
  
  return <>{children}</>;
}
```

---

## 💰 BILLING LIFECYCLE

### Subscription States

**Trial** (14 days):
- Full feature access
- No payment required
- Auto-converts to paid or cancels

**Active**:
- Paid subscription
- Full feature access
- Auto-renewal enabled

**Suspended**:
- Payment failed
- Read-only access
- 7-day grace period
- Auto-reactivate on payment

**Cancelled**:
- Subscription ended
- Read-only access (30 days)
- Data export available
- Can reactivate

### State Transitions

```
Trial → Active (payment added)
Trial → Cancelled (no payment)
Active → Suspended (payment failed)
Suspended → Active (payment successful)
Suspended → Cancelled (grace period expired)
Cancelled → Active (reactivate)
```

### Implementation

**Database Schema**:
```sql
-- Subscription events
CREATE TABLE subscription_events (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
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
    status VARCHAR(50) NOT NULL,
    payment_method VARCHAR(50) NULL,
    invoice_url VARCHAR(500) NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Workflow**:
```javascript
// Subscription service
class SubscriptionService {
  async startTrial(organizationId) {
    await supabase
      .from('organizations')
      .update({
        subscription_status: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      })
      .eq('id', organizationId);
  }
  
  async activateSubscription(organizationId, plan, paymentMethodId) {
    await supabase
      .from('organizations')
      .update({
        subscription_plan: plan,
        subscription_status: 'active',
        subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      .eq('id', organizationId);
  }
  
  async suspendSubscription(organizationId, reason) {
    await supabase
      .from('organizations')
      .update({
        subscription_status: 'suspended',
      })
      .eq('id', organizationId);
    
    // Log event
    await this.logEvent(organizationId, 'subscription_suspended', { reason });
  }
}
```

---

## 📊 USAGE TRACKING

### Metrics to Track

**Per Organization**:
- Transaction count (monthly)
- API request count (hourly/daily)
- Storage usage (GB)
- User count
- Business count
- Location count

**Database Schema**:
```sql
-- Usage tracking
CREATE TABLE organization_usage (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,  -- 'transactions', 'api_requests', 'storage'
    metric_value NUMERIC(10, 2) NOT NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, metric_type, period_start)
);
```

**Enforcement**:
```javascript
// Check transaction limit
async function checkTransactionLimit(organizationId) {
  const { data: org } = await supabase
    .from('organizations')
    .select('max_transactions_per_month, subscription_plan')
    .eq('id', organizationId)
    .single();
  
  if (org.subscription_plan === 'pro' || org.subscription_plan === 'enterprise') {
    return true; // Unlimited
  }
  
  const { count } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', (await getBusinessesForOrg(organizationId))[0].id)
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  
  return (count || 0) < org.max_transactions_per_month;
}
```

---

## 🔄 UPGRADE/DOWNGRADE FLOW

### Upgrade

**Process**:
1. User selects new plan
2. Calculate prorated amount
3. Process payment
4. Update organization plan
5. Enable new features
6. Log event

### Downgrade

**Process**:
1. User selects lower plan
2. Check if current usage exceeds new plan limits
3. If exceeds, warn user (data export, feature disable)
4. Update plan at end of billing period
5. Disable features
6. Log event

---

## 📋 BILLING INTEGRATION

### Recommended Providers

**Stripe** (Recommended):
- Subscription management
- Payment processing
- Invoice generation
- Webhooks for events

**Paddle**:
- Merchant of record
- Tax handling
- Subscription management

### Integration Points

**Webhooks**:
- `subscription.created`
- `subscription.updated`
- `payment.succeeded`
- `payment.failed`
- `subscription.cancelled`

**Implementation**:
```javascript
// Stripe webhook handler
app.post('/webhooks/stripe', async (req, res) => {
  const event = req.body;
  
  switch (event.type) {
    case 'subscription.created':
      await activateSubscription(event.data.object.customer);
      break;
    case 'payment.failed':
      await suspendSubscription(event.data.object.customer);
      break;
    case 'subscription.cancelled':
      await cancelSubscription(event.data.object.customer);
      break;
  }
  
  res.json({ received: true });
});
```

---

**Subscription design complete!** ✅

