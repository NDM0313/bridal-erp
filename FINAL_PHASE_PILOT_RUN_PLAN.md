# Final Phase: Pilot Run Plan

**Date**: January 8, 2026  
**Status**: ✅ **READY FOR PILOT**  
**Duration**: 7-10 Days  
**Participants**: 1-2 Production Workers, 1 Sales User, 1 Admin/Manager

---

## Overview

This pilot run validates the ERP system with **real users** performing **real business activities** before full go-live.

**Goal**: Confirm system works correctly in real-world scenarios with actual users.

---

## Pilot Participants

### 1. Production Worker (1-2 users)
- **Role**: `production_worker`
- **Device**: Mobile app (Android/iOS)
- **Activities**: View assigned steps, update quantities, complete steps

### 2. Sales User (1 user)
- **Role**: `cashier` or `sales`
- **Device**: Mobile app OR Web app
- **Activities**: Create sales (normal & studio), finalize sales, handle WhatsApp orders

### 3. Admin/Manager (1 user)
- **Role**: `admin` or `manager`
- **Device**: Web app
- **Activities**: Monitor dashboard, view reports, handle exceptions, manage costs

---

## Pilot Activities (Day-by-Day)

### Day 1: System Introduction & Basic Operations

**Morning (2 hours)**
- ✅ Login to system (all users)
- ✅ Verify role-based access (each user sees only their modules)
- ✅ Navigate to assigned screens
- ✅ Test basic UI responsiveness

**Afternoon (3 hours)**
- ✅ **Sales User**: Create 2-3 normal sales (draft)
- ✅ **Sales User**: Finalize 1 sale
- ✅ **Admin**: Verify sale appears in dashboard
- ✅ **Admin**: Check stock deduction

**Success Criteria**:
- All users can login
- Role-based access works
- Sales creation works
- Stock deduction is correct

---

### Day 2: Production Workflow

**Morning (2 hours)**
- ✅ **Sales User**: Create 1 studio sale (product with `requires_production = true`)
- ✅ **Admin**: Verify production order auto-created
- ✅ **Admin**: Verify default production steps created (Dyeing, Handwork, Stitching)

**Afternoon (3 hours)**
- ✅ **Production Worker**: Login to mobile app
- ✅ **Production Worker**: View assigned steps
- ✅ **Production Worker**: Update step quantity (e.g., Dyeing: 100 units)
- ✅ **Production Worker**: Update completed quantity (e.g., 40 units)
- ✅ **Admin**: Verify step status auto-updated to `in_progress`

**Success Criteria**:
- Studio sale creates production order automatically
- Production steps are visible to worker
- Quantity updates work
- Status transitions are correct

---

### Day 3: Production Completion Flow

**Morning (2 hours)**
- ✅ **Production Worker**: Complete Dyeing step (set completed_qty = step_qty)
- ✅ **Admin**: Verify step status = `completed`
- ✅ **Admin**: Verify `completed_at` timestamp is set

**Afternoon (3 hours)**
- ✅ **Production Worker**: Complete Handwork step
- ✅ **Production Worker**: Complete Stitching step
- ✅ **Admin**: Verify production order status = `completed` (when all steps done)
- ✅ **Admin**: Verify studio dashboard counts updated

**Success Criteria**:
- Steps can be completed correctly
- Production order auto-completes when all steps done
- Dashboard counts are accurate

---

### Day 4: Costing & Accounting Integration

**Morning (2 hours)**
- ✅ **Admin**: Enter cost for Dyeing step (e.g., Rs. 5,000)
- ✅ **Admin**: Enter cost for Handwork step (e.g., Rs. 3,000)
- ✅ **Admin**: Enter cost for Stitching step (e.g., Rs. 2,000)

**Afternoon (3 hours)**
- ✅ **Admin**: Complete a production step (with cost > 0)
- ✅ **Admin**: Verify expense entry auto-created in accounting
- ✅ **Admin**: Verify expense category = "Production Cost"
- ✅ **Admin**: Verify production order `total_cost` = sum of all step costs

**Success Criteria**:
- Cost entry works
- Expense auto-creation works
- Cost rollup is correct

---

### Day 5: WhatsApp Integration (If Configured)

**Morning (2 hours)**
- ✅ **Admin**: Configure WhatsApp webhook (if not done)
- ✅ **Admin**: Test inbound message (order inquiry)
- ✅ **Admin**: Verify lead created

**Afternoon (3 hours)**
- ✅ **Sales User**: Handle WhatsApp order (create draft sale)
- ✅ **Sales User**: Finalize WhatsApp-origin sale
- ✅ **Admin**: Verify WhatsApp notification sent (if configured)

**Success Criteria**:
- WhatsApp webhook works
- Lead creation works
- Sale creation from WhatsApp works
- Notifications are sent

---

### Day 6: Multi-Branch Operations

**Morning (2 hours)**
- ✅ **Admin**: Switch to Branch B
- ✅ **Sales User**: Create sale in Branch B
- ✅ **Admin**: Verify sale saved with correct `location_id`

