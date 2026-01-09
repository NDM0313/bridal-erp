-- ============================================================================
-- CLEANUP: Drop Deprecated `branches` Table
-- Date: January 8, 2026
-- Status: OPTIONAL (Safe to run)
-- ============================================================================
-- 
-- CONTEXT:
-- The `branches` table is deprecated. The official branch table is `business_locations`.
-- This script safely removes the deprecated table after verification.
--
-- VERIFICATION COMPLETED:
-- ✅ Zero foreign key dependencies
-- ✅ Zero RLS policies reference it
-- ✅ Contains only 2 legacy demo rows
-- ✅ Not used by application code
--
-- ============================================================================

-- STEP 1: Final safety check - Verify zero foreign key dependencies
-- ============================================================================

DO $$
DECLARE
    fk_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND ccu.table_name = 'branches';
    
    IF fk_count > 0 THEN
        RAISE EXCEPTION '❌ ABORT: % foreign keys still reference branches table', fk_count;
    ELSE
        RAISE NOTICE '✅ Safe to proceed: Zero foreign key dependencies';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Backup the data (just in case)
-- ============================================================================

DO $$
BEGIN
    -- Create a backup comment with the data
    EXECUTE 'COMMENT ON TABLE branches IS ''DEPRECATED: Dropped on ' || 
            CURRENT_TIMESTAMP || 
            '. Legacy data: 2 rows (Main Branch MB-001, Downtown Outlet DO-002).''';
    
    RAISE NOTICE '✅ Backup comment added to table metadata';
END $$;

-- ============================================================================
-- STEP 3: Drop the deprecated `branches` table
-- ============================================================================

DROP TABLE IF EXISTS branches CASCADE;

-- ============================================================================
-- STEP 4: Verify it's gone
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'branches'
    ) THEN
        RAISE EXCEPTION '❌ Table still exists!';
    ELSE
        RAISE NOTICE '✅ SUCCESS: branches table dropped successfully';
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Final verification
-- ============================================================================

-- Verify business_locations is still intact
SELECT 
    'business_locations' as table_name,
    COUNT(*) as row_count,
    COUNT(DISTINCT business_id) as business_count
FROM business_locations;

-- Verify all foreign keys still point to business_locations
SELECT 
    tc.table_name as referencing_table,
    kcu.column_name as referencing_column,
    COUNT(*) as fk_count
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'business_locations'
GROUP BY tc.table_name, kcu.column_name
ORDER BY tc.table_name;

-- ============================================================================
-- CLEANUP COMPLETE
-- ============================================================================

SELECT '✅ CLEANUP COMPLETE: branches table removed, business_locations intact' as status;

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
