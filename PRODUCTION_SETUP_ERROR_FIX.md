# 🔧 Production Setup - Worker Add Error Fix

**Error:** "Failed to add vendor: {}"  
**Location:** Production Setup Screen → Quick Add Worker/Supplier  
**Date:** January 10, 2026  

---

## ✅ What Was Fixed

### 1. **Improved Error Handling**
**File:** `components/studio/ProductionSetupScreen.tsx`

**Changes:**
- ✅ Added detailed error logging
- ✅ Better error messages for users
- ✅ Specific handling for RLS errors
- ✅ Validation for session and profile
- ✅ Console logs for debugging

**Before:**
```typescript
catch (err: any) {
  console.error('Failed to add vendor:', err);
  toast.error(err.message || 'Failed to add vendor');
}
```

**After:**
```typescript
catch (err: any) {
  console.error('Failed to add vendor - Full error:', err);
  console.error('Error type:', typeof err);
  console.error('Error keys:', err ? Object.keys(err) : 'null');
  
  let errorMessage = 'Failed to add contact';
  
  // Detailed error handling for:
  // - RLS permission errors (42501)
  // - Duplicate entries (23505)
  // - Invalid references (23503)
  // - And more...
  
  toast.error(errorMessage);
}
```

---

## 🔍 Common Causes

### 1. **RLS Policy Blocking Insert**
**Symptoms:**
- Error code: `42501`
- Message: "row-level security policy"
- Empty error object `{}`

**Why it happens:**
- Database RLS (Row-Level Security) is blocking INSERT
- User doesn't have permission to add contacts
- Policy WITH CHECK condition is failing

### 2. **Missing User Profile**
**Symptoms:**
- "Profile not found" error
- "Business profile not found" error

**Why it happens:**
- No entry in `user_profiles` for current user
- No `business_id` assigned to user

### 3. **Authentication Issues**
**Symptoms:**
- "Not authenticated" error
- Session error

**Why it happens:**
- User session expired
- Not logged in
- Auth token invalid

---

## 🚀 How to Fix

### Option 1: Quick Fix - Run SQL Script

**Step 1:** Open Supabase SQL Editor

**Step 2:** Run this script:
```sql
-- File: database/FIX_CONTACTS_RLS_INSERT.sql

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Create INSERT policy
CREATE POLICY "contacts_insert_policy" ON contacts
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Grant permissions
GRANT INSERT ON contacts TO authenticated;
GRANT USAGE ON SEQUENCE contacts_id_seq TO authenticated;
```

**Step 3:** Refresh browser and try again

---

### Option 2: Check User Profile

**Step 1:** Run this query in Supabase SQL Editor:
```sql
-- Check if you have a user profile
SELECT 
  up.user_id,
  up.business_id,
  up.role,
  b.name as business_name
FROM user_profiles up
LEFT JOIN businesses b ON up.business_id = b.id
WHERE up.user_id = auth.uid();
```

**Step 2:** If no result, create user profile:
```sql
-- Replace YOUR_BUSINESS_ID with actual business ID
INSERT INTO user_profiles (user_id, business_id, role)
VALUES (auth.uid(), YOUR_BUSINESS_ID, 'admin');
```

---

### Option 3: Detailed Debugging

**Step 1:** Open Browser Console (F12)

**Step 2:** Try adding a worker again

**Step 3:** Check console logs:
```
User authenticated: [user_id]
Business ID: [business_id]
Creating contact with type: worker
Inserting contact: { business_id, name, mobile, type, created_by }
```

**Step 4:** Look for error details:
```
Insert error details: {
  message: "...",
  code: "42501",
  details: "...",
  hint: "..."
}
```

**Step 5:** Based on error code:

| Code | Issue | Fix |
|------|-------|-----|
| `42501` | RLS blocking | Run Option 1 SQL |
| `23505` | Duplicate entry | Contact already exists |
| `23503` | Invalid reference | Check business_id |
| `null` | No error returned | Check Supabase connection |

