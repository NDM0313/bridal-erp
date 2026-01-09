# Final Phase: Data Discipline Rules

**Date**: January 8, 2026  
**Status**: ✅ **RULES DEFINED**  
**Purpose**: Ensure data integrity and system reliability

---

## Overview

These rules define **what users MUST do**, **what they MUST NEVER do**, and **how to correct mistakes safely**.

**Goal**: Maintain data accuracy and system reliability in daily operations.

---

## Daily Must-Do Rules

### For Production Workers

**✅ MUST DO DAILY**:
1. **Login at start of workday**
   - Verify you see your assigned steps
   - If no steps, contact admin

2. **Update quantity as you work**
   - Don't wait until end of day
   - Update every 2-3 hours or when significant progress made

3. **Mark step as "in_progress" when you start**
   - Don't leave steps in "pending" if you're working on them

4. **Complete step only when 100% done**
   - Verify completed quantity = step quantity
   - Don't mark as completed if work is incomplete

5. **Logout at end of workday**
   - Prevents unauthorized access

---

### For Sales Users

**✅ MUST DO DAILY**:
1. **Select correct branch before creating sale**
   - Verify branch name in header
   - Don't create sale in wrong branch

2. **Finalize sales immediately**
   - Don't keep too many draft sales
   - Finalize within same day

3. **Verify product quantities before finalizing**
   - Check stock availability
   - Confirm customer wants that quantity

4. **Select correct customer (if applicable)**
   - Link sale to customer for proper tracking
   - Use "Walk-in Customer" if no customer

5. **Review sales list at end of day**
   - Verify all sales are finalized
   - Check for any errors

---

### For Admin/Manager

**✅ MUST DO DAILY**:
1. **Monitor dashboard every morning**
   - Check overnight sales
   - Review production progress
   - Identify any issues

2. **Enter production costs promptly**
   - Enter cost when step is completed
   - Don't delay cost entry

3. **Verify data accuracy**
   - Compare system data with manual records (first 2 weeks)
   - Check for discrepancies

4. **Review error logs**
   - Check for system errors
   - Address user issues

5. **Backup verification (weekly)**
   - Verify backups are running
   - Test restore process (monthly)

---

## Must-Never-Do Rules

### For Production Workers

**❌ MUST NEVER DO**:
1. **Don't update other workers' steps**
   - Only update steps assigned to you
   - If you see someone else's step, contact admin

2. **Don't enter quantity more than step quantity**
   - System will reject it
   - If step quantity is wrong, contact admin

3. **Don't mark step as completed if not 100% done**
   - This affects production order completion
   - This affects cost calculations

4. **Don't delete or modify completed steps**
   - Completed steps are locked
   - If correction needed, contact admin

5. **Don't share login credentials**
   - Each worker must have own account
   - Security risk if shared

---

### For Sales Users

**❌ MUST NEVER DO**:
1. **Don't create sale in wrong branch**
   - Always verify branch selection
   - Wrong branch = wrong inventory tracking

2. **Don't finalize sale without verifying stock**
   - Check stock availability first
   - System will reject if insufficient stock

3. **Don't delete finalized sales**
   - Finalized sales are locked
   - If correction needed, create credit note (future feature)

4. **Don't create duplicate sales**
   - Check if sale already exists
   - Don't create same sale twice

5. **Don't modify sale after finalization**
   - Finalized sales cannot be edited
   - If correction needed, contact admin

---

### For Admin/Manager

**❌ MUST NEVER DO**:
1. **Don't delete finalized sales**
   - Affects accounting records
   - Affects inventory
   - Use proper cancellation process (future feature)

2. **Don't modify production steps directly in database**
   - Use system UI only
   - Direct DB changes break data integrity

3. **Don't change user roles without reason**
   - Affects permissions
   - May break workflows
   - Document reason for role change

4. **Don't ignore error messages**
   - Errors indicate problems
   - Address errors promptly

5. **Don't disable RLS (Row Level Security)**
   - Security risk
   - Breaks multi-tenant isolation

---

## How to Correct Mistakes Safely

### Mistake: Wrong Quantity in Production Step

**If caught BEFORE step is completed**:
1. Production Worker: Update quantity to correct value
2. Admin: Verify correction

**If caught AFTER step is completed**:
1. Contact admin
2. Admin: Create new step with correct quantity (if needed)
3. Admin: Adjust cost if needed

**Never**: Don't try to "undo" completed step

---

### Mistake: Sale Created in Wrong Branch

