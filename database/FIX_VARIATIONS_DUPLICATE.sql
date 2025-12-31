-- Fix for Product Variations Duplication
-- This script ensures product_variations and variations tables are properly set up
-- Run this if you encounter RLS or foreign key issues when duplicating products

-- Verify product_variations table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_variations') THEN
        RAISE EXCEPTION 'product_variations table does not exist. Please run SUPABASE_SCHEMA.sql first.';
    END IF;
END $$;

-- Verify variations table has product_variation_id column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'variations' AND column_name = 'product_variation_id'
    ) THEN
        RAISE EXCEPTION 'variations table missing product_variation_id column. Please run SUPABASE_SCHEMA.sql first.';
    END IF;
END $$;

-- Ensure RLS policies are in place
ALTER TABLE product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE variations ENABLE ROW LEVEL SECURITY;

-- Verify indexes exist
CREATE INDEX IF NOT EXISTS idx_product_variations_product_id ON product_variations(product_id);
CREATE INDEX IF NOT EXISTS idx_variations_product_variation_id ON variations(product_variation_id);
CREATE INDEX IF NOT EXISTS idx_variations_product_id ON variations(product_id);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Product variations schema verified and ready for duplication';
END $$;

