# 🗄️ SQL Execution Guide

## Quick Methods to Run SQL on Supabase

### Method 1: Supabase Dashboard (Easiest - Recommended)
1. Go to: **https://supabase.com/dashboard/project/xnpevheuniybnadyfjut**
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New Query"**
4. Paste your SQL and click **"Run"** (or press `Ctrl+Enter`)

**✅ This method always works and doesn't require any setup!**

---

### Method 2: Node.js Script (When network is available)
```bash
# Execute SQL directly
node scripts/run-sql.js "SELECT * FROM business_locations LIMIT 5;"

# Execute SQL from file
node scripts/run-sql.js --file database/DEPRECATE_BRANCHES_TABLE.sql
```

**Note:** Requires network connectivity to Supabase. If you get `ENOTFOUND` error, use Method 1 (Dashboard) instead.

---

### Method 3: Supabase CLI (if configured)
```bash
# If you have Supabase CLI linked to your project
npx supabase db execute "SELECT * FROM business_locations LIMIT 5;"

# Or from file
npx supabase db execute --file database/DEPRECATE_BRANCHES_TABLE.sql
```

---

### Method 4: Direct psql (if installed)
```bash
# Windows PowerShell
$env:PGPASSWORD="IPHONE@13MAX"; psql -h db.xnpevheuniybnadyfjut.supabase.co -U postgres -d postgres -c "SELECT * FROM business_locations LIMIT 5;"

# Linux/Mac
PGPASSWORD="IPHONE@13MAX" psql -h db.xnpevheuniybnadyfjut.supabase.co -U postgres -d postgres -c "SELECT * FROM business_locations LIMIT 5;"
```

---

### Method 5: PowerShell Script (Windows)
```powershell
.\scripts\run-sql-quick.ps1 "SELECT * FROM business_locations LIMIT 5;"
```

---

## Database Connection Details

**Project Ref:** `xnpevheuniybnadyfjut`  
**Connection String:** `postgresql://postgres:IPHONE@13MAX@db.xnpevheuniybnadyfjut.supabase.co:5432/postgres`

---

## Common SQL Queries

### Check branches
```sql
SELECT * FROM business_locations ORDER BY created_at DESC LIMIT 10;
```

### Check RLS policies
```sql
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
```

### Check foreign keys
```sql
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'business_locations';
```

---

## Files Created

- `scripts/run-sql.js` - Node.js SQL executor (uses postgres package)
- `scripts/run-sql.sh` - Bash script (Linux/Mac)
- `scripts/run-sql-quick.ps1` - PowerShell script (Windows)