**If caught BEFORE sale is finalized**:
1. Sales User: Delete draft sale
2. Sales User: Select correct branch
3. Sales User: Create sale again

**If caught AFTER sale is finalized**:
1. Contact admin immediately
2. Admin: Create transfer entry (if stock needs to move)
3. Admin: Document correction in notes

**Never**: Don't try to change branch of finalized sale

---

### Mistake: Wrong Product in Sale

**If caught BEFORE sale is finalized**:
1. Sales User: Delete draft sale
2. Sales User: Create sale with correct product

**If caught AFTER sale is finalized**:
1. Contact admin
2. Admin: Create credit note (future feature) or manual adjustment
3. Admin: Document correction

**Never**: Don't try to edit finalized sale

---

### Mistake: Wrong Cost Entered

**If caught BEFORE step is completed**:
1. Admin: Update cost to correct value
2. System will use correct cost when step completes

**If caught AFTER step is completed**:
1. Admin: Create manual expense adjustment
2. Admin: Document correction
3. Admin: Update production order total_cost if needed

**Never**: Don't try to delete auto-created expense

---

### Mistake: Step Marked as Completed by Mistake

**If caught immediately**:
1. Contact admin
2. Admin: Revert step status (if possible)
3. Admin: Verify data integrity

**If caught later**:
1. Contact admin
2. Admin: Create new step for remaining work
3. Admin: Document correction

**Never**: Don't try to "undo" completed step yourself

---

## Who Can Override What

### Production Worker
- **Can Override**: Nothing (no override permissions)
- **Cannot Override**: Step assignments, costs, production orders

---

### Sales User
- **Can Override**: Draft sale deletion (own sales only)
- **Cannot Override**: Finalized sales, stock levels, branch assignments

---

### Admin/Manager
- **Can Override**: 
  - Production step assignments
  - Production step costs
  - User roles (with documentation)
  - Branch assignments
  - Manual data corrections (with documentation)

- **Cannot Override**:
  - RLS policies (security)
  - Database constraints (data integrity)
  - Completed production steps (without proper process)
  - Finalized sales (without proper cancellation process)

---

## Data Correction Process

### Step 1: Identify Mistake
- User identifies mistake
- User documents what happened
- User contacts admin

### Step 2: Assess Impact
- Admin checks:
  - What data is affected?
  - What downstream effects?
  - What is the correct value?

### Step 3: Plan Correction
- Admin plans correction method
- Admin verifies correction won't break data integrity
- Admin documents correction plan

### Step 4: Execute Correction
- Admin executes correction
- Admin verifies correction worked
- Admin documents correction in system notes

### Step 5: Verify & Monitor
- Admin verifies data is correct
- Admin monitors for 24-48 hours
- Admin confirms no side effects

---

## Data Backup & Recovery

### Daily Backups
- **Automatic**: System backs up daily (if configured)
- **Manual**: Admin can trigger backup anytime

### Recovery Process
1. Identify what data needs recovery
2. Contact system administrator
3. Restore from backup
4. Verify restored data
5. Document recovery process

---

## Data Retention Rules

### Sales Data
- **Retain**: Forever (business records)
- **Delete**: Never (unless legal requirement)

### Production Data
- **Retain**: Forever (cost tracking)
- **Delete**: Never

### User Activity Logs
- **Retain**: 1 year minimum
- **Delete**: After retention period (if needed)

---

## Compliance & Audit

### Audit Trail
- All data changes are logged
- Admin can view audit logs
- Audit logs cannot be deleted

### Compliance
- Follow local business regulations
- Maintain proper records
- Document all corrections

---

## Emergency Procedures

### If System is Down
1. **Stop creating new data** (if possible)
2. **Document what you were doing**
3. **Contact admin immediately**
4. **Wait for system recovery**
5. **Resume work after system is back**

### If Data is Corrupted
1. **Stop all operations**
2. **Contact admin immediately**
3. **Do NOT try to fix yourself**
4. **Wait for admin to restore from backup**

### If Unauthorized Access Suspected
1. **Change password immediately**
2. **Contact admin**
3. **Review recent activity**
4. **Report incident**

---

## Summary

**✅ DO**:
- Follow daily must-do rules
- Correct mistakes using proper process
- Contact admin for help
- Document corrections

**❌ DON'T**:
- Don't violate must-never-do rules
- Don't try to fix mistakes yourself (if unsure)
- Don't ignore errors
- Don't share credentials

---

**Status**: ✅ **Data Discipline Rules Defined**  
**Next**: Review with users → Enforce rules → Monitor compliance

---

**Last Updated**: January 8, 2026
