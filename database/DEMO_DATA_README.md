# Demo Data Insert Script - Usage Guide

## Overview

This SQL script (`DEMO_DATA_INSERT.sql`) populates your Supabase database with realistic demo data for visual testing of the ERP system.

## What Gets Inserted

### 1. Products (10 items)
- **Bridal Lehengas:** Red, Gold, Maroon (with rental pricing)
- **Grooms Sherwanis:** Black, White, Gold (with rental pricing)
- **Accessories:** Bridal Dupattas (Red, Gold), Jewelry Set, Bridal Shoes
- **Stock Levels:** 
  - Low stock (< 10): Red Lehenga (3), Maroon Lehenga (2), Gold Sherwani (4), Gold Dupatta (7), Red Shoes (6)
  - Normal stock: Others have 8-25 pieces

### 2. Contacts (8 total)
- **5 Customers:**
  - 3 Retail customers (Mrs. Fatima Ahmed, Ms. Ayesha Khan, Mrs. Zara Ahmed)
  - 2 Wholesale customers (Bridal Boutique, Ali Textiles)
- **3 Suppliers:**
  - Silk Traders (Fabric Supplier)
  - Ali Dyer (Dyeing Vendor)
  - Master Sahab (Tailor Vendor)

### 3. Financial Accounts (2 accounts)
- **Cash Till:** 50,000 PKR
- **Meezan Bank:** 150,000 PKR (with account number)

### 4. Sales Transactions (5 recent sales)
- 3 Retail sales (various dates, some partial payments)
- 2 Wholesale sales (bulk orders)
- All with transaction line items

### 5. Rental Bookings (3 active rentals)
- 1 Active rental (out) - Red Bridal Lehenga
- 1 Reserved (upcoming) - Gold Bridal Lehenga
- 1 Active rental (out) - Maroon Bridal Lehenga

### 6. Production Orders (3 orders)
- **ORD-8822:** In Cutting stage (new status)
- **ORD-8821:** In Dyeing stage
- **ORD-8823:** In Stitching stage

---

## Prerequisites

1. **You must be logged in** to Supabase (auth.uid() must return your user UUID)
2. **Your user must have a business_id** in the `user_profiles` table
3. **Required tables must exist:**
   - businesses
   - business_locations
   - units
   - categories
   - brands
   - products
   - variations
   - variation_location_details
   - contacts
   - financial_accounts
   - transactions
   - transaction_sell_lines
   - rental_bookings
   - production_orders

---

## How to Run

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

### Step 2: Copy and Paste Script
1. Open `database/DEMO_DATA_INSERT.sql`
2. Copy the entire contents
3. Paste into the SQL Editor

### Step 3: Run the Script
1. Click "Run" or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
2. Wait for completion (should take 5-10 seconds)

### Step 4: Verify Results
The script includes verification queries at the end. Check:
- Product count should be 10
- Contact count: 5 customers + 3 suppliers
- Financial accounts: 2 accounts
- Low stock products: 5 items
- Rental bookings: 3 bookings
- Production orders: 3 orders

---

## Important Notes

### Safe to Run Multiple Times
- The script uses `ON CONFLICT` for financial accounts (updates existing)
- Products, contacts, and other data will be inserted as new records
- **Warning:** Running multiple times will create duplicate data

### Data Isolation
- All data is inserted for **your current business_id** only
- Data is isolated by `business_id` (multi-tenant safe)

### Stock Management
- Stock is stored in **base unit (Pieces)** only
- All quantities in `variation_location_details` are in Pieces

### Invoice Numbers
- Invoice numbers are auto-generated starting from existing max + 1
- Format: `INV-000001`, `INV-000002`, etc.

---

## Troubleshooting

### Error: "auth.uid() returned NULL"
**This is the most common error!** SQL Editor mein `auth.uid()` kaam nahi karta.

**Solution 1: Use the updated script (with fallback)**
- Updated `DEMO_DATA_INSERT.sql` ab automatically first user aur business use karega
- Agar yeh bhi fail ho, to Solution 2 use karo

**Solution 2: Use Manual Version**
1. Pehle `GET_YOUR_IDS.sql` run karo to get your user_id and business_id
2. `DEMO_DATA_INSERT_MANUAL.sql` file kholo
3. Line 18-19 par values replace karo:
   ```sql
   v_user_id UUID := 'your-actual-uuid-here'::UUID;
   v_business_id INTEGER := 1;  -- Your actual business_id
   ```
4. Script run karo

### Error: "No business found for current user"
- **Solution:** Create a business first, or link your user to a business in `user_profiles` table
- You can manually insert:
  ```sql
  INSERT INTO user_profiles (user_id, business_id, role)
  VALUES ('your-user-uuid'::UUID, <your_business_id>, 'owner');
  ```

### Error: Foreign key constraint violation
- **Solution:** Make sure all required tables exist
- Run the base schema migration first if tables are missing

### Duplicate Key Errors
- **Solution:** The script handles conflicts for financial accounts
- For other tables, delete existing demo data first or modify the script

---

## Customization

### Change Product Names/SKUs
Edit the `INSERT INTO products` statements in the script.

### Change Stock Levels
Modify the `qty_available` values in `variation_location_details` inserts.

### Add More Products
Copy a product insert block and modify the values.

### Change Dates
Modify `CURRENT_DATE - INTERVAL 'X days'` to adjust transaction/rental dates.

---

## Verification Queries

After running, you can verify with these queries:

```sql
-- Count products
SELECT COUNT(*) FROM products 
WHERE business_id = (SELECT business_id FROM user_profiles WHERE user_id = auth.uid());

-- Check low stock
SELECT p.name, vld.qty_available, p.alert_quantity
FROM products p
JOIN variations v ON v.product_id = p.id
JOIN variation_location_details vld ON vld.variation_id = v.id
WHERE p.business_id = (SELECT business_id FROM user_profiles WHERE user_id = auth.uid())
  AND vld.qty_available < p.alert_quantity;

-- Check rentals
SELECT rb.id, c.name, p.name, rb.status
FROM rental_bookings rb
JOIN contacts c ON c.id = rb.contact_id
JOIN products p ON p.id = rb.product_id
WHERE rb.business_id = (SELECT business_id FROM user_profiles WHERE user_id = auth.uid());
```

---

**File:** `database/DEMO_DATA_INSERT.sql`  
**Last Updated:** Based on current schema  
**Status:** Ready to use

