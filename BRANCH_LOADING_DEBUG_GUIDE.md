# 🔧 Branch Loading Debug Guide

## ✅ Fixes Applied

1. **Type Mismatch Fixed** ✅
   - `BranchSelectorV2.tsx`: Updated `handleSelectBranch` to accept `number | 'ALL'`
   
2. **Enhanced Debugging Logs** ✅
   - Added detailed console logs in `BranchContextV2.tsx`
   - Both real mode and demo mode have comprehensive logging

---

## 🔍 Diagnostic Steps

### Step 1: Clear Cache & Reload (CRITICAL) 🚨

```javascript
// Open browser console (F12) and run:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

**Why?** Old cached branch data might be causing conflicts.

---

### Step 2: Check Console Logs 📊

After reload, browser console me ye logs dikhne chahiye:

#### **Expected Logs (Success Case):**
```
[timestamp] 🔄 loadBranches: START
[timestamp] 👤 Current business_id: 1
[timestamp] ✅ Loaded 3 branches from database (business_id: 1)
[timestamp] 📦 savedBranchId from localStorage: null (or a number)
[timestamp] 📊 Total branches (with ALL): 4
[timestamp] 🔍 Found saved branch: Main Branch (or NOT FOUND)
[timestamp] 🔄 Using fallback branch: Main Branch
[timestamp] ✅ Active branch set: Main Branch (ID: 1, business_id: 1)
[timestamp] 🔄 loadBranches: END
```

#### **Problem Indicators:**
- ❌ `No session found` → Login issue
- ❌ `No profile found` → User profile missing
- ❌ `No branches found` → Database has no branches for this business
- ❌ `Failed to load branches` → Database connection error
- ❌ Logs stop abruptly → JavaScript error (check console for red errors)

---

### Step 3: Verify Database Connection 🗄️

```sql
-- Run this in Supabase SQL Editor or psql:
SELECT id, business_id, name, custom_field1 as code 
FROM business_locations 
WHERE business_id = 1 AND deleted_at IS NULL;
```

**Expected:** 3 rows (Main Branch, City Outlet, Warehouse)

---

### Step 4: Check Network Tab 🌐

1. Open browser DevTools (F12)
2. Go to "Network" tab
3. Reload page
4. Look for request to `business_locations`
5. Check response:
   - ✅ Status: 200 OK
   - ✅ Response has data array with 3 items
   - ❌ Status: 401/403 → Auth issue
   - ❌ Status: 500 → Server error

---

## 🐛 Common Issues & Fixes

### Issue 1: "Loading..." Never Disappears ⏳

**Cause:** `loading` state never set to `false`

**Debug:**
```javascript
// In console, after page loads:
const ctx = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
// Check if BranchContext is mounted and what its state is
```

**Fix:** Check console logs for errors that prevent `setLoading(false)` from running

---

### Issue 2: "No session found" in Console 🚫

**Cause:** User not logged in or session expired

**Fix:**
1. Go to `/login`
2. Login again with demo account
3. Return to dashboard

---

### Issue 3: Branches Load but "Loading..." Still Shows 🤔

**Cause:** `activeBranch` is `null` even after branches load

**Debug:** Check console log:
```
✅ Active branch set: [BRANCH_NAME]
```

If this log is missing, the branch setting logic failed.

**Fix:** Check if `branchesWithAll` array has items:
```javascript
// Should see in console:
📊 Total branches (with ALL): 4
```

If it shows 0 or 1, database query returned no branches.

---

### Issue 4: TypeError in Console 🛑

**Cause:** JavaScript runtime error

**Fix:**
1. Read the full error message in console
2. Look for file name and line number
3. Check if it's related to:
   - Type mismatch (`number` vs `'ALL'`)
   - Null/undefined access
   - Missing property

---

## 🚀 Quick Fix Checklist

Run through these in order:

- [ ] **Step 1:** Clear cache + reload (localStorage.clear())
- [ ] **Step 2:** Check console for errors (red text)
- [ ] **Step 3:** Verify login status (go to /login if needed)
- [ ] **Step 4:** Check network tab for failed requests
- [ ] **Step 5:** Verify database has branches (SQL query)
- [ ] **Step 6:** Check console logs match expected pattern

---

## 📝 Report Template

If issue persists, provide this info:

```
1. Console Logs:
   [Paste relevant console logs here]

2. Network Errors:
   [Any failed requests? Status codes?]

3. Database Query Result:
   [Output of SELECT from business_locations]

4. Browser:
   [Chrome/Firefox/etc., Version]

5. Current URL:
   [e.g., http://localhost:3000/dashboard]

6. Last Action:
   [What did you do before seeing "Loading..."?]
```

---

## ✅ Expected Behavior After Fix

1. **Initial Load:**
   - Branch selector shows "Loading..." for < 1 second
   - Then shows "Main Branch" (default)

2. **Click Branch Selector:**
   - Dropdown opens instantly
   - Shows: 🌐 All Locations, Main Branch, City Outlet, Warehouse

3. **Select Different Branch:**
   - Dropdown closes
   - Branch name updates in selector
   - Page refreshes (expected - this ensures data consistency)

4. **Reload Page:**
   - Selected branch persists (loaded from localStorage)
   - No "Loading..." stuck

---

## 🎯 Final Verification

Run this in console after "successful load":

```javascript
// Check branch context state
console.log('Active Branch:', localStorage.getItem('active_branch_id_v2'));
console.log('Cached Branches:', localStorage.getItem('branches_cache_v2'));

// Should show:
// Active Branch: "1" (or another number)
// Cached Branches: [array of branch objects]
```

---

**If still stuck, run all diagnostic steps and provide console output!** 🔍
