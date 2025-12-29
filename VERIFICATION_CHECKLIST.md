# Verification Checklist - Advanced POS Features

## 🎯 PURPOSE

Verify that all advanced POS features work correctly and maintain security guarantees.

---

## ✅ CHECKLIST 1: INVOICE GENERATION

### Test 1: Invoice Shows Correct Business Data

**Action**:
1. Login as User A (business_id = 1)
2. Create a sale and finalize it
3. Generate invoice for the sale

**Expected**:
- ✅ Invoice shows business name from business_id = 1
- ✅ Invoice shows location from business_id = 1
- ✅ Invoice shows tax numbers from business_id = 1

**Verification**:
```typescript
const invoice = await generateInvoice(transactionId);
console.log(invoice.business.id); // Should be 1
console.log(invoice.business.name); // Should match business_id = 1
```

**❌ If Wrong Business Data**: RLS policy is broken → Security risk!

---

### Test 2: Invoice Shows Correct Customer Data

**Action**:
1. Create sale with customer (contact_id = 5)
2. Generate invoice

**Expected**:
- ✅ Invoice shows customer name from contact_id = 5
- ✅ Invoice shows customer address/contact if available

**Verification**:
```typescript
const invoice = await generateInvoice(transactionId);
console.log(invoice.contact?.id); // Should be 5
console.log(invoice.contact?.name); // Should match contact_id = 5
```

**❌ If Wrong Customer Data**: Data integrity issue → Check query joins

---

### Test 3: Invoice Shows Correct Items and Totals

**Action**:
1. Create sale with multiple items
2. Generate invoice

**Expected**:
- ✅ All items from transaction_sell_lines are shown
- ✅ Quantities match sell lines
- ✅ Prices match sell lines
- ✅ Totals match transaction.final_total

**Verification**:
```typescript
const invoice = await generateInvoice(transactionId);
const itemsTotal = invoice.items.reduce((sum, item) => sum + item.line_total, 0);
const calculatedTotal = invoice.summary.subtotal - invoice.summary.total_discount + invoice.summary.total_tax;

console.log(itemsTotal); // Should match transaction.total_before_tax
console.log(calculatedTotal); // Should match invoice.summary.grand_total
console.log(invoice.summary.grand_total); // Should match transaction.final_total
```

**❌ If Totals Don't Match**: Calculation error → Fix invoice service

---

### Test 4: Invoice Only Accessible for Own Business

**Action**:
1. Login as User A (business_id = 1)
2. Try to generate invoice for transaction from business_id = 2

**Expected**:
- ✅ Error or null (transaction not found)
- ✅ RLS blocks access

**Verification**:
```typescript
// Try to access other business transaction
const invoice = await generateInvoice(transactionFromBusiness2);
// Should throw error or return null
```

**❌ If Invoice Generated**: RLS policy is broken → Security risk!

---

## ✅ CHECKLIST 2: RECEIPT PRINTING

### Test 1: Receipt Data is Read-Only

**Action**:
1. Generate receipt for finalized sale
2. Try to modify receipt data in browser console

**Expected**:
- ✅ Receipt displays correctly
- ✅ Data cannot be modified (read-only component)
- ✅ No edit functionality available

**Verification**:
- Check component props are read-only
- No state updates in ReceiptView component
- Data comes from finalized transaction only

**❌ If Receipt Can Be Modified**: Security risk → Make component read-only

---

### Test 2: Receipts Cannot Be Forged Across Businesses

**Action**:
1. Login as User A (business_id = 1)
2. Try to generate receipt for transaction from business_id = 2

**Expected**:
- ✅ Error or null (transaction not found)
- ✅ RLS blocks access

**Verification**:
```typescript
// Try to access other business transaction
const invoice = await generateInvoice(transactionFromBusiness2);
// Should throw error or return null
```

**❌ If Receipt Generated**: RLS policy is broken → Security risk!

---

### Test 3: Receipt Layout is Thermal-Friendly

**Action**:
1. Generate receipt
2. Open browser print preview
3. Check layout

**Expected**:
- ✅ Receipt fits 80mm width
- ✅ Text is readable
- ✅ Layout is compact
- ✅ Print styles work correctly

**Verification**:
- Check CSS print styles
- Verify width is ~80mm
- Test actual thermal printer if available

**❌ If Layout Broken**: Fix CSS print styles

