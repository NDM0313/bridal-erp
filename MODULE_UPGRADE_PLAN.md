# Module Upgrade Plan - Step by Step

## Overview
Upgrading all modules to match `doc/modules/*.md` documentation specifications.

## Modules to Upgrade

### ✅ 1. Products Module - COMPLETE
- ✅ SmartTable with composite cells
- ✅ Stock color coding
- ✅ 3-dots action menu
- ✅ Print Barcode Modal
- ✅ Duplicate functionality
- ✅ Stock History Modal
- ✅ Mobile card view

### 🔄 2. POS Module - IN PROGRESS
**Current Issues:**
- Background color: Using `bg-slate-950`, should be `bg-[#111827]`
- Cart width: Using `w-[400px]`, should be `w-[460px]`
- Search input: Using `bg-slate-950`, should be `bg-gray-800/50 border-gray-700`
- Category pills: Missing horizontal scroll styling
- Product cards: Missing `rounded-2xl border-2` and gradient
- Cart items: Missing `bg-gray-800/50 rounded-xl border border-gray-700`
- Pricing toggle: Need proper switch component
- Checkout buttons: Need gradient styling (`from-green-600 to-green-700` for Cash, `from-blue-600 to-blue-700` for Card)

### ⏳ 3. Dashboard Module
**Requirements:**
- Low Stock Banner with AlertTriangle icon
- Stat Cards with hover effects and background graphics
- Custom Studio Widget (2 columns on mobile)
- Charts Section with Recharts

### ⏳ 4. Rentals Module
**Requirements:**
- View Toggle (List/Calendar) with segmented control
- Quick Stats (4 columns) - only in List view
- RentalCalendar component
- RentalOrdersList component
- Pink theme for primary buttons

### ⏳ 5. Sales Module
**Requirements:**
- Status Badges (Paid/Partial/Pending)
- Financial columns with color coding
- Invoice generation
- Payment status calculation

### ⏳ 6. Purchases Module
**Requirements:**
- Orange accent theme
- Stats section (Total Purchase, Amount Due, Returns)
- Table columns with color coding

### ⏳ 7. Contacts Module
**Requirements:**
- Stats Row (Receivables/Payables)
- Type Badges (Supplier/Customer)
- Financial columns with color coding
- Quick Add Modal
- Ledger Drawer

### ⏳ 8. Users Module
**Requirements:**
- Stats Section (3 cards)
- Avatar with dicebear/initials
- Role Badges (Admin/Manager/Cashier)
- Status Pills (Active/Inactive)

### ⏳ 9. Settings Module
**Requirements:**
- Module Cards with enable/disable switches
- Configuration Modals
- Feature toggling logic

---

## Execution Order
1. POS Module (Current)
2. Dashboard Module
3. Rentals Module
4. Sales Module
5. Purchases Module
6. Contacts Module
7. Users Module
8. Settings Module

