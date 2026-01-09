-- ============================================================================
-- RLS (Row-Level Security) Policies for ERP System
-- Purpose: Enforce business_id isolation at database level
-- Date: January 8, 2026
-- Status: CRITICAL SECURITY REQUIREMENT
-- ============================================================================

-- STEP 1: Enable RLS on all critical tables
-- ============================================================================

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE salesman_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- STEP 2: Create helper function to get user's business_id
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS INTEGER AS $$
  SELECT business_id 
  FROM user_profiles 
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- STEP 3: Sales & Purchase Policies
-- ============================================================================

-- Sales table
CREATE POLICY "Users can only access their business sales"
ON sales FOR ALL
USING (business_id = get_user_business_id());

-- Sale items (inherits from sales via FK)
CREATE POLICY "Users can only access their business sale items"
ON sale_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM sales 
    WHERE sales.id = sale_items.sale_id 
    AND sales.business_id = get_user_business_id()
  )
);

-- Purchases table
CREATE POLICY "Users can only access their business purchases"
ON purchases FOR ALL
USING (business_id = get_user_business_id());

-- Purchase items (inherits from purchases via FK)
CREATE POLICY "Users can only access their business purchase items"
ON purchase_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM purchases 
    WHERE purchases.id = purchase_items.purchase_id 
    AND purchases.business_id = get_user_business_id()
  )
);

-- STEP 4: Product & Inventory Policies
-- ============================================================================

-- Products table
CREATE POLICY "Users can only access their business products"
ON products FOR ALL
USING (business_id = get_user_business_id());

-- Product variations (inherits from products via FK)
CREATE POLICY "Users can only access their business product variations"
ON product_variations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_variations.product_id 
    AND products.business_id = get_user_business_id()
  )
);

-- Branch inventory
CREATE POLICY "Users can only access their business branch inventory"
ON branch_inventory FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM business_locations 
    WHERE business_locations.id = branch_inventory.branch_id 
    AND business_locations.business_id = get_user_business_id()
  )
);

-- Categories
CREATE POLICY "Users can only access their business categories"
ON categories FOR ALL
USING (business_id = get_user_business_id());

-- STEP 5: Contacts Policies
-- ============================================================================

CREATE POLICY "Users can only access their business contacts"
ON contacts FOR ALL
USING (business_id = get_user_business_id());

-- STEP 6: User & Branch Policies
-- ============================================================================

-- User profiles - Users can only see users in their business
CREATE POLICY "Users can see users in their business"
ON user_profiles FOR SELECT
USING (business_id = get_user_business_id());

-- Admins and Managers can manage users in their business
CREATE POLICY "Admins can manage users in their business"
ON user_profiles FOR INSERT, UPDATE, DELETE
USING (
  business_id = get_user_business_id() 
  AND EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- Business locations (branches)
CREATE POLICY "Users can only access their business branches"
ON business_locations FOR ALL
USING (business_id = get_user_business_id());

-- STEP 7: Salesman Ledger Policies
-- ============================================================================

CREATE POLICY "Users can access salesman ledgers in their business"
ON salesman_ledgers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = salesman_ledgers.salesman_id 
    AND user_profiles.business_id = get_user_business_id()
  )
);

-- STEP 8: Grant necessary permissions to authenticated users
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant select on all tables (RLS will filter results)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant insert/update/delete on business-scoped tables
GRANT INSERT, UPDATE, DELETE ON sales TO authenticated;
GRANT INSERT, UPDATE, DELETE ON sale_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON purchases TO authenticated;
GRANT INSERT, UPDATE, DELETE ON purchase_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON products TO authenticated;
GRANT INSERT, UPDATE, DELETE ON product_variations TO authenticated;
GRANT INSERT, UPDATE, DELETE ON contacts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON branch_inventory TO authenticated;
GRANT INSERT, UPDATE, DELETE ON business_locations TO authenticated;
GRANT INSERT, UPDATE, DELETE ON categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON salesman_ledgers TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (Run after applying this migration)
-- ============================================================================

-- 1. Check which tables have RLS enabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND rowsecurity = true;

-- 2. List all policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- ORDER BY tablename;

-- 3. Test cross-business access (should return empty)
-- -- Login as User A (business 1)
-- SELECT * FROM sales WHERE business_id = 2;  -- Should return nothing

-- ============================================================================
-- ROLLBACK (Emergency use only)
-- ============================================================================

-- To disable RLS (use only for debugging):
-- ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE products DISABLE ROW LEVEL SECURITY;
-- -- etc for all tables

-- To drop all policies:
-- DROP POLICY "Users can only access their business sales" ON sales;
-- -- etc for all policies

-- ============================================================================
-- END OF RLS MIGRATION
-- ============================================================================

