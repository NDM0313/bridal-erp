-- ============================================
-- MODERN ERP EXTENSION MIGRATION
-- Extends existing schema for:
-- 1. Hybrid Inventory (Rental Support)
-- 2. Rental Management Module
-- 3. Custom Studio / Manufacturing Module
-- 4. Advanced Accounting (Ledgers & Banking)
-- 5. Expense Categories
-- 6. Business Modules (Feature Flags)
-- ============================================
-- 
-- USAGE: Supabase SQL Editor میں یہ فائل paste کریں اور Run کریں
-- 
-- IMPORTANT: 
-- - یہ فائل existing schema کو extend کرتی ہے
-- - Safe to run multiple times (IF NOT EXISTS)
-- - Existing data کو affect نہیں کرے گی
-- ============================================

-- ============================================
-- PART 1: HYBRID INVENTORY UPDATES
-- Add rental support to products table
-- ============================================

-- Add rental columns to products table
DO $$ 
BEGIN
    -- Add is_rentable column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'is_rentable'
    ) THEN
        ALTER TABLE products ADD COLUMN is_rentable BOOLEAN NOT NULL DEFAULT false;
    END IF;

    -- Add rental_price column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'rental_price'
    ) THEN
        ALTER TABLE products ADD COLUMN rental_price NUMERIC(22, 4) NULL;
    END IF;

    -- Add security_deposit_amount column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'security_deposit_amount'
    ) THEN
        ALTER TABLE products ADD COLUMN security_deposit_amount NUMERIC(22, 4) NULL;
    END IF;

    -- Add rent_duration_unit column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'rent_duration_unit'
    ) THEN
        ALTER TABLE products ADD COLUMN rent_duration_unit VARCHAR(20) NULL 
        CHECK (rent_duration_unit IN ('hour', 'day', 'event'));
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN products.is_rentable IS 'Whether this product can be rented out';
COMMENT ON COLUMN products.rental_price IS 'Fixed rental price per duration unit';
COMMENT ON COLUMN products.security_deposit_amount IS 'Security deposit required for rental';
COMMENT ON COLUMN products.rent_duration_unit IS 'Rental duration unit: hour, day, or event';

-- ============================================
-- PART 2: RENTAL MANAGEMENT MODULE
-- ============================================

