-- Add measurements and assigned_vendor_id columns to production_orders table
-- This migration adds support for tailoring measurements and vendor assignment

-- Add measurements column (JSONB) if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'production_orders' AND column_name = 'measurements'
    ) THEN
        ALTER TABLE production_orders ADD COLUMN measurements JSONB NULL;
        COMMENT ON COLUMN production_orders.measurements IS 'JSON object storing tailoring measurements (shirtLength, chest, waist, hip, shoulder, sleeveLength, trouserLength, bottomPoncha)';
    END IF;
END $$;

-- Add assigned_vendor_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'production_orders' AND column_name = 'assigned_vendor_id'
    ) THEN
        ALTER TABLE production_orders ADD COLUMN assigned_vendor_id INTEGER NULL;
        ALTER TABLE production_orders 
            ADD CONSTRAINT fk_production_orders_vendor 
            FOREIGN KEY (assigned_vendor_id) 
            REFERENCES contacts(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_production_orders_vendor_id ON production_orders(assigned_vendor_id);
        COMMENT ON COLUMN production_orders.assigned_vendor_id IS 'Vendor assigned to handle this production order';
    END IF;
END $$;

-- Verify columns added
SELECT 
    'Columns Added' as check_type,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'production_orders'
  AND column_name IN ('measurements', 'assigned_vendor_id');

