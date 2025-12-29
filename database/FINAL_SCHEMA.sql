-- ============================================
-- FINAL DATABASE SCHEMA FOR SUPABASE (PostgreSQL)
-- POS / Business Management System
-- ============================================
-- 
-- CRITICAL BUSINESS RULES:
-- 1. Inventory is ALWAYS stored in BASE UNIT = PIECES
-- 2. Products can be sold/purchased in Pieces OR Box
-- 3. Box is a secondary unit (1 Box = N Pieces via base_unit_multiplier)
-- 4. All stock calculations must convert to Pieces before updating qty_available
-- 5. Multi-business support: All tables have business_id
-- 6. Multi-location support: Stock tracked per location
-- 7. Dual pricing: retail_price and wholesale_price in variations
-- ============================================

-- ============================================
-- CORE BUSINESS TABLES
-- ============================================

-- 1. BUSINESSES TABLE
-- Purpose: Multi-tenancy root table. Each business is a separate tenant.
-- Why: Enables SaaS model where multiple businesses use the same system.
CREATE TABLE businesses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    currency_id INTEGER NULL,  -- References currencies table (if exists)
    start_date DATE NULL,
    tax_number_1 VARCHAR(100) NULL,
    tax_label_1 VARCHAR(10) NULL,
    tax_number_2 VARCHAR(100) NULL,
    tax_label_2 VARCHAR(10) NULL,
    default_profit_percent NUMERIC(5, 2) DEFAULT 0,
    owner_id INTEGER NOT NULL,  -- References users table (Supabase Auth)
    time_zone VARCHAR(50) DEFAULT 'UTC',
    fy_start_month SMALLINT DEFAULT 1,  -- Financial year start month
    accounting_method VARCHAR(10) DEFAULT 'fifo' CHECK (accounting_method IN ('fifo', 'lifo', 'avco')),
    default_sales_discount NUMERIC(5, 2) NULL,
    sell_price_tax VARCHAR(10) DEFAULT 'includes' CHECK (sell_price_tax IN ('includes', 'excludes')),
    logo VARCHAR(255) NULL,
    sku_prefix VARCHAR(50) NULL,
    enable_tooltip BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_businesses_owner_id ON businesses(owner_id);

COMMENT ON TABLE businesses IS 'Root table for multi-tenancy. Each business is a separate tenant.';
COMMENT ON COLUMN businesses.owner_id IS 'References Supabase Auth users.id';

