# 🚀 SIMPLE DEMO DATA RESET - Manual Steps

**Current Status:** Database mein data already hai (products: 7, contacts: 12, sales: 23)

Lekin agar aap chahte hain ke fresh data ho, to ye simple steps follow karein:

---

## ✅ METHOD 1: Frontend Cache Clear (FASTEST)

Pehle ye try karein - shayad sirf cache ka issue ho:

1. **Open Browser Console** (F12)
2. **Run this:**
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   location.reload(true);
   ```
3. **Login again** aur check karein

Agar data sahi nahi hai, to Method 2 use karein.

---

## ✅ METHOD 2: Keep Existing Data (RECOMMENDED)

Data already hai aur working hai:
- ✅ 7 products
- ✅ 12 contacts  
- ✅ 23 sales transactions
- ✅ 10 inventory records

**Main Branch mein 23 sales aur 10 inventory items hain.**

Agar ye data test ke liye kaafi hai, to bas frontend test kar lein. Database already populated hai.

---

## ✅ METHOD 3: Manual Fresh Data (If needed)

Agar bilkul fresh data chahiye, to Supabase Dashboard mein jaayein:

### Step 1: Open Supabase Dashboard
https://supabase.com/dashboard → Your Project → SQL Editor

### Step 2: Clean Old Data (Copy-Paste)
```sql
-- Clean old demo data for business_id = 1
BEGIN;

DELETE FROM transaction_sell_lines WHERE transaction_id IN (SELECT id FROM transactions WHERE business_id = 1);
DELETE FROM transaction_purchase_lines WHERE transaction_id IN (SELECT id FROM transactions WHERE business_id = 1);
DELETE FROM transactions WHERE business_id = 1;
DELETE FROM variation_location_details WHERE location_id IN (SELECT id FROM business_locations WHERE business_id = 1);
DELETE FROM variations WHERE product_id IN (SELECT id FROM products WHERE business_id = 1);
DELETE FROM products WHERE business_id = 1;
DELETE FROM contacts WHERE business_id = 1;
DELETE FROM categories WHERE business_id = 1;
DELETE FROM units WHERE business_id = 1;

COMMIT;

SELECT 'Cleanup Complete!' as status;
```

### Step 3: Verify Clean
```sql
SELECT 
    (SELECT COUNT(*) FROM products WHERE business_id = 1) as products,
    (SELECT COUNT(*) FROM contacts WHERE business_id = 1) as contacts,
    (SELECT COUNT(*) FROM transactions WHERE business_id = 1) as sales;
-- Should show: 0, 0, 0
```

### Step 4: Contact Me
Agar clean successfully ho gaya, to mujhe batayein. Main phir fresh data insert karne ka simple script dunga jo Supabase Dashboard mein directly run ho sakta hai.

---

## 🎯 RECOMMENDATION

**Pehle Method 1 try karein** (localStorage clear) - usually yahi problem hota hai.

Agar phir bhi issue ho, to mujhe batayein aur main aapke exact schema ke liye working fresh data script banaunga.

---

## 📊 Current Database Status

```
Business: Studio Rently POS (ID: 1)
Branches: 3 (Main Stor, SADDAR, new)
Products: 7
Contacts: 12
Sales: 23
Inventory: 10 items (all in Main Stor branch)
```

**Data hai - shayad frontend cache clear karne ki zaroorat hai.**
