# 🚀 Modern ERP Extension - SQL Migration Guide

## 📋 Overview

This SQL migration script extends your existing POS database schema to support:
1. **Hybrid Inventory** (Rental Support)
2. **Rental Management Module**
3. **Custom Studio / Manufacturing Module**
4. **Advanced Accounting** (Ledgers & Banking)
5. **Expense Categories**
6. **Business Modules** (Feature Flags)

---

## ✅ What This Script Does

### 1. Hybrid Inventory Updates
**Alters `products` table:**
- ✅ `is_rentable` (BOOLEAN) - Whether product can be rented
- ✅ `rental_price` (NUMERIC) - Fixed rental price per duration unit
- ✅ `security_deposit_amount` (NUMERIC) - Security deposit required
- ✅ `rent_duration_unit` (VARCHAR) - 'hour', 'day', or 'event'

### 2. Rental Management Module
**New Tables:**
- ✅ `rental_bookings` - Date-based bookings with conflict detection
  - Links to transactions, contacts, products
  - Tracks pickup/return dates, status, security deposits
  - Supports conflict detection view

### 3. Custom Studio / Manufacturing Module
**New Tables:**
- ✅ `production_orders` - Job work orders (Dyeing, Stitching, etc.)
- ✅ `production_steps` - Individual steps within orders
- ✅ `production_materials` - Materials/Inventory used in production

### 4. Advanced Accounting
**New Tables:**
- ✅ `financial_accounts` - Bank, Cash, Wallet accounts
- ✅ `account_transactions` - All debit/credit transactions
- ✅ `fund_transfers` - Account-to-account transfers
- ✅ Auto-balance updates via triggers

### 5. Expense Categories
**New Tables:**
- ✅ `expense_categories` - Categorize expenses (Rent, Salary, etc.)
- ✅ Links to `transactions` table via `expense_category_id`

### 6. Business Modules (Feature Flags)
**Alters `businesses` table:**
- ✅ `module_config` (JSONB) - Feature flags for modules
  - Example: `{"is_rental_active": true, "is_studio_active": false}`

---

## 🔒 Security Features

### Row Level Security (RLS)
- ✅ All new tables have RLS enabled
- ✅ Policies ensure users can only access their own business data
- ✅ Uses `get_user_business_id()` helper function

### RLS Policies Created:
- ✅ SELECT, INSERT, UPDATE, DELETE policies for all tables
- ✅ Nested policies for production_steps and production_materials (via production_orders)

---

## 🛠️ Helper Functions & Triggers

### Functions:
1. **`is_module_active(module_key)`** - Check if a module is enabled for business
2. **`update_account_balance()`** - Auto-update account balance on transactions
3. **`create_fund_transfer_transactions()`** - Auto-create debit/credit entries for transfers

### Triggers:
1. **`trigger_update_account_balance`** - Updates account balance on transaction changes
2. **`trigger_create_fund_transfer_transactions`** - Creates dual entries for fund transfers

---

## 📊 Views

### `rental_booking_conflicts`
- Detects overlapping bookings for the same product
- Helps prevent double-booking

---

## 🚀 Usage Instructions

### Step 1: Run the Migration
1. Open **Supabase SQL Editor**
2. Copy entire contents of `MODERN_ERP_EXTENSION.sql`
3. Paste and click **Run**
4. Wait for completion (should take 10-30 seconds)

### Step 2: Verify Tables
The script includes verification queries at the end. Check:
- ✅ All 8 new tables created
- ✅ Products table extended with 4 new columns
- ✅ Businesses table extended with `module_config`

### Step 3: Enable Modules for Your Business
```sql
-- Enable all modules
UPDATE businesses 
SET module_config = '{
  "is_rental_active": true,
  "is_studio_active": true,
  "is_advanced_accounting_active": true
}'::jsonb
WHERE id = <your_business_id>;

-- Or enable individually
UPDATE businesses 
SET module_config = jsonb_set(
  COALESCE(module_config, '{}'::jsonb),
  '{is_rental_active}',
  'true'::jsonb
)
WHERE id = <your_business_id>;
```

