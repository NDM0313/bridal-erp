-- ============================================
-- POS SYSTEM SCHEMA FOR SUPABASE
-- Safe to re-run (uses IF NOT EXISTS)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE BUSINESS TABLES
-- ============================================

-- Businesses table
CREATE TABLE IF NOT EXISTS businesses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    currency_id INTEGER NULL,
    start_date DATE NULL,
    tax_number_1 VARCHAR(100) NULL,
    tax_label_1 VARCHAR(10) NULL,
    tax_number_2 VARCHAR(100) NULL,
    tax_label_2 VARCHAR(10) NULL,
    default_profit_percent NUMERIC(5, 2) DEFAULT 0,
    owner_id UUID NOT NULL,
    time_zone VARCHAR(50) DEFAULT 'UTC',
    fy_start_month SMALLINT DEFAULT 1,
    accounting_method VARCHAR(10) DEFAULT 'fifo' CHECK (accounting_method IN ('fifo', 'lifo', 'avco')),
    default_sales_discount NUMERIC(5, 2) NULL,
    sell_price_tax VARCHAR(10) DEFAULT 'includes' CHECK (sell_price_tax IN ('includes', 'excludes')),
    logo VARCHAR(255) NULL,
    sku_prefix VARCHAR(50) NULL,
    enable_tooltip BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);

-- Business locations table
CREATE TABLE IF NOT EXISTS business_locations (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    name VARCHAR(256) NOT NULL,
    landmark TEXT NULL,
    country VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    city VARCHAR(100) NULL,
    zip_code VARCHAR(7) NULL,
    mobile VARCHAR(20) NULL,
    alternate_number VARCHAR(20) NULL,
    email VARCHAR(255) NULL,
    website VARCHAR(255) NULL,
    custom_field1 VARCHAR(255) NULL,
    custom_field2 VARCHAR(255) NULL,
    custom_field3 VARCHAR(255) NULL,
    custom_field4 VARCHAR(255) NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_business_locations_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_business_locations_business_id ON business_locations(business_id);
CREATE INDEX IF NOT EXISTS idx_business_locations_deleted_at ON business_locations(deleted_at) WHERE deleted_at IS NULL;

-- User profiles table (links Supabase Auth users to businesses)
CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id INTEGER NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_profiles_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_profiles_user_id UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_business_id ON user_profiles(business_id);

-- ============================================
-- PRODUCT & INVENTORY TABLES
-- ============================================

-- Units table
CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    actual_name VARCHAR(255) NOT NULL,
    short_name VARCHAR(255) NOT NULL,
    allow_decimal BOOLEAN NOT NULL DEFAULT false,
    base_unit_id INTEGER NULL,
    base_unit_multiplier NUMERIC(20, 4) NULL,
    created_by UUID NOT NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_units_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_units_base_unit FOREIGN KEY (base_unit_id) REFERENCES units(id) ON DELETE SET NULL,
    CONSTRAINT chk_units_multiplier CHECK (
        (base_unit_id IS NULL AND base_unit_multiplier IS NULL) OR
        (base_unit_id IS NOT NULL AND base_unit_multiplier IS NOT NULL AND base_unit_multiplier > 0)
    )
);

