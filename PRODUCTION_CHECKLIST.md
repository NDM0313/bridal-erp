# Production Launch Checklist

## 🎯 OVERVIEW

**Goal**: Safe soft launch with limited users  
**Strategy**: Verify everything, monitor closely, iterate  
**Timeline**: Soft launch → 7 days testing → Public launch

---

## ✅ TASK 1 — PRODUCTION ENVIRONMENT VERIFICATION

### 1.1 Environment Variables

**Backend Production Environment** (`backend/.env`):

**Required Variables**:
```bash
# Supabase (Production)
SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_ANON_KEY=[production-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[production-service-role-key]

# Stripe (Live Mode)
STRIPE_SECRET_KEY=sk_live_[your-live-key]
STRIPE_WEBHOOK_SECRET=whsec_[your-webhook-secret]

# Server
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com

# Optional: Monitoring
SENTRY_DSN=[sentry-dsn-if-using]
```

**Verification Steps**:
- [ ] All variables set in production environment
- [ ] No test/development keys in production
- [ ] Service role key is secure (backend only)
- [ ] Stripe keys are LIVE mode (not test)
- [ ] CORS origin matches production domain

**Frontend Production Environment** (`.env.local` or `.env.production`):

**Required Variables**:
```bash
# Supabase (Production - Anon Key Only)
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[production-anon-key]

# Backend API
NEXT_PUBLIC_API_URL=https://api.your-domain.com

# Optional: Analytics
NEXT_PUBLIC_ANALYTICS_ID=[analytics-id-if-using]
```

**Verification Steps**:
- [ ] All variables set
- [ ] NO service role key in frontend
- [ ] API URL points to production backend
- [ ] Supabase URL is production project

---

### 1.2 Production Supabase Project

**Verification Checklist**:
- [ ] Production project created (separate from staging)
- [ ] Database schema deployed (`PHASE1_SAAS_FOUNDATION.sql`, `PHASE2_DATA_MIGRATION.sql`, `PHASE3_SUBSCRIPTION_SCHEMA.sql`)
- [ ] RLS enabled on all tables
- [ ] RLS policies verified
- [ ] Functions created (`get_user_business_id()`, `get_user_organization_id()`, etc.)
- [ ] Triggers working (subscription sync, feature sync)
- [ ] Indexes created
- [ ] Backup enabled (daily automatic)
- [ ] Point-in-time recovery enabled

**Security Checks**:
- [ ] RLS policies tested (cross-organization isolation)
- [ ] No public access to sensitive tables
- [ ] Service role key not exposed
- [ ] Anon key has minimal permissions

**Database Verification SQL**:
```sql
-- Run in Supabase SQL Editor
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('organizations', 'businesses', 'products', 'transactions')
ORDER BY tablename;

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_user_business_id', 'get_user_organization_id');

-- Check subscriptions created
SELECT COUNT(*) as total_orgs,
       COUNT(CASE WHEN id IN (SELECT organization_id FROM organization_subscriptions) THEN 1 END) as with_subscriptions
FROM organizations;
```

---

### 1.3 Stripe Live Configuration

**Verification Checklist**:
- [ ] Stripe account in LIVE mode (not test)
- [ ] Live API keys configured
- [ ] Products created in Stripe Dashboard:
  - [ ] Basic Plan ($29/month)
  - [ ] Pro Plan ($99/month)
  - [ ] Enterprise Plan (custom pricing)
- [ ] Price IDs copied to backend config
- [ ] Webhook endpoint configured:
  - [ ] URL: `https://api.your-domain.com/api/v1/webhooks/stripe`
  - [ ] Events selected:
    - [ ] `customer.subscription.created`
    - [ ] `customer.subscription.updated`
    - [ ] `customer.subscription.deleted`
    - [ ] `invoice.payment_succeeded`
    - [ ] `invoice.payment_failed`
    - [ ] `customer.subscription.trial_will_end`
  - [ ] Webhook secret copied to backend env

**Test Webhook**:
- [ ] Send test event from Stripe Dashboard
- [ ] Verify webhook received in backend logs
- [ ] Verify event processed correctly
- [ ] Verify idempotency (send duplicate, verify skipped)

---

### 1.4 Domain & HTTPS

**Verification Checklist**:
- [ ] Production domain configured (e.g., `pos.your-domain.com`)
- [ ] SSL certificate valid and auto-renewing
- [ ] DNS records configured:
  - [ ] A record or CNAME pointing to hosting
  - [ ] SSL certificate provisioned
- [ ] Frontend accessible via HTTPS
- [ ] Backend API accessible via HTTPS
- [ ] No mixed content warnings
- [ ] Security headers configured:
  - [ ] HSTS enabled
  - [ ] CSP configured
  - [ ] X-Frame-Options set
  - [ ] X-Content-Type-Options set