---

## ✅ CHECKLIST 3: ADVANCED REPORTS

### Test 1: Profit/Margin Report Calculates Correctly

**Action**:
1. Create sales with known costs and prices
2. Generate profit/margin report

**Expected**:
- ✅ Total sales = sum of all sales
- ✅ Total cost = sum of all costs
- ✅ Total profit = total sales - total cost
- ✅ Margin % = (profit / sales) * 100

**Verification**:
```typescript
const report = await getProfitMarginReport('2024-01-01', '2024-01-31');
const calculatedProfit = report.summary.total_sales - report.summary.total_cost;
const calculatedMargin = (calculatedProfit / report.summary.total_sales) * 100;

console.log(calculatedProfit); // Should match report.summary.total_profit
console.log(calculatedMargin); // Should match report.summary.overall_margin_percent
```

**❌ If Calculations Don't Match**: Fix profit calculation logic

---

### Test 2: Stock Valuation Matches Inventory

**Action**:
1. Get stock valuation report
2. Manually calculate total value

**Expected**:
- ✅ Total value = sum of (qty_available * unit_cost) for all items
- ✅ Total quantity = sum of qty_available
- ✅ Total items = count of stock items

**Verification**:
```typescript
const valuation = await getStockValuationReport();
const calculatedTotal = valuation.items.reduce((sum, item) => sum + item.total_value, 0);
const calculatedQty = valuation.items.reduce((sum, item) => sum + item.qty_available, 0);

console.log(calculatedTotal); // Should match valuation.summary.total_value
console.log(calculatedQty); // Should match valuation.summary.total_quantity
console.log(valuation.items.length); // Should match valuation.summary.total_items
```

**❌ If Values Don't Match**: Fix valuation calculation logic

---

### Test 3: Top Products Ranked Correctly

**Action**:
1. Create multiple sales with different products
2. Generate top products report

**Expected**:
- ✅ Products sorted by total_sales (descending)
- ✅ Top product has highest total_sales
- ✅ Quantities and transactions counted correctly

**Verification**:
```typescript
const topProducts = await getTopSellingProducts('2024-01-01', '2024-01-31', 10);
// Check sorting
const isSorted = topProducts.every((product, index) => {
  if (index === 0) return true;
  return product.total_sales <= topProducts[index - 1].total_sales;
});
console.log(isSorted); // Should be true
```

**❌ If Not Sorted**: Fix sorting logic

---

### Test 4: Reports Never Leak Cross-Business Data

**Action**:
1. Login as User A (business_id = 1)
2. Generate profit report
3. Verify all data is from business_id = 1

**Expected**:
- ✅ All transactions have business_id = 1
- ✅ All products have business_id = 1
- ✅ No data from other businesses

**Verification**:
```typescript
const report = await getProfitMarginReport('2024-01-01', '2024-01-31');
// RLS should have filtered automatically
// Manually verify if needed (should not be necessary)
```

**❌ If Other Business Data Visible**: RLS policy is broken → Security risk!

---

## ✅ CHECKLIST 4: AUDIT & SAFETY

### Test 1: Finalized Sales Cannot Be Edited

**Action**:
1. Create and finalize a sale
2. Try to edit the sale

**Expected**:
- ✅ UI guard prevents edit
- ✅ Validation function throws error
- ✅ Backend rejects edit request

**Verification**:
```typescript
// Frontend validation
if (isTransactionFinalized(transaction.status)) {
  throw new Error('Cannot edit finalized transaction');
}

// UI guard
<SaleEditGuard status={transaction.status}>
  {/* Edit form - should not render if finalized */}
</SaleEditGuard>
```

**❌ If Can Edit**: Security risk → Fix validation and UI guard

---

### Test 2: Transaction Validation Works

**Action**:
1. Check draft transaction can be edited
2. Check finalized transaction cannot be edited

**Expected**:
- ✅ `canEditTransaction('draft')` returns true
- ✅ `canEditTransaction('final')` returns false
- ✅ `isTransactionFinalized('final')` returns true
- ✅ `validateTransactionEditable('final')` throws error

**Verification**:
```typescript
console.log(canEditTransaction('draft')); // Should be true
console.log(canEditTransaction('final')); // Should be false
console.log(isTransactionFinalized('final')); // Should be true
try {
  validateTransactionEditable('final');
  console.error('Should have thrown error');
} catch (error) {
  console.log('Correctly threw error');
}
```

