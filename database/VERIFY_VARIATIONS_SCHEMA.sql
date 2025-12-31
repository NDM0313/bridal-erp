-- Verify Product Variations Schema
-- Run this script to verify that product_variations and variations tables are properly set up

-- Check if product_variations table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_variations') THEN
        RAISE EXCEPTION 'product_variations table does not exist. Please run SUPABASE_SCHEMA.sql first.';
    ELSE
        RAISE NOTICE '✅ product_variations table exists';
    END IF;
END $$;

-- Check if variations table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'variations') THEN
        RAISE EXCEPTION 'variations table does not exist. Please run SUPABASE_SCHEMA.sql first.';
    ELSE
        RAISE NOTICE '✅ variations table exists';
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
    ELSE
        RAISE NOTICE '✅ variations table has product_variation_id column';
    END IF;
END $$;

-- Ensure RLS policies are enabled
ALTER TABLE IF EXISTS product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS variations ENABLE ROW LEVEL SECURITY;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_product_variations_product_id ON product_variations(product_id);
CREATE INDEX IF NOT EXISTS idx_variations_product_variation_id ON variations(product_variation_id);
CREATE INDEX IF NOT EXISTS idx_variations_product_id ON variations(product_id);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Product variations schema verified and ready for duplication';
    RAISE NOTICE '✅ All indexes created';
    RAISE NOTICE '✅ RLS policies enabled';
END $$;

