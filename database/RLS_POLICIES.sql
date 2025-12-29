-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Multi-Tenancy Security for POS System
-- ============================================
-- 
-- STRATEGY:
-- - All policies use business_id to isolate data per business
-- - Users can only access data where business_id matches their business
-- - Helper function get_user_business_id() retrieves user's business_id
-- ============================================

-- ============================================
-- STEP 1: ENABLE RLS ON ALL TABLES
-- ============================================

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

-- ============================================
-- STEP 2: CREATE HELPER FUNCTION
-- ============================================

-- Function to get user's business_id
-- NOTE: This is a placeholder. You need to implement based on your user-business mapping strategy.
-- Options:
-- 1. Store business_id in auth.users.raw_user_meta_data
-- 2. Create a user_businesses table
-- 3. Use a user_profiles table with business_id

CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_business_id INTEGER;
BEGIN
    -- OPTION 1: Get from user metadata (recommended)
    -- Uncomment and modify based on your structure:
    /*
    SELECT (raw_user_meta_data->>'business_id')::INTEGER INTO user_business_id
    FROM auth.users
    WHERE id = auth.uid();
    */
    
    -- OPTION 2: Get from user_businesses table (if you create one)
    -- Uncomment and modify:
    /*
    SELECT business_id INTO user_business_id
    FROM user_businesses
    WHERE user_id = auth.uid()
    LIMIT 1;
    */
    
    -- OPTION 3: Get from user_profiles table (if you create one)
    -- Uncomment and modify:
    /*
    SELECT business_id INTO user_business_id
    FROM user_profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
    */
    
    -- For now, return NULL (will cause RLS to block all access until implemented)
    -- TODO: Implement one of the options above
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION get_user_business_id() IS 'Returns the business_id for the current authenticated user. Must be implemented based on your user-business mapping strategy.';

-- ============================================
-- STEP 3: BUSINESSES TABLE POLICIES
-- ============================================

-- Users can view their own business
CREATE POLICY "users_view_own_business"
ON businesses
FOR SELECT
USING (id = get_user_business_id());

-- Users can update their own business
CREATE POLICY "users_update_own_business"
ON businesses
FOR UPDATE
USING (id = get_user_business_id());

-- Note: INSERT and DELETE typically restricted to system admins
-- Add policies as needed based on your requirements

-- ============================================
-- STEP 4: BUSINESS_LOCATIONS TABLE POLICIES
-- ============================================

CREATE POLICY "users_manage_locations"
ON business_locations
FOR ALL
USING (business_id = get_user_business_id())
WITH CHECK (business_id = get_user_business_id());

-- ============================================
-- STEP 5: CONTACTS TABLE POLICIES
-- ============================================

CREATE POLICY "users_manage_contacts"
ON contacts
FOR ALL
USING (business_id = get_user_business_id())
WITH CHECK (business_id = get_user_business_id());

-- ============================================
-- STEP 6: UNITS TABLE POLICIES
-- ============================================

CREATE POLICY "users_manage_units"
ON units
FOR ALL
USING (business_id = get_user_business_id())
WITH CHECK (business_id = get_user_business_id());

-- ============================================
-- STEP 7: BRANDS TABLE POLICIES
-- ============================================

CREATE POLICY "users_manage_brands"
ON brands
FOR ALL
USING (business_id = get_user_business_id())
WITH CHECK (business_id = get_user_business_id());

-- ============================================
-- STEP 8: CATEGORIES TABLE POLICIES
-- ============================================

CREATE POLICY "users_manage_categories"
ON categories
FOR ALL
USING (business_id = get_user_business_id())
WITH CHECK (business_id = get_user_business_id());

-- ============================================
-- STEP 9: PRODUCTS TABLE POLICIES
-- ============================================

CREATE POLICY "users_view_products"
ON products
FOR SELECT
USING (business_id = get_user_business_id());

CREATE POLICY "users_insert_products"
ON products
FOR INSERT
WITH CHECK (business_id = get_user_business_id());

CREATE POLICY "users_update_products"
ON products
FOR UPDATE
USING (business_id = get_user_business_id());

CREATE POLICY "users_delete_products"
ON products
FOR DELETE
USING (business_id = get_user_business_id());