-- 2. BUSINESS_LOCATIONS TABLE
-- Purpose: Multiple physical locations per business (stores, warehouses).
-- Why: Businesses operate from multiple locations, stock must be tracked per location.
CREATE TABLE business_locations (
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

CREATE INDEX idx_business_locations_business_id ON business_locations(business_id);
CREATE INDEX idx_business_locations_deleted_at ON business_locations(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE business_locations IS 'Physical locations (stores/warehouses) for each business. Stock is tracked per location.';

-- 3. CONTACTS TABLE (Customers & Suppliers)
-- Purpose: Unified table for both customers and suppliers.
-- Why: Single table simplifies queries and allows contacts to be both customer and supplier.
CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('customer', 'supplier', 'both', 'lead')),  -- 'customer' = retail/wholesale, 'supplier' = vendor
    supplier_business_name VARCHAR(255) NULL,  -- For suppliers
    name VARCHAR(255) NOT NULL,
    tax_number VARCHAR(100) NULL,
    city VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    country VARCHAR(100) NULL,
    landmark TEXT NULL,
    mobile VARCHAR(20) NOT NULL,
    landline VARCHAR(20) NULL,
    alternate_number VARCHAR(20) NULL,
    email VARCHAR(255) NULL,
    pay_term_number INTEGER NULL,  -- Payment terms: number
    pay_term_type VARCHAR(10) NULL CHECK (pay_term_type IN ('days', 'months')),  -- Payment terms: type
    credit_limit NUMERIC(22, 4) NULL,
    -- Customer-specific fields
    customer_type VARCHAR(20) NULL CHECK (customer_type IN ('retail', 'wholesale')),  -- CRITICAL: Determines which price to use (retail_price vs wholesale_price)
    customer_group_id INTEGER NULL,  -- References customer_groups if exists
    -- Supplier-specific fields
    -- Additional fields
    is_default BOOLEAN DEFAULT false,  -- Default walk-in customer
    created_by INTEGER NOT NULL,  -- References users
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_contacts_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX idx_contacts_business_id ON contacts(business_id);
CREATE INDEX idx_contacts_type ON contacts(type);
CREATE INDEX idx_contacts_customer_type ON contacts(customer_type) WHERE customer_type IS NOT NULL;
CREATE INDEX idx_contacts_deleted_at ON contacts(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE contacts IS 'Unified table for customers and suppliers. customer_type (retail/wholesale) determines pricing.';
COMMENT ON COLUMN contacts.customer_type IS 'CRITICAL: retail = use retail_price, wholesale = use wholesale_price from variations table';
COMMENT ON COLUMN contacts.type IS 'customer, supplier, both, or lead';

-- ============================================
-- PRODUCT & INVENTORY TABLES
-- ============================================

-- 4. UNITS TABLE
-- Purpose: Unit of measurement management with base unit conversion logic.
-- Why: Products need to be sold in different units (Pieces, Box). Box is always a sub-unit of Pieces.
-- CRITICAL: base_unit_id and base_unit_multiplier enable Box/Pieces conversion.
CREATE TABLE units (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    actual_name VARCHAR(255) NOT NULL,  -- Full name: "Pieces", "Box", "Kilogram"
    short_name VARCHAR(255) NOT NULL,    -- Abbreviation: "Pcs", "Box", "Kg"
    allow_decimal BOOLEAN NOT NULL DEFAULT false,  -- Can quantity have decimals?
    -- BASE UNIT LOGIC (CRITICAL FOR BOX/PIECES):
    base_unit_id INTEGER NULL,  -- If this is a sub-unit, references the base unit (e.g., Box -> Pieces)
    base_unit_multiplier NUMERIC(20, 4) NULL,  -- Conversion factor: 1 Box = 12 Pieces (multiplier = 12)
    created_by INTEGER NOT NULL,  -- References users
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_units_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_units_base_unit FOREIGN KEY (base_unit_id) REFERENCES units(id) ON DELETE SET NULL,
    CONSTRAINT fk_units_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    -- Validation: If base_unit_id is set, multiplier must be set
    CONSTRAINT chk_units_multiplier CHECK (
        (base_unit_id IS NULL AND base_unit_multiplier IS NULL) OR
        (base_unit_id IS NOT NULL AND base_unit_multiplier IS NOT NULL AND base_unit_multiplier > 0)
    )
);

CREATE INDEX idx_units_business_id ON units(business_id);
CREATE INDEX idx_units_base_unit_id ON units(base_unit_id);
CREATE INDEX idx_units_deleted_at ON units(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE units IS 'Unit of measurement. Supports base unit conversion (e.g., Box -> Pieces).';
COMMENT ON COLUMN units.base_unit_id IS 'If set, this unit is a sub-unit of the referenced base unit (e.g., Box is sub-unit of Pieces)';
COMMENT ON COLUMN units.base_unit_multiplier IS 'CRITICAL: Conversion factor. Example: 1 Box = 12 Pieces means multiplier = 12. Used to convert Box to Pieces for stock calculations.';
COMMENT ON COLUMN units.allow_decimal IS 'Whether this unit allows decimal quantities (e.g., 1.5 Kg)';

-- Example data:
-- id=1, actual_name='Pieces', short_name='Pcs', base_unit_id=NULL, base_unit_multiplier=NULL (BASE UNIT)
-- id=2, actual_name='Box', short_name='Box', base_unit_id=1, base_unit_multiplier=12 (1 Box = 12 Pieces)

-- 5. BRANDS TABLE
-- Purpose: Product brand management.
CREATE TABLE brands (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    created_by INTEGER NOT NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_brands_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_brands_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_brands_business_id ON brands(business_id);
CREATE INDEX idx_brands_deleted_at ON brands(deleted_at) WHERE deleted_at IS NULL;

-- 6. CATEGORIES TABLE
-- Purpose: Product categorization with hierarchical support (parent categories).
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    short_code VARCHAR(255) NULL,
    parent_id INTEGER NULL,  -- Self-reference for hierarchical categories
    category_type VARCHAR(255) NULL,  -- 'product', 'expense', etc.
    description TEXT NULL,
    slug VARCHAR(255) NULL,
    created_by INTEGER NOT NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_categories_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_categories_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_categories_business_id ON categories(business_id);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_deleted_at ON categories(deleted_at) WHERE deleted_at IS NULL;

-- 7. PRODUCTS TABLE
-- Purpose: Product master data. Products can be 'single' or 'variable' (with variations).
-- Why: Core product information. Variations handle different SKUs and pricing.
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'single' CHECK (type IN ('single', 'variable')),
    -- UNIT REFERENCES (CRITICAL):
    unit_id INTEGER NOT NULL,  -- Base unit (ALWAYS Pieces for stock calculations)
    secondary_unit_id INTEGER NULL,  -- Optional secondary unit (e.g., Box) for display/sales
    -- RELATIONSHIPS:
    brand_id INTEGER NULL,
    category_id INTEGER NULL,
    sub_category_id INTEGER NULL,
    tax_id INTEGER NULL,  -- References tax_rates if exists
    tax_type VARCHAR(20) NOT NULL DEFAULT 'exclusive' CHECK (tax_type IN ('inclusive', 'exclusive')),
    -- STOCK SETTINGS:
    enable_stock BOOLEAN NOT NULL DEFAULT false,  -- Track stock for this product?
    alert_quantity NUMERIC(22, 4) NOT NULL DEFAULT 0,  -- Low stock alert threshold (in base unit)
    -- PRODUCT IDENTIFIERS:
    sku VARCHAR(255) NOT NULL,  -- Stock Keeping Unit (unique per business)
    barcode_type VARCHAR(20) NOT NULL DEFAULT 'C128' CHECK (barcode_type IN ('C39', 'C128', 'EAN-13', 'EAN-8', 'UPC-A', 'UPC-E', 'ITF-14')),
    -- STATUS:
    is_inactive BOOLEAN NOT NULL DEFAULT false,
    not_for_selling BOOLEAN NOT NULL DEFAULT false,
    -- ADDITIONAL FIELDS:
    product_description TEXT NULL,
    image VARCHAR(255) NULL,  -- Image path (stored in Supabase Storage)
    weight NUMERIC(22, 4) NULL,
    product_custom_field1 VARCHAR(255) NULL,
    product_custom_field2 VARCHAR(255) NULL,
    product_custom_field3 VARCHAR(255) NULL,
    product_custom_field4 VARCHAR(255) NULL,
    -- METADATA:
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FOREIGN KEYS:
    CONSTRAINT fk_products_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_products_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    CONSTRAINT fk_products_secondary_unit FOREIGN KEY (secondary_unit_id) REFERENCES units(id) ON DELETE SET NULL,
    CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_products_sub_category FOREIGN KEY (sub_category_id) REFERENCES categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_products_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    -- UNIQUE CONSTRAINTS:
    CONSTRAINT uq_products_business_sku UNIQUE (business_id, sku)
);

CREATE INDEX idx_products_business_id ON products(business_id);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_unit_id ON products(unit_id);
CREATE INDEX idx_products_secondary_unit_id ON products(secondary_unit_id) WHERE secondary_unit_id IS NOT NULL;
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category_id ON products(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_products_brand_id ON products(brand_id) WHERE brand_id IS NOT NULL;
CREATE INDEX idx_products_created_by ON products(created_by);

COMMENT ON TABLE products IS 'Product master data. unit_id is the base unit (Pieces). secondary_unit_id is optional (e.g., Box).';
COMMENT ON COLUMN products.unit_id IS 'CRITICAL: Base unit (always Pieces). All stock calculations use this unit.';
COMMENT ON COLUMN products.secondary_unit_id IS 'Optional secondary unit (e.g., Box) for display and sales. Stock is NOT stored in this unit.';
COMMENT ON COLUMN products.alert_quantity IS 'Low stock alert threshold. Value is in base unit (Pieces).';

-- 8. PRODUCT_VARIATIONS TABLE
-- Purpose: Variation templates for variable products (e.g., Size, Color).
-- Why: Products can have multiple variations (Size: S/M/L, Color: Red/Blue).
CREATE TABLE product_variations (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,  -- Variation name: "Size", "Color", etc.
    is_dummy BOOLEAN NOT NULL DEFAULT true,  -- true for single products, false for actual variations
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_variations_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_product_variations_product_id ON product_variations(product_id);
CREATE INDEX idx_product_variations_name ON product_variations(name);

COMMENT ON TABLE product_variations IS 'Variation templates for variable products. Single products have one dummy variation.';

-- 9. VARIATIONS TABLE
-- Purpose: Actual product variations with SKU and pricing (retail/wholesale).
-- Why: Each variation has its own SKU, stock, and pricing. This is where retail_price and wholesale_price are stored.
CREATE TABLE variations (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    product_variation_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,  -- Variation value: "Small", "Red", etc.
    sub_sku VARCHAR(255) NULL,  -- SKU for this specific variation
    -- PURCHASE PRICING:
    default_purchase_price NUMERIC(22, 4) NULL,
    dpp_inc_tax NUMERIC(22, 4) NOT NULL DEFAULT 0,  -- Default purchase price including tax
    profit_percent NUMERIC(22, 4) NOT NULL DEFAULT 0,
    -- SELL PRICING (LEGACY - kept for compatibility):
    default_sell_price NUMERIC(22, 4) NULL,
    sell_price_inc_tax NUMERIC(22, 4) NULL,
    -- DUAL PRICING (CRITICAL FOR RETAIL/WHOLESALE):
    retail_price NUMERIC(22, 4) NOT NULL DEFAULT 0,  -- Price for retail customers (walk-in)
    wholesale_price NUMERIC(22, 4) NOT NULL DEFAULT 0,  -- Price for wholesale customers (dealers)
    -- METADATA:
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FOREIGN KEYS:
    CONSTRAINT fk_variations_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_variations_product_variation FOREIGN KEY (product_variation_id) REFERENCES product_variations(id) ON DELETE CASCADE,
    -- VALIDATION:
    CONSTRAINT chk_variations_prices CHECK (retail_price >= 0 AND wholesale_price >= 0)
);

CREATE INDEX idx_variations_product_id ON variations(product_id);
CREATE INDEX idx_variations_product_variation_id ON variations(product_variation_id);
CREATE INDEX idx_variations_sub_sku ON variations(sub_sku) WHERE sub_sku IS NOT NULL;
CREATE INDEX idx_variations_deleted_at ON variations(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE variations IS 'Actual product variations with SKU and pricing. Contains retail_price and wholesale_price for dual pricing.';
COMMENT ON COLUMN variations.retail_price IS 'CRITICAL: Price for retail customers (customer_type = retail). Used when contact.customer_type = retail.';
COMMENT ON COLUMN variations.wholesale_price IS 'CRITICAL: Price for wholesale customers (customer_type = wholesale). Used when contact.customer_type = wholesale.';
COMMENT ON COLUMN variations.sub_sku IS 'SKU for this specific variation. Unique per business.';

-- 10. VARIATION_LOCATION_DETAILS TABLE (STOCK TABLE)
-- Purpose: Stock quantity per variation per location. CRITICAL: qty_available is ALWAYS in BASE UNIT (Pieces).
-- Why: Stock must be tracked per location. All quantities stored in base unit for consistency.
-- CRITICAL RULE: qty_available is ALWAYS in PIECES (base unit), never in Box or any other unit.
CREATE TABLE variation_location_details (
    id SERIAL PRIMARY KEY,
    variation_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,  -- Denormalized for performance
    product_variation_id INTEGER NOT NULL,  -- Denormalized for performance
    location_id INTEGER NOT NULL,
    -- STOCK QUANTITY (CRITICAL):
    qty_available NUMERIC(22, 4) NOT NULL DEFAULT 0,  -- ALWAYS in BASE UNIT (Pieces), NEVER in Box
    -- METADATA:
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FOREIGN KEYS:
    CONSTRAINT fk_vld_variation FOREIGN KEY (variation_id) REFERENCES variations(id) ON DELETE CASCADE,
    CONSTRAINT fk_vld_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_vld_location FOREIGN KEY (location_id) REFERENCES business_locations(id) ON DELETE CASCADE,
    -- UNIQUE CONSTRAINT: One stock record per variation per location
    CONSTRAINT uq_vld_variation_location UNIQUE (variation_id, location_id),
    -- VALIDATION:
    CONSTRAINT chk_vld_qty_available CHECK (qty_available >= 0)
);

CREATE INDEX idx_vld_variation_id ON variation_location_details(variation_id);
CREATE INDEX idx_vld_product_id ON variation_location_details(product_id);
CREATE INDEX idx_vld_location_id ON variation_location_details(location_id);
CREATE INDEX idx_vld_variation_location ON variation_location_details(variation_id, location_id);  -- Composite for fast lookups

COMMENT ON TABLE variation_location_details IS 'Stock quantity per variation per location. CRITICAL: qty_available is ALWAYS in BASE UNIT (Pieces).';
COMMENT ON COLUMN variation_location_details.qty_available IS 'CRITICAL: Stock quantity ALWAYS in BASE UNIT (Pieces). When selling in Box, convert to Pieces before updating. Formula: qty_in_pieces = qty_in_boxes * base_unit_multiplier';
COMMENT ON COLUMN variation_location_details.product_id IS 'Denormalized for performance (avoids JOIN in stock queries)';
COMMENT ON COLUMN variation_location_details.product_variation_id IS 'Denormalized for performance';

-- STOCK CALCULATION RULES (ENFORCED IN APPLICATION LOGIC):
-- 1. When purchasing in Box: qty_available += (qty_in_boxes * base_unit_multiplier)
-- 2. When selling in Box: qty_available -= (qty_in_boxes * base_unit_multiplier)
-- 3. When purchasing in Pieces: qty_available += qty_in_pieces
-- 4. When selling in Pieces: qty_available -= qty_in_pieces
-- Example: If 1 Box = 12 Pieces, and you purchase 5 Boxes:
--   qty_available += (5 * 12) = 60 Pieces

-- ============================================
-- TRANSACTION TABLES
-- ============================================

-- 11. TRANSACTIONS TABLE
-- Purpose: Sales and purchase transactions (invoices, receipts).
-- Why: Central table for all financial transactions. Links to contacts (customers/suppliers).
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    -- TRANSACTION TYPE:
    type VARCHAR(50) NOT NULL CHECK (type IN ('sell', 'purchase', 'sell_return', 'purchase_return', 'stock_adjustment', 'sell_transfer', 'purchase_transfer', 'opening_stock', 'expense', 'expense_refund', 'sales_order', 'purchase_order')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'pending', 'ordered', 'received', 'in_transit', 'completed', 'cancelled')),
    payment_status VARCHAR(20) DEFAULT 'due' CHECK (payment_status IN ('paid', 'partial', 'due')),
    -- CONTACT (CUSTOMER/SUPPLIER):
    contact_id INTEGER NULL,  -- NULL for walk-in customers (uses default contact)
    -- CRITICAL: Customer type determines pricing (retail_price vs wholesale_price)
    -- This is denormalized from contacts table for performance
    customer_type VARCHAR(20) NULL CHECK (customer_type IN ('retail', 'wholesale')),  -- Only for sell transactions
    -- INVOICE/REFERENCE:
    invoice_no VARCHAR(255) NULL,  -- Auto-generated invoice number
    ref_no VARCHAR(255) NULL,  -- External reference number
    transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FINANCIAL TOTALS:
    total_before_tax NUMERIC(22, 4) NOT NULL DEFAULT 0,
    tax_id INTEGER NULL,  -- References tax_rates if exists
    tax_amount NUMERIC(22, 4) NOT NULL DEFAULT 0,
    discount_type VARCHAR(20) NULL CHECK (discount_type IN ('fixed', 'percentage')),
    discount_amount NUMERIC(22, 4) NOT NULL DEFAULT 0,
    shipping_charges NUMERIC(22, 4) NOT NULL DEFAULT 0,
    final_total NUMERIC(22, 4) NOT NULL DEFAULT 0,
    -- ADDITIONAL INFO:
    shipping_details TEXT NULL,
    additional_notes TEXT NULL,
    staff_note TEXT NULL,
    -- METADATA:
    created_by INTEGER NOT NULL,  -- User who created the transaction
    return_parent_id INTEGER NULL,  -- If this is a return, references original transaction
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FOREIGN KEYS:
    CONSTRAINT fk_transactions_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_transactions_location FOREIGN KEY (location_id) REFERENCES business_locations(id) ON DELETE CASCADE,
    CONSTRAINT fk_transactions_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
    CONSTRAINT fk_transactions_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_transactions_return_parent FOREIGN KEY (return_parent_id) REFERENCES transactions(id) ON DELETE SET NULL
);

CREATE INDEX idx_transactions_business_id ON transactions(business_id);
CREATE INDEX idx_transactions_location_id ON transactions(location_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_contact_id ON transactions(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_transactions_customer_type ON transactions(customer_type) WHERE customer_type IS NOT NULL;
CREATE INDEX idx_transactions_transaction_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_invoice_no ON transactions(invoice_no) WHERE invoice_no IS NOT NULL;
CREATE INDEX idx_transactions_created_by ON transactions(created_by);
CREATE INDEX idx_transactions_business_location_type ON transactions(business_id, location_id, type);  -- Composite for common queries

COMMENT ON TABLE transactions IS 'Sales and purchase transactions. customer_type determines which price to use (retail_price vs wholesale_price).';
COMMENT ON COLUMN transactions.customer_type IS 'CRITICAL: retail = use retail_price, wholesale = use wholesale_price from variations. Denormalized from contacts for performance.';
COMMENT ON COLUMN transactions.type IS 'Transaction type: sell, purchase, sell_return, purchase_return, stock_adjustment, etc.';
COMMENT ON COLUMN transactions.status IS 'Transaction status: draft, final, pending, etc. Only final transactions affect stock.';

-- 12. TRANSACTION_SELL_LINES TABLE
-- Purpose: Line items for sales transactions. Contains quantity sold and unit used.
-- Why: Each sale can have multiple products. Quantity and unit are stored here.
-- CRITICAL: unit_id stores the unit used for sale (Box or Pieces). Must convert to Pieces for stock update.
CREATE TABLE transaction_sell_lines (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    variation_id INTEGER NOT NULL,
    -- QUANTITY & UNIT (CRITICAL FOR BOX/PIECES):
    quantity NUMERIC(22, 4) NOT NULL,  -- Quantity sold (can be in Box or Pieces)
    unit_id INTEGER NOT NULL,  -- Unit used for sale (Box or Pieces) - CRITICAL for stock conversion
    -- PRICING:
    unit_price NUMERIC(22, 4) NOT NULL,  -- Price per unit (retail_price or wholesale_price based on customer_type)
    unit_price_inc_tax NUMERIC(22, 4) NOT NULL DEFAULT 0,  -- Price including tax
    line_discount_type VARCHAR(20) NULL CHECK (line_discount_type IN ('fixed', 'percentage')),
    line_discount_amount NUMERIC(22, 4) NOT NULL DEFAULT 0,
    -- TOTALS:
    item_tax NUMERIC(22, 4) NOT NULL DEFAULT 0,
    tax_id INTEGER NULL,  -- References tax_rates if exists
    line_total NUMERIC(22, 4) NOT NULL,  -- Total for this line (quantity * unit_price - discount + tax)
    -- ADDITIONAL:
    sell_line_note TEXT NULL,
    -- METADATA:
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FOREIGN KEYS:
    CONSTRAINT fk_tsl_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_tsl_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_tsl_variation FOREIGN KEY (variation_id) REFERENCES variations(id) ON DELETE CASCADE,
    CONSTRAINT fk_tsl_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    -- VALIDATION:
    CONSTRAINT chk_tsl_quantity CHECK (quantity > 0),
    CONSTRAINT chk_tsl_unit_price CHECK (unit_price >= 0),
    CONSTRAINT chk_tsl_line_total CHECK (line_total >= 0)
);

CREATE INDEX idx_tsl_transaction_id ON transaction_sell_lines(transaction_id);
CREATE INDEX idx_tsl_product_id ON transaction_sell_lines(product_id);
CREATE INDEX idx_tsl_variation_id ON transaction_sell_lines(variation_id);
CREATE INDEX idx_tsl_unit_id ON transaction_sell_lines(unit_id);

COMMENT ON TABLE transaction_sell_lines IS 'Sales line items. quantity and unit_id are CRITICAL for stock calculations.';
COMMENT ON COLUMN transaction_sell_lines.quantity IS 'Quantity sold. Can be in Box or Pieces (as specified by unit_id).';
COMMENT ON COLUMN transaction_sell_lines.unit_id IS 'CRITICAL: Unit used for sale (Box or Pieces). Must convert to Pieces before updating stock. Use base_unit_multiplier for conversion.';
COMMENT ON COLUMN transaction_sell_lines.unit_price IS 'Price per unit. This is either retail_price or wholesale_price from variations table, based on transaction.customer_type.';

-- STOCK UPDATE RULES FOR SALES (ENFORCED IN APPLICATION LOGIC):
-- When a sale is finalized (status = 'final'):
-- 1. For each transaction_sell_lines row:
--    a. Get unit from unit_id
--    b. If unit.base_unit_id IS NOT NULL (it's a Box), convert to Pieces:
--       qty_in_pieces = quantity * unit.base_unit_multiplier
--    c. If unit.base_unit_id IS NULL (it's Pieces), use quantity as-is
--    d. Update variation_location_details:
--       qty_available -= qty_in_pieces
-- Example: Selling 2 Boxes (1 Box = 12 Pieces):
--   qty_in_pieces = 2 * 12 = 24 Pieces
--   qty_available -= 24

-- ============================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================

-- Composite indexes for common query patterns
CREATE INDEX idx_products_business_type ON products(business_id, type) WHERE is_inactive = false;
CREATE INDEX idx_variations_product_deleted ON variations(product_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vld_location_product ON variation_location_details(location_id, product_id);
CREATE INDEX idx_transactions_business_date ON transactions(business_id, transaction_date DESC);

-- ============================================
-- TABLE RELATIONSHIPS SUMMARY
-- ============================================

-- BUSINESS HIERARCHY:
-- businesses (1) -> (many) business_locations
-- businesses (1) -> (many) contacts
-- businesses (1) -> (many) products
-- businesses (1) -> (many) units
-- businesses (1) -> (many) brands
-- businesses (1) -> (many) categories
-- businesses (1) -> (many) transactions

-- PRODUCT HIERARCHY:
-- products (1) -> (many) product_variations
-- product_variations (1) -> (many) variations
-- variations (1) -> (many) variation_location_details (stock per location)

-- UNIT CONVERSION:
-- units (1) -> (many) units (via base_unit_id) - Self-referencing for Box/Pieces

-- TRANSACTION FLOW:
-- transactions (1) -> (many) transaction_sell_lines
-- transaction_sell_lines (many) -> (1) variations
-- transaction_sell_lines (many) -> (1) units (for conversion)

-- STOCK TRACKING:
-- variation_location_details links: variations + business_locations
-- Stock is ALWAYS in base unit (Pieces)

-- ============================================
-- CRITICAL BUSINESS RULES (ENFORCED IN APPLICATION)
-- ============================================

-- 1. STOCK STORAGE:
--    - qty_available in variation_location_details is ALWAYS in BASE UNIT (Pieces)
--    - Never store stock in Box or any other unit

-- 2. UNIT CONVERSION:
--    - When selling/purchasing in Box: Convert to Pieces using base_unit_multiplier
--    - Formula: qty_in_pieces = qty_in_boxes * base_unit_multiplier
--    - Example: 1 Box = 12 Pieces, selling 2 Boxes = 24 Pieces deducted from stock

-- 3. PRICING:
--    - variations.retail_price: Used when contact.customer_type = 'retail'
--    - variations.wholesale_price: Used when contact.customer_type = 'wholesale'
--    - transaction.customer_type is denormalized from contacts for performance

-- 4. STOCK UPDATES:
--    - Only final transactions (status = 'final') affect stock
--    - Sales decrease stock, purchases increase stock
--    - Returns reverse the stock change

-- 5. MULTI-LOCATION:
--    - Each location has separate stock (variation_location_details per location)
--    - Stock transfers move stock between locations

-- ============================================
-- END OF SCHEMA
-- ============================================

