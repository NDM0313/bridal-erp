# PRODUCTION SERVER REPAIR - DEPLOYMENT STEPS

## Overview
Your production server (`https://pos.dincouture.pk`) is returning 500 errors because the API routes have naming conflicts. This guide will fix that.

**Status:** ✅ Fixed api.php ready | ⏳ Awaiting deployment

---

## FILES READY FOR UPLOAD

Three files are ready in: `C:\xampp\htdocs\610\`

1. **`api_fixed.php`** - The corrected routes file (170+ lines, all routes properly namespaced)
2. **`PRODUCTION_REPAIR_INSTRUCTIONS.md`** - Detailed repair guide
3. **`PRODUCTION_REPAIR_SCRIPT.sh`** - Automated bash script for server

---

## DEPLOYMENT METHOD OPTIONS

### OPTION A: Using File Manager (Easiest - No SSH/FTP Needed)

1. **Login to your hosting control panel** (cPanel, Plesk, etc.)
2. **Navigate to:** `public_html/pos/Modules/Connector/Routes/`
3. **Right-click `api.php`** → **Rename** to `api.php.backup.original`
4. **Upload file:** Select `api_fixed.php` from C:\xampp\htdocs\610\
5. **Rename uploaded file** from `api_fixed.php` to `api.php`

---

### OPTION B: Using FTP/SFTP

```
Host: dincouture.pk
Username: dincouture
Password: [your FTP password]
Port: 21 (FTP) or 22 (SFTP)

Path: /public_html/pos/Modules/Connector/Routes/

Steps:
1. Backup: Rename api.php → api.php.backup.original
2. Upload: api_fixed.php
3. Rename: api_fixed.php → api.php
```

---

### OPTION C: Using SSH Terminal (if available)

```bash
# SSH into server
ssh dincouture@dincouture.pk

# Navigate to project
cd ~/domains/dincouture.pk/public_html/pos

# Execute the repair script
bash PRODUCTION_REPAIR_SCRIPT.sh
```

---

## STEP-BY-STEP AFTER UPLOADING api.php

### Step 1: Clear Caches (Via Control Panel Terminal OR SSH)

```bash
cd ~/domains/dincouture.pk/public_html/pos
php artisan route:clear
php artisan config:clear  
php artisan cache:clear
```

### Step 2: Rebuild Cache (CRITICAL - MUST SUCCEED)

```bash
php artisan optimize
```

**Expected output:**
```
Compiling routes...
Compiled successfully.
```

**If it FAILS:** There's still a duplicate route name. Check the error and see [TROUBLESHOOTING](#troubleshooting) section.

### Step 3: Verify API Works

**Test 1: Check status code**
```bash
curl -I https://pos.dincouture.pk/connector/api/business-locations
```
Expected: `HTTP/2 401` or `HTTP/2 200` (NOT 500)

**Test 2: Test login**
```bash
curl -X POST https://pos.dincouture.pk/connector/api/login \
  -d "username=rabi313&password=12345&client_id=47&client_secret=JXLzfcQxUaTumJOBTBuHFYFuntZSrxh361UIyyX3" \
  -H "Accept: application/json"
```
Expected: JSON response with `"access_token"` field

**Test 3: Verify real data loads**
```bash
# First get token from Test 2, then:
TOKEN="YOUR_TOKEN_HERE"
curl -H "Authorization: Bearer $TOKEN" \
  https://pos.dincouture.pk/connector/api/dashboard-summary
