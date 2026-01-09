# Production Steps API Contracts

## Overview

API contracts for managing production steps: updating quantity progress, status transitions, and fetching dashboard counts.

**Base URL**: `/api/v1/production/steps`

**Authentication**: All endpoints require Bearer token in `Authorization` header.

**Response Format**: Consistent JSON with `success`, `data`, and optional `error` fields.

---

## Endpoint 1: Update Step Quantity Progress

### `PATCH /api/v1/production/steps/:stepId/quantity`

Updates the completed quantity for a production step. Validates that `completed_qty <= step_qty`.

**Method**: `PATCH`  
**Path Parameter**: `stepId` (integer, required)  
**Authentication**: Required  
**Permission**: `production.update` (manager/admin)

#### Request Headers
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

#### Request Body
```json
{
  "completed_qty": 75.5,
  "step_qty": 100.0
}
```

**Field Validation**:
- `completed_qty` (number, required): Must be >= 0, must be <= `step_qty` (if `step_qty` provided)
- `step_qty` (number, optional): Must be >= 0, must be >= `completed_qty` (if `completed_qty` provided)

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": 123,
    "production_order_id": 45,
    "step_name": "Dyeing",
    "step_qty": 100.0,
    "completed_qty": 75.5,
    "status": "in_progress",
    "vendor_id": 12,
    "cost": 5000.00,
    "notes": "In progress",
    "started_at": "2026-01-08T10:00:00Z",
    "completed_at": null,
    "created_at": "2026-01-08T09:00:00Z",
    "updated_at": "2026-01-08T11:30:00Z"
  }
}
```

#### Error Responses

**400 Bad Request** - Validation Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "completed_qty (150) cannot exceed step_qty (100)",
    "details": {
      "field": "completed_qty",
      "value": 150,
      "constraint": "completed_qty <= step_qty"
    }
  }
}
```

**404 Not Found** - Step Not Found
```json
{
  "success": false,
  "error": {
    "code": "STEP_NOT_FOUND",
    "message": "Production step with ID 123 not found or does not belong to your business"
  }
}
```

**403 Forbidden** - Permission Denied
```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You do not have permission to update production steps"
  }
}
```

---

## Endpoint 2: Update Step Status

### `PATCH /api/v1/production/steps/:stepId/status`

Updates the status of a production step. Enforces status transition rules:
- `pending` → `in_progress` → `completed`
- No backward transitions
- No skipping steps
- `completed` requires `completed_qty = step_qty` (if `step_qty` is set)

**Method**: `PATCH`  
**Path Parameter**: `stepId` (integer, required)  
**Authentication**: Required  
**Permission**: `production.update` (manager/admin)

#### Request Headers
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

#### Request Body
```json
{
  "status": "completed"
}
```

**Field Validation**:
- `status` (string, required): Must be one of: `pending`, `in_progress`, `completed`, `cancelled`
- Status transition must be valid according to rules
- If transitioning to `completed` and `step_qty` is set, `completed_qty` must equal `step_qty`

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": 123,
    "production_order_id": 45,
    "step_name": "Dyeing",
    "step_qty": 100.0,
    "completed_qty": 100.0,
    "status": "completed",
    "vendor_id": 12,
    "cost": 5000.00,
    "notes": "Completed",
    "started_at": "2026-01-08T10:00:00Z",
    "completed_at": "2026-01-08T15:30:00Z",
    "created_at": "2026-01-08T09:00:00Z",
    "updated_at": "2026-01-08T15:30:00Z"
  }
}
```

#### Error Responses

**400 Bad Request** - Invalid Status Transition
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Invalid status transition: pending → completed. Allowed: in_progress or cancelled",
    "details": {
      "current_status": "pending",
      "requested_status": "completed",
      "allowed_transitions": ["in_progress", "cancelled"]
    }
  }
}
```

**400 Bad Request** - Quantity Not Complete
```json
{
  "success": false,
  "error": {
    "code": "QUANTITY_INCOMPLETE",
    "message": "Cannot mark as completed: completed_qty (75) must equal step_qty (100)",
    "details": {
      "completed_qty": 75.0,
      "step_qty": 100.0,
      "required": "completed_qty must equal step_qty"
    }
  }
}
```

