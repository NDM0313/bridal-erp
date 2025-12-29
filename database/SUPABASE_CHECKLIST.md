# Supabase Setup Checklist
## Step 2: Production Database Configuration

Use this checklist to ensure all steps are completed correctly.

---

## ✅ PROJECT SETUP

- [ ] Created Supabase account
- [ ] Created new project in Supabase Dashboard
- [ ] Selected appropriate region (closest to users)
- [ ] Generated and saved database password securely
- [ ] Saved project credentials:
  - [ ] Project URL
  - [ ] `anon` key (public)
  - [ ] `service_role` key (secret - never expose)
  - [ ] Database connection string

---

## ✅ DATABASE SCHEMA

- [ ] Opened Supabase SQL Editor
- [ ] Copied contents of `FINAL_SCHEMA.sql`
- [ ] Executed schema SQL successfully
- [ ] Verified no errors in execution
- [ ] Ran verification queries:
  - [ ] All 12 tables exist
  - [ ] Foreign keys are created
  - [ ] Indexes are created
  - [ ] Critical columns exist (base_unit_id, retail_price, etc.)

---

## ✅ AUTHENTICATION

- [ ] Verified Email provider is enabled
- [ ] Configured Site URL in Authentication settings
- [ ] Added redirect URLs (localhost and production)
- [ ] Reviewed email templates (optional)
- [ ] Saved JWT secret (auto-generated)
- [ ] Verified JWT expiry settings

---

## ✅ ROW LEVEL SECURITY (RLS)

- [ ] Enabled RLS on all 12 tables
- [ ] Created `get_user_business_id()` function
- [ ] Implemented user-business mapping strategy
- [ ] Created RLS policies for all tables:
  - [ ] businesses
  - [ ] business_locations
  - [ ] contacts
  - [ ] units
  - [ ] brands
  - [ ] categories
  - [ ] products
  - [ ] product_variations
  - [ ] variations
  - [ ] variation_location_details (stock)
  - [ ] transactions
  - [ ] transaction_sell_lines
- [ ] Verified RLS is enabled on all tables
- [ ] Verified policies exist for all tables
- [ ] Tested policies with authenticated user (optional)

---

## ✅ VERIFICATION

- [ ] Ran table existence query (12 tables)
- [ ] Ran foreign key verification query
- [ ] Ran index verification query
- [ ] Ran critical columns verification query
- [ ] Ran RLS status query (all tables show `rowsecurity = true`)
- [ ] Ran policy listing query (policies exist for all tables)

---

## ✅ SECURITY

- [ ] Verified `service_role` key is kept secret
- [ ] Confirmed `anon` key is safe for client-side use
- [ ] Enabled SSL for database connections
- [ ] Reviewed API key rotation schedule
- [ ] Documented backup procedures (if applicable)

---

## ✅ DOCUMENTATION

- [ ] Saved project credentials securely
- [ ] Documented user-business mapping strategy
- [ ] Noted any custom configurations
- [ ] Saved connection strings for future use

---

## ⚠️ CRITICAL NOTES

### Before Going to Production:

1. **Implement `get_user_business_id()` function**
   - Choose mapping strategy (user metadata, user_businesses table, etc.)
   - Test with real users
   - Verify RLS policies work correctly

2. **Test RLS Policies**
   - Create test users for different businesses
   - Verify data isolation works
   - Test all CRUD operations

3. **Backup Strategy**
   - Enable automatic backups (paid plans)
   - Document restore procedures
   - Test backup restoration

4. **Monitoring**
   - Set up database monitoring
   - Configure alerts for errors
   - Monitor query performance

---

## 🚀 NEXT STEPS

After completing this checklist:

1. ✅ Database is ready for application development
2. ✅ RLS is configured for multi-tenancy
3. ✅ Authentication is ready
4. ⏭️ **Next**: Implement application logic (Step 3)

---

## 📝 QUICK REFERENCE

### Important URLs:
- **Dashboard**: https://app.supabase.com
- **SQL Editor**: Dashboard → SQL Editor
- **Authentication**: Dashboard → Authentication
- **Settings**: Dashboard → Settings → API

### Key Files:
- `FINAL_SCHEMA.sql` - Database schema
- `RLS_POLICIES.sql` - RLS policies
- `SUPABASE_SETUP_GUIDE.md` - Detailed setup guide
- `SUPABASE_CHECKLIST.md` - This file

---

**Status**: ⏳ In Progress / ✅ Complete

**Completed Date**: _______________

**Notes**: 
_________________________________
_________________________________
_________________________________

