# Operational Playbooks

## 🎯 OVERVIEW

Operational procedures for running the POS SaaS in production.

---

## 📋 INCIDENT RESPONSE

### Billing Incidents

#### Payment Processing Failure

**Severity**: High  
**Detection**: Stripe webhook errors, customer reports

**Response Steps**:
1. **Detect**: Monitor Stripe webhook error logs
2. **Assess**: 
   - Check payment method status
   - Verify Stripe service status
   - Review retry attempts
3. **Action**:
   - If temporary: Wait for automatic retry
   - If permanent: Notify customer via email
   - Offer support to update payment method
4. **Resolve**: 
   - Payment succeeds OR
   - Customer updates payment method
   - Verify subscription reactivated
5. **Document**: 
   - Log incident in support system
   - Update customer record
   - Root cause analysis

**Communication Template**:
```
Subject: Action Required: Update Your Payment Method

Hi [Name],

We couldn't process your payment for your [Plan] subscription.

Please update your payment method to avoid service interruption:
[Update Payment Method]

You have 7 days to update before your account is suspended.

Need help? Reply to this email.
```

---

#### Subscription Sync Failure

**Severity**: Medium  
**Detection**: Database monitoring, customer reports

**Response Steps**:
1. **Detect**: Monitor `subscription_events` table
2. **Assess**: Check sync trigger status, organization status
3. **Action**: 
   - Verify trigger is enabled
   - Manual sync if needed:
     ```sql
     UPDATE organizations
     SET subscription_plan = s.plan, subscription_status = s.status
     FROM organization_subscriptions s
     WHERE organizations.id = s.organization_id;
     ```
4. **Resolve**: Verify sync complete
5. **Document**: Log fix, prevent recurrence

---

### Data Incidents

#### Data Loss

**Severity**: Critical  
**Detection**: Customer reports, monitoring alerts

**Response Steps**:
1. **Detect**: Customer report or monitoring alert
2. **Assess**: 
   - Check backups (Supabase automatic backups)
   - Review audit logs
   - Identify affected records
3. **Action**: 
   - Restore from backup if needed
   - Verify data restored correctly
4. **Resolve**: 
   - Confirm data restored
   - Notify customer
5. **Document**: 
   - Root cause analysis
   - Prevention measures
   - Customer communication

**Communication Template**:
```
Subject: Data Restored - Action Taken

Hi [Name],

We've identified and resolved a data issue affecting your account.

What happened: [Brief description]
What we did: [Restored from backup, fixed issue, etc.]
Current status: All data restored and verified

We apologize for any inconvenience.

If you notice any issues, please contact support immediately.
```

---

#### Data Corruption

**Severity**: High  
**Detection**: Database integrity checks, customer reports

**Response Steps**:
1. **Detect**: Database integrity checks or customer reports
2. **Assess**: 
   - Identify affected records
   - Check backup integrity
3. **Action**: 
   - Restore from backup
   - Fix corruption source
4. **Resolve**: Verify data integrity
5. **Document**: Root cause, prevention

---

### Auth Incidents

#### Mass Login Failure

**Severity**: Critical  
**Detection**: Monitor login success rate

**Response Steps**:
1. **Detect**: Login success rate drops below threshold
2. **Assess**: 
   - Check Supabase Auth status
   - Verify RLS policies
   - Check for recent changes
3. **Action**: 
   - Verify Supabase service status
   - Check RLS policy changes
   - Test login flow
4. **Resolve**: 
   - Fix issue
   - Verify logins work
5. **Document**: Incident report

**Communication Template**:
```
Subject: Login Issue Resolved

Hi [Name],

We've resolved a login issue that was affecting some users.

The issue has been fixed and you should now be able to log in normally.

If you continue to experience issues, please contact support.
```

---

#### RLS Policy Failure

**Severity**: Critical (Security)  
**Detection**: Customer reports cross-organization data access

**Response Steps**:
1. **Detect**: Customer reports seeing other organizations' data
2. **Assess**: 
   - Review RLS policies
   - Test isolation
   - Check for policy changes
3. **Action**: 
   - Fix RLS policy immediately
   - Verify isolation restored
   - Audit affected organizations
4. **Resolve**: 
   - Confirm no data leakage
   - Notify affected customers
5. **Document**: 
   - Security incident report
   - Policy fix
   - Prevention measures

---

## 📧 CUSTOMER COMMUNICATION TEMPLATES

### Trial Reminders

