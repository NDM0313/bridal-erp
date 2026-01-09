-- ============================================================================
-- Database Constraints & Indexes for ERP System
-- Purpose: Enforce data integrity and improve query performance
-- Date: January 8, 2026
-- Status: CRITICAL DATA INTEGRITY REQUIREMENT
-- ============================================================================

-- ============================================================================
-- PART 1: FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Sales & Sale Items
-- ----------------------------------------------------------------------------

-- Sales table foreign keys
ALTER TABLE sales 
  ADD CONSTRAINT fk_sales_business 
  FOREIGN KEY (business_id) 
  REFERENCES businesses(id) 
  ON DELETE RESTRICT;

ALTER TABLE sales 
  ADD CONSTRAINT fk_sales_branch 
  FOREIGN KEY (branch_id) 
  REFERENCES business_locations(id) 
  ON DELETE RESTRICT;

ALTER TABLE sales 
  ADD CONSTRAINT fk_sales_customer 
  FOREIGN KEY (customer_id) 
  REFERENCES contacts(id) 
  ON DELETE SET NULL;

ALTER TABLE sales 
  ADD CONSTRAINT fk_sales_salesman 
  FOREIGN KEY (salesman_id) 
  REFERENCES user_profiles(id) 
  ON DELETE SET NULL;

-- Sale items foreign keys
ALTER TABLE sale_items 
  ADD CONSTRAINT fk_sale_items_sale 
  FOREIGN KEY (sale_id) 
  REFERENCES sales(id) 
  ON DELETE CASCADE;

ALTER TABLE sale_items 
  ADD CONSTRAINT fk_sale_items_product 
  FOREIGN KEY (product_id) 
  REFERENCES products(id) 
  ON DELETE RESTRICT;

ALTER TABLE sale_items 
  ADD CONSTRAINT fk_sale_items_variation 
  FOREIGN KEY (variation_id) 
  REFERENCES product_variations(id) 
  ON DELETE RESTRICT;

-- Purchases & Purchase Items
-- ----------------------------------------------------------------------------

-- Purchases table foreign keys
ALTER TABLE purchases 
  ADD CONSTRAINT fk_purchases_business 
  FOREIGN KEY (business_id) 
  REFERENCES businesses(id) 
  ON DELETE RESTRICT;

ALTER TABLE purchases 
  ADD CONSTRAINT fk_purchases_branch 
  FOREIGN KEY (branch_id) 
  REFERENCES business_locations(id) 
  ON DELETE RESTRICT;

ALTER TABLE purchases 
  ADD CONSTRAINT fk_purchases_supplier 
  FOREIGN KEY (supplier_id) 
  REFERENCES contacts(id) 
  ON DELETE SET NULL;

-- Purchase items foreign keys
ALTER TABLE purchase_items 
  ADD CONSTRAINT fk_purchase_items_purchase 
  FOREIGN KEY (purchase_id) 
  REFERENCES purchases(id) 
  ON DELETE CASCADE;

ALTER TABLE purchase_items 
  ADD CONSTRAINT fk_purchase_items_product 
  FOREIGN KEY (product_id) 
  REFERENCES products(id) 
  ON DELETE RESTRICT;

ALTER TABLE purchase_items 
  ADD CONSTRAINT fk_purchase_items_variation 
  FOREIGN KEY (variation_id) 
  REFERENCES product_variations(id) 
  ON DELETE RESTRICT;

-- Products & Variations
-- ----------------------------------------------------------------------------

-- Products table foreign keys
ALTER TABLE products 
  ADD CONSTRAINT fk_products_business 
  FOREIGN KEY (business_id) 
  REFERENCES businesses(id) 
  ON DELETE CASCADE;

ALTER TABLE products 
  ADD CONSTRAINT fk_products_category 
  FOREIGN KEY (category_id) 
  REFERENCES categories(id) 
  ON DELETE SET NULL;

-- Product variations foreign keys
ALTER TABLE product_variations 
  ADD CONSTRAINT fk_product_variations_product 
  FOREIGN KEY (product_id) 
  REFERENCES products(id) 
  ON DELETE CASCADE;

-- Branch Inventory
-- ----------------------------------------------------------------------------

ALTER TABLE branch_inventory 
  ADD CONSTRAINT fk_branch_inventory_branch 
  FOREIGN KEY (branch_id) 
  REFERENCES business_locations(id) 
  ON DELETE CASCADE;

ALTER TABLE branch_inventory 
  ADD CONSTRAINT fk_branch_inventory_product 
  FOREIGN KEY (product_id) 
  REFERENCES products(id) 
  ON DELETE CASCADE;