-- Rental bookings table
CREATE TABLE IF NOT EXISTS rental_bookings (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NULL,
    business_id INTEGER NOT NULL,
    contact_id INTEGER NULL,
    product_id INTEGER NOT NULL,
    variation_id INTEGER NULL,
    booking_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    pickup_date TIMESTAMP NOT NULL,
    return_date TIMESTAMP NOT NULL,
    actual_return_date TIMESTAMP NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'reserved' 
        CHECK (status IN ('reserved', 'out', 'returned', 'overdue', 'cancelled')),
    security_type VARCHAR(20) NULL 
        CHECK (security_type IN ('cash', 'id_card', 'both', 'none')),
    security_doc_url TEXT NULL,
    penalty_amount NUMERIC(22, 4) NOT NULL DEFAULT 0,
    rental_amount NUMERIC(22, 4) NOT NULL DEFAULT 0,
    security_deposit_amount NUMERIC(22, 4) NOT NULL DEFAULT 0,
    notes TEXT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rental_bookings_transaction FOREIGN KEY (transaction_id) 
        REFERENCES transactions(id) ON DELETE SET NULL,
    CONSTRAINT fk_rental_bookings_business FOREIGN KEY (business_id) 
        REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_rental_bookings_contact FOREIGN KEY (contact_id) 
        REFERENCES contacts(id) ON DELETE SET NULL,
    CONSTRAINT fk_rental_bookings_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_rental_bookings_variation FOREIGN KEY (variation_id) 
        REFERENCES variations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rental_bookings_business_id ON rental_bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_product_id ON rental_bookings(product_id);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_status ON rental_bookings(status);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_pickup_date ON rental_bookings(pickup_date);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_return_date ON rental_bookings(return_date);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_transaction_id ON rental_bookings(transaction_id);

COMMENT ON TABLE rental_bookings IS 'Rental bookings with date-based conflict detection';
COMMENT ON COLUMN rental_bookings.status IS 'Booking status: reserved, out, returned, overdue, cancelled';
COMMENT ON COLUMN rental_bookings.security_type IS 'Type of security taken: cash, id_card, both, none';

-- Rental booking conflicts view (for conflict detection)
CREATE OR REPLACE VIEW rental_booking_conflicts AS
SELECT 
    rb1.id as booking_id_1,
    rb2.id as booking_id_2,
    rb1.product_id,
    rb1.pickup_date as pickup_1,
    rb1.return_date as return_1,
    rb2.pickup_date as pickup_2,
    rb2.return_date as return_2
FROM rental_bookings rb1
JOIN rental_bookings rb2 ON rb1.product_id = rb2.product_id 
    AND rb1.id < rb2.id
    AND rb1.status IN ('reserved', 'out')
    AND rb2.status IN ('reserved', 'out')
WHERE (
    (rb1.pickup_date <= rb2.return_date AND rb1.return_date >= rb2.pickup_date)
);

-- ============================================
-- PART 3: CUSTOM STUDIO / MANUFACTURING MODULE
-- ============================================

-- Production orders table
CREATE TABLE IF NOT EXISTS production_orders (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    customer_id INTEGER NULL,
    order_no VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'new' 
        CHECK (status IN ('new', 'dyeing', 'stitching', 'handwork', 'completed', 'dispatched', 'cancelled')),
    deadline_date TIMESTAMP NULL,
    total_cost NUMERIC(22, 4) NOT NULL DEFAULT 0,
    final_price NUMERIC(22, 4) NOT NULL DEFAULT 0,
    description TEXT NULL,
    measurements JSONB NULL,
    assigned_vendor_id INTEGER NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_production_orders_business FOREIGN KEY (business_id) 
        REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_production_orders_customer FOREIGN KEY (customer_id) 
        REFERENCES contacts(id) ON DELETE SET NULL,
    CONSTRAINT fk_production_orders_vendor FOREIGN KEY (assigned_vendor_id) 
        REFERENCES contacts(id) ON DELETE SET NULL,
    CONSTRAINT uq_production_orders_business_order_no UNIQUE (business_id, order_no)
);

CREATE INDEX IF NOT EXISTS idx_production_orders_business_id ON production_orders(business_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_customer_id ON production_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(status);
CREATE INDEX IF NOT EXISTS idx_production_orders_order_no ON production_orders(order_no);

COMMENT ON TABLE production_orders IS 'Custom studio / manufacturing job work orders';
COMMENT ON COLUMN production_orders.status IS 'Order status: new, dyeing, stitching, handwork, completed, dispatched, cancelled';

-- Production steps table
CREATE TABLE IF NOT EXISTS production_steps (
    id SERIAL PRIMARY KEY,
    production_order_id INTEGER NOT NULL,
    step_name VARCHAR(50) NOT NULL 
        CHECK (step_name IN ('Dyeing', 'Stitching', 'Handwork', 'Cutting', 'Finishing', 'Quality Check', 'Packaging')),
    vendor_id INTEGER NULL,
    cost NUMERIC(22, 4) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    notes TEXT NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_production_steps_order FOREIGN KEY (production_order_id) 
        REFERENCES production_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_production_steps_vendor FOREIGN KEY (vendor_id) 
        REFERENCES contacts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_production_steps_order_id ON production_steps(production_order_id);
CREATE INDEX IF NOT EXISTS idx_production_steps_vendor_id ON production_steps(vendor_id);
CREATE INDEX IF NOT EXISTS idx_production_steps_status ON production_steps(status);

COMMENT ON TABLE production_steps IS 'Individual steps/tasks within a production order';
COMMENT ON COLUMN production_steps.step_name IS 'Step type: Dyeing, Stitching, Handwork, etc.';

-- Production materials table
CREATE TABLE IF NOT EXISTS production_materials (
    id SERIAL PRIMARY KEY,
    production_order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    variation_id INTEGER NULL,
    quantity_used NUMERIC(22, 4) NOT NULL,
    unit_id INTEGER NOT NULL,
    unit_cost NUMERIC(22, 4) NOT NULL DEFAULT 0,
    total_cost NUMERIC(22, 4) NOT NULL DEFAULT 0,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_production_materials_order FOREIGN KEY (production_order_id) 
        REFERENCES production_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_production_materials_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_production_materials_variation FOREIGN KEY (variation_id) 
        REFERENCES variations(id) ON DELETE SET NULL,
    CONSTRAINT fk_production_materials_unit FOREIGN KEY (unit_id) 
        REFERENCES units(id)
);

CREATE INDEX IF NOT EXISTS idx_production_materials_order_id ON production_materials(production_order_id);
CREATE INDEX IF NOT EXISTS idx_production_materials_product_id ON production_materials(product_id);

COMMENT ON TABLE production_materials IS 'Materials/Inventory items used in production orders';

-- ============================================
-- PART 4: ADVANCED ACCOUNTING (LEDGERS & BANKING)
-- ============================================

-- Financial accounts table
CREATE TABLE IF NOT EXISTS financial_accounts (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL 
        CHECK (type IN ('bank', 'cash', 'wallet', 'credit_card', 'loan')),
    account_number VARCHAR(100) NULL,
    bank_name VARCHAR(255) NULL,
    branch_name VARCHAR(255) NULL,
    current_balance NUMERIC(22, 4) NOT NULL DEFAULT 0,
    opening_balance NUMERIC(22, 4) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_financial_accounts_business FOREIGN KEY (business_id) 
        REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT uq_financial_accounts_business_name UNIQUE (business_id, name)
);

CREATE INDEX IF NOT EXISTS idx_financial_accounts_business_id ON financial_accounts(business_id);
CREATE INDEX IF NOT EXISTS idx_financial_accounts_type ON financial_accounts(type);
CREATE INDEX IF NOT EXISTS idx_financial_accounts_is_active ON financial_accounts(is_active);

COMMENT ON TABLE financial_accounts IS 'Financial accounts (Bank, Cash, Wallet, etc.)';
COMMENT ON COLUMN financial_accounts.type IS 'Account type: bank, cash, wallet, credit_card, loan';

-- Account transactions table
CREATE TABLE IF NOT EXISTS account_transactions (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL,
    business_id INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL 
        CHECK (type IN ('debit', 'credit')),
    amount NUMERIC(22, 4) NOT NULL,
    reference_type VARCHAR(50) NULL 
        CHECK (reference_type IN ('sell', 'purchase', 'expense', 'transfer', 'opening_balance', 'adjustment', 'rental', 'production')),
    reference_id INTEGER NULL,
    description TEXT NULL,
    transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_account_transactions_account FOREIGN KEY (account_id) 
        REFERENCES financial_accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_account_transactions_business FOREIGN KEY (business_id) 
        REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_account_transactions_account_id ON account_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_business_id ON account_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_reference ON account_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_date ON account_transactions(transaction_date);

COMMENT ON TABLE account_transactions IS 'All financial transactions (debits/credits) for accounts';
COMMENT ON COLUMN account_transactions.type IS 'Transaction type: debit (money out) or credit (money in)';
COMMENT ON COLUMN account_transactions.reference_type IS 'What this transaction is linked to: sell, purchase, expense, transfer, etc.';

-- Fund transfers table (for account-to-account transfers)
CREATE TABLE IF NOT EXISTS fund_transfers (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    from_account_id INTEGER NOT NULL,
    to_account_id INTEGER NOT NULL,
    amount NUMERIC(22, 4) NOT NULL,
    transfer_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reference_no VARCHAR(255) NULL,
    notes TEXT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fund_transfers_business FOREIGN KEY (business_id) 
        REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_fund_transfers_from_account FOREIGN KEY (from_account_id) 
        REFERENCES financial_accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_fund_transfers_to_account FOREIGN KEY (to_account_id) 
        REFERENCES financial_accounts(id) ON DELETE CASCADE,
    CONSTRAINT chk_fund_transfers_different_accounts CHECK (from_account_id != to_account_id)
);

CREATE INDEX IF NOT EXISTS idx_fund_transfers_business_id ON fund_transfers(business_id);
CREATE INDEX IF NOT EXISTS idx_fund_transfers_from_account ON fund_transfers(from_account_id);
CREATE INDEX IF NOT EXISTS idx_fund_transfers_to_account ON fund_transfers(to_account_id);
CREATE INDEX IF NOT EXISTS idx_fund_transfers_date ON fund_transfers(transfer_date);

COMMENT ON TABLE fund_transfers IS 'Account-to-account fund transfers';

-- ============================================
-- PART 5: EXPENSE CATEGORIES
-- ============================================

-- Expense categories table
CREATE TABLE IF NOT EXISTS expense_categories (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    color_code VARCHAR(7) NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_expense_categories_business FOREIGN KEY (business_id) 
        REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT uq_expense_categories_business_name UNIQUE (business_id, name)
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_business_id ON expense_categories(business_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_is_active ON expense_categories(is_active);

COMMENT ON TABLE expense_categories IS 'Expense categories (Rent, Salary, Utilities, etc.)';

-- Link expense categories to transactions (if transactions table supports expenses)
-- Note: This assumes transactions.type can be 'expense'
-- If expense_category_id needs to be added to transactions table:
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'expense_category_id'
    ) THEN
        ALTER TABLE transactions ADD COLUMN expense_category_id INTEGER NULL;
        ALTER TABLE transactions ADD CONSTRAINT fk_transactions_expense_category 
            FOREIGN KEY (expense_category_id) REFERENCES expense_categories(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_transactions_expense_category_id ON transactions(expense_category_id);
    END IF;
END $$;

-- ============================================
-- PART 6: BUSINESS MODULES (FEATURE FLAGS)
-- ============================================

-- Add module_config to businesses table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' AND column_name = 'module_config'
    ) THEN
        ALTER TABLE businesses ADD COLUMN module_config JSONB NULL DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Add default module config structure
COMMENT ON COLUMN businesses.module_config IS 'Feature flags for business modules. Example: {"is_rental_active": true, "is_studio_active": false, "is_advanced_accounting_active": true}';

-- Helper function to check if a module is active
CREATE OR REPLACE FUNCTION is_module_active(module_key VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    business_config JSONB;
BEGIN
    SELECT module_config INTO business_config
    FROM businesses
    WHERE id = get_user_business_id()
    LIMIT 1;
    
    IF business_config IS NULL THEN
        RETURN false;
    END IF;
    
    RETURN COALESCE((business_config->>module_key)::boolean, false);
END;
$$;

-- ============================================
-- PART 7: ROW LEVEL SECURITY (RLS)
-- Enable RLS on all new tables
-- ============================================

ALTER TABLE rental_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 8: RLS POLICIES
-- Users can only access data from their own business
-- ============================================

-- Rental bookings policies
DROP POLICY IF EXISTS "Users view own business rental bookings" ON rental_bookings;
CREATE POLICY "Users view own business rental bookings" ON rental_bookings
FOR SELECT
USING (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users insert own business rental bookings" ON rental_bookings;
CREATE POLICY "Users insert own business rental bookings" ON rental_bookings
FOR INSERT
WITH CHECK (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users update own business rental bookings" ON rental_bookings;
CREATE POLICY "Users update own business rental bookings" ON rental_bookings
FOR UPDATE
USING (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users delete own business rental bookings" ON rental_bookings;
CREATE POLICY "Users delete own business rental bookings" ON rental_bookings
FOR DELETE
USING (business_id = get_user_business_id());

-- Production orders policies
DROP POLICY IF EXISTS "Users view own business production orders" ON production_orders;
CREATE POLICY "Users view own business production orders" ON production_orders
FOR SELECT
USING (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users insert own business production orders" ON production_orders;
CREATE POLICY "Users insert own business production orders" ON production_orders
FOR INSERT
WITH CHECK (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users update own business production orders" ON production_orders;
CREATE POLICY "Users update own business production orders" ON production_orders
FOR UPDATE
USING (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users delete own business production orders" ON production_orders;
CREATE POLICY "Users delete own business production orders" ON production_orders
FOR DELETE
USING (business_id = get_user_business_id());

-- Production steps policies
DROP POLICY IF EXISTS "Users view own business production steps" ON production_steps;
CREATE POLICY "Users view own business production steps" ON production_steps
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM production_orders po
        WHERE po.id = production_steps.production_order_id
          AND po.business_id = get_user_business_id()
    )
);

DROP POLICY IF EXISTS "Users insert own business production steps" ON production_steps;
CREATE POLICY "Users insert own business production steps" ON production_steps
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM production_orders po
        WHERE po.id = production_steps.production_order_id
          AND po.business_id = get_user_business_id()
    )
);

DROP POLICY IF EXISTS "Users update own business production steps" ON production_steps;
CREATE POLICY "Users update own business production steps" ON production_steps
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM production_orders po
        WHERE po.id = production_steps.production_order_id
          AND po.business_id = get_user_business_id()
    )
);

DROP POLICY IF EXISTS "Users delete own business production steps" ON production_steps;
CREATE POLICY "Users delete own business production steps" ON production_steps
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM production_orders po
        WHERE po.id = production_steps.production_order_id
          AND po.business_id = get_user_business_id()
    )
);

-- Production materials policies
DROP POLICY IF EXISTS "Users view own business production materials" ON production_materials;
CREATE POLICY "Users view own business production materials" ON production_materials
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM production_orders po
        WHERE po.id = production_materials.production_order_id
          AND po.business_id = get_user_business_id()
    )
);

DROP POLICY IF EXISTS "Users insert own business production materials" ON production_materials;
CREATE POLICY "Users insert own business production materials" ON production_materials
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM production_orders po
        WHERE po.id = production_materials.production_order_id
          AND po.business_id = get_user_business_id()
    )
);