#### Day 7 Email
```
Subject: How's your trial going?

Hi [Name],

You're halfway through your 14-day free trial!

Here's what you've accomplished so far:
- [X] products added
- [X] sales completed
- [X] team members invited

Need help? Reply to this email or check out our docs: [Link]

[Upgrade to Pro] [Continue Trial]
```

#### Day 12 Email
```
Subject: Your trial ends in 2 days

Hi [Name],

Your free trial ends in 2 days. Don't lose access to your data!

Upgrade now to keep:
- All your products and sales
- Team access
- Reports and analytics

[Upgrade Now] [Export Data]

Questions? Reply to this email.
```

#### Day 13 Email
```
Subject: Last day of your trial

Hi [Name],

Today is the last day of your free trial.

Upgrade now to continue using all features:
[Upgrade Now]

After today, your account will be suspended (read-only access for 30 days).
```

---

### Payment Failure

#### Payment Failed Email
```
Subject: Action required: Update your payment method

Hi [Name],

We couldn't process your payment for your [Plan] subscription.

Please update your payment method to avoid service interruption:
[Update Payment Method]

You have 7 days to update before your account is suspended.

Need help? Reply to this email.
```

#### Account Suspended Email
```
Subject: Your account has been suspended

Hi [Name],

Your account has been suspended due to payment failure.

Your data is safe and will be available for 30 days.

To reactivate:
1. Update your payment method
2. Click "Reactivate Account"

[Reactivate Account] [Export Data]

After 30 days, your account will be cancelled and data deleted.
```

---

### Upgrade Prompts

#### Feature Limit Reached
```
Subject: Unlock [Feature] with [Plan]

Hi [Name],

You've reached your plan limit for [Feature].

Upgrade to [Plan] to unlock:
- [Benefit 1]
- [Benefit 2]
- [Benefit 3]

[Upgrade Now] [View Plans]
```

#### Usage Threshold (80%)
```
Subject: You're using 80% of your monthly limit

Hi [Name],

You've used 80% of your monthly [Feature] limit.

Upgrade to [Plan] for unlimited [Feature]:
[Upgrade Now]

Or continue on your current plan (limit resets next month).
```

---

## 🎯 SLA DEFINITION (ENTERPRISE)

### Uptime Guarantees

**Pro Plan**:
- 99.9% uptime (43.2 minutes downtime/month)
- Email support (24-hour response)

**Enterprise Plan**:
- 99.99% uptime (4.32 minutes downtime/month)
- Dedicated support channel (1-hour response)
- SLA credits for downtime

### Response Times

**Critical Issues** (Service down, data loss):
- Pro: 4 hours
- Enterprise: 1 hour

**High Priority** (Feature broken, payment issue):
- Pro: 24 hours
- Enterprise: 4 hours

**Normal Priority** (Feature request, bug):
- Pro: 48 hours
- Enterprise: 24 hours

### Data Retention

**Standard**:
- 30 days after cancellation
- Data export available

**Enterprise**:
- 90 days after cancellation
- Extended data export
- Custom retention available

---

## 📊 METRICS DASHBOARD

### Key Metrics to Track

**Business Metrics**:
- MRR (Monthly Recurring Revenue)
- Churn rate (monthly)
- ARPU (Average Revenue Per User)
- Customer count by plan
- Trial conversion rate

**Operational Metrics**:
- API response times (p50, p95, p99)
- Error rates
- Payment failure rate
- Webhook processing time
- Database query performance

**Customer Metrics**:
- Active organizations
- Trial organizations
- Suspended organizations
- Feature usage by plan
- Support ticket volume

---

## 🚨 ESCALATION PROCEDURES

### Severity Levels

**P0 - Critical** (Service down, data loss):
- Immediate response
- All hands on deck
- Customer notification within 1 hour

**P1 - High** (Feature broken, payment issue):
- Response within 4 hours
- Customer notification within 24 hours

**P2 - Medium** (Bug, feature request):
- Response within 24 hours
- Customer notification as needed

**P3 - Low** (Enhancement, minor bug):
- Response within 48 hours
- No customer notification

---

## ✅ OPERATIONAL CHECKLIST

### Daily
- [ ] Check error rates
- [ ] Review payment failures
- [ ] Monitor webhook processing
- [ ] Check support tickets

### Weekly
- [ ] Review MRR and churn
- [ ] Analyze feature usage
- [ ] Review customer feedback
- [ ] Performance metrics review

### Monthly
- [ ] Business metrics report
- [ ] Customer health review
- [ ] Security audit
- [ ] Backup verification

---

**Operational playbooks complete!** ✅

