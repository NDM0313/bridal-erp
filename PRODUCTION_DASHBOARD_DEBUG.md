# Production Dashboard - Enhanced Debugging

**Date**: January 2026  
**Issue**: Empty error objects in console  
**Status**: ✅ **Enhanced Debugging Added**

---

## 🔍 DEBUGGING IMPROVEMENTS

### 1. **Better Error Serialization**

```typescript
// BEFORE
console.error('Sales query error:', salesError);
// Output: {}

// AFTER
console.error('Sales query error:', {
  message: salesError.message,
  code: salesError.code,
  details: salesError.details,
  hint: salesError.hint,
  raw: JSON.stringify(salesError, Object.getOwnPropertyNames(salesError)),
});
// Output: Full error details
```

**Why**: Error objects don't serialize properly with default console.error. Using `JSON.stringify` with `Object.getOwnPropertyNames` shows all properties.

---

### 2. **Step-by-Step Logging**

Added console logs at every step:

```typescript
console.log('No session found');                           // Auth check
console.log('No profile found');                           // Profile check
console.log('Fetching orders for business:', business_id); // Business context
console.log('Fetching production orders...');              // Production orders
console.log('Production orders loaded:', count);           // Success count
console.log('Fetching transactions for setup...');         // Sales query
console.log('Transactions loaded:', count);                // Sales count
console.log('Existing production order transaction IDs:'); // Filtering
console.log('Skipping sale (has production order):', id);  // Skip reason
console.log('Sale has no items:', id);                     // Skip reason
console.log('Found sale requiring production:', id);       // Match found
console.log('Sale does not require production:', id);      // No match
console.log('Pending setup sales:', count);                // Final result
```

**Why**: Helps identify exactly where the process succeeds or fails.

---

### 3. **Removed Problematic Join**

```typescript
// BEFORE - Might fail if RLS blocks join
.select(`
  id,
  invoice_no,
  transaction_date,
  contact:contacts(name)  // ❌ Join might fail
`)

// AFTER - Separate queries
.select(`
  id,
  invoice_no,
  transaction_date,
  contact_id  // ✅ Just get the ID
`)

// Then fetch contacts separately
const { data: contacts } = await supabase
  .from('contacts')
  .select('id, name')
  .in('id', contactIds);
```

**Why**: Supabase joins can fail if RLS policies don't allow the related table access. Separate queries are more reliable.

---

### 4. **Profile Error Handling**

```typescript
// BEFORE
const { data: profile } = await supabase
  .from('user_profiles')
  .select('business_id')
  .eq('user_id', session.user.id)
  .single();

if (!profile) return;  // Silent failure

// AFTER
const { data: profile, error: profileError } = await supabase
  .from('user_profiles')
  .select('business_id')
  .eq('user_id', session.user.id)
  .single();

if (profileError) {
  console.error('Profile error:', profileError);
  throw profileError;
}

if (!profile) {
  console.log('No profile found');
  return;
}
```

**Why**: Profile errors should be logged and thrown, not silently ignored.

---

## 📊 WHAT YOU'LL SEE IN CONSOLE

### Successful Load:
```
Fetching orders for business: 1
Fetching production orders...
Production orders loaded: 5
Fetching transactions for setup...
Transactions loaded: 10
Existing production order transaction IDs: [1, 2, 3]
Skipping sale (has production order): 1
Skipping sale (has production order): 2
Skipping sale (has production order): 3
Sale has no items: 4
Found sale requiring production: 5 INV-005
Sale does not require production: 6
Pending setup sales: 1
```

### Error Case:
```
Fetching orders for business: 1
Fetching production orders...
Sales query error: {
  message: "relation \"sales\" does not exist",
  code: "42P01",
  details: null,
  hint: null,
  raw: "{\"message\":\"relation does not exist\",\"code\":\"42P01\"}"
}
Failed to load orders: {
  message: "relation \"sales\" does not exist",
  code: "42P01",
  ...
}
```

---

## 🎯 HOW TO DEBUG

### Step 1: Check Console
Open browser console and look for:
1. **Session check**: "No session found" or business ID
2. **Profile check**: "No profile found" or profile error
3. **Query results**: How many records loaded
4. **Error details**: Full error message with code

### Step 2: Identify Issue
Based on console output:

| Console Message | Issue | Solution |
|----------------|-------|----------|
| "No session found" | Not logged in | Log in first |
| "Profile error: ..." | RLS policy issue | Check user_profiles RLS |
| "Sales query error: code 42P01" | Table doesn't exist | Check table name |
| "Sales query error: code 42501" | Permission denied | Check RLS policies |
| "Transactions loaded: 0" | No sales data | Create some sales first |
| "Pending setup sales: 0" | No production sales | Mark products with `requires_production = true` |

### Step 3: Fix
Apply appropriate solution based on identified issue.

---

## ✅ VERIFICATION

After changes, you should see:
- [x] No more empty error objects `{}`
- [x] Clear console logs showing progress
- [x] Actual error messages with codes
- [x] Step-by-step execution flow visible
- [x] Easy to identify where failure occurs

---

**Now check console for detailed logs!** 🔍
