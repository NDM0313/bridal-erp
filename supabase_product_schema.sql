-- ============================================
-- Product Module Schema for Supabase (PostgreSQL)
-- Based on Laravel Migrations
-- ============================================

-- 1. UNITS TABLE
-- Handles base_unit logic for Boxes/Pcs conversion
CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    actual_name VARCHAR(255) NOT NULL,
    short_name VARCHAR(255) NOT NULL,
    allow_decimal BOOLEAN NOT NULL DEFAULT false,
    base_unit_id INTEGER NULL,
    base_unit_multiplier NUMERIC(20, 4) NULL,
    created_by INTEGER NOT NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_units_business FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE,
    CONSTRAINT fk_units_base_unit FOREIGN KEY (base_unit_id) REFERENCES units(id) ON DELETE SET NULL,
    CONSTRAINT fk_units_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for units
CREATE INDEX idx_units_business_id ON units(business_id);
CREATE INDEX idx_units_base_unit_id ON units(base_unit_id);

-- 2. BRANDS TABLE
CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    created_by INTEGER NOT NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_brands_business FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE,
    CONSTRAINT fk_brands_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for brands
CREATE INDEX idx_brands_business_id ON brands(business_id);

-- 3. CATEGORIES TABLE
-- Supports hierarchical structure with parent_id
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    short_code VARCHAR(255) NULL,
    parent_id INTEGER NULL DEFAULT 0,
    category_type VARCHAR(255) NULL,
    description TEXT NULL,
    slug VARCHAR(255) NULL,
    created_by INTEGER NOT NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_categories_business FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE,
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_categories_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for categories
CREATE INDEX idx_categories_business_id ON categories(business_id);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);

-- 4. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'single' CHECK (type IN ('single', 'variable')),
    unit_id INTEGER NOT NULL,
    brand_id INTEGER NULL,
    category_id INTEGER NULL,
    sub_category_id INTEGER NULL,
    tax INTEGER NULL,
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
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_business FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE,
    CONSTRAINT fk_products_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    CONSTRAINT fk_products_sub_category FOREIGN KEY (sub_category_id) REFERENCES categories(id) ON DELETE CASCADE,
    CONSTRAINT fk_products_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for products
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_business_id ON products(business_id);
CREATE INDEX idx_products_unit_id ON products(unit_id);
CREATE INDEX idx_products_created_by ON products(created_by);
CREATE INDEX idx_products_sku ON products(sku);

-- 5. PRODUCT_VARIATIONS TABLE
-- Used for variable products (e.g., Size, Color combinations)
CREATE TABLE IF NOT EXISTS product_variations (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_dummy BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_variations_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Indexes for product_variations
CREATE INDEX idx_product_variations_name ON product_variations(name);
CREATE INDEX idx_product_variations_product_id ON product_variations(product_id);

-- 6. VARIATIONS TABLE
-- Contains pricing (retail_price and wholesale_price) and SKU for each variation
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
    -- Retail and Wholesale pricing (as per requirements)
    retail_price NUMERIC(22, 4) NOT NULL DEFAULT 0,
    wholesale_price NUMERIC(22, 4) NOT NULL DEFAULT 0,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_variations_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_variations_product_variation FOREIGN KEY (product_variation_id) REFERENCES product_variations(id) ON DELETE CASCADE
);

-- Indexes for variations
CREATE INDEX idx_variations_name ON variations(name);
CREATE INDEX idx_variations_sub_sku ON variations(sub_sku);
CREATE INDEX idx_variations_product_id ON variations(product_id);
CREATE INDEX idx_variations_product_variation_id ON variations(product_variation_id);

-- ============================================
-- NOTES:
-- 1. All tables include business_id for multi-tenancy support
-- 2. Units table supports base_unit logic: base_unit_id references another unit, 
--    and base_unit_multiplier stores the conversion factor (e.g., 1 Box = 12 Pcs)
-- 3. Variations table includes retail_price and wholesale_price for dual pricing
-- 4. All foreign keys use appropriate CASCADE/SET NULL behavior
-- 5. Soft deletes are supported via deleted_at columns where applicable
-- ============================================