ALTER TABLE branch_inventory 
  ADD CONSTRAINT fk_branch_inventory_variation 
  FOREIGN KEY (variation_id) 
  REFERENCES product_variations(id) 
  ON DELETE CASCADE;

-- Contacts
-- ----------------------------------------------------------------------------

ALTER TABLE contacts 
  ADD CONSTRAINT fk_contacts_business 
  FOREIGN KEY (business_id) 
  REFERENCES businesses(id) 
  ON DELETE CASCADE;

-- User Profiles
-- ----------------------------------------------------------------------------

ALTER TABLE user_profiles 
  ADD CONSTRAINT fk_user_profiles_business 
  FOREIGN KEY (business_id) 
  REFERENCES businesses(id) 
  ON DELETE CASCADE;

-- Salesman Ledgers
-- ----------------------------------------------------------------------------

ALTER TABLE salesman_ledgers 
  ADD CONSTRAINT fk_salesman_ledgers_salesman 
  FOREIGN KEY (salesman_id) 
  REFERENCES user_profiles(id) 
  ON DELETE CASCADE;

-- Business Locations
-- ----------------------------------------------------------------------------

ALTER TABLE business_locations 
  ADD CONSTRAINT fk_business_locations_business 
  FOREIGN KEY (business_id) 
  REFERENCES businesses(id) 
  ON DELETE CASCADE;

-- Categories
-- ----------------------------------------------------------------------------

ALTER TABLE categories 
  ADD CONSTRAINT fk_categories_business 
  FOREIGN KEY (business_id) 
  REFERENCES businesses(id) 
  ON DELETE CASCADE;

-- ============================================================================
-- PART 2: UNIQUE CONSTRAINTS
-- ============================================================================

-- Sales - Invoice number must be unique per business
ALTER TABLE sales 
  ADD CONSTRAINT unique_invoice_per_business 
  UNIQUE (business_id, invoice_number);

-- Products - SKU must be unique per business
ALTER TABLE products 
  ADD CONSTRAINT unique_sku_per_business 
  UNIQUE (business_id, sku);

-- Product variations - SKU must be globally unique
ALTER TABLE product_variations 
  ADD CONSTRAINT unique_variation_sku 
  UNIQUE (sku);

-- Branch inventory - One record per branch/product/variation combination
ALTER TABLE branch_inventory 
  ADD CONSTRAINT unique_branch_product_variation 
  UNIQUE (branch_id, product_id, variation_id);

-- Contacts - Email must be unique per business (if provided)
ALTER TABLE contacts 
  ADD CONSTRAINT unique_contact_email_per_business 
  UNIQUE (business_id, email) 
  WHERE email IS NOT NULL;

-- Business locations - Branch code must be unique per business
ALTER TABLE business_locations 
  ADD CONSTRAINT unique_branch_code_per_business 
  UNIQUE (business_id, custom_field1) 
  WHERE custom_field1 IS NOT NULL;

-- User profiles - One profile per user
ALTER TABLE user_profiles 
  ADD CONSTRAINT unique_user_profile 
  UNIQUE (user_id);

-- ============================================================================
-- PART 3: CHECK CONSTRAINTS
-- ============================================================================

-- Sales constraints
-- ----------------------------------------------------------------------------

ALTER TABLE sales 
  ADD CONSTRAINT positive_subtotal 
  CHECK (subtotal >= 0);

ALTER TABLE sales 
  ADD CONSTRAINT positive_total 
  CHECK (total >= 0);

ALTER TABLE sales 
  ADD CONSTRAINT valid_discount 
  CHECK (discount >= 0);

ALTER TABLE sales 
  ADD CONSTRAINT valid_tax 
  CHECK (tax >= 0);

ALTER TABLE sales 
  ADD CONSTRAINT valid_payment_status 
  CHECK (payment_status IN ('paid', 'partial', 'pending', 'cancelled'));

-- Sale items constraints
-- ----------------------------------------------------------------------------

ALTER TABLE sale_items 
  ADD CONSTRAINT positive_quantity 
  CHECK (quantity >= 0);

ALTER TABLE sale_items 
  ADD CONSTRAINT positive_unit_price 
  CHECK (unit_price >= 0);

ALTER TABLE sale_items 
  ADD CONSTRAINT valid_item_discount 
  CHECK (discount >= 0 AND discount <= 100);

ALTER TABLE sale_items 
  ADD CONSTRAINT positive_item_total 
  CHECK (total >= 0);

