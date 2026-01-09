# Create Studio Sale - Step by Step Guide

**Date**: January 2026  
**Purpose**: Create a sale that will show in Production Dashboard  
**Time**: 2 minutes

---

## ✅ QUICK STEPS

### 1. **Go to Sales Page**
- URL: `/dashboard/sales`
- Click **"Add Sale"** button

### 2. **Add Production Product**
Search and add ONE of these products:
- **T-Shirt Cotton Premium** (SKU: TSH-COT-001)
- **Jeans Denim Blue** (SKU: JNS-DEN-BLU)

These products are already marked with `requires_production = true`

### 3. **Fill Sale Details**
- **Customer**: Walk-in (or any customer)
- **Quantity**: 5 (or any number)
- **Branch**: Select your branch
- **Date**: Today

### 4. **Save as Final**
- Click **"Save Sale"** button
- Status must be **"Final"** (not draft)

### 5. **Check Production Dashboard**
- Go to: `/dashboard/production`
- Look in **"Setup Required"** column
- Your sale should appear there! ✨

---

## 🎯 WHAT HAPPENS

### Backend Flow:
1. Sale created with `status = 'final'`
2. Backend checks: Does sale have `requires_production` products?
3. If YES → Creates production order automatically
4. Production order appears in dashboard

### Frontend Flow:
1. Dashboard fetches all final sales
2. Checks which sales have production products
3. Filters out sales that already have production orders
4. Shows remaining sales in "Setup Required"

---

## ✅ VERIFICATION

After creating sale:

### Check 1: Sale Created
- Go to `/dashboard/sales`
- See your new sale with sparkle icon ✨

### Check 2: Production Dashboard
- Go to `/dashboard/production`
- "Setup Required" column should show your sale
- Click on it (future: will open setup screen)

### Check 3: Console Logs (F12)
```
Fetching orders for business: 1
Fetching production orders...
Production orders loaded: X
Fetching transactions for setup...
Transactions loaded: Y
Found sale requiring production: [ID] [INVOICE]
Pending setup sales: 1
```

---

## 🔧 TROUBLESHOOTING

### Sale not showing?

**Check 1: Product marked?**
```sql
SELECT id, name, requires_production 
FROM products 
WHERE id IN (169, 170);
```
Should show `requires_production = true`

**Check 2: Sale is final?**
- Status must be 'final', not 'draft'

**Check 3: Console errors?**
- Open browser console (F12)
- Look for red errors
- Check detailed logs

**Check 4: Already has production order?**
```sql
SELECT * FROM production_orders 
WHERE transaction_id = YOUR_SALE_ID;
```
If exists, sale won't show in "Setup Required"

---

## 📝 MARKED PRODUCTS

These products are ready for studio sales:

| ID | Name | SKU | Status |
|----|------|-----|--------|
| 169 | T-Shirt Cotton Premium | TSH-COT-001 | ✅ Marked |
| 170 | Jeans Denim Blue | JNS-DEN-BLU | ✅ Marked |

Use these in your sale!

---

## ✅ SUMMARY

1. ✅ Backend integration: Working
2. ✅ Products marked: 2 products ready
3. ✅ Dashboard fixed: Filters corrected
4. ✅ Dummy data: Cleaned
5. ⏳ **Action Required**: Create sale via UI

**Just create one sale with marked products and check dashboard!** 🎉

---

**END OF GUIDE**
