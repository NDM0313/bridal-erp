# Soft Launch Daily Test Routine

## 🎯 OVERVIEW

**Purpose**: Systematic daily testing during 7-day soft launch  
**Duration**: 30-45 minutes per day  
**Focus**: Core POS flows, edge cases, monitoring

---

## 📋 DAILY TEST CHECKLIST

### Morning Session (9:00 AM - 9:30 AM)

#### 1. Login & Authentication ✅
- [ ] Login as test user
- [ ] Verify session persists
- [ ] Verify RLS working (can only see own data)
- [ ] Logout and login again

**Expected**: Login works, no cross-organization data visible

---

#### 2. Product Management ✅
- [ ] List products → Should load quickly (<2s)
- [ ] Create new product → Should save successfully
- [ ] Edit product → Should update correctly
- [ ] Delete product (if allowed) → Should remove

**Expected**: All product operations work, no errors

---

#### 3. Stock Management ✅
- [ ] View current stock → Should show correct quantities
- [ ] Check stock in Pieces (base unit) → Should be accurate
- [ ] View stock by location → Should filter correctly

**Expected**: Stock data accurate, no calculation errors

---

#### 4. Create Sale ✅
- [ ] Add product to cart → Should work
- [ ] Select quantity in Box → Should convert to Pieces
- [ ] Select quantity in Pieces → Should work
- [ ] Complete sale → Should deduct stock
- [ ] Verify stock updated → Should reflect sale

**Expected**: Sale completes, stock deducted correctly

---

#### 5. Generate Reports ✅
- [ ] Sales report (today) → Should generate
- [ ] Sales report (this week) → Should generate
- [ ] Inventory report → Should show current stock
- [ ] Verify report data accuracy → Should match actual data

**Expected**: Reports generate quickly (<3s), data accurate

---

### Afternoon Session (2:00 PM - 2:30 PM)

#### 6. Purchase Flow ✅
- [ ] Create purchase → Should work
- [ ] Add items in Box → Should convert to Pieces
- [ ] Complete purchase → Should increase stock
- [ ] Verify stock updated → Should reflect purchase

**Expected**: Purchase completes, stock increased correctly

---

#### 7. Stock Adjustments ✅
- [ ] Increase stock manually → Should work
- [ ] Decrease stock manually → Should work
- [ ] Add reason for adjustment → Should save
- [ ] Verify stock updated → Should reflect adjustment

**Expected**: Adjustments work, no negative stock allowed

---

#### 8. Stock Transfers ✅
- [ ] Transfer stock between locations → Should work
- [ ] Verify source location decreased → Should be correct
- [ ] Verify destination location increased → Should be correct
- [ ] Verify total stock unchanged → Should be same

**Expected**: Transfers work atomically, no stock loss

---

#### 9. Subscription Status ✅
- [ ] Check subscription status → Should show trial
- [ ] Check trial end date → Should be 14 days from signup
- [ ] Verify plan limits → Should match Free plan
- [ ] Test plan limit (if applicable) → Should enforce limit

**Expected**: Subscription status correct, limits enforced

---

### Evening Review (6:00 PM - 6:15 PM)

#### 10. Monitor Metrics ✅
- [ ] Check error logs → Should be minimal (<10/day)
- [ ] Check payment failures → Should be zero
- [ ] Check sale failures → Should be minimal (<5/day)
- [ ] Review API response times → Should be <500ms p95

**Expected**: All metrics within acceptable ranges

---

## 🧪 WEEKLY EDGE CASE TESTING

### Day 1: Stock Edge Cases

**Test Scenarios**:
- [ ] Sale with zero stock → Should fail gracefully with clear message
- [ ] Sale with negative stock attempt → Should prevent and show error
- [ ] Concurrent stock updates (2 users) → Should be atomic, no race condition
- [ ] Stock adjustment to zero → Should work
- [ ] Stock adjustment to negative → Should fail

**Expected**: All edge cases handled correctly, no data corruption

---

### Day 2: Plan Limit Edge Cases

