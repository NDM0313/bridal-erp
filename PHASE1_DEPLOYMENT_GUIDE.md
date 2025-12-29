# Phase 1 Deployment Guide

## 🎯 QUICK START

**Goal**: Deploy SaaS foundation without breaking existing tenants  
**Time**: ~15 minutes  
**Risk**: Low (all changes backward compatible)

---

## 📋 PRE-DEPLOYMENT CHECKLIST

- [ ] Database backup created
- [ ] Staging environment tested (if available)
- [ ] Team notified of deployment
- [ ] Rollback plan reviewed
- [ ] Verification queries ready

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Backup Database

**Supabase Dashboard**:
1. Go to Database → Backups
2. Click "Create Backup"
3. Wait for backup to complete

**Or via SQL**:
```sql
-- Note: Supabase handles backups automatically
-- This is just for manual verification
SELECT pg_dump('your_database');
```

---

### Step 2: Deploy Schema

**Supabase SQL Editor**:
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `database/PHASE1_SAAS_FOUNDATION.sql`
3. Paste and run
4. Verify no errors

**Expected Output**:
- ✅ Tables created
- ✅ Columns added
- ✅ Functions created
- ✅ RLS policies created

---

### Step 3: Verify Deployment

**Run Verification Queries**:
1. Open `database/PHASE1_VERIFICATION.sql`
2. Run all queries
3. All should show ✅

**Key Checks**:
- ✅ Tables exist
- ✅ organization_id column added (nullable)
- ✅ Functions created
- ✅ RLS enabled
- ✅ Existing businesses unaffected

---

### Step 4: Deploy Backend Changes

**Local Testing**:
```bash
cd backend
npm install  # If new dependencies
npm run dev
```

**Verify**:
- ✅ Server starts without errors
- ✅ Auth middleware works
- ✅ Feature guard middleware works

**Production Deployment**:
- Deploy backend as usual (Railway, Vercel, etc.)
- No environment variable changes needed

---

### Step 5: Test Existing Flows

**Manual Testing**:
1. Login as existing user
2. List products → Should work
3. Create sale → Should work
4. View reports → Should work
5. Adjust stock → Should work

**Expected**: All existing flows work unchanged

---

## ✅ VERIFICATION CHECKLIST

### Database
- [ ] organizations table exists
- [ ] organization_users table exists
- [ ] feature_definitions table exists
- [ ] organization_features table exists
- [ ] businesses.organization_id column exists (nullable)
- [ ] get_user_business_id() function updated
- [ ] get_user_organization_id() function created
- [ ] RLS enabled on new tables

### Backend
- [ ] Server starts without errors
- [ ] Auth middleware extracts organizationId
- [ ] Auth middleware falls back to businessId (legacy)
- [ ] Feature guard middleware works
- [ ] Existing API endpoints work

### Functionality
- [ ] Existing users can login
- [ ] Products list works
- [ ] Sales create works
- [ ] Reports work
- [ ] Stock operations work

---

## 🚨 TROUBLESHOOTING

### Issue: Existing users cannot access data

**Cause**: RLS policy issue  
**Fix**: Verify `get_user_business_id()` returns correct value

**Check**:
```sql
-- Test function with actual user_id
SELECT get_user_business_id();
-- Should return business_id for authenticated user
```

---

### Issue: Backend fails to start

**Cause**: Import error or syntax error  
**Fix**: Check console logs, verify imports

**Check**:
```bash
cd backend
npm run dev
# Check for errors
```

---

### Issue: Feature guard blocks all requests

**Cause**: Organization not found  
**Fix**: Verify user is in organization_users or user_profiles

**Check**:
```sql
-- Check user exists in either table
SELECT 'org' as type, user_id FROM organization_users
UNION ALL
SELECT 'legacy' as type, user_id FROM user_profiles;
```

---

## 🔄 ROLLBACK PROCEDURE

**If Critical Issues Occur**:

1. **Stop Deployment**: Don't proceed further
2. **Run Rollback**: Execute `database/PHASE1_ROLLBACK.sql`
3. **Verify**: Run verification queries
4. **Test**: Verify existing flows work
5. **Investigate**: Fix issues before re-deploying

**Rollback Command**:
```sql
-- In Supabase SQL Editor
\i database/PHASE1_ROLLBACK.sql
```

**Expected After Rollback**:
- ✅ System returns to pre-Phase 1 state
- ✅ All existing functionality works
- ✅ No data loss

---

## 📊 POST-DEPLOYMENT

### Monitor
- Error rates
- API response times
- User login success rate
- Database query performance

### Next Steps
- Phase 2: Data migration (create organizations for existing businesses)
- Phase 3: Subscription management
- Phase 4: Feature gating UI

---

## ✅ DEPLOYMENT COMPLETE

**Status**: Phase 1 foundation deployed  
**Safety**: ✅ Backward compatible  
**Next**: Phase 2 (data migration)

---

**Deployment guide complete!** ✅

