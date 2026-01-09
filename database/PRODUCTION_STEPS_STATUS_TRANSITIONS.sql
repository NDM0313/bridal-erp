-- ============================================
-- PRODUCTION STEPS STATUS TRANSITION RULES
-- Safe status transition enforcement via trigger
-- ============================================
--
-- Rules:
-- 1. Valid transitions: pending → in_progress → completed
-- 2. No backward transitions (except cancelled)
-- 3. No skipping steps
-- 4. completed only when completed_qty = step_qty (if step_qty is set)
-- 5. cancelled can be set from any status (special case)
--
-- Implementation: BEFORE UPDATE trigger
-- ============================================

-- Step 1: Create trigger function to validate status transitions
CREATE OR REPLACE FUNCTION validate_production_step_status_transition()
RETURNS TRIGGER AS $$
DECLARE
    is_qty_complete BOOLEAN;
BEGIN
    -- Allow cancelled from any status (special case)
    IF NEW.status = 'cancelled' THEN
        RETURN NEW;
    END IF;
    
    -- Block transition to cancelled if already cancelled
    IF OLD.status = 'cancelled' AND NEW.status != 'cancelled' THEN
        RAISE EXCEPTION 'Cannot transition from cancelled status. Step must remain cancelled.';
    END IF;
    
    -- Define valid transitions
    CASE OLD.status
        WHEN 'pending' THEN
            -- From pending: can only go to in_progress
            IF NEW.status NOT IN ('in_progress', 'cancelled') THEN
                RAISE EXCEPTION 'Invalid status transition: pending → %. Allowed: in_progress or cancelled', NEW.status;
            END IF;
            
        WHEN 'in_progress' THEN
            -- From in_progress: can go to completed or cancelled
            IF NEW.status NOT IN ('completed', 'cancelled') THEN
                RAISE EXCEPTION 'Invalid status transition: in_progress → %. Allowed: completed or cancelled', NEW.status;
            END IF;
            
            -- If transitioning to completed, validate quantity
            IF NEW.status = 'completed' THEN
                -- Check if step_qty is set
                IF NEW.step_qty IS NOT NULL THEN
                    -- completed_qty must equal step_qty
                    IF NEW.completed_qty IS NULL OR NEW.completed_qty != NEW.step_qty THEN
                        RAISE EXCEPTION 'Cannot mark as completed: completed_qty (%) must equal step_qty (%)', 
                            COALESCE(NEW.completed_qty, 0), NEW.step_qty;
                    END IF;
                END IF;
                
                -- Set completed_at timestamp if not already set
                IF NEW.completed_at IS NULL THEN
                    NEW.completed_at := CURRENT_TIMESTAMP;
                END IF;
            END IF;
            
        WHEN 'completed' THEN
            -- From completed: cannot transition to anything (except cancelled, but that's already handled)
            IF NEW.status != 'cancelled' THEN
                RAISE EXCEPTION 'Invalid status transition: completed → %. Cannot transition from completed status (except to cancelled)', NEW.status;
            END IF;
            
        WHEN 'cancelled' THEN
            -- Already handled above: cannot transition from cancelled
            RAISE EXCEPTION 'Cannot transition from cancelled status';
            
        ELSE
            -- Unknown old status (should not happen due to CHECK constraint)
            RAISE EXCEPTION 'Unknown previous status: %', OLD.status;
    END CASE;
    
    -- Auto-set started_at when transitioning to in_progress
    IF NEW.status = 'in_progress' AND OLD.status = 'pending' THEN
        IF NEW.started_at IS NULL THEN
            NEW.started_at := CURRENT_TIMESTAMP;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger
DROP TRIGGER IF EXISTS trg_validate_production_step_status ON production_steps;

CREATE TRIGGER trg_validate_production_step_status
    BEFORE UPDATE OF status, completed_qty, step_qty ON production_steps
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status OR 
          OLD.completed_qty IS DISTINCT FROM NEW.completed_qty OR
          OLD.step_qty IS DISTINCT FROM NEW.step_qty)
    EXECUTE FUNCTION validate_production_step_status_transition();

-- Step 3: Add CHECK constraint to ensure completed status requires quantity match
-- (Additional safety at constraint level)
ALTER TABLE production_steps
DROP CONSTRAINT IF EXISTS production_steps_completed_qty_check;

ALTER TABLE production_steps
ADD CONSTRAINT production_steps_completed_qty_check
CHECK (
    -- If status is completed and step_qty is set, completed_qty must equal step_qty
    (status != 'completed') OR 
    (step_qty IS NULL) OR 
    (completed_qty = step_qty)
);

-- Step 4: Add comment for documentation
COMMENT ON FUNCTION validate_production_step_status_transition() IS 
'Validates production step status transitions. Rules: pending → in_progress → completed. No backward transitions. completed requires completed_qty = step_qty when step_qty is set.';

COMMENT ON TRIGGER trg_validate_production_step_status ON production_steps IS 
'Enforces safe status transitions for production steps. Prevents invalid transitions and ensures quantity completion before marking as completed.';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'production_steps'
    AND trigger_name = 'trg_validate_production_step_status';

-- Verify function exists
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name = 'validate_production_step_status_transition';

-- Verify constraint exists
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'production_steps'::regclass
    AND conname = 'production_steps_completed_qty_check';
