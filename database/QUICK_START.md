# Supabase Quick Start Guide
## Get Your Database Running in 5 Minutes

---

## 🚀 Quick Setup Steps

### 1. Create Supabase Project (2 minutes)

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in:
   - Name: `my-pos-system`
   - Password: Generate strong password (save it!)
   - Region: Choose closest to you
4. Wait 2-3 minutes for project creation

### 2. Run Database Schema (1 minute)

1. In Supabase Dashboard → SQL Editor
2. Open `database/FINAL_SCHEMA.sql`
3. Copy entire file
4. Paste in SQL Editor
5. Click "Run"
6. ✅ Should see "Success. No rows returned"

### 3. Enable RLS (1 minute)

1. In SQL Editor, open `database/RLS_POLICIES.sql`
2. Copy entire file
3. Paste in SQL Editor
4. Click "Run"
5. ✅ Should see "Success. No rows returned"

### 4. Verify Setup (1 minute)

1. In SQL Editor, open `database/VERIFICATION_QUERIES.sql`
2. Run query #1 (check tables exist)
3. ✅ Should see 12 tables
4. Run query #5 (check RLS enabled)
5. ✅ All tables should show `rls_enabled = true`

---

## ✅ You're Done!

Your database is now ready with:
- ✅ 12 tables created
- ✅ RLS enabled
- ✅ Multi-tenancy policies configured
- ✅ Box/Pieces conversion support
- ✅ Retail/Wholesale pricing support

---

## ⚠️ Important: Implement User-Business Mapping

Before using in production, you MUST implement the `get_user_business_id()` function.

**Options:**

1. **Store in user metadata** (Recommended):
   ```sql
   -- Update function to read from auth.users.raw_user_meta_data
   SELECT (raw_user_meta_data->>'business_id')::INTEGER
   FROM auth.users
   WHERE id = auth.uid();
   ```

2. **Create user_businesses table**:
   ```sql
   CREATE TABLE user_businesses (
       user_id UUID REFERENCES auth.users(id),
       business_id INTEGER REFERENCES businesses(id),
       PRIMARY KEY (user_id, business_id)
   );
   ```

---

## 📚 Full Documentation

- **Detailed Setup**: `SUPABASE_SETUP_GUIDE.md`
- **Checklist**: `SUPABASE_CHECKLIST.md`
- **RLS Policies**: `RLS_POLICIES.sql`
- **Verification**: `VERIFICATION_QUERIES.sql`

---

## 🔑 Save These Credentials

After project creation, save:
- Project URL: `https://xxx.supabase.co`
- `anon` key: `sb_xxx...` (public, safe for client)
- `service_role` key: `sb_xxx...` (secret, server-only)
- Database password: (saved during creation)

---

## 🆘 Troubleshooting

**Error: Table already exists**
- Tables are already created, skip schema step

**Error: Policy already exists**
- Policies are already created, skip RLS step

**RLS blocking all queries**
- Implement `get_user_business_id()` function first

---

**Ready for Step 3: API Implementation!** 🎉

