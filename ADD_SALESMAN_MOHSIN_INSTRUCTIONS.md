# 📝 Add Salesman: Mohsin - Complete Instructions

## 👤 **User Details:**
- **Name:** Mohsin
- **Email:** mhm313@yahoo.com
- **Password:** 123456
- **Role:** salesman
- **Salary:** Rs. 40,000
- **Commission:** 1%

---

## 🚀 **Method 1: Quick SQL (If User Already Exists)**

Agar user pehle se `auth.users` mein hai, to yeh SQL script run karen:

```bash
psql "postgresql://postgres.xnpevheuniybnadyfjut:khan313ndm313@aws-1-ap-south-1.pooler.supabase.com:6543/postgres" -f scripts/add-salesman-mohsin-sql.sql
```

Ya direct SQL run karen:

```sql
-- Check if user exists first
SELECT id, email FROM auth.users WHERE email = 'mhm313@yahoo.com';

-- If user exists, run this:
DO $$
DECLARE
    v_user_id UUID;
    v_business_id INTEGER;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'mhm313@yahoo.com' LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found. Please create user first via Supabase Dashboard.';
    END IF;

    SELECT id INTO v_business_id FROM businesses WHERE id = 1 LIMIT 1;
    IF v_business_id IS NULL THEN
        SELECT id INTO v_business_id FROM businesses LIMIT 1;
    END IF;

    INSERT INTO user_profiles (user_id, business_id, role, base_salary, commission_percentage)
    VALUES (v_user_id, v_business_id, 'salesman', 40000, 1.0)
    ON CONFLICT (user_id) DO UPDATE SET
        role = 'salesman',
        base_salary = 40000,
        commission_percentage = 1.0,
        updated_at = NOW();
END $$;
```

---

## 🎯 **Method 2: Complete Setup (Create User + Profile)**

### **Step 1: Create User via Supabase Dashboard**

1. Supabase Dashboard kholen: https://supabase.com/dashboard
2. Apna project select karen
3. **Authentication** → **Users** → **Add User**
4. Fill karen:
   - **Email:** `mhm313@yahoo.com`
   - **Password:** `123456`
   - **Auto Confirm User:** ✅ (check karen)
   - **User Metadata:**
     ```json
     {
       "full_name": "Mohsin"
     }
     ```
5. **Create User** click karen

### **Step 2: Create Profile via SQL**

User create hone ke baad, yeh SQL run karen:

```bash
psql "postgresql://postgres.xnpevheuniybnadyfjut:khan313ndm313@aws-1-ap-south-1.pooler.supabase.com:6543/postgres" -f scripts/add-salesman-mohsin-sql.sql
```

---

## 🔧 **Method 3: Using Node.js Script (If Service Role Key Available)**

Agar aapke paas `SUPABASE_SERVICE_ROLE_KEY` hai, to:

1. `.env.local` file mein add karen:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xnpevheuniybnadyfjut.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. Script run karen:
   ```bash
   node scripts/add-salesman-mohsin.js
   ```

---

## ✅ **Verification**

User create hone ke baad, verify karen:

```sql
SELECT 
    up.id,
    au.email,
    up.role,
    up.base_salary,
    up.commission_percentage,
    b.name as business_name
FROM user_profiles up
JOIN auth.users au ON au.id = up.user_id
LEFT JOIN businesses b ON b.id = up.business_id
WHERE au.email = 'mhm313@yahoo.com';
```

**Expected Output:**
```
id | email              | role     | base_salary | commission_percentage | business_name
---+--------------------+----------+-------------+----------------------+---------------
1  | mhm313@yahoo.com   | salesman | 40000       | 1.0                  | Din Collection
```

---

## 🎉 **After Setup**

User ab login kar sakta hai:
- **Email:** mhm313@yahoo.com
- **Password:** 123456
- **Role:** salesman
- **Salary:** Rs. 40,000/month
- **Commission:** 1% on sales

---

## ⚠️ **Troubleshooting**

### **Error: "User not found in auth.users"**
→ User pehle Supabase Dashboard se create karen

### **Error: "No business found"**
→ Pehle business create karen (business_id = 1 hona chahiye)

### **Error: "column base_salary does not exist"**
→ Migration run karen to add salesman columns:
  ```sql
  ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS base_salary DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5,2) DEFAULT 0;
  ```

---

**Status:** Ready to execute  
**Last Updated:** January 8, 2026