DROP POLICY IF EXISTS "Users update own business production materials" ON production_materials;
CREATE POLICY "Users update own business production materials" ON production_materials
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM production_orders po
        WHERE po.id = production_materials.production_order_id
          AND po.business_id = get_user_business_id()
    )
);

DROP POLICY IF EXISTS "Users delete own business production materials" ON production_materials;
CREATE POLICY "Users delete own business production materials" ON production_materials
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM production_orders po
        WHERE po.id = production_materials.production_order_id
          AND po.business_id = get_user_business_id()
    )
);

-- Financial accounts policies
DROP POLICY IF EXISTS "Users view own business financial accounts" ON financial_accounts;
CREATE POLICY "Users view own business financial accounts" ON financial_accounts
FOR SELECT
USING (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users insert own business financial accounts" ON financial_accounts;
CREATE POLICY "Users insert own business financial accounts" ON financial_accounts
FOR INSERT
WITH CHECK (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users update own business financial accounts" ON financial_accounts;
CREATE POLICY "Users update own business financial accounts" ON financial_accounts
FOR UPDATE
USING (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users delete own business financial accounts" ON financial_accounts;
CREATE POLICY "Users delete own business financial accounts" ON financial_accounts
FOR DELETE
USING (business_id = get_user_business_id());

-- Account transactions policies
DROP POLICY IF EXISTS "Users view own business account transactions" ON account_transactions;
CREATE POLICY "Users view own business account transactions" ON account_transactions
FOR SELECT
USING (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users insert own business account transactions" ON account_transactions;
CREATE POLICY "Users insert own business account transactions" ON account_transactions
FOR INSERT
WITH CHECK (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users update own business account transactions" ON account_transactions;
CREATE POLICY "Users update own business account transactions" ON account_transactions
FOR UPDATE
USING (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users delete own business account transactions" ON account_transactions;
CREATE POLICY "Users delete own business account transactions" ON account_transactions
FOR DELETE
USING (business_id = get_user_business_id());

-- Fund transfers policies
DROP POLICY IF EXISTS "Users view own business fund transfers" ON fund_transfers;
CREATE POLICY "Users view own business fund transfers" ON fund_transfers
FOR SELECT
USING (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users insert own business fund transfers" ON fund_transfers;
CREATE POLICY "Users insert own business fund transfers" ON fund_transfers
FOR INSERT
WITH CHECK (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users update own business fund transfers" ON fund_transfers;
CREATE POLICY "Users update own business fund transfers" ON fund_transfers
FOR UPDATE
USING (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users delete own business fund transfers" ON fund_transfers;
CREATE POLICY "Users delete own business fund transfers" ON fund_transfers
FOR DELETE
USING (business_id = get_user_business_id());

-- Expense categories policies
DROP POLICY IF EXISTS "Users view own business expense categories" ON expense_categories;
CREATE POLICY "Users view own business expense categories" ON expense_categories
FOR SELECT
USING (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users insert own business expense categories" ON expense_categories;
CREATE POLICY "Users insert own business expense categories" ON expense_categories
FOR INSERT
WITH CHECK (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users update own business expense categories" ON expense_categories;
CREATE POLICY "Users update own business expense categories" ON expense_categories
FOR UPDATE
USING (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users delete own business expense categories" ON expense_categories;
CREATE POLICY "Users delete own business expense categories" ON expense_categories
FOR DELETE
USING (business_id = get_user_business_id());

-- ============================================
-- PART 9: HELPER FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update financial account balance after transaction
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.type = 'credit' THEN
            UPDATE financial_accounts 
            SET current_balance = current_balance + NEW.amount,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.account_id;
        ELSIF NEW.type = 'debit' THEN
            UPDATE financial_accounts 
            SET current_balance = current_balance - NEW.amount,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.account_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.type = 'credit' THEN
            UPDATE financial_accounts 
            SET current_balance = current_balance - OLD.amount,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.account_id;
        ELSIF OLD.type = 'debit' THEN
            UPDATE financial_accounts 
            SET current_balance = current_balance + OLD.amount,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.account_id;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Reverse old transaction
        IF OLD.type = 'credit' THEN
            UPDATE financial_accounts 
            SET current_balance = current_balance - OLD.amount,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.account_id;
        ELSIF OLD.type = 'debit' THEN
            UPDATE financial_accounts 
            SET current_balance = current_balance + OLD.amount,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.account_id;
        END IF;
        -- Apply new transaction
        IF NEW.type = 'credit' THEN
            UPDATE financial_accounts 
            SET current_balance = current_balance + NEW.amount,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.account_id;
        ELSIF NEW.type = 'debit' THEN
            UPDATE financial_accounts 
            SET current_balance = current_balance - NEW.amount,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.account_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- Trigger to auto-update account balance
DROP TRIGGER IF EXISTS trigger_update_account_balance ON account_transactions;
CREATE TRIGGER trigger_update_account_balance
    AFTER INSERT OR UPDATE OR DELETE ON account_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balance();

-- Function to handle fund transfers (creates two account transactions)
CREATE OR REPLACE FUNCTION create_fund_transfer_transactions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Debit from source account
    INSERT INTO account_transactions (
        account_id, business_id, type, amount, 
        reference_type, reference_id, description, created_by
    ) VALUES (
        NEW.from_account_id, NEW.business_id, 'debit', NEW.amount,
        'transfer', NEW.id, 
        COALESCE(NEW.notes, 'Fund transfer to account #' || NEW.to_account_id),
        NEW.created_by
    );
    
    -- Credit to destination account
    INSERT INTO account_transactions (
        account_id, business_id, type, amount, 
        reference_type, reference_id, description, created_by
    ) VALUES (
        NEW.to_account_id, NEW.business_id, 'credit', NEW.amount,
        'transfer', NEW.id, 
        COALESCE(NEW.notes, 'Fund transfer from account #' || NEW.from_account_id),
        NEW.created_by
    );
    
    RETURN NEW;
END;
$$;

-- Trigger to auto-create account transactions for fund transfers
DROP TRIGGER IF EXISTS trigger_create_fund_transfer_transactions ON fund_transfers;
CREATE TRIGGER trigger_create_fund_transfer_transactions
    AFTER INSERT ON fund_transfers
    FOR EACH ROW
    EXECUTE FUNCTION create_fund_transfer_transactions();

-- ============================================
-- PART 10: VERIFICATION
-- ============================================

-- Check all new tables created
SELECT 
    'New Tables Created' as check_type,
    COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'rental_bookings',
    'production_orders', 'production_steps', 'production_materials',
    'financial_accounts', 'account_transactions', 'fund_transfers',
    'expense_categories'
  );

-- Check new columns added to products
SELECT 
    'Products Table Extended' as check_type,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('is_rentable', 'rental_price', 'security_deposit_amount', 'rent_duration_unit');

-- Check module_config added to businesses
SELECT 
    'Businesses Table Extended' as check_type,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'businesses'
  AND column_name = 'module_config';

-- ============================================
-- COMPLETE!
-- ============================================
-- 
-- تمام new tables, columns, functions, triggers, اور RLS policies create ہو گئی ہیں
-- 
-- Next Steps:
-- 1. Verify tables: Run verification queries above
-- 2. Test RLS policies with actual user sessions
-- 3. Insert sample data for testing
-- 4. Update frontend to use new modules
-- 
-- Module Configuration Example:
-- UPDATE businesses 
-- SET module_config = '{"is_rental_active": true, "is_studio_active": true, "is_advanced_accounting_active": true}'::jsonb
-- WHERE id = <business_id>;
-- 
-- ============================================

