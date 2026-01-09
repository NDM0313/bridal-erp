-- ============================================
-- SALE TO PRODUCTION INTEGRATION
-- Add columns to link sales and production orders
-- ============================================
--
-- This script adds:
-- 1. transaction_id to production_orders (link to sale)
-- 2. location_id to production_orders (branch tracking)
-- 3. requires_production flag to products (identify production products)
--
-- Safe to run: Uses IF NOT EXISTS, nullable columns, backward compatible
-- ============================================

-- Step 1: Add transaction_id to production_orders
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'production_orders' 
        AND column_name = 'transaction_id'
    ) THEN
        ALTER TABLE production_orders 
        ADD COLUMN transaction_id INTEGER NULL;
        
        COMMENT ON COLUMN production_orders.transaction_id IS 
        'Links production order to sale transaction. NULL for manually created orders (if allowed in future).';
    END IF;
END $$;

-- Step 2: Add foreign key constraint for transaction_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_production_orders_transaction'
    ) THEN
        ALTER TABLE production_orders
        ADD CONSTRAINT fk_production_orders_transaction
        FOREIGN KEY (transaction_id)
        REFERENCES transactions(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- Step 3: Add index for transaction_id
CREATE INDEX IF NOT EXISTS idx_production_orders_transaction_id
ON production_orders(transaction_id)
WHERE transaction_id IS NOT NULL;

-- Step 4: Add location_id to production_orders
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'production_orders' 
        AND column_name = 'location_id'
    ) THEN
        ALTER TABLE production_orders 
        ADD COLUMN location_id INTEGER NULL;
        
        COMMENT ON COLUMN production_orders.location_id IS 
        'Branch/location where production order was created. Inherited from sale transaction.';
    END IF;
END $$;

-- Step 5: Add foreign key constraint for location_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_production_orders_location'
    ) THEN
        ALTER TABLE production_orders
        ADD CONSTRAINT fk_production_orders_location
        FOREIGN KEY (location_id)
        REFERENCES business_locations(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- Step 6: Add index for location_id
CREATE INDEX IF NOT EXISTS idx_production_orders_location_id
ON production_orders(location_id)
WHERE location_id IS NOT NULL;

-- Step 7: Add requires_production flag to products
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'requires_production'
    ) THEN
        ALTER TABLE products 
        ADD COLUMN requires_production BOOLEAN NOT NULL DEFAULT false;
        
        COMMENT ON COLUMN products.requires_production IS 
        'If true, sale of this product automatically creates a production order.';
    END IF;
END $$;

-- Step 8: Add partial index for requires_production (performance)
CREATE INDEX IF NOT EXISTS idx_products_requires_production
ON products(requires_production)
WHERE requires_production = true;

-- Step 9: Optional - Add unique constraint to prevent duplicate orders per sale
-- Uncomment if one sale should create exactly one production order
-- DO $$
-- BEGIN
--     IF NOT EXISTS (
--         SELECT 1 FROM pg_constraint 
--         WHERE conname = 'uq_production_orders_transaction_id'
--     ) THEN
--         ALTER TABLE production_orders
--         ADD CONSTRAINT uq_production_orders_transaction_id
--         UNIQUE (transaction_id)
--         WHERE transaction_id IS NOT NULL;
--     END IF;
-- END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify columns added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'production_orders'
    AND column_name IN ('transaction_id', 'location_id')
ORDER BY column_name;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'products'
    AND column_name = 'requires_production';

-- Verify constraints
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'production_orders'::regclass
    AND conname IN ('fk_production_orders_transaction', 'fk_production_orders_location');

-- Verify indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('production_orders', 'products')
    AND indexname IN (
        'idx_production_orders_transaction_id',
        'idx_production_orders_location_id',
        'idx_products_requires_production'
    )
ORDER BY tablename, indexname;