**400 Bad Request** - Backward Transition
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Invalid status transition: completed → in_progress. Cannot transition from completed status (except to cancelled)",
    "details": {
      "current_status": "completed",
      "requested_status": "in_progress"
    }
  }
}
```

**404 Not Found** - Step Not Found
```json
{
  "success": false,
  "error": {
    "code": "STEP_NOT_FOUND",
    "message": "Production step with ID 123 not found or does not belong to your business"
  }
}
```

**403 Forbidden** - Permission Denied
```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You do not have permission to update production steps"
  }
}
```

---

## Endpoint 3: Fetch Studio Dashboard Counts

### `GET /api/v1/production/steps/dashboard/counts`

Returns real-time counts for studio dashboard:
- Dyer count (Dyeing steps not completed)
- Handwork count (Handwork steps not completed)
- Stitching count (Stitching steps not completed)
- Completed count (all completed steps)

**Method**: `GET`  
**Query Parameters**: None (business_id from auth context)  
**Authentication**: Required  
**Permission**: `production.view` (all authenticated users)

#### Request Headers
```
Authorization: Bearer <jwt-token>
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "dyer_count": 5,
    "handwork_count": 3,
    "stitching_count": 8,
    "completed_count": 12,
    "total_steps": 28,
    "in_progress_total": 10,
    "pending_total": 6
  }
}
```

**Response Fields**:
- `dyer_count` (integer): Count of Dyeing steps with status != 'completed'
- `handwork_count` (integer): Count of Handwork steps with status != 'completed'
- `stitching_count` (integer): Count of Stitching steps with status != 'completed'
- `completed_count` (integer): Count of all steps with status = 'completed'
- `total_steps` (integer): Total count of all steps (optional, for reference)
- `in_progress_total` (integer): Total in_progress steps across all step names (optional)
- `pending_total` (integer): Total pending steps across all step names (optional)

#### Error Responses

**500 Internal Server Error** - Database Error
```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Failed to fetch dashboard counts"
  }
}
```

---

## Endpoint 4: Update Step (Combined)

### `PATCH /api/v1/production/steps/:stepId`

Updates multiple fields of a production step in a single request. Validates both quantity and status rules.

**Method**: `PATCH`  
**Path Parameter**: `stepId` (integer, required)  
**Authentication**: Required  
**Permission**: `production.update` (manager/admin)

#### Request Headers
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

#### Request Body
```json
{
  "status": "in_progress",
  "step_qty": 100.0,
  "completed_qty": 50.0,
  "vendor_id": 12,
  "cost": 5000.00,
  "notes": "Updated notes"
}
```

**Field Validation**:
- `status` (string, optional): Valid status transition required
- `step_qty` (number, optional): Must be >= 0, must be >= `completed_qty`
- `completed_qty` (number, optional): Must be >= 0, must be <= `step_qty`
- `vendor_id` (integer, optional): Must exist in contacts table
- `cost` (number, optional): Must be >= 0
- `notes` (string, optional): Max length 1000 characters

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": 123,
    "production_order_id": 45,
    "step_name": "Dyeing",
    "step_qty": 100.0,
    "completed_qty": 50.0,
    "status": "in_progress",
    "vendor_id": 12,
    "cost": 5000.00,
    "notes": "Updated notes",
    "started_at": "2026-01-08T10:00:00Z",
    "completed_at": null,
    "created_at": "2026-01-08T09:00:00Z",
    "updated_at": "2026-01-08T11:30:00Z"
  }
}
```

#### Error Responses

Same as Endpoint 1 and 2, depending on which validation fails.

---

## Validation Rules Summary

### Quantity Validation
1. `completed_qty` must be >= 0
2. `step_qty` must be >= 0
3. `completed_qty` must be <= `step_qty` (when both are set)
4. If `status = 'completed'` and `step_qty` is set, then `completed_qty` must equal `step_qty`

### Status Transition Validation
1. **From `pending`**: Can only transition to `in_progress` or `cancelled`
2. **From `in_progress`**: Can only transition to `completed` or `cancelled`
   - If transitioning to `completed`: `completed_qty` must equal `step_qty` (if `step_qty` is set)
3. **From `completed`**: Can only transition to `cancelled`
4. **From `cancelled`**: Cannot transition to any other status

### Business Context Validation
1. Step must belong to a production order in the user's business
2. User must have appropriate permissions (`production.update` or `production.view`)

### Automatic Behaviors
1. When transitioning `pending` → `in_progress`: Auto-sets `started_at` if NULL
2. When transitioning to `completed`: Auto-sets `completed_at` if NULL
3. `updated_at` is automatically updated on any change

---

## Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Field validation failed |
| `INVALID_STATUS_TRANSITION` | 400 | Status transition not allowed |
| `QUANTITY_INCOMPLETE` | 400 | Cannot complete: quantity mismatch |
| `STEP_NOT_FOUND` | 404 | Step not found or access denied |
| `PERMISSION_DENIED` | 403 | User lacks required permission |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |

---

## Usage Examples

### TypeScript/JavaScript

```typescript
// Update quantity progress
const updateQuantity = async (stepId: number, completedQty: number, stepQty: number) => {
  const response = await fetch(`/api/v1/production/steps/${stepId}/quantity`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      completed_qty: completedQty,
      step_qty: stepQty,
    }),
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error.message);
  }
  return result.data;
};

// Update status
const updateStatus = async (stepId: number, status: string) => {
  const response = await fetch(`/api/v1/production/steps/${stepId}/status`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error.message);
  }
  return result.data;
};

// Get dashboard counts
const getDashboardCounts = async () => {
  const response = await fetch('/api/v1/production/steps/dashboard/counts', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  const result = await response.json();
  return result.data;
};
```

---

## Implementation Notes

### Backend Service Functions Required

1. `updateStepQuantity(stepId, businessId, quantityData)` - Updates quantity fields
2. `updateStepStatus(stepId, businessId, status)` - Updates status with validation
3. `getDashboardCounts(businessId)` - Returns aggregated counts
4. `updateStep(stepId, businessId, updateData)` - Combined update function

### Database Triggers

The database trigger `trg_validate_production_step_status` will automatically:
- Validate status transitions
- Validate quantity constraints
- Auto-set timestamps (`started_at`, `completed_at`)

Backend should still validate before calling database to provide better error messages.

### Caching Considerations

Dashboard counts endpoint can be cached for 30-60 seconds to reduce database load. Use React Query or similar with appropriate `staleTime`.

---

**Last Updated**: January 8, 2026  
**Status**: ✅ API Contracts Defined