**Test**:
- [ ] Visit frontend URL → Should load via HTTPS
- [ ] Visit backend API → Should respond via HTTPS
- [ ] Check SSL certificate validity (expires > 30 days)

---

## ✅ TASK 2 — SOFT LAUNCH MODE

### 2.1 User Limit Configuration

**Strategy**: Limit initial users to 5-10 for soft launch

**Implementation**:
```sql
-- Add soft launch flag to organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS soft_launch_user BOOLEAN DEFAULT false;

-- Mark soft launch users
UPDATE organizations 
SET soft_launch_user = true 
WHERE id IN (SELECT id FROM organizations ORDER BY id LIMIT 10);
```

**Backend Check**:
```javascript
// In onboarding route
const { count } = await supabase
  .from('organizations')
  .select('id', { count: 'exact', head: true })
  .eq('soft_launch_user', false);

if (count >= 10) {
  return res.status(503).json({
    success: false,
    error: {
      code: 'SOFT_LAUNCH_LIMIT',
      message: 'We are currently in soft launch mode. Signups are limited. Please check back soon!',
    },
  });
}
```

**Verification**:
- [ ] User limit enforced
- [ ] Error message clear
- [ ] Can disable limit when ready for public launch

---

### 2.2 Trial Plans Only

**Strategy**: All new signups get Free plan with 14-day trial

**Configuration**:
- [ ] New organizations default to `subscription_plan = 'free'`
- [ ] New subscriptions default to `status = 'trial'`
- [ ] Trial period: 14 days
- [ ] Full feature access during trial
- [ ] Upgrade prompts after trial

**Verification**:
- [ ] New signup creates Free plan organization
- [ ] Trial starts automatically
- [ ] Trial end date set correctly
- [ ] Features accessible during trial

---

### 2.3 Disable Aggressive Marketing

**Strategy**: Soft launch = word-of-mouth only

**Actions**:
- [ ] No public marketing campaigns
- [ ] No paid advertising
- [ ] No press releases
- [ ] Limited to:
  - [ ] Direct invites to beta users
  - [ ] Word-of-mouth referrals
  - [ ] Internal testing

**Marketing Controls**:
- [ ] Signup page: "Limited Beta - By Invitation Only"
- [ ] No public pricing page (yet)
- [ ] No public feature pages (yet)
- [ ] Focus on stability, not growth

---

## ✅ TASK 3 — MONITORING ENABLEMENT

### 3.1 Error Logging

**Setup**:
- [ ] Error tracking service configured (Sentry recommended)
- [ ] Backend error handler logs to Sentry
- [ ] Frontend error boundary logs to Sentry
- [ ] Alerts configured for critical errors

**Backend Error Handler** (update `backend/src/middleware/errorHandler.js`):
```javascript
import * as Sentry from '@sentry/node';

// Initialize Sentry
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
  });
}

// In error handler
export function errorHandler(err, req, res, next) {
  // Log to Sentry
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err, {
      tags: {
        organizationId: req.organizationId,
        userId: req.user?.id,
      },
    });
  }
  
  // ... existing error handling
}
```

**Alerts**:
- [ ] Critical errors (>10 errors/hour) → Email + Slack
- [ ] Payment errors → Immediate alert
- [ ] Authentication errors → Alert if spike

---

### 3.2 Payment Failure Tracking

**Monitoring**:
- [ ] Track payment failures in `billing_history` table
- [ ] Alert on payment failure rate > 5%
- [ ] Daily payment failure report
- [ ] Track recovery rate

**Dashboard Metrics**:
- [ ] Payment success rate
- [ ] Payment failure rate
- [ ] Average time to recovery
- [ ] Failed payments by reason

**Alerts**:
- [ ] Payment failure rate > 10% → Immediate alert
- [ ] Multiple failures for same customer → Support alert

---

### 3.3 Sale/Transaction Failure Tracking

**Monitoring**:
- [ ] Track failed sales in application logs
- [ ] Alert on sale failure rate > 1%
- [ ] Track common failure reasons:
  - [ ] Stock unavailable
  - [ ] Plan limit exceeded
  - [ ] Validation errors
  - [ ] Database errors

**Dashboard Metrics**:
- [ ] Sales success rate
- [ ] Sales failure rate
- [ ] Average sale processing time
- [ ] Failed sales by reason

**Alerts**:
- [ ] Sale failure rate > 5% → Alert
- [ ] Stock deduction failures → Critical alert
- [ ] Database errors during sales → Critical alert

---

## ✅ TASK 4 — POST-LAUNCH TESTING PLAN

### 4.1 Daily POS Usage Testing

**Daily Test Checklist** (Run every day during soft launch):

