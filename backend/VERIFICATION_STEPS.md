# Backend Verification Steps

## ✅ TASK 1 — SERVER START VERIFICATION

### Step 1.1: Check Environment Variables

**Action**: Verify `.env` file has all required variables

```powershell
cd C:\Users\ndm31\dev\Corusr\my-pos-system\my-pos-system\backend
Get-Content .env | Select-String "SUPABASE"
```

**Expected Output**:
```
SUPABASE_URL=https://xnpevheuniybnadyfjut.supabase.co
SUPABASE_ANON_KEY=sb_publishable_Gl2zL4cEDTcOpv6VP9gFFA_GOSLUw-d
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
```

**⚠️ IMPORTANT**: If `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here`, you need to:
1. Go to Supabase Dashboard → Settings → API
2. Copy the `service_role` secret key
3. Update `.env` file with the actual key

### Step 1.2: Start Backend Server

**Action**: Start the server

```powershell
cd C:\Users\ndm31\dev\Corusr\my-pos-system\my-pos-system\backend
npm run dev
```

**Expected Console Output**:
```
🚀 Server running on port 3001
📝 Environment: development
🔗 Health check: http://localhost:3001/health
✅ Supabase URL: https://xnpevheuniybnadyfjut.supabase...
✅ Supabase Anon Key: sb_publishable_Gl2zL4cED...
✅ Supabase Service Role Key: sb_xxxxxxxxxxxxx...
```

**✅ Verification Checklist**:
- [ ] No SyntaxError
- [ ] Server reaches running state
- [ ] Supabase URL is NOT undefined
- [ ] Service role key is shown (NOT the warning)

**❌ If Warning Appears**:
```
⚠️ SUPABASE_SERVICE_ROLE_KEY is not set!
```
→ Update `.env` file with actual service role key

---

## ✅ TASK 2 — HEALTH ENDPOINT TEST

### Step 2.1: Test Health Endpoint

**Action**: Send GET request to health endpoint

**PowerShell Command**:
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/test/health" -Method GET
```

**cURL Command** (if available):
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

**✅ Verification Checklist**:
- [ ] Response shows `success: true`
- [ ] Server timestamp is present
- [ ] `supabase.connected: true`
- [ ] `supabase.usingServiceRole: true`

**❌ If Error**:
- **500 "Supabase admin client not initialized"** → Check `SUPABASE_SERVICE_ROLE_KEY` in `.env`
- **500 "Supabase connection failed"** → Check Supabase project is active
- **Connection refused** → Server is not running

---

## ✅ TASK 3 — TEST REMOTE INSERT

### Step 3.1: Get Required Values

**Before testing, you need**:

1. **business_id**: 
   ```sql
   SELECT id, name FROM businesses LIMIT 1;
   ```

2. **unit_id**: 
   ```sql
   SELECT id, actual_name FROM units WHERE business_id = 1 LIMIT 1;
   ```

3. **created_by** (UUID):
   - Go to Supabase Dashboard → Authentication → Users
   - Copy the UUID (id column) of any user

### Step 3.2: Send POST Request

**PowerShell Command**:
```powershell
$body = @{
    name = "Test Product"
    sku = "TEST-$(Get-Date -Format 'yyyyMMddHHmmss')"
    business_id = 1
    unit_id = 1
    created_by = "YOUR_USER_UUID_HERE"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/test/insert" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

**cURL Command**:
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

**Expected Success Response**:
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

**✅ Verification Checklist**:
- [ ] Response shows `success: true`
- [ ] `data` object contains inserted product
- [ ] `id` is auto-generated
- [ ] `created_at` timestamp is present

**❌ If Error**:

**400 "Missing required fields"**:
```json
{
  "success": false,
  "error": "Missing required fields",
  "required": ["name", "sku", "business_id", "unit_id", "created_by"],
  "received": {...}
}
```
→ Check all required fields are provided

**500 "Failed to insert product"**:
```json
{
  "success": false,
  "error": "Failed to insert product",
  "details": "...",
  "code": "..."
}
```
→ Check error details:
- Foreign key constraint → `business_id` or `unit_id` doesn't exist
- Unique constraint → `sku` already exists for this `business_id`
- Invalid UUID → `created_by` is not a valid UUID format

---

## ✅ TASK 4 — VERIFY DATABASE INSERTION

### Step 4.1: Open Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project
3. Navigate to **Table Editor**

### Step 4.2: View Products Table

1. Click on **`products`** table in the left sidebar
2. You should see the inserted record

**Expected Record**:
- `id`: Auto-generated integer
- `name`: "Test Product"
- `sku`: "TEST-001" (or your test SKU)
- `business_id`: 1 (or your test business_id)
- `unit_id`: 1 (or your test unit_id)
- `created_by`: UUID string
- `created_at`: Recent timestamp
- `type`: "single"
- `enable_stock`: false
- `is_inactive`: false

### Step 4.3: Verify Using SQL Editor

1. Go to **SQL Editor** in Supabase Dashboard
2. Run:
```sql
SELECT * FROM products 
WHERE sku = 'TEST-001' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Result**:
- One row returned
- All fields populated correctly
- `created_at` timestamp matches insertion time

---

## ✅ TASK 5 — ERROR REPORTING

### If Any Step Fails:

**Capture**:
1. **Exact error message** from console or response
2. **Stack trace** (if available)
3. **Which step failed** (1, 2, 3, or 4)
4. **HTTP status code** (if applicable)
5. **Response body** (if applicable)

**Common Issues**:

1. **Server won't start**:
   - Check: Syntax errors in code
   - Check: Missing dependencies (`npm install`)
   - Check: Port 3001 is not in use

2. **Health endpoint fails**:
   - Check: `SUPABASE_SERVICE_ROLE_KEY` is set correctly
   - Check: Supabase project is active
   - Check: Network connectivity

3. **Insert fails**:
   - Check: All required fields provided
   - Check: `business_id` exists in `businesses` table
   - Check: `unit_id` exists in `units` table
   - Check: `created_by` is valid UUID from `auth.users`
   - Check: `sku` is unique for the `business_id`

4. **Record not visible in dashboard**:
   - Check: Correct table (`products`)
   - Check: RLS is enabled (service_role should bypass)
   - Check: Refresh the table view
   - Check: SQL query to confirm record exists

---

## 📋 COMPLETE VERIFICATION CHECKLIST

- [ ] **TASK 1**: Server starts without errors
- [ ] **TASK 1**: Supabase URL is NOT undefined
- [ ] **TASK 1**: Service role key warning is NOT shown
- [ ] **TASK 2**: Health endpoint returns success
- [ ] **TASK 2**: Supabase admin client is initialized
- [ ] **TASK 3**: POST request to `/test/insert` succeeds
- [ ] **TASK 3**: Response shows `success: true`
- [ ] **TASK 4**: Record appears in Supabase Dashboard
- [ ] **TASK 4**: Record has correct fields and timestamp

---

## 🎯 SUCCESS CRITERIA

**Backend is verified when**:
1. ✅ Server starts without errors
2. ✅ Health endpoint confirms Supabase connection
3. ✅ INSERT operation succeeds
4. ✅ Record is visible in Supabase Dashboard

**If all tasks pass**: Backend is stable and Supabase remote INSERT works using SERVICE_ROLE key.

---

**Ready for verification!**

