# Production Steps Status Transition Logic

## Overview

This document defines the safe status transition rules for the `production_steps` table. These rules are enforced at the database level using triggers and CHECK constraints to ensure data integrity.

---

## Status Transition Rules

### Valid Status Values

The `production_steps.status` column accepts the following values:
- `pending` - Step has not started
- `in_progress` - Step is currently being worked on
- `completed` - Step is finished
- `cancelled` - Step has been cancelled (special case)

### Allowed Transitions

```
pending → in_progress → completed
   ↓           ↓            ↓
cancelled   cancelled   cancelled
```

**Detailed Rules:**

1. **From `pending`**:
   - ✅ Can transition to: `in_progress`, `cancelled`
   - ❌ Cannot transition to: `completed` (must go through `in_progress` first)

2. **From `in_progress`**:
   - ✅ Can transition to: `completed`, `cancelled`
   - ❌ Cannot transition to: `pending` (no backward transitions)
   - ⚠️ To transition to `completed`: `completed_qty` must equal `step_qty` (if `step_qty` is set)

3. **From `completed`**:
   - ✅ Can transition to: `cancelled` (only exception)
   - ❌ Cannot transition to: `pending`, `in_progress` (no backward transitions)

4. **From `cancelled`**:
   - ❌ Cannot transition to any other status (cancelled is terminal)

### Special Cases

#### Cancelled Status
- Can be set from **any** status (pending, in_progress, completed)
- Once cancelled, **cannot** be changed to any other status
- Acts as a terminal state

#### Quantity Validation for Completed
- When `step_qty` is **NULL**: Can mark as `completed` without quantity check
- When `step_qty` is **set**: `completed_qty` **must equal** `step_qty` to mark as `completed`
- This ensures all work is done before marking as completed

---

## Database-Level Enforcement

### 1. Trigger Function: `validate_production_step_status_transition()`

**Type**: BEFORE UPDATE trigger  
**Fires On**: Updates to `status`, `completed_qty`, or `step_qty` columns

**Responsibilities**:
- Validates status transitions according to rules
- Enforces quantity completion requirement
- Auto-sets `started_at` when transitioning to `in_progress`
- Auto-sets `completed_at` when transitioning to `completed`

**Error Messages**:
- `Invalid status transition: pending → X. Allowed: in_progress or cancelled`
- `Invalid status transition: in_progress → X. Allowed: completed or cancelled`
- `Cannot mark as completed: completed_qty (X) must equal step_qty (Y)`
- `Cannot transition from completed status (except to cancelled)`
- `Cannot transition from cancelled status`

### 2. CHECK Constraint: `production_steps_completed_qty_check`

**Definition**:
```sql
CHECK (
    (status != 'completed') OR 
    (step_qty IS NULL) OR 
    (completed_qty = step_qty)
)
```

**Purpose**: 
- Additional safety layer at constraint level
- Ensures that if status is `completed` and `step_qty` is set, then `completed_qty` must equal `step_qty`
- Prevents invalid data even if trigger is bypassed

### 3. Existing CHECK Constraint: `production_steps_status_check`

**Definition**:
```sql
CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'))
```

**Purpose**: 
- Ensures only valid status values are allowed
- Prevents typos or invalid status strings

---

## Automatic Behaviors

### Timestamp Auto-Setting

The trigger automatically sets timestamps when status changes:

1. **`started_at`**:
   - Set to `CURRENT_TIMESTAMP` when transitioning from `pending` → `in_progress`
   - Only set if currently NULL (preserves existing value if already set)

2. **`completed_at`**:
   - Set to `CURRENT_TIMESTAMP` when transitioning to `completed`
   - Only set if currently NULL (preserves existing value if already set)

---

## Examples

### Valid Operations

```sql
-- 1. Start a step
UPDATE production_steps
SET status = 'in_progress'
WHERE id = 1;
-- ✅ Valid: pending → in_progress
-- Auto-sets started_at

-- 2. Complete a step (with quantity)
UPDATE production_steps
SET status = 'completed',
    step_qty = 100,
    completed_qty = 100
WHERE id = 1;
-- ✅ Valid: in_progress → completed
-- ✅ Valid: completed_qty (100) = step_qty (100)
-- Auto-sets completed_at

-- 3. Complete a step (without quantity tracking)
UPDATE production_steps
SET status = 'completed'
WHERE id = 2;
-- ✅ Valid: in_progress → completed
-- ✅ Valid: step_qty is NULL, so no quantity check needed
-- Auto-sets completed_at

-- 4. Cancel from any status
UPDATE production_steps
SET status = 'cancelled'
WHERE id = 3;
-- ✅ Valid: any status → cancelled
```