**Morning (9 AM)**:
- [ ] Login as test user
- [ ] List products → Should work
- [ ] Create test sale → Should work
- [ ] Verify stock deducted → Should be correct
- [ ] Generate sales report → Should work
- [ ] Check error logs → Should be clean

**Afternoon (2 PM)**:
- [ ] Create purchase → Should work
- [ ] Verify stock increased → Should be correct
- [ ] Adjust stock → Should work
- [ ] Transfer stock → Should work
- [ ] Generate inventory report → Should work

**Evening (6 PM)**:
- [ ] Review daily metrics:
  - [ ] Error rate
  - [ ] Payment failures
  - [ ] Sale failures
  - [ ] API response times

---

### 4.2 Edge Case Testing

**Test Scenarios** (Run once during soft launch):

**Stock Edge Cases**:
- [ ] Sale with zero stock → Should fail gracefully
- [ ] Sale with negative stock attempt → Should prevent
- [ ] Concurrent stock updates → Should be atomic
- [ ] Stock adjustment to zero → Should work

**Plan Limit Edge Cases**:
- [ ] Create business at limit → Should fail with upgrade prompt
- [ ] Add user at limit → Should fail with upgrade prompt
- [ ] Create transaction at monthly limit → Should fail with upgrade prompt
- [ ] Upgrade plan → Should unlock limits immediately

**Subscription Edge Cases**:
- [ ] Trial expires → Should suspend gracefully
- [ ] Payment fails → Should enter grace period
- [ ] Grace period expires → Should suspend
- [ ] Suspend → Should allow read-only access
- [ ] Resume subscription → Should reactivate immediately

**Data Isolation**:
- [ ] User from Org A cannot see Org B data → Should be blocked
- [ ] RLS policies working → Should enforce isolation
- [ ] Cross-organization queries → Should return empty

---

### 4.3 Subscription Suspend/Resume Testing

**Suspend Test**:
1. Manually suspend subscription (via Stripe or admin)
2. Verify:
   - [ ] User can login
   - [ ] Read-only access (can view, cannot create/edit)
   - [ ] Upgrade prompt shown
   - [ ] Basic features still work

**Resume Test**:
1. Update payment method
2. Verify:
   - [ ] Subscription reactivated
   - [ ] Full access restored
   - [ ] Features unlocked
   - [ ] No data loss

---

## ✅ TASK 5 — ROLLBACK PLAN

### 5.1 Disable Signup (Feature Flag)

**Implementation**:
```sql
-- Add feature flag
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS signup_enabled BOOLEAN DEFAULT true;

-- Disable signup
UPDATE organizations SET signup_enabled = false WHERE id = 0; -- Dummy update to set default

-- Create signup_enabled setting (single row)
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_settings (key, value) 
VALUES ('signup_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
```

**Backend Check**:
```javascript
// In onboarding route
const { data: setting } = await supabase
  .from('system_settings')
  .select('value')
  .eq('key', 'signup_enabled')
  .single();

if (!setting || setting.value !== true) {
  return res.status(503).json({
    success: false,
    error: {
      code: 'SIGNUP_DISABLED',
      message: 'New signups are temporarily disabled. Please check back soon.',
    },
  });
}
```

**Rollback Command**:
```sql
-- Disable signup
UPDATE system_settings 
SET value = 'false'::jsonb 
WHERE key = 'signup_enabled';
```

---

### 5.2 Pause Billing

**Strategy**: Suspend all subscriptions temporarily

**Rollback Command**:
```sql
-- Suspend all active subscriptions
UPDATE organization_subscriptions
SET status = 'suspended',
    updated_at = CURRENT_TIMESTAMP
WHERE status IN ('active', 'trial');

-- Sync to organizations
UPDATE organizations
SET subscription_status = 'suspended'
WHERE subscription_status IN ('active', 'trial');
```

**Communication**:
- [ ] Email all affected customers
- [ ] Explain temporary suspension
- [ ] Provide timeline for resolution

---

### 5.3 User Communication

**Communication Templates**:

**Signup Disabled**:
```
Subject: Temporary Signup Pause

Hi,

We're temporarily pausing new signups to ensure the best experience for existing users.

We'll resume signups soon. Thank you for your patience.

- The Team
```

**Billing Paused**:
```
Subject: Temporary Billing Pause

Hi [Name],

We've temporarily paused billing to address a technical issue.

Your account remains active and accessible. We'll resume billing once the issue is resolved.

No action needed on your part.

- The Team
```

**Critical Bug**:
```
Subject: Important: Service Update

Hi [Name],

We've identified a critical issue and are working to resolve it.

Your data is safe. We'll update you within [X] hours.

If you have questions, please contact support.

- The Team
```

---

## ✅ TASK 6 — PUBLIC LAUNCH CRITERIA

