# Database Setup Instructions (Urdu/Hindi)

## Problem: Error aa raha hai aur 42 tables already hain

Agar aapko error aa raha hai, to pehle yeh steps follow karo:

### Step 1: Database Check Karo
```sql
-- DIAGNOSE_DATABASE.sql run karo
-- Yeh check karega ke kaun se tables/columns missing hain
```

### Step 2: Missing Tables Add Karo

Agar `financial_accounts`, `rental_bookings`, ya `production_orders` tables missing hain:

```sql
-- MODERN_ERP_EXTENSION.sql run karo
-- Yeh missing tables aur columns add kar dega
```

### Step 3: Demo Data Insert Karo

```sql
-- DEMO_DATA_FIXED.sql run karo
-- Yeh automatically missing tables handle karega
```

---

## Quick Fix

### Option 1: Sab kuch check karo
1. `DIAGNOSE_DATABASE.sql` run karo
2. Missing tables dekh lo
3. `MODERN_ERP_EXTENSION.sql` run karo (agar kuch missing hai)
4. `DEMO_DATA_FIXED.sql` run karo

### Option 2: Direct Fix
Agar aapko pata hai ke kya missing hai:

```sql
-- Pehle MODERN_ERP_EXTENSION.sql run karo
-- Phir DEMO_DATA_INSERT.sql run karo
```

---

## Common Issues

### Issue 1: "Table does not exist"
**Solution:** `MODERN_ERP_EXTENSION.sql` run karo

### Issue 2: "Column does not exist" (is_rentable, rental_price, etc.)
**Solution:** `MODERN_ERP_EXTENSION.sql` run karo (yeh products table mein rental columns add karega)

### Issue 3: "No business found"
**Solution:** Pehle business create karo:
```sql
INSERT INTO businesses (name, owner_id) 
VALUES ('Your Business Name', 'your-user-uuid'::UUID);
```

### Issue 4: "No user_profile found"
**Solution:** User profile create karo:
```sql
INSERT INTO user_profiles (user_id, business_id, role)
VALUES ('your-user-uuid'::UUID, 1, 'owner');
```

---

## Files Order

1. **DIAGNOSE_DATABASE.sql** - Check karo ke kya missing hai
2. **MODERN_ERP_EXTENSION.sql** - Missing tables/columns add karo
3. **DEMO_DATA_FIXED.sql** - Demo data insert karo (smart version)
   - Ya **DEMO_DATA_INSERT.sql** - Full demo data (agar sab ready hai)

---

## Summary

- **42 tables hain?** → Good! Bas check karo ke required tables hain
- **Error aa raha hai?** → `DIAGNOSE_DATABASE.sql` run karo
- **Missing tables?** → `MODERN_ERP_EXTENSION.sql` run karo
- **Demo data chahiye?** → `DEMO_DATA_FIXED.sql` run karo