**Test Scenarios**:
- [ ] Create business at limit → Should fail with upgrade prompt
- [ ] Add user at limit → Should fail with upgrade prompt
- [ ] Create transaction at monthly limit → Should fail with upgrade prompt
- [ ] Upgrade plan (if test account) → Should unlock limits immediately

**Expected**: Limits enforced, upgrade prompts clear

---

### Day 3: Subscription Edge Cases

**Test Scenarios**:
- [ ] Trial expires (simulate) → Should suspend gracefully
- [ ] Payment fails (simulate) → Should enter grace period
- [ ] Grace period expires → Should suspend
- [ ] Suspend → Should allow read-only access
- [ ] Resume subscription → Should reactivate immediately

**Expected**: Subscription transitions work correctly

---

### Day 4: Data Isolation

**Test Scenarios**:
- [ ] User from Org A cannot see Org B data → Should be blocked
- [ ] RLS policies working → Should enforce isolation
- [ ] Cross-organization queries → Should return empty
- [ ] Support agent view (if applicable) → Should be read-only

**Expected**: Complete data isolation, no cross-organization access

---

### Day 5: Performance Under Load

**Test Scenarios**:
- [ ] Create 10 sales quickly → Should all succeed
- [ ] Generate 5 reports simultaneously → Should all complete
- [ ] Update stock for 5 products → Should all update
- [ ] Check API response times → Should remain <500ms

**Expected**: System handles load gracefully, no degradation

---

### Day 6: Error Recovery

**Test Scenarios**:
- [ ] Simulate network error → Should handle gracefully
- [ ] Simulate database timeout → Should retry or fail gracefully
- [ ] Simulate payment processing error → Should log and notify
- [ ] Verify error logs → Should capture all errors

**Expected**: Errors handled gracefully, logged correctly

---

### Day 7: End-to-End Flow

**Test Scenarios**:
- [ ] Complete business day simulation:
  - [ ] Morning: Create products, set stock
  - [ ] Midday: Create sales, update stock
  - [ ] Afternoon: Create purchases, update stock
  - [ ] Evening: Generate reports, review metrics
- [ ] Verify all data accurate → Should match expectations
- [ ] Verify no errors → Should be clean

**Expected**: Complete flow works end-to-end, no issues

---

## 📊 METRICS TO TRACK DAILY

### Error Metrics
- **Total Errors**: Target <10/day
- **Critical Errors**: Target 0/day
- **Error Rate**: Target <1%
- **Error Types**: Track most common errors

### Payment Metrics
- **Payment Success Rate**: Target >95%
- **Payment Failures**: Target 0/day
- **Recovery Rate**: Track if failures recover

### Sale Metrics
- **Sale Success Rate**: Target >99%
- **Sale Failures**: Target <5/day
- **Average Sale Time**: Target <500ms

### Performance Metrics
- **API Response Time p50**: Target <200ms
- **API Response Time p95**: Target <500ms
- **API Response Time p99**: Target <1000ms
- **Database Query Time**: Target <100ms

---

## 🚨 RED FLAGS (Immediate Action Required)

**Stop Soft Launch If**:
- ❌ Critical error affecting >50% users
- ❌ Data loss detected
- ❌ Security breach detected
- ❌ Payment processing completely down
- ❌ Cross-organization data access detected

**Action**: Disable signup, notify team, assess impact, fix or rollback

---

## ✅ DAILY COMPLETION CHECKLIST

**Before End of Day**:
- [ ] All daily tests completed
- [ ] Metrics reviewed
- [ ] Errors investigated (if any)
- [ ] Feedback collected (if any)
- [ ] Daily report written
- [ ] Next day plan reviewed

---

## 📝 DAILY REPORT TEMPLATE

**Date**: [Date]

**Tests Completed**:
- [ ] Morning session
- [ ] Afternoon session
- [ ] Evening review

**Metrics**:
- Errors: [count]
- Payment failures: [count]
- Sale failures: [count]
- API response time: [p95]

**Issues Found**:
- [List any issues]

**Feedback Collected**:
- [List user feedback]

**Action Items**:
- [List action items for next day]

**Status**: ✅ GO / ⚠️ MONITOR / ❌ STOP

---

**Daily routine complete!** ✅