```
Expected: JSON with dashboard metrics (not HTML error)

---

## WHAT'S BEEN FIXED

| Problem | Solution |
|---------|----------|
| Routes named `product.index`, `user.index` (conflicts with main app) | All renamed to `connector.product.index`, `connector.user.index` (unique) |
| `php artisan optimize` fails due to duplicate names | All 13+ resources now have unique `connector.*` naming |
| API returning 500 errors instead of JSON | Fixed by preventing route cache corruption |
| Missing auth:api middleware | All authenticated routes grouped with `auth:api` middleware |

---

## TROUBLESHOOTING

### Problem: `php artisan optimize` still fails

**Error message** will show duplicate route name like:
```
LogicException: Route names must be unique, found duplicate: "user.index"
```

**Solution:**
1. Open `Modules/Connector/Routes/api.php`
2. Find the problematic route (grep for "user.index")
3. Add `->name('connector.user.index')` if missing
4. Save and try `php artisan optimize` again
5. Repeat until no duplicates

---

### Problem: API still returning HTML instead of JSON

**Cause:** Cache rebuild didn't complete properly

**Solution:**
1. Clear caches manually:
   ```bash
   rm -rf bootstrap/cache/*
   php artisan cache:clear
   ```
2. Rebuild:
   ```bash
   php artisan optimize
   ```
3. Verify cache exists:
   ```bash
   ls -la bootstrap/cache/
   ```

---

### Problem: 500 error on /oauth/token endpoint

**Cause:** Passport not installed or not configured

**Solution:**
1. Check if Passport installed:
   ```bash
   php artisan passport:install
   ```
2. Verify oauth_clients table exists:
   ```bash
   php artisan tinker
   >>> DB::table('oauth_clients')->get();
   ```
3. Verify password grant client exists (client_id = 47):
   ```bash
   >>> DB::table('oauth_clients')->where('id', 47)->first();
   ```

---

## VERIFICATION CHECKLIST

After deployment, verify:

- [ ] File uploaded: `Modules/Connector/Routes/api.php` exists
- [ ] Backup created: `api.php.backup.original` exists  
- [ ] Caches cleared: `php artisan cache:clear` ran successfully
- [ ] Routes optimized: `php artisan optimize` succeeded with no errors
- [ ] No duplicates: `grep -R "->name(" Modules | cut -d"'" -f2 | sort | uniq -d` returns empty
- [ ] Login works: POST /connector/api/login returns access_token
- [ ] Data loads: GET /connector/api/dashboard-summary returns JSON with real data
- [ ] No HTML errors: API returns JSON, not `<!DOCTYPE html>`

---

## ROLLBACK PROCEDURE

If something goes wrong:

```bash
cd ~/domains/dincouture.pk/public_html/pos

# Restore from backup
cp Modules/Connector/Routes/api.php.backup.original Modules/Connector/Routes/api.php

# Rebuild cache
php artisan route:clear
php artisan config:clear
php artisan cache:clear
php artisan optimize
```

---

## FILES REFERENCE

**Fixed api.php includes routes for:**
- ✅ Login (public)
- ✅ Users (authenticated)
- ✅ Business locations
- ✅ Dashboard & reports
- ✅ Products & variations
- ✅ Customers/Contacts
- ✅ Sales/Transactions
- ✅ Expenses
- ✅ Payments
- ✅ Cash register
- ✅ Categories, Units, Brands, Taxes
- ✅ Tables & Services
- ✅ Notifications
- ✅ Subscriptions
- ✅ Attendance
- ✅ CRM (Follow-ups, Leads, Call logs)
- ✅ Field Force tracking

**All routes use pattern:** `connector.<resource>.<action>`

---

## EXPECTED RESULTS

✅ **After successful deployment:**
- API endpoints respond with HTTP 200/401 (never 500)
- Login returns valid JWT token
- Protected endpoints require Bearer token
- Real business data loads from database
- Flutter app can authenticate and sync
- Dashboard shows sales/expense metrics
- Locations show all business branches
- Products load with all variations
- Mobile POS system fully functional

---

## CONTACT & QUESTIONS

If you encounter issues:

1. **Check error logs:** `/public_html/pos/storage/logs/laravel.log`
2. **Run diagnostics:** `php artisan tinker` → `DB::connection()->getPdo()`
3. **Verify Passport:** `php artisan passport:install`
4. **Clear everything:** 
   ```bash
   php artisan cache:clear
   php artisan route:clear
   php artisan config:clear
   php artisan view:clear
   php artisan optimize
   ```

---

**Status:** ✅ READY FOR DEPLOYMENT  
**Last Updated:** 2025-12-12  
**Server:** dincouture.pk  
**Local Project:** C:\xampp\htdocs\610\