-- Purchase constraints
-- ----------------------------------------------------------------------------

ALTER TABLE purchases 
  ADD CONSTRAINT positive_purchase_total 
  CHECK (total >= 0);

ALTER TABLE purchases 
  ADD CONSTRAINT valid_purchase_status 
  CHECK (status IN ('draft', 'ordered', 'received', 'cancelled'));

-- Purchase items constraints
-- ----------------------------------------------------------------------------

ALTER TABLE purchase_items 
  ADD CONSTRAINT positive_purchase_quantity 
  CHECK (quantity >= 0);

ALTER TABLE purchase_items 
  ADD CONSTRAINT positive_cost 
  CHECK (cost >= 0);

-- Products constraints
-- ----------------------------------------------------------------------------

ALTER TABLE products 
  ADD CONSTRAINT positive_price 
  CHECK (price >= 0);

ALTER TABLE products 
  ADD CONSTRAINT positive_product_cost 
  CHECK (cost >= 0);

ALTER TABLE products 
  ADD CONSTRAINT positive_stock 
  CHECK (stock >= 0);

-- Product variations constraints
-- ----------------------------------------------------------------------------

ALTER TABLE product_variations 
  ADD CONSTRAINT positive_variation_price 
  CHECK (price >= 0);

ALTER TABLE product_variations 
  ADD CONSTRAINT positive_variation_stock 
  CHECK (stock >= 0);

-- Branch inventory constraints
-- ----------------------------------------------------------------------------

ALTER TABLE branch_inventory 
  ADD CONSTRAINT positive_inventory_quantity 
  CHECK (quantity >= 0);

-- Contacts constraints
-- ----------------------------------------------------------------------------

ALTER TABLE contacts 
  ADD CONSTRAINT valid_contact_type 
  CHECK (type IN ('customer', 'supplier', 'both'));

-- User profiles constraints
-- ----------------------------------------------------------------------------

ALTER TABLE user_profiles 
  ADD CONSTRAINT valid_role 
  CHECK (role IN ('admin', 'manager', 'salesman', 'cashier'));

ALTER TABLE user_profiles 
  ADD CONSTRAINT valid_status 
  CHECK (status IN ('active', 'inactive', 'suspended'));

ALTER TABLE user_profiles 
  ADD CONSTRAINT positive_salary 
  CHECK (base_salary IS NULL OR base_salary >= 0);

ALTER TABLE user_profiles 
  ADD CONSTRAINT valid_commission 
  CHECK (commission_percentage IS NULL OR (commission_percentage >= 0 AND commission_percentage <= 100));

-- Salesman ledgers constraints
-- ----------------------------------------------------------------------------

ALTER TABLE salesman_ledgers 
  ADD CONSTRAINT positive_debit 
  CHECK (debit >= 0);

ALTER TABLE salesman_ledgers 
  ADD CONSTRAINT positive_credit 
  CHECK (credit >= 0);

ALTER TABLE salesman_ledgers 
  ADD CONSTRAINT valid_transaction_type 
  CHECK (transaction_type IN ('commission', 'salary', 'advance', 'payment', 'adjustment'));

-- ============================================================================
-- PART 4: PERFORMANCE INDEXES
-- ============================================================================

-- Sales indexes
-- ----------------------------------------------------------------------------

CREATE INDEX idx_sales_business_id ON sales(business_id);
CREATE INDEX idx_sales_branch_id ON sales(branch_id);
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_sales_salesman_id ON sales(salesman_id);
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_invoice_number ON sales(invoice_number);
CREATE INDEX idx_sales_payment_status ON sales(payment_status);
CREATE INDEX idx_sales_created_at ON sales(created_at DESC);

-- Sale items indexes
-- ----------------------------------------------------------------------------

CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX idx_sale_items_variation_id ON sale_items(variation_id);

-- Purchases indexes
-- ----------------------------------------------------------------------------

CREATE INDEX idx_purchases_business_id ON purchases(business_id);
CREATE INDEX idx_purchases_branch_id ON purchases(branch_id);
CREATE INDEX idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX idx_purchases_date ON purchases(purchase_date);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchases_created_at ON purchases(created_at DESC);

-- Purchase items indexes
-- ----------------------------------------------------------------------------

CREATE INDEX idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_product_id ON purchase_items(product_id);
CREATE INDEX idx_purchase_items_variation_id ON purchase_items(variation_id);

-- Products indexes
-- ----------------------------------------------------------------------------

