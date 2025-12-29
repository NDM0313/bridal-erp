-- ============================================
-- COMPLETE DATABASE SETUP FOR SUPABASE
-- یہ فائل تمام tables, functions, RLS policies شامل کرتی ہے
-- ============================================
-- 
-- USAGE: Supabase SQL Editor میں یہ پوری فائل paste کریں اور Run کریں
-- 
-- IMPORTANT: 
-- - یہ فائل safe ہے (IF NOT EXISTS استعمال کرتی ہے)
-- - Existing data کو delete نہیں کرے گی
-- - Multiple times run کر سکتے ہیں
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PART 1: CORE BUSINESS TABLES
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

-- Add organization_id column if it doesn't exist (for SaaS support)
-- This handles the case where businesses table was created before organization_id was added
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE businesses ADD COLUMN organization_id INTEGER NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);

-- Create index on organization_id only if column exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' AND column_name = 'organization_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_businesses_organization_id ON businesses(organization_id) WHERE organization_id IS NOT NULL;
    END IF;
END $$;

-- Business locations
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

-- User profiles (links Supabase Auth to businesses)
CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id INTEGER NOT NULL,
    role VARCHAR(50) DEFAULT 'cashier' CHECK (role IN ('admin', 'manager', 'cashier', 'auditor')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_profiles_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_business_id ON user_profiles(business_id);

-- ============================================
-- PART 2: PRODUCT & INVENTORY TABLES
-- ============================================

-- Units table
CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    actual_name VARCHAR(20) NOT NULL,
    short_name VARCHAR(10) NOT NULL,
    allow_decimal BOOLEAN NOT NULL DEFAULT false,
    base_unit_id INTEGER NULL,
    base_unit_multiplier NUMERIC(22, 4) NULL DEFAULT 1,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_units_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_units_base_unit FOREIGN KEY (base_unit_id) REFERENCES units(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_units_business_id ON units(business_id);
CREATE INDEX IF NOT EXISTS idx_units_base_unit_id ON units(base_unit_id);

COMMENT ON TABLE units IS 'Units table. Base unit (Pieces) has base_unit_id = NULL. Secondary units (Box) reference base unit with multiplier.';
COMMENT ON COLUMN units.base_unit_multiplier IS 'Example: 1 Box = 12 Pieces, so multiplier = 12';

-- Brands
CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_brands_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT uq_brands_business_name UNIQUE (business_id, name)
);

CREATE INDEX IF NOT EXISTS idx_brands_business_id ON brands(business_id);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    short_code VARCHAR(191) NULL,
    parent_id INTEGER NULL,
    description TEXT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_categories_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    CONSTRAINT uq_categories_business_name UNIQUE (business_id, name)
);

