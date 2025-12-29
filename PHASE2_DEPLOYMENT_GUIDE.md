# Phase 2 Deployment Guide

## 🎯 QUICK START

**Goal**: Migrate existing businesses to organizations  
**Time**: ~30 minutes  
**Risk**: Low (transactional, rollback ready)

---

## 📋 PRE-DEPLOYMENT CHECKLIST

- [ ] Phase 1 foundation deployed
- [ ] Database backup created
- [ ] Staging migration tested
- [ ] Rollback plan reviewed
- [ ] Team notified
- [ ] Low traffic window scheduled

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Pre-Migration Verification

**Supabase SQL Editor**:
1. Open `database/PHASE2_DATA_MIGRATION.sql`
2. Run pre-migration checks (first section)
3. Review output for warnings

**Expected Output**:
```
Pre-migration check:
Total businesses: X
Businesses with org: 0
Legacy businesses to migrate: X
```

**If warnings appear**: Review and fix before proceeding

---

### Step 2: Execute Migration

**Supabase SQL Editor**:
1. Run full `PHASE2_DATA_MIGRATION.sql`
2. Migration runs in transaction (all-or-nothing)
3. Review output for success messages

**Expected Output**:
```
Organizations created: X
Businesses linked to organizations: X
Users migrated to organization_users: X
✅ MIGRATION SUCCESSFUL
```

**If errors occur**: Transaction rolls back automatically

---

### Step 3: Post-Migration Verification

**Run Verification Queries**:
1. Open `database/PHASE2_VERIFICATION.sql`
2. Run all queries
3. All should show ✅

**Key Checks**:
- ✅ All businesses have organizations
- ✅ All users migrated
- ✅ Organization isolation correct
- ✅ Role mapping correct
- ✅ No orphaned data

---

### Step 4: Application Testing

**Manual Testing**:
1. Login as existing user
2. List products → Should work
3. Create sale → Should work
4. View reports → Should work
5. Adjust stock → Should work

**Expected**: All existing flows work unchanged

---

### Step 5: RLS Isolation Test

**Test Organization Isolation**:
1. Login as User A (Org 1)
2. Try to access Org 2's data → Should be blocked
3. Verify only own organization's data visible

**Expected**: RLS enforces organization-level isolation

---

### Step 6: Deploy Backend Changes

**Backend Update**:
- ✅ Already updated in Phase 1
- ✅ Prefers organization mode
- ✅ Falls back to legacy mode

**No additional deployment needed** (changes already in place)

---

## ✅ VERIFICATION CHECKLIST

### Database
- [ ] All businesses have organization_id
- [ ] All users in organization_users
- [ ] Organizations created correctly
- [ ] Role mapping correct
- [ ] No orphaned data
- [ ] No duplicates

### Application
- [ ] Users can login
- [ ] Products list works
- [ ] Sales create works
- [ ] Reports work
- [ ] Stock operations work

### Security
- [ ] RLS enforces organization isolation
- [ ] Cross-organization access blocked
- [ ] Legacy users still work
- [ ] No security regressions

---

## 🚨 TROUBLESHOOTING

### Issue: Users Cannot Login

**Cause**: Migration incomplete or user not migrated  
**Fix**: Check organization_users table

**Check**:
```sql
-- Check if user exists in organization_users
SELECT * FROM organization_users WHERE user_id = 'USER_UUID';
```

---

### Issue: Users See No Data

**Cause**: RLS policy issue or organization_id mismatch  
**Fix**: Verify get_user_business_id() returns correct value

**Check**:
```sql
-- Test function (as authenticated user)
SELECT get_user_business_id();
SELECT get_user_organization_id();
```

---

### Issue: Duplicate Users

**Cause**: User in both organization_users and user_profiles  
**Fix**: System handles this (prefers organization_users)

**Check**:
```sql
-- Find duplicates
SELECT user_id, COUNT(*) 
FROM organization_users 
GROUP BY user_id 
HAVING COUNT(*) > 1;
```

---

## 🔄 ROLLBACK PROCEDURE

**If Critical Issues Occur**:

1. **Stop Operations**: Don't proceed further
2. **Run Rollback**: Execute `database/PHASE2_ROLLBACK.sql`
3. **Verify**: Run verification queries
4. **Test**: Verify existing flows work
5. **Investigate**: Fix issues before re-migrating

**Rollback Command**:
```sql
-- In Supabase SQL Editor
\i database/PHASE2_ROLLBACK.sql
```

**Expected After Rollback**:
- ✅ System returns to Phase 1 dual-mode state
- ✅ All businesses have organization_id = NULL
- ✅ Users access via user_profiles (legacy mode)
- ✅ Organizations preserved (audit trail)

---

## 📊 POST-DEPLOYMENT

### Monitor
- Error rates
- Login success rate
- API response times
- Database query performance
- User complaints

### Metrics to Track
- Organizations created
- Businesses migrated
- Users migrated
- Migration success rate

### Next Steps
- Phase 3: Subscription management
- Phase 4: Feature gating UI
- Phase 5: White-label features

---

## ✅ DEPLOYMENT COMPLETE

**Status**: Phase 2 migration complete  
**Safety**: ✅ Zero downtime, no data loss  
**Next**: Phase 3 (subscription management)

---

**Deployment guide complete!** ✅

