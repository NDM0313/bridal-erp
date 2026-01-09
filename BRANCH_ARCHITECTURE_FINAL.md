# 🏗️ BRANCH ARCHITECTURE - FINAL DECISION

## ✅ OFFICIAL ARCHITECTURAL DECISION

**`business_locations` is the single source of truth for branches.**

**The `branches` table is deprecated and should not be used.**

---

## 📊 VERIFICATION RESULTS

### ✅ `business_locations` (ACTIVE - 16 files)
- `lib/context/BranchContextV2.tsx` - Loads branches
- `app/settings/branches/page.tsx` - CRUD operations
- `lib/hooks/useSales.ts` - Filters by `location_id`
- `lib/hooks/usePurchases.ts` - Filters by `location_id`
- `lib/hooks/useInventory.ts` - Filters by `location_id`
- `components/dashboard/ModernPOS.tsx` - Uses `location_id`
- `components/dashboard/ModernProductList.tsx` - Uses `location_id`
- `components/dashboard/ModernDashboardHome.tsx` - Uses `location_id`
- `components/sales/AddSaleModal.tsx` - Uses `location_id`
- `components/purchases/AddPurchaseModal.tsx` - Uses `location_id`
- Plus 6 more files...

### ❌ `branches` Table (ORPHANED - 0 files)
- **Zero references** in entire codebase
- **No foreign keys** pointing to it
- **No queries** using it
- **Not connected** to any functionality

---

## 🔗 DATABASE SCHEMA

### Active Relationships
```sql
business_locations (id)
    ↓
transactions.location_id → business_locations.id
variation_location_details.location_id → business_locations.id
```

### Foreign Key Constraints
- `transactions.location_id` → `business_locations.id`
- `variation_location_details.location_id` → `business_locations.id`

### RLS Policies
- All RLS policies configured for `business_locations`
- Business isolation enforced via `business_id`

---

## 📋 DEPRECATION STEPS

### 1. Run Deprecation SQL
```sql
-- See: database/DEPRECATE_BRANCHES_TABLE.sql
-- This script:
-- ✅ Verifies no dependencies
-- ✅ Adds deprecation comment
-- ✅ Confirms business_locations is active
-- ✅ Optionally drops branches table (if empty)
```

### 2. Code Verification
✅ **COMPLETE** - All code uses `business_locations`

### 3. Documentation
✅ **COMPLETE** - All docs reference `business_locations`

---

## 🎯 PRODUCTION SAFETY

### ✅ Safe to Deprecate
- Zero code dependencies on `branches` table
- All foreign keys use `business_locations`
- All queries use `location_id`
- RLS policies active on `business_locations`

### ✅ Migration Not Required
- No data migration needed (branches table not used)
- No code changes needed (already using business_locations)
- No breaking changes

---

## ✅ FINAL STATEMENT

**`business_locations` is the official branch table. The `branches` table should not be used.**

**All branch operations MUST use:**
- **Table:** `business_locations`
- **Column:** `location_id` (in related tables)
- **Context:** `BranchContextV2` (loads from `business_locations`)

**Architecture Status:** ✅ **PRODUCTION-READY & SINGLE-SOURCE**