CREATE INDEX IF NOT EXISTS idx_units_business_id ON units(business_id);
CREATE INDEX IF NOT EXISTS idx_units_base_unit_id ON units(base_unit_id);
CREATE INDEX IF NOT EXISTS idx_units_deleted_at ON units(deleted_at) WHERE deleted_at IS NULL;

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'single' CHECK (type IN ('single', 'variable')),
    unit_id INTEGER NOT NULL,
    secondary_unit_id INTEGER NULL,
    brand_id INTEGER NULL,
    category_id INTEGER NULL,
    sub_category_id INTEGER NULL,
    tax_id INTEGER NULL,
    tax_type VARCHAR(20) NOT NULL DEFAULT 'exclusive' CHECK (tax_type IN ('inclusive', 'exclusive')),
    enable_stock BOOLEAN NOT NULL DEFAULT false,
    alert_quantity NUMERIC(22, 4) NOT NULL DEFAULT 0,
    sku VARCHAR(255) NOT NULL,
    barcode_type VARCHAR(20) NOT NULL DEFAULT 'C128' CHECK (barcode_type IN ('C39', 'C128', 'EAN-13', 'EAN-8', 'UPC-A', 'UPC-E', 'ITF-14')),
    is_inactive BOOLEAN NOT NULL DEFAULT false,
    not_for_selling BOOLEAN NOT NULL DEFAULT false,
    product_description TEXT NULL,
    image VARCHAR(255) NULL,
    weight NUMERIC(22, 4) NULL,
    product_custom_field1 VARCHAR(255) NULL,
    product_custom_field2 VARCHAR(255) NULL,
    product_custom_field3 VARCHAR(255) NULL,
    product_custom_field4 VARCHAR(255) NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_products_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    CONSTRAINT fk_products_secondary_unit FOREIGN KEY (secondary_unit_id) REFERENCES units(id) ON DELETE SET NULL,
    CONSTRAINT uq_products_business_sku UNIQUE (business_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_unit_id ON products(unit_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_created_by ON products(created_by);

-- Product variations table
CREATE TABLE IF NOT EXISTS product_variations (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_dummy BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_variations_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_variations_product_id ON product_variations(product_id);

-- Variations table
CREATE TABLE IF NOT EXISTS variations (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    product_variation_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    sub_sku VARCHAR(255) NULL,
    default_purchase_price NUMERIC(22, 4) NULL,
    dpp_inc_tax NUMERIC(22, 4) NOT NULL DEFAULT 0,
    profit_percent NUMERIC(22, 4) NOT NULL DEFAULT 0,
    default_sell_price NUMERIC(22, 4) NULL,
    sell_price_inc_tax NUMERIC(22, 4) NULL,
    retail_price NUMERIC(22, 4) NOT NULL DEFAULT 0,
    wholesale_price NUMERIC(22, 4) NOT NULL DEFAULT 0,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_variations_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_variations_product_variation FOREIGN KEY (product_variation_id) REFERENCES product_variations(id) ON DELETE CASCADE,
    CONSTRAINT chk_variations_prices CHECK (retail_price >= 0 AND wholesale_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_variations_product_id ON variations(product_id);
CREATE INDEX IF NOT EXISTS idx_variations_product_variation_id ON variations(product_variation_id);
CREATE INDEX IF NOT EXISTS idx_variations_sub_sku ON variations(sub_sku) WHERE sub_sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_variations_deleted_at ON variations(deleted_at) WHERE deleted_at IS NULL;

-- Variation location details table (stock)
CREATE TABLE IF NOT EXISTS variation_location_details (
    id SERIAL PRIMARY KEY,
    variation_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_variation_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    qty_available NUMERIC(22, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vld_variation FOREIGN KEY (variation_id) REFERENCES variations(id) ON DELETE CASCADE,
    CONSTRAINT fk_vld_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_vld_location FOREIGN KEY (location_id) REFERENCES business_locations(id) ON DELETE CASCADE,
    CONSTRAINT uq_vld_variation_location UNIQUE (variation_id, location_id),
    CONSTRAINT chk_vld_qty_available CHECK (qty_available >= 0)
);

CREATE INDEX IF NOT EXISTS idx_vld_variation_id ON variation_location_details(variation_id);
CREATE INDEX IF NOT EXISTS idx_vld_product_id ON variation_location_details(product_id);
CREATE INDEX IF NOT EXISTS idx_vld_location_id ON variation_location_details(location_id);
CREATE INDEX IF NOT EXISTS idx_vld_variation_location ON variation_location_details(variation_id, location_id);

-- ============================================
-- TRANSACTION TABLES
-- ============================================

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('sell', 'purchase', 'sell_return', 'purchase_return', 'stock_adjustment', 'sell_transfer', 'purchase_transfer', 'opening_stock', 'expense', 'expense_refund', 'sales_order', 'purchase_order', 'stock_transfer')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'pending', 'ordered', 'received', 'in_transit', 'completed', 'cancelled')),
    payment_status VARCHAR(20) DEFAULT 'due' CHECK (payment_status IN ('paid', 'partial', 'due')),
    contact_id INTEGER NULL,
    customer_type VARCHAR(20) NULL CHECK (customer_type IN ('retail', 'wholesale')),
    invoice_no VARCHAR(255) NULL,
    ref_no VARCHAR(255) NULL,
    transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_before_tax NUMERIC(22, 4) NOT NULL DEFAULT 0,
    tax_id INTEGER NULL,
    tax_amount NUMERIC(22, 4) NOT NULL DEFAULT 0,
    discount_type VARCHAR(20) NULL CHECK (discount_type IN ('fixed', 'percentage')),
    discount_amount NUMERIC(22, 4) NOT NULL DEFAULT 0,
    shipping_charges NUMERIC(22, 4) NOT NULL DEFAULT 0,
    final_total NUMERIC(22, 4) NOT NULL DEFAULT 0,
    shipping_details TEXT NULL,
    additional_notes TEXT NULL,
    staff_note TEXT NULL,
    created_by UUID NOT NULL,
    return_parent_id INTEGER NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transactions_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_transactions_location FOREIGN KEY (location_id) REFERENCES business_locations(id) ON DELETE CASCADE,
    CONSTRAINT fk_transactions_return_parent FOREIGN KEY (return_parent_id) REFERENCES transactions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_business_id ON transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_location_id ON transactions(location_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON transactions(created_by);

-- Transaction sell lines table
CREATE TABLE IF NOT EXISTS transaction_sell_lines (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    variation_id INTEGER NOT NULL,
    quantity NUMERIC(22, 4) NOT NULL,
    unit_id INTEGER NOT NULL,
    unit_price NUMERIC(22, 4) NOT NULL,
    unit_price_inc_tax NUMERIC(22, 4) NOT NULL DEFAULT 0,
    line_discount_type VARCHAR(20) NULL CHECK (line_discount_type IN ('fixed', 'percentage')),
    line_discount_amount NUMERIC(22, 4) NOT NULL DEFAULT 0,
    item_tax NUMERIC(22, 4) NOT NULL DEFAULT 0,
    tax_id INTEGER NULL,
    line_total NUMERIC(22, 4) NOT NULL,
    sell_line_note TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tsl_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_tsl_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_tsl_variation FOREIGN KEY (variation_id) REFERENCES variations(id) ON DELETE CASCADE,
    CONSTRAINT fk_tsl_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    CONSTRAINT chk_tsl_quantity CHECK (quantity > 0),
    CONSTRAINT chk_tsl_unit_price CHECK (unit_price >= 0),
    CONSTRAINT chk_tsl_line_total CHECK (line_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_tsl_transaction_id ON transaction_sell_lines(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tsl_product_id ON transaction_sell_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_tsl_variation_id ON transaction_sell_lines(variation_id);
CREATE INDEX IF NOT EXISTS idx_tsl_unit_id ON transaction_sell_lines(unit_id);

-- Purchase lines table
CREATE TABLE IF NOT EXISTS purchase_lines (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    variation_id INTEGER NOT NULL,
    quantity NUMERIC(22, 4) NOT NULL,
    unit_id INTEGER NOT NULL,
    purchase_price NUMERIC(22, 4) NOT NULL,
    purchase_price_inc_tax NUMERIC(22, 4) NOT NULL DEFAULT 0,
    item_tax NUMERIC(22, 4) NOT NULL DEFAULT 0,
    tax_id INTEGER NULL,
    line_total NUMERIC(22, 4) NOT NULL,
    mfg_date DATE NULL,
    exp_date DATE NULL,
    lot_number VARCHAR(50) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pl_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_pl_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_pl_variation FOREIGN KEY (variation_id) REFERENCES variations(id) ON DELETE CASCADE,
    CONSTRAINT fk_pl_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    CONSTRAINT chk_pl_quantity CHECK (quantity > 0),
    CONSTRAINT chk_pl_purchase_price CHECK (purchase_price >= 0),
    CONSTRAINT chk_pl_line_total CHECK (line_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_pl_transaction_id ON purchase_lines(transaction_id);
CREATE INDEX IF NOT EXISTS idx_pl_product_id ON purchase_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_pl_variation_id ON purchase_lines(variation_id);
CREATE INDEX IF NOT EXISTS idx_pl_unit_id ON purchase_lines(unit_id);

-- Stock adjustment lines table
CREATE TABLE IF NOT EXISTS stock_adjustment_lines (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    variation_id INTEGER NOT NULL,
    quantity NUMERIC(22, 4) NOT NULL,
    unit_id INTEGER NOT NULL,
    adjustment_type VARCHAR(10) NOT NULL CHECK (adjustment_type IN ('increase', 'decrease')),
    reason TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sal_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_sal_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_sal_variation FOREIGN KEY (variation_id) REFERENCES variations(id) ON DELETE CASCADE,
    CONSTRAINT fk_sal_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    CONSTRAINT chk_sal_quantity CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_sal_transaction_id ON stock_adjustment_lines(transaction_id);
CREATE INDEX IF NOT EXISTS idx_sal_product_id ON stock_adjustment_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_sal_variation_id ON stock_adjustment_lines(variation_id);
CREATE INDEX IF NOT EXISTS idx_sal_unit_id ON stock_adjustment_lines(unit_id);

-- Stock transfer lines table
CREATE TABLE IF NOT EXISTS stock_transfer_lines (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    variation_id INTEGER NOT NULL,
    quantity NUMERIC(22, 4) NOT NULL,
    unit_id INTEGER NOT NULL,
    source_location_id INTEGER NOT NULL,
    destination_location_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stl_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_stl_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_stl_variation FOREIGN KEY (variation_id) REFERENCES variations(id) ON DELETE CASCADE,
    CONSTRAINT fk_stl_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    CONSTRAINT fk_stl_source_location FOREIGN KEY (source_location_id) REFERENCES business_locations(id) ON DELETE CASCADE,
    CONSTRAINT fk_stl_destination_location FOREIGN KEY (destination_location_id) REFERENCES business_locations(id) ON DELETE CASCADE,
    CONSTRAINT chk_stl_quantity CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_stl_transaction_id ON stock_transfer_lines(transaction_id);
CREATE INDEX IF NOT EXISTS idx_stl_product_id ON stock_transfer_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_stl_variation_id ON stock_transfer_lines(variation_id);
CREATE INDEX IF NOT EXISTS idx_stl_unit_id ON stock_transfer_lines(unit_id);

-- ============================================
-- HELPER FUNCTION
-- ============================================

-- Function to get user's business_id
CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_business_id INTEGER;
BEGIN
    SELECT business_id INTO user_business_id
    FROM user_profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    RETURN user_business_id;
END;
$$;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE variation_location_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_sell_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustment_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_lines ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- User profiles policies
DROP POLICY IF EXISTS "Users view own profile" ON user_profiles;
CREATE POLICY "Users view own profile" ON user_profiles
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own profile" ON user_profiles;
CREATE POLICY "Users update own profile" ON user_profiles
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own profile" ON user_profiles;
CREATE POLICY "Users insert own profile" ON user_profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Businesses policies
DROP POLICY IF EXISTS "Users view own business" ON businesses;
CREATE POLICY "Users view own business" ON businesses
FOR SELECT USING (id = get_user_business_id());

DROP POLICY IF EXISTS "Users update own business" ON businesses;
CREATE POLICY "Users update own business" ON businesses
FOR UPDATE USING (id = get_user_business_id());

-- Business locations policies
DROP POLICY IF EXISTS "Users view own locations" ON business_locations;
CREATE POLICY "Users view own locations" ON business_locations
FOR SELECT USING (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users manage own locations" ON business_locations;
CREATE POLICY "Users manage own locations" ON business_locations
FOR ALL USING (business_id = get_user_business_id());

-- Units policies
DROP POLICY IF EXISTS "Users view own units" ON units;
CREATE POLICY "Users view own units" ON units
FOR SELECT USING (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users manage own units" ON units;
CREATE POLICY "Users manage own units" ON units
FOR ALL USING (business_id = get_user_business_id());

-- Products policies
DROP POLICY IF EXISTS "Users view own products" ON products;
CREATE POLICY "Users view own products" ON products
FOR SELECT USING (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users manage own products" ON products;
CREATE POLICY "Users manage own products" ON products
FOR ALL USING (business_id = get_user_business_id());

-- Product variations policies
DROP POLICY IF EXISTS "Users view own product_variations" ON product_variations;
CREATE POLICY "Users view own product_variations" ON product_variations
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM products 
        WHERE products.id = product_variations.product_id 
        AND products.business_id = get_user_business_id()
    )
);

DROP POLICY IF EXISTS "Users manage own product_variations" ON product_variations;
CREATE POLICY "Users manage own product_variations" ON product_variations
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM products 
        WHERE products.id = product_variations.product_id 
        AND products.business_id = get_user_business_id()
    )
);

-- Variations policies
DROP POLICY IF EXISTS "Users view own variations" ON variations;
CREATE POLICY "Users view own variations" ON variations
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM products 
        WHERE products.id = variations.product_id 
        AND products.business_id = get_user_business_id()
    )
);

DROP POLICY IF EXISTS "Users manage own variations" ON variations;
CREATE POLICY "Users manage own variations" ON variations
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM products 
        WHERE products.id = variations.product_id 
        AND products.business_id = get_user_business_id()
    )
);

-- Variation location details policies
DROP POLICY IF EXISTS "Users view own stock" ON variation_location_details;
CREATE POLICY "Users view own stock" ON variation_location_details
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM products 
        WHERE products.id = variation_location_details.product_id 
        AND products.business_id = get_user_business_id()
    )
);

DROP POLICY IF EXISTS "Users manage own stock" ON variation_location_details;
CREATE POLICY "Users manage own stock" ON variation_location_details
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM products 
        WHERE products.id = variation_location_details.product_id 
        AND products.business_id = get_user_business_id()
    )
);

-- Transactions policies
DROP POLICY IF EXISTS "Users view own transactions" ON transactions;
CREATE POLICY "Users view own transactions" ON transactions
FOR SELECT USING (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users manage own transactions" ON transactions;
CREATE POLICY "Users manage own transactions" ON transactions
FOR ALL USING (business_id = get_user_business_id());

-- Transaction sell lines policies
DROP POLICY IF EXISTS "Users view own sell lines" ON transaction_sell_lines;
CREATE POLICY "Users view own sell lines" ON transaction_sell_lines
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM transactions 
        WHERE transactions.id = transaction_sell_lines.transaction_id 
        AND transactions.business_id = get_user_business_id()
    )
);

DROP POLICY IF EXISTS "Users manage own sell lines" ON transaction_sell_lines;
CREATE POLICY "Users manage own sell lines" ON transaction_sell_lines
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM transactions 
        WHERE transactions.id = transaction_sell_lines.transaction_id 
        AND transactions.business_id = get_user_business_id()
    )
);

