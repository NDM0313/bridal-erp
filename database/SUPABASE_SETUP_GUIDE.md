# Supabase Setup Guide
## Step 2: Production Database Configuration

---

## 📋 TABLE OF CONTENTS

1. [Project Creation](#1-project-creation)
2. [Database Setup](#2-database-setup)
3. [Authentication Configuration](#3-authentication-configuration)
4. [Row Level Security (RLS)](#4-row-level-security-rls)
5. [Verification](#5-verification)
6. [Security Best Practices](#6-security-best-practices)

---

## 1. PROJECT CREATION

### 1.1 Create Supabase Project

1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com
   - Sign in or create an account

2. **Create New Project**
   - Click "New Project"
   - Fill in project details:
     - **Name**: `my-pos-system` (or your preferred name)
     - **Database Password**: Generate a strong password (save it securely)
     - **Region**: Choose closest to your users (e.g., `US East (N. Virginia)`, `EU West (London)`)
     - **Pricing Plan**: Select appropriate plan (Free tier for development)

3. **Wait for Project Initialization**
   - Project creation takes 2-3 minutes
   - You'll receive an email when ready

### 1.2 Project Settings

1. **Access Project Settings**
   - Click on your project
   - Go to Settings → General

2. **Save Important Credentials**
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **API Keys**:
     - `anon` key (public): Safe for client-side
     - `service_role` key (secret): Server-side only, never expose
   - **Database Password**: Saved during creation

3. **Database Connection String**
   - Go to Settings → Database
   - Copy connection string (for future use)
   - Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

---

## 2. DATABASE SETUP

### 2.1 Access SQL Editor

1. **Open SQL Editor**
   - In Supabase Dashboard, click "SQL Editor" in left sidebar
   - Click "New Query"

### 2.2 Run Schema Migration

1. **Copy Schema SQL**
   - Open `database/FINAL_SCHEMA.sql`
   - Copy entire contents

2. **Paste and Execute**
   - Paste SQL into Supabase SQL Editor
   - Click "Run" or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
   - Wait for execution (should take 10-30 seconds)

3. **Verify Success**
   - Check for "Success. No rows returned" message
   - If errors occur, check error messages and fix

### 2.3 Verification Queries

Run these queries to verify tables are created:

```sql
-- 1. Check all tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Expected output: 12 tables
-- businesses, business_locations, contacts, units, brands, categories,
-- products, product_variations, variations, variation_location_details,
-- transactions, transaction_sell_lines

-- 2. Verify foreign keys
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 3. Check indexes
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 4. Verify critical columns exist
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND (
        (table_name = 'units' AND column_name IN ('base_unit_id', 'base_unit_multiplier'))
        OR (table_name = 'variations' AND column_name IN ('retail_price', 'wholesale_price'))
        OR (table_name = 'variation_location_details' AND column_name = 'qty_available')
        OR (table_name = 'contacts' AND column_name = 'customer_type')
    )
ORDER BY table_name, column_name;
```

### 2.4 Insert Test Data (Optional)

```sql
-- Create a test business
INSERT INTO businesses (name, owner_id, time_zone)
VALUES ('Test Business', 1, 'UTC')
RETURNING id;

-- Note: Replace owner_id with actual user ID from Supabase Auth

-- Create base unit (Pieces)
INSERT INTO units (business_id, actual_name, short_name, allow_decimal, created_by)
VALUES (1, 'Pieces', 'Pcs', false, 1)
RETURNING id;

-- Create secondary unit (Box) - 1 Box = 12 Pieces
INSERT INTO units (business_id, actual_name, short_name, allow_decimal, base_unit_id, base_unit_multiplier, created_by)
VALUES (1, 'Box', 'Box', false, 1, 12, 1)
RETURNING id;

-- Note: Replace business_id and created_by with actual IDs
```

---

## 3. AUTHENTICATION CONFIGURATION

### 3.1 Enable Email/Password Auth

1. **Access Authentication Settings**
   - Go to Authentication → Providers
   - Email provider should be enabled by default

2. **Configure Email Settings**
   - Go to Authentication → Settings
   - **Site URL**: Set your application URL
   - **Redirect URLs**: Add your app URLs (e.g., `http://localhost:3000`, `https://yourdomain.com`)

3. **Email Templates** (Optional)
   - Customize email templates in Authentication → Email Templates
   - Templates: Confirm signup, Magic link, Change email address, Reset password

### 3.2 JWT Configuration

1. **JWT Secret**
   - Go to Settings → API
   - JWT Secret is auto-generated (do not share)
   - JWT Expiry: Default 3600 seconds (1 hour)

2. **JWT Claims**
   - Supabase automatically includes user metadata in JWT
   - Access via `auth.users` table
   - Custom claims can be added via database functions

### 3.3 User Management

```sql
-- View all users (Supabase Auth)
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users;

-- Link user to business (if needed)
-- This would be done via application logic, not directly in SQL
```

---

## 4. ROW LEVEL SECURITY (RLS)

### 4.1 RLS Strategy

**Multi-Tenancy Approach**: Use `business_id` to isolate data per business.

**Principle**: Users can only access data where `business_id` matches their business.

**Implementation**:
1. Enable RLS on all tables
2. Create policies that check `business_id`
3. Use Supabase Auth to get user's business_id

### 4.2 Enable RLS on All Tables

```sql
-- Enable RLS on all core tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE variation_location_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_sell_lines ENABLE ROW LEVEL SECURITY;
```

### 4.3 Helper Function: Get User Business ID

```sql
-- Create function to get user's business_id
-- This assumes you'll store business_id in auth.users metadata or a separate user_businesses table
-- For now, we'll create a simple function that can be extended

CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_business_id INTEGER;
BEGIN
    -- Option 1: Get from user metadata (if stored in auth.users.raw_user_meta_data)
    -- SELECT (raw_user_meta_data->>'business_id')::INTEGER INTO user_business_id
    -- FROM auth.users
    -- WHERE id = auth.uid();
    
    -- Option 2: Get from user_businesses table (if you create one)
    -- SELECT business_id INTO user_business_id
    -- FROM user_businesses
    -- WHERE user_id = auth.uid()
    -- LIMIT 1;
    
    -- For now, return NULL (will be implemented in application layer)
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION get_user_business_id() IS 'Returns the business_id for the current authenticated user. To be implemented based on your user-business mapping strategy.';
```

### 4.4 RLS Policies

#### Policy 1: Businesses Table

```sql
-- Policy: Users can only see their own business
CREATE POLICY "Users can view their own business"
ON businesses
FOR SELECT
USING (id = get_user_business_id());

-- Policy: Users can update their own business
CREATE POLICY "Users can update their own business"
ON businesses
FOR UPDATE
USING (id = get_user_business_id());

-- Note: INSERT and DELETE policies depend on your business logic
-- Typically, only system admins can create/delete businesses
```

#### Policy 2: Products Table

```sql
-- Policy: Users can view products from their business
CREATE POLICY "Users can view products from their business"
ON products
FOR SELECT
USING (business_id = get_user_business_id());

-- Policy: Users can insert products for their business
CREATE POLICY "Users can insert products for their business"
ON products
FOR INSERT
WITH CHECK (business_id = get_user_business_id());

-- Policy: Users can update products from their business
CREATE POLICY "Users can update products from their business"
ON products
FOR UPDATE
USING (business_id = get_user_business_id());

-- Policy: Users can delete products from their business (soft delete)
CREATE POLICY "Users can delete products from their business"
ON products
FOR DELETE
USING (business_id = get_user_business_id());
```

#### Policy 3: Variations Table

```sql
-- Policy: Users can view variations from their business
CREATE POLICY "Users can view variations from their business"
ON variations
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM products
        WHERE products.id = variations.product_id
        AND products.business_id = get_user_business_id()
    )
);

-- Policy: Users can insert variations for their business products
CREATE POLICY "Users can insert variations for their business"
ON variations
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM products
        WHERE products.id = variations.product_id
        AND products.business_id = get_user_business_id()
    )
);

-- Policy: Users can update variations from their business
CREATE POLICY "Users can update variations from their business"
ON variations
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM products
        WHERE products.id = variations.product_id
        AND products.business_id = get_user_business_id()
    )
);
```

#### Policy 4: Variation Location Details (Stock Table)

```sql
-- Policy: Users can view stock from their business locations
CREATE POLICY "Users can view stock from their business"
ON variation_location_details
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM products
        JOIN business_locations ON business_locations.id = variation_location_details.location_id
        WHERE products.id = variation_location_details.product_id
        AND products.business_id = get_user_business_id()
        AND business_locations.business_id = get_user_business_id()
    )
);

-- Policy: Users can update stock for their business
CREATE POLICY "Users can update stock for their business"
ON variation_location_details
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM products
        JOIN business_locations ON business_locations.id = variation_location_details.location_id
        WHERE products.id = variation_location_details.product_id
        AND products.business_id = get_user_business_id()
        AND business_locations.business_id = get_user_business_id()
    )
);

-- Policy: Users can insert stock for their business
CREATE POLICY "Users can insert stock for their business"
ON variation_location_details
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM products
        JOIN business_locations ON business_locations.id = variation_location_details.location_id
        WHERE products.id = variation_location_details.product_id
        AND products.business_id = get_user_business_id()
        AND business_locations.business_id = get_user_business_id()
    )
);
```

#### Policy 5: Transactions Table

```sql
-- Policy: Users can view transactions from their business
CREATE POLICY "Users can view transactions from their business"
ON transactions
FOR SELECT
USING (business_id = get_user_business_id());

-- Policy: Users can insert transactions for their business
CREATE POLICY "Users can insert transactions for their business"
ON transactions
FOR INSERT
WITH CHECK (business_id = get_user_business_id());

-- Policy: Users can update transactions from their business
CREATE POLICY "Users can update transactions from their business"
ON transactions
FOR UPDATE
USING (business_id = get_user_business_id());
```

#### Policy 6: Transaction Sell Lines

```sql
-- Policy: Users can view sell lines from their business transactions
CREATE POLICY "Users can view sell lines from their business"
ON transaction_sell_lines
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM transactions
        WHERE transactions.id = transaction_sell_lines.transaction_id
        AND transactions.business_id = get_user_business_id()
    )
);

-- Policy: Users can insert sell lines for their business transactions
CREATE POLICY "Users can insert sell lines for their business"
ON transaction_sell_lines
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM transactions
        WHERE transactions.id = transaction_sell_lines.transaction_id
        AND transactions.business_id = get_user_business_id()
    )
);
```

### 4.5 Additional Tables Policies

```sql
-- Business Locations
CREATE POLICY "Users can view locations from their business"
ON business_locations FOR SELECT
USING (business_id = get_user_business_id());

CREATE POLICY "Users can manage locations for their business"
ON business_locations FOR ALL
USING (business_id = get_user_business_id())
WITH CHECK (business_id = get_user_business_id());

-- Contacts
CREATE POLICY "Users can view contacts from their business"
ON contacts FOR SELECT
USING (business_id = get_user_business_id());

CREATE POLICY "Users can manage contacts for their business"
ON contacts FOR ALL
USING (business_id = get_user_business_id())
WITH CHECK (business_id = get_user_business_id());

-- Units
CREATE POLICY "Users can view units from their business"
ON units FOR SELECT
USING (business_id = get_user_business_id());

CREATE POLICY "Users can manage units for their business"
ON units FOR ALL
USING (business_id = get_user_business_id())
WITH CHECK (business_id = get_user_business_id());

-- Brands
CREATE POLICY "Users can view brands from their business"
ON brands FOR SELECT
USING (business_id = get_user_business_id());

CREATE POLICY "Users can manage brands for their business"
ON brands FOR ALL
USING (business_id = get_user_business_id())
WITH CHECK (business_id = get_user_business_id());

-- Categories
CREATE POLICY "Users can view categories from their business"
ON categories FOR SELECT
USING (business_id = get_user_business_id());

CREATE POLICY "Users can manage categories for their business"
ON categories FOR ALL
USING (business_id = get_user_business_id())
WITH CHECK (business_id = get_user_business_id());

-- Product Variations
CREATE POLICY "Users can view product variations from their business"
ON product_variations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM products
        WHERE products.id = product_variations.product_id
        AND products.business_id = get_user_business_id()
    )
);
```

---

## 5. VERIFICATION

### 5.1 Verify RLS is Enabled

```sql
-- Check RLS status on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- All tables should show rowsecurity = true
```

### 5.2 Verify Policies Exist

```sql
-- List all RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 5.3 Test RLS (Requires Authentication)

```sql
-- This test requires an authenticated user
-- Run in Supabase SQL Editor with authenticated context

-- Test 1: Try to select products (should only see your business)
SELECT COUNT(*) FROM products;

-- Test 2: Try to insert a product with wrong business_id (should fail)
-- INSERT INTO products (business_id, name, type, unit_id, sku, created_by)
-- VALUES (999, 'Test Product', 'single', 1, 'TEST-001', auth.uid());
-- Should fail if RLS is working correctly

-- Test 3: Verify you can only see your business locations
SELECT COUNT(*) FROM business_locations;
```

---

## 6. SECURITY BEST PRACTICES

### 6.1 API Keys

- **Never expose `service_role` key** in client-side code
- **Use `anon` key** for client-side operations (with RLS enabled)
- **Rotate keys** periodically (Settings → API → Regenerate)

### 6.2 Database Access

- **Use connection pooling** for server-side connections
- **Limit direct database access** - use Supabase API when possible
- **Enable SSL** for all connections

### 6.3 RLS Best Practices

- **Always enable RLS** on tables with sensitive data
- **Test policies** with different user contexts
- **Use `SECURITY DEFINER` functions** carefully (they bypass RLS)
- **Audit policies** regularly

### 6.4 Authentication

- **Enable email confirmation** for production
- **Use strong password requirements**
- **Implement rate limiting** for login attempts
- **Enable MFA** for admin users (if available)

### 6.5 Backup & Recovery

- **Enable automatic backups** (available in paid plans)
- **Test restore procedures** regularly
- **Document backup schedule**

---

## 7. NEXT STEPS

After completing this setup:

1. ✅ Database schema is deployed
2. ✅ RLS is enabled and configured
3. ✅ Authentication is ready
4. ⏭️ **Next**: Implement application logic to:
   - Map users to businesses
   - Update `get_user_business_id()` function
   - Test RLS policies with real users

---

## 8. TROUBLESHOOTING

### Issue: RLS blocking all queries

**Solution**: Ensure `get_user_business_id()` returns correct value. Check user-business mapping.

### Issue: Policies not applying

**Solution**: Verify RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`

### Issue: Foreign key errors

**Solution**: Ensure all referenced tables exist and data is inserted in correct order.

### Issue: Permission denied errors

**Solution**: Check that policies allow the operation you're trying to perform.

---

**STEP 2 SUPABASE SETUP COMPLETE**