### Invalid Operations (Will Raise Errors)

```sql
-- 1. Skip in_progress
UPDATE production_steps
SET status = 'completed'
WHERE id = 1 AND status = 'pending';
-- ❌ Error: Invalid status transition: pending → completed

-- 2. Backward transition
UPDATE production_steps
SET status = 'pending'
WHERE id = 1 AND status = 'in_progress';
-- ❌ Error: Invalid status transition: in_progress → pending

-- 3. Incomplete quantity
UPDATE production_steps
SET status = 'completed',
    step_qty = 100,
    completed_qty = 75
WHERE id = 1;
-- ❌ Error: Cannot mark as completed: completed_qty (75) must equal step_qty (100)

-- 4. Transition from completed
UPDATE production_steps
SET status = 'in_progress'
WHERE id = 1 AND status = 'completed';
-- ❌ Error: Cannot transition from completed status (except to cancelled)

-- 5. Transition from cancelled
UPDATE production_steps
SET status = 'pending'
WHERE id = 1 AND status = 'cancelled';
-- ❌ Error: Cannot transition from cancelled status
```

---

## Application Code Guidelines

### Recommended Patterns

**1. Status Updates:**
```typescript
// Start a step
await supabase
  .from('production_steps')
  .update({ status: 'in_progress' })
  .eq('id', stepId);

// Complete a step (with quantity)
await supabase
  .from('production_steps')
  .update({ 
    status: 'completed',
    completed_qty: stepQty  // Must equal step_qty
  })
  .eq('id', stepId);
```

**2. Error Handling:**
```typescript
try {
  await supabase
    .from('production_steps')
    .update({ status: 'completed' })
    .eq('id', stepId);
} catch (error) {
  if (error.message.includes('Invalid status transition')) {
    // Handle invalid transition
  } else if (error.message.includes('completed_qty')) {
    // Handle quantity mismatch
  }
}
```

**3. Quantity Validation (Client-Side):**
```typescript
// Before updating to completed, validate quantity
if (stepQty !== null && completedQty !== stepQty) {
  throw new Error('Cannot complete: quantity mismatch');
}
```

---

## Testing the Rules

### Test Queries

```sql
-- Test 1: Valid transition (pending → in_progress)
UPDATE production_steps
SET status = 'in_progress'
WHERE id = 1 AND status = 'pending';
-- Should succeed

-- Test 2: Invalid transition (pending → completed)
UPDATE production_steps
SET status = 'completed'
WHERE id = 1 AND status = 'pending';
-- Should fail with error

-- Test 3: Quantity validation
UPDATE production_steps
SET status = 'completed',
    step_qty = 100,
    completed_qty = 100
WHERE id = 1 AND status = 'in_progress';
-- Should succeed

-- Test 4: Quantity mismatch
UPDATE production_steps
SET status = 'completed',
    step_qty = 100,
    completed_qty = 50
WHERE id = 1 AND status = 'in_progress';
-- Should fail with error
```

---

## Summary

### Enforced Rules

✅ **Sequential Transitions**: `pending → in_progress → completed`  
✅ **No Backward Transitions**: Cannot go backwards (except cancelled)  
✅ **No Skipping Steps**: Must go through each status sequentially  
✅ **Quantity Completion**: `completed` requires `completed_qty = step_qty` (when `step_qty` is set)  
✅ **Cancelled Terminal**: Once cancelled, cannot change status  

### Safety Mechanisms

1. **Trigger Function**: Validates transitions at runtime
2. **CHECK Constraint**: Additional safety for quantity validation
3. **Auto-Timestamps**: Automatically sets `started_at` and `completed_at`
4. **Clear Error Messages**: Descriptive errors guide developers

### Database Objects

- **Function**: `validate_production_step_status_transition()`
- **Trigger**: `trg_validate_production_step_status`
- **Constraint**: `production_steps_completed_qty_check`
- **Constraint**: `production_steps_status_check` (existing)

---

**Last Updated**: January 8, 2026  
**Status**: ✅ Production Ready
