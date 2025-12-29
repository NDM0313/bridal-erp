# Phase 3 Deployment Guide

## 🎯 QUICK START

**Goal**: Deploy subscription and billing system  
**Time**: ~45 minutes  
**Risk**: Low (backward compatible, existing orgs default to Free)

---

## 📋 PRE-DEPLOYMENT CHECKLIST

- [ ] Stripe account created
- [ ] Stripe products/prices created
- [ ] Environment variables set (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)
- [ ] Webhook endpoint configured in Stripe
- [ ] Database backup created
- [ ] Backend dependencies installed (stripe package)

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Install Stripe Package

**Backend**:
```bash
cd backend
npm install stripe
```

---

### Step 2: Configure Stripe

**Create Stripe Products/Prices**:

1. Go to Stripe Dashboard → Products
2. Create products for each plan:
   - **Basic Plan**: $29/month
   - **Pro Plan**: $99/month
   - **Enterprise Plan**: Custom pricing
3. Copy Price IDs (e.g., `price_xxxxx`)

**Set Environment Variables**:
```bash
# backend/.env
STRIPE_SECRET_KEY=sk_live_xxxxx  # or sk_test_xxxxx for testing
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # From Stripe webhook settings
```

---

### Step 3: Deploy Schema

**Supabase SQL Editor**:
1. Open `database/PHASE3_SUBSCRIPTION_SCHEMA.sql`
2. Run the script
3. Verify no errors

**Expected Output**:
- ✅ Tables created
- ✅ Functions created
- ✅ Triggers created
- ✅ Subscriptions created for existing orgs

---

### Step 4: Configure Stripe Webhook

**Stripe Dashboard**:
1. Go to Developers → Webhooks
2. Add endpoint: `https://your-backend.com/api/v1/webhooks/stripe`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`
4. Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET`

---

### Step 5: Verify Deployment

**Run Verification Queries**:
1. Open `database/PHASE3_VERIFICATION.sql`
2. Run all queries
3. All should show ✅

**Key Checks**:
- ✅ All tables created
- ✅ All functions created
- ✅ All triggers working
- ✅ Subscriptions created for existing orgs
- ✅ RLS enabled

---

### Step 6: Deploy Backend

**Update Backend**:
```bash
cd backend
npm install  # Install stripe package
npm run dev   # Test locally
```

**Verify**:
- ✅ Server starts without errors
- ✅ Subscription routes work
- ✅ Webhook endpoint accessible

---

### Step 7: Test Webhook

**Stripe Dashboard**:
1. Go to Developers → Webhooks
2. Send test event
3. Check backend logs for processing

**Expected**: Event processed successfully

---

## ✅ VERIFICATION CHECKLIST

### Database
- [ ] organization_subscriptions table exists
- [ ] billing_history table exists
- [ ] subscription_events table exists
- [ ] Functions created
- [ ] Triggers created
- [ ] RLS enabled
- [ ] Subscriptions created for existing orgs

### Backend
- [ ] Stripe package installed
- [ ] Environment variables set
- [ ] Subscription routes work
- [ ] Webhook endpoint accessible
- [ ] Feature guard checks subscription status

### Stripe
- [ ] Products/prices created
- [ ] Webhook endpoint configured
- [ ] Webhook secret set
- [ ] Test events processed

---

## 🚨 TROUBLESHOOTING

### Issue: Webhook signature verification fails

**Cause**: Wrong webhook secret or raw body not parsed  
**Fix**: Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard

**Check**:
```bash
# Verify webhook secret in Stripe dashboard
# Ensure backend uses express.raw() for webhook route
```

---

### Issue: Subscriptions not syncing with organizations

**Cause**: Trigger not working  
**Fix**: Verify trigger exists and is enabled

**Check**:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'sync_org_plan_on_subscription_update';
```

---

### Issue: Features not syncing on plan change

**Cause**: Feature sync trigger not working  
**Fix**: Verify trigger exists

**Check**:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'sync_features_on_plan_change';
```

---

## 🔄 ROLLBACK PROCEDURE

**If Critical Issues Occur**:

1. **Disable Subscription Enforcement**: Comment out subscription guards
2. **Revert to Free Plan**: Update all subscriptions to Free
3. **Disable Webhooks**: Remove webhook endpoint
4. **Keep Data**: Do NOT delete subscription tables

**Rollback SQL**:
```sql
-- Set all subscriptions to Free plan
UPDATE organization_subscriptions
SET plan = 'free', status = 'active';

-- Sync with organizations
UPDATE organizations
SET subscription_plan = 'free', subscription_status = 'active';
```

---

## 📊 POST-DEPLOYMENT

### Monitor
- Webhook event processing
- Subscription status changes
- Payment success/failure rates
- Plan upgrade/downgrade requests

### Metrics to Track
- Active subscriptions
- Trial conversions
- Payment failures
- Plan distribution

### Next Steps
- Phase 4: White-label features
- Phase 5: Advanced reporting
- Phase 6: Mobile app enhancements

---

## ✅ DEPLOYMENT COMPLETE

**Status**: Phase 3 subscription system deployed  
**Safety**: ✅ Backward compatible, existing orgs default to Free  
**Next**: Phase 4 (white-label features)

---

**Deployment guide complete!** ✅