CREATE INDEX idx_products_business_id ON products(business_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_has_variations ON products(has_variations);

-- Product variations indexes
-- ----------------------------------------------------------------------------

CREATE INDEX idx_product_variations_product_id ON product_variations(product_id);
CREATE INDEX idx_product_variations_sku ON product_variations(sku);

-- Branch inventory indexes
-- ----------------------------------------------------------------------------

CREATE INDEX idx_branch_inventory_branch_id ON branch_inventory(branch_id);
CREATE INDEX idx_branch_inventory_product_id ON branch_inventory(product_id);
CREATE INDEX idx_branch_inventory_variation_id ON branch_inventory(variation_id);
CREATE INDEX idx_branch_inventory_quantity ON branch_inventory(quantity);

-- Contacts indexes
-- ----------------------------------------------------------------------------

CREATE INDEX idx_contacts_business_id ON contacts(business_id);
CREATE INDEX idx_contacts_type ON contacts(type);
CREATE INDEX idx_contacts_name ON contacts(name);
CREATE INDEX idx_contacts_email ON contacts(email);

-- User profiles indexes
-- ----------------------------------------------------------------------------

CREATE INDEX idx_user_profiles_business_id ON user_profiles(business_id);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_status ON user_profiles(status);

-- Salesman ledgers indexes
-- ----------------------------------------------------------------------------

CREATE INDEX idx_salesman_ledgers_salesman_id ON salesman_ledgers(salesman_id);
CREATE INDEX idx_salesman_ledgers_date ON salesman_ledgers(transaction_date DESC);
CREATE INDEX idx_salesman_ledgers_type ON salesman_ledgers(transaction_type);

-- Business locations indexes
-- ----------------------------------------------------------------------------

CREATE INDEX idx_business_locations_business_id ON business_locations(business_id);
CREATE INDEX idx_business_locations_active ON business_locations(is_active);

-- Categories indexes
-- ----------------------------------------------------------------------------

CREATE INDEX idx_categories_business_id ON categories(business_id);
CREATE INDEX idx_categories_name ON categories(name);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- 1. List all foreign key constraints
-- SELECT 
--   tc.table_name, 
--   tc.constraint_name, 
--   tc.constraint_type,
--   kcu.column_name, 
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name 
-- FROM information_schema.table_constraints AS tc 
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY' 
-- AND tc.table_schema = 'public'
-- ORDER BY tc.table_name;

-- 2. List all unique constraints
-- SELECT 
--   tc.table_name, 
--   tc.constraint_name,
--   STRING_AGG(kcu.column_name, ', ') AS columns
-- FROM information_schema.table_constraints AS tc 
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- WHERE tc.constraint_type = 'UNIQUE' 
-- AND tc.table_schema = 'public'
-- GROUP BY tc.table_name, tc.constraint_name
-- ORDER BY tc.table_name;

-- 3. List all check constraints
-- SELECT 
--   tc.table_name,
--   tc.constraint_name,
--   cc.check_clause
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.check_constraints AS cc
--   ON tc.constraint_name = cc.constraint_name
-- WHERE tc.constraint_type = 'CHECK'
-- AND tc.table_schema = 'public'
-- ORDER BY tc.table_name;

-- 4. List all indexes
-- SELECT 
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;

-- ============================================================================
-- TEST QUERIES (Verify constraints work)
-- ============================================================================

-- Test 1: Try to insert negative quantity (should fail)
-- INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total) 
-- VALUES (1, 1, -5, 100, -500);
-- Expected: ERROR: check constraint "positive_quantity" violated

-- Test 2: Try to insert duplicate invoice (should fail)
-- INSERT INTO sales (business_id, invoice_number, ...) VALUES (1, 'INV-001', ...);
-- INSERT INTO sales (business_id, invoice_number, ...) VALUES (1, 'INV-001', ...);
-- Expected: ERROR: duplicate key violates unique constraint "unique_invoice_per_business"

-- Test 3: Try to delete product with sales (should fail)
-- DELETE FROM products WHERE id = 1;
-- Expected: ERROR: update or delete violates foreign key constraint

-- ============================================================================
-- ROLLBACK (Emergency use only)
-- ============================================================================

-- To drop all constraints:
-- ALTER TABLE sales DROP CONSTRAINT IF EXISTS fk_sales_business CASCADE;
-- -- etc for all constraints

-- To drop all indexes:
-- DROP INDEX IF EXISTS idx_sales_business_id;
-- -- etc for all indexes

-- ============================================================================
-- END OF CONSTRAINTS MIGRATION
-- ============================================================================

