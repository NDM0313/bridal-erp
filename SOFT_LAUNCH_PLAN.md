# Soft Launch Plan

## 🎯 OVERVIEW

**Goal**: Safe soft launch with 5-10 users, 7-day testing period  
**Strategy**: Limited users, trial-only, close monitoring, iterate  
**Timeline**: Soft launch → 7 days → Public launch decision

---

## ✅ SOFT LAUNCH MODE CONFIGURATION

### User Limit

**Configuration**:
- Initial limit: 10 users
- All new signups get Free plan with 14-day trial
- Signup can be disabled via feature flag

**Implementation**:
- ✅ `system_settings` table for configuration
- ✅ Backend checks user limit before signup
- ✅ Clear error message when limit reached

**Disable Limit** (when ready for public launch):
```sql
UPDATE system_settings 
SET value = 'false'::jsonb 
WHERE key = 'soft_launch_mode';
```

---

### Trial Plans Only

**Configuration**:
- All new organizations: Free plan
- All new subscriptions: Trial status (14 days)
- Full feature access during trial
- Upgrade prompts after trial

**Verification**:
- [ ] New signup creates Free plan
- [ ] Trial starts automatically
- [ ] Trial end date set correctly
- [ ] Features accessible

---

### No Aggressive Marketing

**Actions**:
- [ ] Signup page: "Limited Beta - By Invitation Only"
- [ ] No public marketing campaigns
- [ ] No paid advertising
- [ ] Word-of-mouth only
- [ ] Direct invites to beta users

---

## 📊 DAILY TESTING PLAN

### Day 1-7: Daily POS Usage

**Morning (9 AM)**:
1. Login as test user
2. List products → Verify works
3. Create test sale → Verify works
4. Verify stock deducted → Verify correct
5. Generate sales report → Verify works
6. Check error logs → Should be clean

**Afternoon (2 PM)**:
1. Create purchase → Verify works
2. Verify stock increased → Verify correct
3. Adjust stock → Verify works
4. Transfer stock → Verify works
5. Generate inventory report → Verify works

**Evening (6 PM)**:
1. Review daily metrics:
   - Error rate (target: <1%)
   - Payment failures (target: <5%)
   - Sale failures (target: <1%)
   - API response times (target: <500ms p95)

---

## 🧪 EDGE CASE TESTING

### Test Scenarios (Run once during soft launch)

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

## 📈 MONITORING DASHBOARD

### Key Metrics to Track Daily

**Error Metrics**:
- Total errors (target: <10/day)
- Error rate (target: <1%)
- Critical errors (target: 0)
- Error by type

**Payment Metrics**:
- Payment success rate (target: >95%)
- Payment failure rate (target: <5%)
- Recovery rate (target: >80%)
- Average recovery time

**Sale Metrics**:
- Sale success rate (target: >99%)
- Sale failure rate (target: <1%)
- Average sale processing time (target: <500ms)
- Failed sales by reason

**Performance Metrics**:
- API response time p50 (target: <200ms)
- API response time p95 (target: <500ms)
- API response time p99 (target: <1000ms)
- Database query time

---

## 🚨 ROLLBACK PROCEDURES

### Disable Signup

**Command**:
```sql
UPDATE system_settings 
SET value = 'false'::jsonb 
WHERE key = 'signup_enabled';
```

**Verification**:
- [ ] Signup endpoint returns 503
- [ ] Error message clear
- [ ] Existing users unaffected

---

### Pause Billing

**Command**:
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

**Verification**:
- [ ] All subscriptions suspended
- [ ] Users can still login (read-only)
- [ ] Billing paused

---

### Communicate with Users

**Templates Ready**:
- [ ] Signup disabled email
- [ ] Billing paused email
- [ ] Critical bug notification
- [ ] Service update email

---

## ✅ PUBLIC LAUNCH CRITERIA

### 7-Day Stability Requirements

**All Must Be True**:
- [ ] No critical bugs for 7 consecutive days
- [ ] Error rate < 1% for 7 days
- [ ] Payment success rate > 95% for 7 days
- [ ] Sale success rate > 99% for 7 days
- [ ] API response times acceptable for 7 days
- [ ] No security incidents
- [ ] No data loss incidents
- [ ] Customer feedback positive

### Daily Checklist (7 Days)

**Day 1**:
- [ ] Error rate: _____ (<1% target)
- [ ] Payment success: _____ (>95% target)
- [ ] Sale success: _____ (>99% target)
- [ ] Critical bugs: _____ (0 target)

**Day 2-7**: Repeat daily checklist

**Day 7 Evaluation**:
- [ ] All criteria met? → GO for public launch
- [ ] Any criteria failed? → NO-GO, extend soft launch

---

## 📋 SOFT LAUNCH EXECUTION

### Pre-Launch (Day 0)

**Actions**:
- [ ] Deploy to production
- [ ] Enable soft launch mode (10 user limit)
- [ ] Verify monitoring working
- [ ] Verify error logging working
- [ ] Verify payment tracking working
- [ ] Verify sale tracking working

---

### Week 1: Soft Launch

**Day 1**:
- [ ] Onboard 5 test users
- [ ] Monitor closely
- [ ] Daily testing
- [ ] Review metrics

**Day 2-7**:
- [ ] Daily POS usage testing
- [ ] Monitor error rates
- [ ] Track payment success
- [ ] Track sale success
- [ ] Collect feedback
- [ ] Fix issues as they arise

---

### Week 2: Evaluation

**Day 8-14**:
- [ ] Review 7-day metrics
- [ ] Evaluate GO/NO-GO criteria
- [ ] Make public launch decision
- [ ] If GO → Prepare public launch
- [ ] If NO-GO → Extend soft launch, fix issues

---

## 🎯 SUCCESS CRITERIA

### Soft Launch Success

**Week 1 Targets**:
- [ ] 5-10 users onboarded
- [ ] Error rate < 1%
- [ ] Payment success rate > 95%
- [ ] Sale success rate > 99%
- [ ] No critical bugs
- [ ] Positive user feedback

### Public Launch Readiness

**7-Day Requirements**:
- [ ] All soft launch targets met for 7 days
- [ ] No critical bugs
- [ ] Stable performance
- [ ] Support processes validated
- [ ] Monitoring working
- [ ] Rollback plan tested

---

## ✅ SOFT LAUNCH PLAN COMPLETE

**Status**: ✅ **READY FOR SOFT LAUNCH**

**Next Steps**:
1. Execute production checklist
2. Enable soft launch mode
3. Onboard 5-10 test users
4. Monitor closely for 7 days
5. Evaluate public launch criteria

---

**Soft launch plan complete!** ✅