**❌ If Validation Fails**: Fix validation functions

---

### Test 3: Reports Are Read-Only

**Action**:
1. Open any report page
2. Try to modify report data

**Expected**:
- ✅ Reports display data only
- ✅ No edit functionality
- ✅ No data modification possible

**Verification**:
- Check report components have no edit buttons
- Check report services are read-only
- Check no state updates modify data

**❌ If Reports Can Be Modified**: Security risk → Make reports read-only

---

## ✅ CHECKLIST 5: DATE & FILTERS

### Test 1: Date Presets Work Correctly

**Action**:
1. Select "Today" preset
2. Select "This Week" preset
3. Select "This Month" preset

**Expected**:
- ✅ Today shows today's date range
- ✅ This Week shows Monday to Sunday
- ✅ This Month shows first to last day of month

**Verification**:
```typescript
const today = getTodayRange();
const thisWeek = getThisWeekRange();
const thisMonth = getThisMonthRange();

console.log(today.from); // Should be today
console.log(today.to); // Should be today
console.log(thisWeek.label); // Should be 'This Week'
console.log(thisMonth.label); // Should be 'This Month'
```

**❌ If Presets Wrong**: Fix date calculation functions

---

### Test 2: Custom Date Range Works

**Action**:
1. Select "Custom" date range
2. Enter from and to dates
3. Apply filter

**Expected**:
- ✅ Custom dates are accepted
- ✅ Filter is applied correctly
- ✅ Reports show data in date range

**Verification**:
```typescript
const custom = getCustomRange(new Date('2024-01-01'), new Date('2024-01-31'));
console.log(custom.from); // Should be '2024-01-01'
console.log(custom.to); // Should be '2024-01-31'
```

**❌ If Custom Range Fails**: Fix date range component

---

### Test 3: Filters Respect Business Scope

**Action**:
1. Login as User A (business_id = 1)
2. Apply date filter
3. Verify all results are from business_id = 1

**Expected**:
- ✅ RLS filters by business_id first
- ✅ Date filter applied after RLS filtering
- ✅ No cross-business data

**Verification**:
```typescript
// RLS filters first, then date filter
const sales = await listSales({ date_from: '2024-01-01', date_to: '2024-01-31' });
// All sales should have business_id = 1 (RLS enforced)
```

**❌ If Cross-Business Data**: RLS policy is broken → Security risk!

---

## 📋 COMPLETE VERIFICATION CHECKLIST

### Invoice Generation
- [ ] Invoice shows correct business data
- [ ] Invoice shows correct customer data
- [ ] Invoice shows correct items and totals
- [ ] Invoice only accessible for own business
- [ ] Only finalized transactions can generate invoices

### Receipt Printing
- [ ] Receipt data is read-only
- [ ] Receipts cannot be forged across businesses
- [ ] Receipt layout is thermal-friendly
- [ ] Browser print works correctly

### Advanced Reports
- [ ] Profit/margin report calculates correctly
- [ ] Stock valuation matches inventory
- [ ] Top products ranked correctly
- [ ] Reports never leak cross-business data
- [ ] All reports show only own business data

### Audit & Safety
- [ ] Finalized sales cannot be edited
- [ ] Transaction validation works
- [ ] UI guard prevents accidental edits
- [ ] Reports are read-only

### Date & Filters
- [ ] Date presets work correctly
- [ ] Custom date range works
- [ ] Filters respect business scope
- [ ] Date validation works

---

## 🎯 EXPECTED RESULTS

### ✅ Success Indicators

1. **Invoice**: Shows correct business/customer data, totals match
2. **Receipt**: Read-only, thermal-friendly, cannot be forged
3. **Reports**: Calculations correct, no cross-business data
4. **Safety**: Finalized sales protected, validation works
5. **Filters**: Presets work, custom range works, business scope respected

### ❌ Failure Indicators

1. **Invoice**: Wrong business data, totals don't match
2. **Receipt**: Can be modified, wrong business data
3. **Reports**: Calculations wrong, cross-business data visible
4. **Safety**: Can edit finalized sales, validation fails
5. **Filters**: Presets wrong, custom range fails, cross-business data

---

**If all checks pass**: Advanced POS features are secure and production-ready! ✅