CREATE INDEX IF NOT EXISTS idx_categories_business_id ON categories(business_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- Products
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
    barcode_type VARCHAR(20) NOT NULL DEFAULT 'C128',
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
    CONSTRAINT fk_products_unit FOREIGN KEY (unit_id) REFERENCES units(id),
    CONSTRAINT fk_products_secondary_unit FOREIGN KEY (secondary_unit_id) REFERENCES units(id) ON DELETE SET NULL,
    CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    CONSTRAINT uq_products_business_sku UNIQUE (business_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_unit_id ON products(unit_id);

-- Variations (for variable products)
CREATE TABLE IF NOT EXISTS variations (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    sub_sku VARCHAR(255) NULL,
    default_purchase_price NUMERIC(22, 4) NOT NULL DEFAULT 0,
    dpp_inc_tax NUMERIC(22, 4) NOT NULL DEFAULT 0,
    profit_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
    retail_price NUMERIC(22, 4) NOT NULL DEFAULT 0,
    wholesale_price NUMERIC(22, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_variations_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_variations_product_id ON variations(product_id);
CREATE INDEX IF NOT EXISTS idx_variations_sub_sku ON variations(sub_sku);

COMMENT ON TABLE variations IS 'Product variations. For single products, one variation. For variable products, multiple variations.';
COMMENT ON COLUMN variations.retail_price IS 'Retail price (for retail customers)';
COMMENT ON COLUMN variations.wholesale_price IS 'Wholesale price (for wholesale customers)';

-- Variation location details (STOCK - always in PIECES)
CREATE TABLE IF NOT EXISTS variation_location_details (
    id SERIAL PRIMARY KEY,
    variation_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    qty_available NUMERIC(22, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vld_variation FOREIGN KEY (variation_id) REFERENCES variations(id) ON DELETE CASCADE,
    CONSTRAINT fk_vld_location FOREIGN KEY (location_id) REFERENCES business_locations(id) ON DELETE CASCADE,
    CONSTRAINT uq_vld_variation_location UNIQUE (variation_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_vld_variation_id ON variation_location_details(variation_id);
CREATE INDEX IF NOT EXISTS idx_vld_location_id ON variation_location_details(location_id);

COMMENT ON TABLE variation_location_details IS 'STOCK TABLE - qty_available is ALWAYS in BASE UNIT (PIECES). All purchases/sales must convert to pieces before updating.';

-- ============================================
-- PART 3: TRANSACTION TABLES
-- ============================================

-- Transactions
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
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);

-- Transaction sell lines
CREATE TABLE IF NOT EXISTS transaction_sell_lines (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL,
    variation_id INTEGER NOT NULL,
    quantity NUMERIC(22, 4) NOT NULL,
    unit_id INTEGER NOT NULL,
    unit_price NUMERIC(22, 4) NOT NULL,
    line_total NUMERIC(22, 4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tsl_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_tsl_variation FOREIGN KEY (variation_id) REFERENCES variations(id),
    CONSTRAINT fk_tsl_unit FOREIGN KEY (unit_id) REFERENCES units(id)
);

CREATE INDEX IF NOT EXISTS idx_tsl_transaction_id ON transaction_sell_lines(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tsl_variation_id ON transaction_sell_lines(variation_id);

-- Transaction purchase lines
CREATE TABLE IF NOT EXISTS transaction_purchase_lines (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL,
    variation_id INTEGER NOT NULL,
    quantity NUMERIC(22, 4) NOT NULL,
    unit_id INTEGER NOT NULL,
    purchase_price NUMERIC(22, 4) NOT NULL,
    line_total NUMERIC(22, 4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tpl_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_tpl_variation FOREIGN KEY (variation_id) REFERENCES variations(id),
    CONSTRAINT fk_tpl_unit FOREIGN KEY (unit_id) REFERENCES units(id)
);

CREATE INDEX IF NOT EXISTS idx_tpl_transaction_id ON transaction_purchase_lines(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tpl_variation_id ON transaction_purchase_lines(variation_id);

-- Stock adjustment lines
CREATE TABLE IF NOT EXISTS stock_adjustment_lines (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL,
    variation_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('increase', 'decrease')),
    quantity NUMERIC(22, 4) NOT NULL,
    unit_id INTEGER NOT NULL,
    reason TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sal_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_sal_variation FOREIGN KEY (variation_id) REFERENCES variations(id),
    CONSTRAINT fk_sal_location FOREIGN KEY (location_id) REFERENCES business_locations(id),
    CONSTRAINT fk_sal_unit FOREIGN KEY (unit_id) REFERENCES units(id)
);

CREATE INDEX IF NOT EXISTS idx_sal_transaction_id ON stock_adjustment_lines(transaction_id);
CREATE INDEX IF NOT EXISTS idx_sal_variation_id ON stock_adjustment_lines(variation_id);

-- Stock transfer lines
CREATE TABLE IF NOT EXISTS stock_transfer_lines (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL,
    variation_id INTEGER NOT NULL,
    from_location_id INTEGER NOT NULL,
    to_location_id INTEGER NOT NULL,
    quantity NUMERIC(22, 4) NOT NULL,
    unit_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stl_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_stl_variation FOREIGN KEY (variation_id) REFERENCES variations(id),
    CONSTRAINT fk_stl_from_location FOREIGN KEY (from_location_id) REFERENCES business_locations(id),
    CONSTRAINT fk_stl_to_location FOREIGN KEY (to_location_id) REFERENCES business_locations(id),
    CONSTRAINT fk_stl_unit FOREIGN KEY (unit_id) REFERENCES units(id)
);

CREATE INDEX IF NOT EXISTS idx_stl_transaction_id ON stock_transfer_lines(transaction_id);
CREATE INDEX IF NOT EXISTS idx_stl_variation_id ON stock_transfer_lines(variation_id);

-- ============================================
-- PART 4: CONTACTS (CUSTOMERS & SUPPLIERS)
-- ============================================

-- Contacts
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('customer', 'supplier', 'both')),
    customer_type VARCHAR(20) NULL CHECK (customer_type IN ('retail', 'wholesale')),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NULL,
    mobile VARCHAR(20) NULL,
    alternate_number VARCHAR(20) NULL,
    landline VARCHAR(20) NULL,
    address_line_1 TEXT NULL,
    address_line_2 TEXT NULL,
    city VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    country VARCHAR(100) NULL,
    zip_code VARCHAR(7) NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_contacts_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contacts_business_id ON contacts(business_id);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type);

-- ============================================
-- PART 5: SAAS TABLES (Phase 1)
-- ============================================

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    subscription_plan VARCHAR(50) NOT NULL DEFAULT 'free' CHECK (subscription_plan IN ('free', 'basic', 'pro', 'enterprise')),
    subscription_status VARCHAR(50) NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'suspended', 'cancelled')),
    trial_ends_at TIMESTAMP NULL,
    subscription_ends_at TIMESTAMP NULL,
    max_businesses INTEGER DEFAULT 1,
    max_users INTEGER DEFAULT 3,
    max_locations INTEGER DEFAULT 1,
    max_transactions_per_month INTEGER DEFAULT 100,
    max_storage_gb INTEGER DEFAULT 1,
    max_api_requests_per_hour INTEGER DEFAULT 1000,
    white_label_enabled BOOLEAN DEFAULT false,
    custom_domain VARCHAR(255) NULL,
    custom_domain_verified BOOLEAN DEFAULT false,
    branding_logo_url VARCHAR(500) NULL,
    branding_primary_color VARCHAR(7) NULL,
    branding_secondary_color VARCHAR(7) NULL,
    branding_company_name VARCHAR(255) NULL,
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_step VARCHAR(50) DEFAULT 'signup',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- Add foreign key constraint for businesses.organization_id (after organizations table exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' AND column_name = 'organization_id'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_businesses_organization' 
            AND table_name = 'businesses'
        ) THEN
            ALTER TABLE businesses 
            ADD CONSTRAINT fk_businesses_organization 
            FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Organization users
CREATE TABLE IF NOT EXISTS organization_users (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'cashier', 'auditor')),
    is_organization_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_org_users_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT uq_org_users_org_user UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_users_org_id ON organization_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_users_user_id ON organization_users(user_id);

-- Feature definitions
CREATE TABLE IF NOT EXISTS feature_definitions (
    id SERIAL PRIMARY KEY,
    feature_key VARCHAR(100) UNIQUE NOT NULL,
    feature_name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Organization features
CREATE TABLE IF NOT EXISTS organization_features (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    feature_key VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_org_features_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_org_features_feature FOREIGN KEY (feature_key) REFERENCES feature_definitions(feature_key) ON DELETE CASCADE,
    CONSTRAINT uq_org_features_org_feature UNIQUE (organization_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_org_features_org_id ON organization_features(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_features_feature_key ON organization_features(feature_key);

-- ============================================
-- PART 6: SUBSCRIPTION TABLES (Phase 3)
-- ============================================

-- Organization subscriptions
CREATE TABLE IF NOT EXISTS organization_subscriptions (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL UNIQUE,
    stripe_customer_id VARCHAR(255) NULL,
    stripe_subscription_id VARCHAR(255) NULL,
    plan VARCHAR(50) NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro', 'enterprise')),
    status VARCHAR(50) NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'suspended', 'cancelled')),
    trial_start TIMESTAMP NULL,
    trial_end TIMESTAMP NULL,
    current_period_start TIMESTAMP NULL,
    current_period_end TIMESTAMP NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMP NULL,
    metadata JSONB NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_org_subscriptions_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_org_subscriptions_org_id ON organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_status ON organization_subscriptions(status);

-- Billing history
CREATE TABLE IF NOT EXISTS billing_history (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    subscription_id INTEGER NULL,
    stripe_invoice_id VARCHAR(255) NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_billing_history_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_billing_history_subscription FOREIGN KEY (subscription_id) REFERENCES organization_subscriptions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_history_org_id ON billing_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_status ON billing_history(status);

-- Subscription events
CREATE TABLE IF NOT EXISTS subscription_events (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    subscription_id INTEGER NULL,
    stripe_event_id VARCHAR(255) UNIQUE NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NULL,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_subscription_events_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_subscription_events_subscription FOREIGN KEY (subscription_id) REFERENCES organization_subscriptions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_org_id ON subscription_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe_event_id ON subscription_events(stripe_event_id);

-- ============================================
-- PART 7: MONITORING TABLES
-- ============================================

-- Error logs
CREATE TABLE IF NOT EXISTS error_logs (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NULL REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT NULL,
    error_type VARCHAR(100) NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    context JSONB NULL,
    ip_address INET NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_error_logs_org_id ON error_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);

-- Payment failure logs
CREATE TABLE IF NOT EXISTS payment_failure_logs (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id INTEGER NULL REFERENCES organization_subscriptions(id) ON DELETE SET NULL,
    stripe_invoice_id VARCHAR(255) NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    failure_reason TEXT NULL,
    retry_attempt INTEGER DEFAULT 0,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_failure_logs_org_id ON payment_failure_logs(organization_id);

-- Sale failure logs
CREATE TABLE IF NOT EXISTS sale_failure_logs (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    business_id INTEGER NULL REFERENCES businesses(id) ON DELETE SET NULL,
    user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    failure_reason TEXT NOT NULL,
    sale_data JSONB NULL,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sale_failure_logs_org_id ON sale_failure_logs(organization_id);

-- ============================================
-- PART 8: SUPPORT TOOLING TABLES
-- ============================================

-- Support agents
CREATE TABLE IF NOT EXISTS support_agents (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('support', 'admin')),
    can_impersonate BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_agents_user_id ON support_agents(user_id);

-- Support access logs
CREATE TABLE IF NOT EXISTS support_access_logs (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL REFERENCES support_agents(id) ON DELETE CASCADE,
    organization_id INTEGER NULL REFERENCES organizations(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL,
    accessed_data JSONB NULL,
    ip_address INET NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_access_logs_agent_id ON support_access_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_support_access_logs_organization_id ON support_access_logs(organization_id);

-- ============================================
-- PART 9: SOFT LAUNCH CONFIG
-- ============================================

-- System settings
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Insert default settings
INSERT INTO system_settings (key, value, description) VALUES
('signup_enabled', 'true'::jsonb, 'Enable/disable new user signups'),
('soft_launch_user_limit', '10'::jsonb, 'Maximum number of users allowed during soft launch'),
('soft_launch_mode', 'true'::jsonb, 'Enable/disable soft launch mode (user limits)')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- PART 10: WHATSAPP AUTOMATION TABLES
-- ============================================

-- Notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('invoice', 'low_stock', 'purchase_confirmation', 'sale_confirmation')),
    template_name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NULL,
    body TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_templates_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notification_templates_business_id ON notification_templates(business_id);

-- Notifications queue
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMP NULL,
    error_message TEXT NULL,
    metadata JSONB NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_business_id ON notifications(business_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);

-- Automation rules
CREATE TABLE IF NOT EXISTS automation_rules (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('invoice_sent', 'low_stock_alert', 'purchase_confirmation', 'sale_confirmation')),
    is_enabled BOOLEAN DEFAULT true,
    conditions JSONB NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_automation_rules_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_business_id ON automation_rules(business_id);

-- ============================================
-- PART 11: AUDIT LOGS
-- ============================================

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    user_id UUID NOT NULL,
    user_role VARCHAR(50) NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NULL,
    entity_id INTEGER NULL,
    details JSONB NULL,
    ip_address INET NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_logs_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_business_id ON audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- PART 12: HELPER FUNCTIONS
-- ============================================

-- Get user business ID (supports both SaaS and legacy mode)
CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_business_id INTEGER;
    user_org_id INTEGER;
BEGIN
    -- Try organization mode first (SaaS)
    SELECT ou.organization_id INTO user_org_id
    FROM organization_users ou
    WHERE ou.user_id = auth.uid()
    LIMIT 1;
    
    IF user_org_id IS NOT NULL THEN
        -- Get first business for this organization
        SELECT id INTO user_business_id
        FROM businesses
        WHERE organization_id = user_org_id
        LIMIT 1;
        
        IF user_business_id IS NOT NULL THEN
            RETURN user_business_id;
        END IF;
    END IF;
    
    -- Fallback to legacy mode (user_profiles)
    SELECT business_id INTO user_business_id
    FROM user_profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    RETURN user_business_id;
END;
$$;

-- Get user organization ID
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_org_id INTEGER;
BEGIN
    SELECT organization_id INTO user_org_id
    FROM organization_users
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    RETURN user_org_id;
END;
$$;

-- ============================================
-- PART 13: ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE variation_location_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_sell_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_purchase_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustment_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_failure_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_failure_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 14: BASIC RLS POLICIES
-- ============================================
-- Note: DROP POLICY IF EXISTS before CREATE to avoid "already exists" errors

-- Businesses: Users can view their own business
DROP POLICY IF EXISTS "Users view own business" ON businesses;
CREATE POLICY "Users view own business" ON businesses
FOR SELECT
USING (id = get_user_business_id() OR owner_id = auth.uid());

-- Products: Users can view products from their business
DROP POLICY IF EXISTS "Users view own business products" ON products;
CREATE POLICY "Users view own business products" ON products
FOR SELECT
USING (business_id = get_user_business_id());

-- Variations: Users can view variations from their business products
DROP POLICY IF EXISTS "Users view own business variations" ON variations;
CREATE POLICY "Users view own business variations" ON variations
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM products
        WHERE products.id = variations.product_id
          AND products.business_id = get_user_business_id()
    )
);

-- Variation location details: Users can view stock from their business
DROP POLICY IF EXISTS "Users view own business stock" ON variation_location_details;
CREATE POLICY "Users view own business stock" ON variation_location_details
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM variations v
        JOIN products p ON p.id = v.product_id
        WHERE v.id = variation_location_details.variation_id
          AND p.business_id = get_user_business_id()
    )
);

-- Transactions: Users can view transactions from their business
DROP POLICY IF EXISTS "Users view own business transactions" ON transactions;
CREATE POLICY "Users view own business transactions" ON transactions
FOR SELECT
USING (business_id = get_user_business_id());

-- Organizations: Users can view their own organization
DROP POLICY IF EXISTS "Users view own organization" ON organizations;
CREATE POLICY "Users view own organization" ON organizations
FOR SELECT
USING (id = get_user_organization_id());

-- Organization users: Users can view users in their organization
DROP POLICY IF EXISTS "Users view own organization users" ON organization_users;
CREATE POLICY "Users view own organization users" ON organization_users
FOR SELECT
USING (organization_id = get_user_organization_id());

-- User profiles: Users can view their own profile
DROP POLICY IF EXISTS "Users view own profile" ON user_profiles;
CREATE POLICY "Users view own profile" ON user_profiles
FOR SELECT
USING (user_id = auth.uid());

-- ============================================
-- VERIFICATION
-- ============================================

-- Check all tables created
SELECT 
    'Tables Created' as check_type,
    COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'businesses', 'business_locations', 'user_profiles',
    'units', 'brands', 'categories', 'products', 'variations', 'variation_location_details',
    'transactions', 'transaction_sell_lines', 'transaction_purchase_lines',
    'stock_adjustment_lines', 'stock_transfer_lines', 'contacts',
    'organizations', 'organization_users', 'organization_subscriptions',
    'billing_history', 'subscription_events', 'error_logs',
    'payment_failure_logs', 'sale_failure_logs', 'support_agents',
    'support_access_logs', 'system_settings', 'notification_templates',
    'notifications', 'automation_rules', 'audit_logs'
  );

-- ============================================
-- COMPLETE!
-- ============================================
-- 
-- تمام tables, functions, اور RLS policies create ہو گئی ہیں
-- 
-- Next Steps:
-- 1. Verify tables: Run verification query above
-- 2. Add bootstrap data if needed
-- 3. Test RLS policies
-- 
-- ============================================