**Afternoon (3 hours)**
- ✅ **Admin**: Switch back to Branch A
- ✅ **Admin**: Verify Branch B sale does NOT appear in Branch A
- ✅ **Admin**: Verify branch filtering works correctly

**Success Criteria**:
- Branch switching works
- Data isolation is correct
- Branch filtering is accurate

---

### Day 7: Reports & Analytics

**Morning (2 hours)**
- ✅ **Admin**: View sales reports
- ✅ **Admin**: View production cost reports
- ✅ **Admin**: View studio dashboard counts

**Afternoon (3 hours)**
- ✅ **Admin**: Verify report accuracy (compare with manual records)
- ✅ **Admin**: Test date range filters
- ✅ **Admin**: Test branch filters

**Success Criteria**:
- Reports are accurate
- Filters work correctly
- Data matches manual records

---

### Day 8-10: Normal Operations

**Daily Activities** (Repeat for 3 days):
- ✅ **Sales User**: Create 5-10 sales per day (mix of normal & studio)
- ✅ **Production Worker**: Update 3-5 production steps per day
- ✅ **Admin**: Monitor dashboard daily
- ✅ **Admin**: Check for errors/exceptions
- ✅ **Admin**: Verify data integrity

**Success Criteria**:
- System handles daily load
- No critical errors
- Data remains consistent
- Users comfortable with workflow

---

## Success Criteria (Overall)

### Technical
- ✅ All core workflows function correctly
- ✅ No critical bugs or errors
- ✅ Performance is acceptable
- ✅ Data integrity maintained

### User Experience
- ✅ Users can complete tasks without confusion
- ✅ Mobile app is responsive
- ✅ Web app is stable
- ✅ Error messages are clear

### Business Logic
- ✅ Stock deduction is accurate
- ✅ Production workflow is correct
- ✅ Cost tracking is accurate
- ✅ Branch isolation works

---

## Common Failure Points to Watch

### 1. Authentication Issues
- **Symptom**: Users cannot login
- **Check**: Token expiry, role assignment, business_id
- **Fix**: Verify user_profiles table, check auth middleware

### 2. Branch Context Issues
- **Symptom**: Data appearing in wrong branch
- **Check**: `activeBranchId` in localStorage, `location_id` in API calls
- **Fix**: Verify BranchContextV2, check API payloads

### 3. Production Order Not Created
- **Symptom**: Studio sale does not create production order
- **Check**: `requires_production` flag on product, sale status = 'final'
- **Fix**: Verify product flags, check sale creation flow

### 4. Step Status Not Updating
- **Symptom**: Step status remains 'pending' after quantity update
- **Check**: Database triggers, status transition rules
- **Fix**: Verify trigger `trg_validate_production_step_status`

### 5. Cost Not Reflecting in Accounting
- **Symptom**: Production cost not creating expense
- **Check**: Step cost > 0, step status = 'completed', expense category exists
- **Fix**: Verify expense creation trigger, check expense_categories table

### 6. WhatsApp Notifications Not Sending
- **Symptom**: No WhatsApp messages sent
- **Check**: WhatsApp webhook configured, event listeners active
- **Fix**: Verify socialMediaService initialization, check webhook URL

---

## Pilot Run Checklist

### Pre-Pilot Setup
- [ ] All users have accounts created
- [ ] All users have correct roles assigned
- [ ] Mobile app installed on worker devices
- [ ] WhatsApp webhook configured (if applicable)
- [ ] Test data cleaned (if needed)
- [ ] Backup of current data taken

### Daily Checklist (Days 1-7)
- [ ] All users can login
- [ ] No critical errors in logs
- [ ] Data integrity verified
- [ ] User feedback collected
- [ ] Issues documented

### Final Checklist (Day 10)
- [ ] All workflows tested successfully
- [ ] No blocking issues
- [ ] User training completed
- [ ] Go-Live plan reviewed
- [ ] Backup strategy confirmed

---

## Pilot Run Report Template

**Date**: _______________  
**Day**: _______________

**Activities Completed**:
- [ ] Sales: _____ created
- [ ] Production Steps: _____ updated
- [ ] Production Orders: _____ completed
- [ ] Costs Entered: _____ steps
- [ ] WhatsApp Orders: _____ handled

**Issues Found**:
1. ________________________________
2. ________________________________
3. ________________________________

**User Feedback**:
- Production Worker: ________________________________
- Sales User: ________________________________
- Admin: ________________________________

**Status**: ✅ Ready for Go-Live / ❌ Needs Fix

---

## Next Steps After Pilot

1. **If Pilot Successful**:
   - Proceed to Go-Live (see `FINAL_PHASE_GO_LIVE_PLAN.md`)

2. **If Issues Found**:
   - Document issues
   - Fix critical issues
   - Re-run pilot for affected workflows

3. **If Major Problems**:
   - Pause pilot
   - Review system architecture
   - Fix root causes
   - Restart pilot

---

**Status**: ✅ **Pilot Run Plan Ready**  
**Next**: Begin Pilot Run → Complete Training → Go-Live

---

**Last Updated**: January 8, 2026