-- ============================================
-- STEP 10: PRODUCT_VARIATIONS TABLE POLICIES
-- ============================================

CREATE POLICY "users_view_product_variations"
ON product_variations
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM products
        WHERE products.id = product_variations.product_id
        AND products.business_id = get_user_business_id()
    )
);

CREATE POLICY "users_manage_product_variations"
ON product_variations
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM products
        WHERE products.id = product_variations.product_id
        AND products.business_id = get_user_business_id()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM products
        WHERE products.id = product_variations.product_id
        AND products.business_id = get_user_business_id()
    )
);

-- ============================================
-- STEP 11: VARIATIONS TABLE POLICIES
-- ============================================

CREATE POLICY "users_view_variations"
ON variations
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM products
        WHERE products.id = variations.product_id
        AND products.business_id = get_user_business_id()
    )
);

CREATE POLICY "users_insert_variations"
ON variations
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM products
        WHERE products.id = variations.product_id
        AND products.business_id = get_user_business_id()
    )
);

CREATE POLICY "users_update_variations"
ON variations
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM products
        WHERE products.id = variations.product_id
        AND products.business_id = get_user_business_id()
    )
);

CREATE POLICY "users_delete_variations"
ON variations
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM products
        WHERE products.id = variations.product_id
        AND products.business_id = get_user_business_id()
    )
);

-- ============================================
-- STEP 12: VARIATION_LOCATION_DETAILS (STOCK) POLICIES
-- ============================================
-- CRITICAL: Stock table requires checking both product and location business_id

CREATE POLICY "users_view_stock"
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

CREATE POLICY "users_insert_stock"
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

CREATE POLICY "users_update_stock"
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

CREATE POLICY "users_delete_stock"
ON variation_location_details
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM products
        JOIN business_locations ON business_locations.id = variation_location_details.location_id
        WHERE products.id = variation_location_details.product_id
        AND products.business_id = get_user_business_id()
        AND business_locations.business_id = get_user_business_id()
    )
);

-- ============================================
-- STEP 13: TRANSACTIONS TABLE POLICIES
-- ============================================

CREATE POLICY "users_view_transactions"
ON transactions
FOR SELECT
USING (business_id = get_user_business_id());

CREATE POLICY "users_insert_transactions"
ON transactions
FOR INSERT
WITH CHECK (business_id = get_user_business_id());

CREATE POLICY "users_update_transactions"
ON transactions
FOR UPDATE
USING (business_id = get_user_business_id());

CREATE POLICY "users_delete_transactions"
ON transactions
FOR DELETE
USING (business_id = get_user_business_id());

-- ============================================
-- STEP 14: TRANSACTION_SELL_LINES TABLE POLICIES
-- ============================================

CREATE POLICY "users_view_sell_lines"
ON transaction_sell_lines
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM transactions
        WHERE transactions.id = transaction_sell_lines.transaction_id
        AND transactions.business_id = get_user_business_id()
    )
);

CREATE POLICY "users_insert_sell_lines"
ON transaction_sell_lines
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM transactions
        WHERE transactions.id = transaction_sell_lines.transaction_id
        AND transactions.business_id = get_user_business_id()
    )
);

CREATE POLICY "users_update_sell_lines"
ON transaction_sell_lines
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM transactions
        WHERE transactions.id = transaction_sell_lines.transaction_id
        AND transactions.business_id = get_user_business_id()
    )
);

CREATE POLICY "users_delete_sell_lines"
ON transaction_sell_lines
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM transactions
        WHERE transactions.id = transaction_sell_lines.transaction_id
        AND transactions.business_id = get_user_business_id()
    )
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check RLS is enabled
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- List all policies
SELECT 
    tablename,
    policyname,
    cmd,
    permissive
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- NOTES
-- ============================================
-- 
-- 1. get_user_business_id() function MUST be implemented before RLS will work
-- 2. All policies use business_id for multi-tenancy isolation
-- 3. Stock table (variation_location_details) checks both product and location business_id
-- 4. Policies use EXISTS subqueries for related tables (products, transactions)
-- 5. Test policies with different user contexts to ensure proper isolation
-- 
-- ============================================

