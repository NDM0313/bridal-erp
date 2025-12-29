# Supabase Database Setup - Complete Guide (اردو)

## 🎯 مقصد

یہ گائیڈ آپ کو Supabase میں تمام database tables شامل کرنے میں مدد کرے گی۔

---

## 📋 فائل کا نام

**`database/COMPLETE_DATABASE_SETUP.sql`**

یہ فائل تمام tables, functions, اور RLS policies شامل کرتی ہے۔

---

## 🚀 استعمال کا طریقہ

### Step 1: Supabase Dashboard کھولیں

1. https://app.supabase.com پر جائیں
2. اپنا project select کریں
3. بائیں sidebar میں **SQL Editor** پر کلک کریں

### Step 2: SQL فائل کھولیں

1. `my-pos-system/database/COMPLETE_DATABASE_SETUP.sql` فائل کھولیں
2. **پوری فائل** کا content copy کریں (Ctrl+A, Ctrl+C)

### Step 3: SQL Editor میں Paste کریں

1. Supabase SQL Editor میں paste کریں (Ctrl+V)
2. **Run** button پر کلک کریں (یا Ctrl+Enter)

### Step 4: Verification

SQL Editor میں یہ query run کریں:

```sql
-- Check all tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected Result**: آپ کو یہ tables نظر آنی چاہئیں:
- businesses
- business_locations
- user_profiles
- units
- brands
- categories
- products
- variations
- variation_location_details
- transactions
- transaction_sell_lines
- transaction_purchase_lines
- stock_adjustment_lines
- stock_transfer_lines
- contacts
- organizations
- organization_users
- organization_subscriptions
- billing_history
- subscription_events
- error_logs
- payment_failure_logs
- sale_failure_logs
- support_agents
- support_access_logs
- system_settings
- notification_templates
- notifications
- automation_rules
- audit_logs

---

## ✅ کیا یہ فائل Safe ہے؟

**ہاں!** یہ فائل:
- ✅ `IF NOT EXISTS` استعمال کرتی ہے (existing tables کو delete نہیں کرے گی)
- ✅ Existing data کو delete نہیں کرے گی
- ✅ Multiple times run کر سکتے ہیں
- ✅ صرف missing tables create کرے گی

---

## ⚠️ اگر Error آئے

### Error: "relation already exists"
- **مطلب**: Table پہلے سے موجود ہے
- **حل**: یہ normal ہے، script skip کر دے گی

### Error: "permission denied"
- **مطلب**: آپ کے پاس admin access نہیں ہے
- **حل**: Service role key استعمال کریں یا admin سے رابطہ کریں

### Error: "foreign key constraint"
- **مطلب**: Dependencies missing ہیں
- **حل**: پوری فائل دوبارہ run کریں (order matter کرتا ہے)

---

## 📊 کون سی Tables شامل ہیں؟

### Core Tables (بنیادی)
- businesses
- business_locations
- user_profiles

### Product Tables (پروڈکٹ)
- units
- brands
- categories
- products
- variations
- variation_location_details (STOCK)

### Transaction Tables (ٹرانزیکشن)
- transactions
- transaction_sell_lines
- transaction_purchase_lines
- stock_adjustment_lines
- stock_transfer_lines

### Contact Tables (کنسٹومر/سپلائر)
- contacts

### SaaS Tables (SaaS features)
- organizations
- organization_users
- organization_subscriptions
- billing_history
- subscription_events

### Monitoring Tables (نگرانی)
- error_logs
- payment_failure_logs
- sale_failure_logs

### Support Tables (سپورٹ)
- support_agents
- support_access_logs

### Other Tables (دیگر)
- system_settings
- notification_templates
- notifications
- automation_rules
- audit_logs

---

## 🔧 Functions شامل ہیں

- `get_user_business_id()` - User کا business ID نکالتا ہے
- `get_user_organization_id()` - User کا organization ID نکالتا ہے

---

## 🔒 Security (RLS)

تمام tables پر **Row Level Security (RLS)** enable ہے۔
یہ یقینی بناتا ہے کہ:
- Users صرف اپنے business کا data دیکھ سکتے ہیں
- Cross-business data access نہیں ہو سکتا

---

## ✅ Verification Checklist

Setup کے بعد یہ checks کریں:

- [ ] تمام tables create ہو گئیں
- [ ] Functions کام کر رہی ہیں
- [ ] RLS enabled ہے
- [ ] کوئی error نہیں ہے

---

## 📝 Next Steps

1. ✅ Tables create ہو گئیں
2. ✅ Bootstrap data add کریں (اگر چاہیں)
3. ✅ Test user create کریں
4. ✅ Frontend test کریں

---

**Setup complete!** ✅

