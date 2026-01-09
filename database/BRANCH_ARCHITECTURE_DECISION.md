# 🏗️ BRANCH ARCHITECTURE - FINAL DECISION

## ✅ OFFICIAL DECISION

**`business_locations` is the single source of truth for branches.**

**The `branches` table is deprecated and should not be used.**

---

## 📊 EVIDENCE

### ✅ `business_locations` Usage (ACTIVE)
- **16 files** use `business_locations` table
- **All queries** use `location_id` (references `business_locations.id`)
- **RLS policies** configured for `business_locations`
- **Branch management** page (`app/settings/branches/page.tsx`) uses `business_locations`
- **BranchContextV2** loads from `business_locations`
- **All data queries** filter by `location_id`:
  - `transactions.location_id` → `business_locations.id`
  - `variation_location_details.location_id` → `business_locations.id`
  - Sales, Purchases, Inventory all use `location_id`

### ❌ `branches` Table Usage (ORPHANED)
- **0 files** reference `branches` table
- **No foreign keys** point to `branches`
- **No queries** use `branches`
- **Not connected** to any frontend or backend code

---

## 🔗 DATABASE RELATIONSHIPS

### Active Relationships (Using `business_locations`)
```
business_locations (id)
    ↓
transactions.location_id → business_locations.id
variation_location_details.location_id → business_locations.id
```

### Orphaned Table (NOT USED)
```
branches (id) → NO RELATIONSHIPS
```

---

## 🎯 ARCHITECTURAL DECISION

### Single Source of Truth: `business_locations`

**Reasons:**
1. ✅ **Already integrated** - All code uses `business_locations`
2. ✅ **RLS configured** - Security policies active
3. ✅ **Foreign keys** - All relationships use `location_id`
4. ✅ **Production-ready** - Actively used in production
5. ✅ **Schema documented** - Official table in schema docs

### Deprecated Table: `branches`

**Reasons:**
1. ❌ **Zero usage** - Not referenced anywhere
2. ❌ **No relationships** - No foreign keys
3. ❌ **Orphaned data** - Not connected to system
4. ❌ **Migration risk** - Would break existing code

---

## 📋 DEPRECATION PLAN

### Step 1: Verify No Dependencies
✅ **COMPLETE - Confirmed zero dependencies**

### Step 2: Safe Deprecation
- Mark table as deprecated (add comment)
- Optionally drop table if no data exists
- Keep foreign key constraints intact

### Step 3: Documentation
- Update all docs to reference `business_locations` only
- Remove any references to `branches` table

---

## ✅ FINAL STATEMENT

**`business_locations` is the official branch table. The `branches` table should not be used.**

All branch operations MUST use:
- Table: `business_locations`
- Column: `location_id` (in related tables)
- Context: `BranchContextV2` (loads from `business_locations`)