### 6.1 Stability Criteria

**7-Day Stability Requirements**:
- [ ] No critical bugs for 7 consecutive days
- [ ] Error rate < 1% for 7 days
- [ ] API response times acceptable for 7 days
- [ ] No security incidents
- [ ] No data loss incidents

**Daily Checks**:
- [ ] Error rate < 1%
- [ ] Payment success rate > 95%
- [ ] Sale success rate > 99%
- [ ] No critical errors
- [ ] Customer satisfaction positive

---

### 6.2 Payment Success Criteria

**Requirements**:
- [ ] Payment success rate > 95% for 7 days
- [ ] Payment failure rate < 5%
- [ ] Average recovery time < 24 hours
- [ ] No payment processing outages
- [ ] Webhook processing success rate > 99%

**Metrics**:
- [ ] Track daily payment success rate
- [ ] Track payment failure reasons
- [ ] Track recovery rate
- [ ] Monitor Stripe dashboard

---

### 6.3 Sales & Reports Stability

**Requirements**:
- [ ] Sale success rate > 99% for 7 days
- [ ] Report generation success rate > 99%
- [ ] No stock calculation errors
- [ ] No transaction isolation issues
- [ ] All POS flows working correctly

**Daily Verification**:
- [ ] Test sale creation → Should work
- [ ] Test stock update → Should work
- [ ] Test report generation → Should work
- [ ] Verify data accuracy → Should be correct

---

### 6.4 Go/No-Go Decision Matrix

**GO Criteria** (All must be true):
- ✅ 7 days with no critical bugs
- ✅ Payment success rate > 95%
- ✅ Sale success rate > 99%
- ✅ Error rate < 1%
- ✅ Customer feedback positive
- ✅ Support team ready
- ✅ Monitoring working
- ✅ Rollback plan tested

**NO-GO Criteria** (Any one triggers delay):
- ❌ Critical bug in last 7 days
- ❌ Payment success rate < 95%
- ❌ Sale success rate < 99%
- ❌ Error rate > 1%
- ❌ Security incident
- ❌ Data loss incident
- ❌ Customer complaints > 5%

**Decision Process**:
1. Review metrics daily
2. On day 7, evaluate all criteria
3. If all GO → Proceed to public launch
4. If any NO-GO → Extend soft launch, fix issues, reset 7-day clock

---

## 📋 SOFT LAUNCH EXECUTION PLAN

### Week 1: Soft Launch

**Day 1**:
- [ ] Deploy to production
- [ ] Enable soft launch mode (10 user limit)
- [ ] Onboard 5 test users
- [ ] Monitor closely
- [ ] Daily testing

**Day 2-7**:
- [ ] Daily POS usage testing
- [ ] Monitor error rates
- [ ] Track payment success
- [ ] Collect feedback
- [ ] Fix issues as they arise

### Week 2: Evaluation

**Day 8-14**:
- [ ] Review 7-day metrics
- [ ] Evaluate GO/NO-GO criteria
- [ ] Make public launch decision
- [ ] If GO → Prepare public launch
- [ ] If NO-GO → Extend soft launch, fix issues

---

## 🚨 EMERGENCY PROCEDURES

### Critical Bug Detected

**Immediate Actions**:
1. **Disable Signup**: `UPDATE system_settings SET value = 'false'::jsonb WHERE key = 'signup_enabled';`
2. **Notify Team**: Alert all engineers
3. **Assess Impact**: How many users affected?
4. **Fix or Rollback**: Fix if quick, rollback if complex
5. **Communicate**: Notify affected users
6. **Document**: Log incident, root cause analysis

### Payment Processing Down

**Immediate Actions**:
1. **Pause Billing**: Suspend all subscriptions
2. **Notify Stripe**: Check Stripe status page
3. **Verify Webhook**: Check webhook endpoint
4. **Fix Issue**: Resolve payment processing
5. **Resume Billing**: Reactivate subscriptions
6. **Communicate**: Notify affected users

### Data Loss Detected

**Immediate Actions**:
1. **Stop All Operations**: Disable signup, pause billing
2. **Assess Impact**: What data lost?
3. **Restore from Backup**: Use Supabase point-in-time recovery
4. **Verify Data**: Confirm restoration
5. **Resume Operations**: Re-enable after verification
6. **Communicate**: Notify affected users
7. **Document**: Root cause analysis

---

## ✅ PRODUCTION CHECKLIST COMPLETE

**Status**: ✅ **READY FOR SOFT LAUNCH**

**Next Steps**:
1. Execute production checklist
2. Enable soft launch mode
3. Onboard 5-10 test users
4. Monitor closely for 7 days
5. Evaluate public launch criteria

---

**Production checklist complete!** ✅