---

## 🧪 Test After Fix

### Test 1: Add Worker via Production Setup
```
1. Go to any sale's Production Setup
2. Enable a step (e.g., Stitching)
3. Click "+ Add New" in worker dropdown
4. Click "Worker" button (green)
5. Enter:
   - Name: "Test Worker"
   - Mobile: "03001234567"
6. Click "Add Worker"
7. ✅ Should see success toast
8. ✅ Worker should auto-select
9. ✅ Check Workers tab in Contacts
```

### Test 2: Check Console Logs
```
✅ Should see: "User authenticated: ..."
✅ Should see: "Business ID: ..."
✅ Should see: "Contact created successfully: ..."
✅ Should NOT see any error logs
```

---

## 📝 Verification Queries

### Query 1: Check RLS Policies
```sql
SELECT 
  policyname,
  cmd,
  permissive,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'contacts'
ORDER BY policyname;
```

**Expected:** Should show policies for SELECT, INSERT, UPDATE, DELETE

---

### Query 2: Check Your Business ID
```sql
SELECT 
  user_id,
  business_id,
  role
FROM user_profiles
WHERE user_id = auth.uid();
```

**Expected:** Should return one row with valid business_id

---

### Query 3: Test Manual Insert
```sql
-- Replace YOUR_BUSINESS_ID with actual business_id
INSERT INTO contacts (business_id, name, type, mobile, created_by)
VALUES 
  (YOUR_BUSINESS_ID, 'SQL Test Worker', 'worker', '03009999999', auth.uid())
RETURNING *;
```

**Expected:** Should insert successfully and return the new contact

---

## 🎯 Complete Fix Checklist

- [ ] Error handling improved (✅ Done automatically)
- [ ] Browser console checked for detailed errors
- [ ] RLS policies verified/created
- [ ] User profile exists with business_id
- [ ] Permissions granted to authenticated role
- [ ] Test worker addition successful
- [ ] Worker appears in Contacts → Workers tab
- [ ] Worker can be assigned in Production Setup

---

## 📁 Files Modified

| File | Changes |
|------|---------|
| `components/studio/ProductionSetupScreen.tsx` | ✅ Better error handling, detailed logging |
| `database/FIX_CONTACTS_RLS_INSERT.sql` | ✅ SQL script to fix RLS policies |

---

## 🔗 Related Documentation

- **RLS Fix Guide:** `database/FIX_CONTACTS_RLS_INSERT.sql`
- **Worker System Guide:** `WORKER_SYSTEM_COMPLETE.md`
- **Urdu Guide:** `WORKER_GUIDE_URDU.md`

---

## 🚨 Still Not Working?

### Check These:

1. **Supabase Connection**
   ```javascript
   // In browser console
   const { data, error } = await supabase.auth.getSession();
   console.log('Session:', data);
   console.log('Error:', error);
   ```

2. **Database Access**
   - Open Supabase Dashboard
   - Go to SQL Editor
   - Run: `SELECT * FROM contacts LIMIT 1;`
   - Should return data without errors

3. **Auth Token**
   - Logout and login again
   - Clear browser cache
   - Try incognito mode

4. **Network Issues**
   - Check browser Network tab (F12)
   - Look for failed requests to Supabase
   - Check response status codes

---

## 📞 Support

**Error still happening?**

1. Share the **complete error** from browser console
2. Run the **verification queries** above
3. Check if you can add contacts from **Contacts page** (not Production Setup)
4. If Contacts page works but Production Setup doesn't, there's a specific issue

**Working on Contacts page but not Production Setup?**
- Issue is likely in Production Setup component
- Check the console logs for Production Setup
- Verify `newVendor` state has correct values

---

**Last Updated:** January 10, 2026  
**Status:** ✅ Error handling improved, SQL fix provided  
**Next:** Run SQL script and test again