### Step 4: Create Sample Data (Optional)
```sql
-- Create a financial account (Cash Drawer)
INSERT INTO financial_accounts (business_id, name, type, current_balance, created_by)
VALUES (
  <your_business_id>,
  'Cash Drawer',
  'cash',
  0,
  auth.uid()
);

-- Create expense categories
INSERT INTO expense_categories (business_id, name, color_code, created_by)
VALUES 
  (<your_business_id>, 'Rent', '#FF5733', auth.uid()),
  (<your_business_id>, 'Salary', '#33FF57', auth.uid()),
  (<your_business_id>, 'Utilities', '#3357FF', auth.uid());
```

---

## 📝 Important Notes

### Safe to Run Multiple Times
- ✅ Uses `CREATE TABLE IF NOT EXISTS`
- ✅ Uses `DO $$ BEGIN ... END $$` blocks for conditional ALTERs
- ✅ Uses `DROP POLICY IF EXISTS` before creating policies
- ✅ Won't delete existing data

### Dependencies
- ✅ Requires existing `businesses` table
- ✅ Requires existing `transactions` table
- ✅ Requires existing `products`, `variations`, `contacts` tables
- ✅ Requires `get_user_business_id()` function (from base schema)

### Data Integrity
- ✅ Foreign keys enforce referential integrity
- ✅ CHECK constraints validate enum values
- ✅ Unique constraints prevent duplicates
- ✅ Triggers maintain account balances automatically

---

## 🔍 Verification Queries

After running the migration, verify with:

```sql
-- Check all new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'rental_bookings',
    'production_orders', 'production_steps', 'production_materials',
    'financial_accounts', 'account_transactions', 'fund_transfers',
    'expense_categories'
  );

-- Check products table extensions
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name IN ('is_rentable', 'rental_price', 'security_deposit_amount', 'rent_duration_unit');

-- Check businesses module_config
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'businesses' 
  AND column_name = 'module_config';

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'rental_bookings',
    'production_orders', 'production_steps', 'production_materials',
    'financial_accounts', 'account_transactions', 'fund_transfers',
    'expense_categories'
  );
```

---

## 🎯 Next Steps

1. **Frontend Integration:**
   - Update TypeScript types for new tables
   - Create API endpoints for new modules
   - Build UI components for rental bookings, production orders, etc.

2. **Testing:**
   - Test RLS policies with different user roles
   - Test fund transfer triggers
   - Test account balance updates

3. **Documentation:**
   - Document API endpoints
   - Create user guides for new modules

---

## 📚 Module Usage Examples

### Rental Booking Example
```sql
-- Create a rental booking
INSERT INTO rental_bookings (
  business_id, contact_id, product_id,
  pickup_date, return_date,
  rental_amount, security_deposit_amount,
  security_type, status, created_by
)
VALUES (
  <business_id>, <contact_id>, <product_id>,
  '2024-01-15 10:00:00', '2024-01-17 18:00:00',
  5000.00, 2000.00,
  'cash', 'reserved', auth.uid()
);
```

### Production Order Example
```sql
-- Create a production order
INSERT INTO production_orders (
  business_id, customer_id, order_no,
  status, deadline_date, created_by
)
VALUES (
  <business_id>, <customer_id>, 'PO-2024-001',
  'new', '2024-01-20', auth.uid()
);

-- Add production steps
INSERT INTO production_steps (
  production_order_id, step_name, status, cost
)
VALUES 
  (<order_id>, 'Dyeing', 'pending', 2000.00),
  (<order_id>, 'Stitching', 'pending', 3000.00);
```

### Fund Transfer Example
```sql
-- Transfer funds between accounts
INSERT INTO fund_transfers (
  business_id, from_account_id, to_account_id,
  amount, notes, created_by
)
VALUES (
  <business_id>, <cash_account_id>, <bank_account_id>,
  50000.00, 'Daily deposit', auth.uid()
);
-- This automatically creates debit/credit entries in account_transactions
```

---

## ✅ Migration Complete!

Your database is now ready for Modern ERP features! 🎉

