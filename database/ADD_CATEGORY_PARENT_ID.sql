-- ============================================
-- ADD PARENT_ID COLUMN TO CATEGORIES TABLE
-- For Sub-Category Support
-- ============================================
-- 
-- This script adds a parent_id column to the categories table
-- to support hierarchical categories (parent-child relationships).
-- 
-- USAGE: Run this in Supabase SQL Editor
-- ============================================

-- Add parent_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'categories' 
        AND column_name = 'parent_id'
    ) THEN
        ALTER TABLE categories 
        ADD COLUMN parent_id INTEGER NULL;
        
        -- Add foreign key constraint
        ALTER TABLE categories
        ADD CONSTRAINT fk_categories_parent 
        FOREIGN KEY (parent_id) 
        REFERENCES categories(id) 
        ON DELETE SET NULL;
        
        -- Add index for better query performance
        CREATE INDEX IF NOT EXISTS idx_categories_parent_id 
        ON categories(parent_id);
        
        RAISE NOTICE 'parent_id column added to categories table';
    ELSE
        RAISE NOTICE 'parent_id column already exists in categories table';
    END IF;
END $$;

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'categories' 
AND column_name = 'parent_id';

