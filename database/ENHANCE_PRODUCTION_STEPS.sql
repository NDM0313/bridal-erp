-- ============================================
-- ENHANCE production_steps TABLE
-- Add semi-advanced production tracking columns
-- ============================================
-- 
-- This script adds:
-- 1. step_qty (numeric) - Total quantity for this step
-- 2. completed_qty (numeric) - Completed quantity
-- 3. CHECK constraint: completed_qty <= step_qty
-- 4. Indexes for step_name and status based counts
--
-- Safe to run: Uses IF NOT EXISTS and preserves existing data
-- ============================================

-- Step 1: Add step_qty column (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'production_steps' 
        AND column_name = 'step_qty'
    ) THEN
        ALTER TABLE production_steps 
        ADD COLUMN step_qty NUMERIC(22, 4) NULL;
        
        COMMENT ON COLUMN production_steps.step_qty IS 'Total quantity for this production step';
    END IF;
END $$;

-- Step 2: Add completed_qty column (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'production_steps' 
        AND column_name = 'completed_qty'
    ) THEN
        ALTER TABLE production_steps 
        ADD COLUMN completed_qty NUMERIC(22, 4) NOT NULL DEFAULT 0;
        
        COMMENT ON COLUMN production_steps.completed_qty IS 'Completed quantity for this step (must be <= step_qty)';
    END IF;
END $$;

-- Step 3: Add CHECK constraint for completed_qty <= step_qty
-- (Only if both columns exist and constraint doesn't exist)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'production_steps' 
        AND column_name = 'step_qty'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'production_steps' 
        AND column_name = 'completed_qty'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'production_steps_qty_check'
    ) THEN
        ALTER TABLE production_steps 
        ADD CONSTRAINT production_steps_qty_check 
        CHECK (
            step_qty IS NULL OR 
            completed_qty IS NULL OR 
            completed_qty <= step_qty
        );
    END IF;
END $$;

-- Step 4: Update status CHECK constraint to ensure it includes required values
-- (Keep existing 'cancelled' to not break existing data, but ensure required values exist)
-- Note: Existing constraint already has 'pending', 'in_progress', 'completed', 'cancelled'
-- We'll keep it as-is to preserve existing data compatibility

-- Step 5: Create index on step_name for step_name based counts (if not exists)
CREATE INDEX IF NOT EXISTS idx_production_steps_step_name 
ON production_steps(step_name);

-- Step 6: Index on status already exists (idx_production_steps_status)
-- Verify it exists, create if missing
CREATE INDEX IF NOT EXISTS idx_production_steps_status 
ON production_steps(status);

-- Step 7: Composite index for common queries (step_name + status)
CREATE INDEX IF NOT EXISTS idx_production_steps_step_name_status 
ON production_steps(step_name, status);

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
    AND table_name = 'production_steps'
    AND column_name IN ('step_qty', 'completed_qty')
ORDER BY column_name;

-- Verify constraint exists
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'production_steps'::regclass
    AND conname = 'production_steps_qty_check';

-- Verify indexes exist
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'production_steps'
    AND indexname IN (
        'idx_production_steps_step_name',
        'idx_production_steps_status',
        'idx_production_steps_step_name_status'
    )
ORDER BY indexname;
