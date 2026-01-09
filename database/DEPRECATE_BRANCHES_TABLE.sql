-- ============================================================================
-- DEPRECATE BRANCHES TABLE
-- ============================================================================
-- 
-- PURPOSE: Safely deprecate the orphaned 'branches' table
-- 
-- CONTEXT:
-- - business_locations is the official branch table (used in 16+ files)
-- - branches table has zero usage in codebase
-- - All foreign keys use location_id → business_locations.id
-- - RLS policies are configured for business_locations
--
-- SAFETY:
-- - This script checks for dependencies before deprecation
-- - Adds deprecation comment to table
-- - Optionally drops table if empty (commented out by default)
-- ============================================================================

-- Step 1: Verify no foreign keys reference 'branches' table
DO $$
DECLARE
    fk_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.referential_constraints rc
    JOIN information_schema.constraint_column_usage ccu
        ON rc.unique_constraint_name = ccu.constraint_name
        AND rc.unique_constraint_schema = ccu.constraint_schema
    WHERE ccu.table_schema = 'public'
        AND ccu.table_name = 'branches';
    
    IF fk_count > 0 THEN
        RAISE EXCEPTION 'Cannot deprecate: % foreign keys reference branches table', fk_count;
    ELSE
        RAISE NOTICE '✅ No foreign keys reference branches table - safe to deprecate';
    END IF;
END $$;

-- Step 2: Check if branches table exists and has data
DO $$
DECLARE
    table_exists BOOLEAN;
    row_count INTEGER;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'branches'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT COUNT(*) INTO row_count FROM branches;
        RAISE NOTICE 'branches table exists with % rows', row_count;
    ELSE
        RAISE NOTICE 'branches table does not exist - nothing to deprecate';
    END IF;
END $$;

-- Step 3: Add deprecation comment to branches table (if exists)
COMMENT ON TABLE branches IS 
    'DEPRECATED: This table is not used. Use business_locations instead. All branch operations should use business_locations table with location_id foreign keys.';

-- Step 4: Verify business_locations is the active table
DO $$
DECLARE
    bl_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO bl_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'business_locations';
    
    IF bl_count = 0 THEN
        RAISE EXCEPTION 'CRITICAL: business_locations table does not exist!';
    ELSE
        RAISE NOTICE '✅ business_locations table exists - this is the official branch table';
    END IF;
END $$;

-- Step 5: Verify foreign keys use location_id → business_locations
DO $$
DECLARE
    fk_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.referential_constraints rc
    JOIN information_schema.constraint_column_usage ccu
        ON rc.unique_constraint_name = ccu.constraint_name
        AND rc.unique_constraint_schema = ccu.constraint_schema
    JOIN information_schema.key_column_usage kcu
        ON rc.constraint_name = kcu.constraint_name
        AND rc.constraint_schema = kcu.constraint_schema
    WHERE ccu.table_schema = 'public'
        AND ccu.table_name = 'business_locations'
        AND kcu.column_name = 'location_id';
    
    RAISE NOTICE '✅ Found % foreign keys using location_id → business_locations.id', fk_count;
    
    IF fk_count = 0 THEN
        RAISE WARNING 'No foreign keys found - verify transactions and variation_location_details use location_id';
    END IF;
END $$;

-- ============================================================================
-- OPTIONAL: Drop branches table (UNCOMMENT ONLY IF TABLE IS EMPTY)
-- ============================================================================
-- 
-- WARNING: Only uncomment if:
-- 1. branches table has zero rows
-- 2. No foreign keys reference it (verified above)
-- 3. You have a database backup
--
-- Uncomment the following lines to drop the table:
--
-- DROP TABLE IF EXISTS branches CASCADE;
-- RAISE NOTICE 'branches table dropped successfully';
--
-- ============================================================================

-- Final verification
DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'DEPRECATION COMPLETE';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '✅ branches table marked as DEPRECATED';
    RAISE NOTICE '✅ business_locations is the official branch table';
    RAISE NOTICE '✅ All operations should use business_locations with location_id';
    RAISE NOTICE '============================================================================';
END $$;

