# Test INSERT Guide - Supabase Service Role Key

## ✅ TASK 1 — VERIFY SUPABASE CLIENT

**Status**: ✅ VERIFIED

**File**: `backend/src/config/supabase.js`

**Configuration**:
- ✅ `supabaseAdmin` uses `SUPABASE_SERVICE_ROLE_KEY` (line 33-40)
- ✅ Bypasses RLS for server-side operations
- ✅ Properly initialized with error handling

**Code**:
```javascript
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;
```

---

## ✅ TASK 2 — HEALTH CHECK ROUTE

**Status**: ✅ CREATED

**Endpoint**: `GET /test/health`

**Features**:
- Tests Supabase connection using service_role key
- Verifies admin client is initialized
- Returns connection status

**Test**:
```bash
curl http://localhost:3001/test/health
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Server and Supabase are connected",
  "timestamp": "2025-01-XX...",
  "supabase": {
    "connected": true,
    "usingServiceRole": true
  }
}
```

---

## ✅ TASK 3 — TEST INSERT ROUTE

**Status**: ✅ CREATED

**Endpoint**: `POST /test/insert`

**File**: `backend/src/routes/test.js`

**Features**:
- Uses `supabaseAdmin` (service_role key)
- Inserts into `products` table
- Validates required fields
- Returns clear success/error responses

---

## ✅ TASK 4 — ERROR HANDLING

**Status**: ✅ IMPLEMENTED

**Error Cases Handled**:
1. Missing required fields → 400 with field list
2. Supabase admin client not initialized → 500 with clear message
3. Database insert error → 500 with error details
4. Unexpected errors → 500 with error message

---

## ✅ TASK 5 — ROUTES REGISTERED

**Status**: ✅ REGISTERED

**File**: `backend/src/server.js`

**Changes**:
- ✅ Imported `testRoutes` (line 20)
- ✅ Registered at `/test` (line 34)

---

## ✅ TASK 6 — SAMPLE POST REQUEST

### Endpoint
```
POST http://localhost:3001/test/insert
```

### Headers
```
Content-Type: application/json
```

### Request Body
```json
{
  "name": "Test Product",
  "sku": "TEST-001",
  "business_id": 1,
  "unit_id": 1,
  "created_by": "YOUR_USER_UUID_HERE"
}
```

### cURL Command
```bash
curl -X POST "http://localhost:3001/test/insert" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "sku": "TEST-001",
    "business_id": 1,
    "unit_id": 1,
    "created_by": "YOUR_USER_UUID_HERE"
  }'
```

### PowerShell Command
```powershell
$body = @{
    name = "Test Product"
    sku = "TEST-001"
    business_id = 1
    unit_id = 1
    created_by = "YOUR_USER_UUID_HERE"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/test/insert" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

### Expected Success Response
```json
{
  "success": true,
  "message": "Product inserted successfully",
  "data": {
    "id": 1,
    "name": "Test Product",
    "sku": "TEST-001",
    "business_id": 1,
    "unit_id": 1,
    "created_at": "2025-01-XX...",
    ...
  }
}
```

### Expected Error Response (Missing Fields)
```json
{
  "success": false,
  "error": "Missing required fields",
  "required": ["name", "sku", "business_id", "unit_id", "created_by"],
  "received": {
    "name": true,
    "sku": true,
    "business_id": false,
    "unit_id": false,
    "created_by": false
  }
}
```

---

## ✅ TASK 7 — VERIFY IN SUPABASE DASHBOARD

### Step 1: Open Supabase Dashboard
1. Go to https://app.supabase.com
2. Select your project
3. Navigate to **Table Editor**

### Step 2: View Products Table
1. Click on **`products`** table in the left sidebar
2. You should see the inserted record with:
   - `id`: Auto-generated
   - `name`: "Test Product"
   - `sku`: "TEST-001"
   - `business_id`: 1
   - `unit_id`: 1
   - `created_at`: Current timestamp

### Step 3: Verify Using SQL Editor
1. Go to **SQL Editor** in Supabase Dashboard
2. Run:
```sql
SELECT * FROM products 
WHERE sku = 'TEST-001' 
ORDER BY created_at DESC 
LIMIT 1;
```

### Expected Result
- One row returned
- All fields populated correctly
- `created_at` timestamp matches insertion time

---

## 📋 REQUIRED VALUES

Before testing, you need:

1. **business_id**: 
   - Get from `businesses` table
   - Run: `SELECT id, name FROM businesses;`

2. **unit_id**: 
   - Get from `units` table
   - Run: `SELECT id, actual_name FROM units WHERE business_id = 1;`

3. **created_by** (UUID):
   - Get from Supabase Auth → Users
   - Copy the UUID (id column)

---

## 🔧 TROUBLESHOOTING

### Error: "Supabase admin client not initialized"
**Solution**: Check `.env` file has `SUPABASE_SERVICE_ROLE_KEY` set

### Error: "Failed to insert product"
**Possible Causes**:
- Foreign key constraint (business_id or unit_id doesn't exist)
- Unique constraint (sku already exists)
- Missing required field
- Check error details in response

### Error: "Missing required fields"
**Solution**: Ensure all required fields are provided:
- `name` (string)
- `sku` (string)
- `business_id` (integer)
- `unit_id` (integer)
- `created_by` (UUID string)

---

## ✅ VERIFICATION CHECKLIST

- [ ] Backend server is running
- [ ] `/test/health` returns success
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set in `.env`
- [ ] Have valid `business_id` and `unit_id`
- [ ] Have valid user UUID for `created_by`
- [ ] POST request to `/test/insert` returns 201
- [ ] Record appears in Supabase Dashboard
- [ ] SQL query confirms record exists

---

**Test routes are ready for verification!**