-- Purchase lines policies
DROP POLICY IF EXISTS "Users view own purchase lines" ON purchase_lines;
CREATE POLICY "Users view own purchase lines" ON purchase_lines
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM transactions 
        WHERE transactions.id = purchase_lines.transaction_id 
        AND transactions.business_id = get_user_business_id()
    )
);

DROP POLICY IF EXISTS "Users manage own purchase lines" ON purchase_lines;
CREATE POLICY "Users manage own purchase lines" ON purchase_lines
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM transactions 
        WHERE transactions.id = purchase_lines.transaction_id 
        AND transactions.business_id = get_user_business_id()
    )
);

-- Stock adjustment lines policies
DROP POLICY IF EXISTS "Users view own adjustment lines" ON stock_adjustment_lines;
CREATE POLICY "Users view own adjustment lines" ON stock_adjustment_lines
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM transactions 
        WHERE transactions.id = stock_adjustment_lines.transaction_id 
        AND transactions.business_id = get_user_business_id()
    )
);

DROP POLICY IF EXISTS "Users manage own adjustment lines" ON stock_adjustment_lines;
CREATE POLICY "Users manage own adjustment lines" ON stock_adjustment_lines
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM transactions 
        WHERE transactions.id = stock_adjustment_lines.transaction_id 
        AND transactions.business_id = get_user_business_id()
    )
);

-- Stock transfer lines policies
DROP POLICY IF EXISTS "Users view own transfer lines" ON stock_transfer_lines;
CREATE POLICY "Users view own transfer lines" ON stock_transfer_lines
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM transactions 
        WHERE transactions.id = stock_transfer_lines.transaction_id 
        AND transactions.business_id = get_user_business_id()
    )
);

DROP POLICY IF EXISTS "Users manage own transfer lines" ON stock_transfer_lines;
CREATE POLICY "Users manage own transfer lines" ON stock_transfer_lines
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM transactions 
        WHERE transactions.id = stock_transfer_lines.transaction_id 
        AND transactions.business_id = get_user_business_id()
    )
);

