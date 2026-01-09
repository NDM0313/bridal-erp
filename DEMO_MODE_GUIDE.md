# Demo Mode Guide

## Overview
Demo Mode enables full-access testing with mock saving, allowing you to test all features without database connections.

## Enabling Demo Mode

1. **Environment Variable**: Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_DEMO_MODE=true
   ```

2. **Restart Development Server**: After adding the variable, restart your Next.js dev server.

## Features

### 1. Full-Access Testing
- All buttons, tabs, and modals are enabled regardless of permissions
- No authentication required for testing
- All features accessible

### 2. Mock Saving
- When "Save" or "Create" is clicked, shows success toast immediately
- Updates local state/UI instantly
- Simulates 500ms network delay for realistic feel

### 3. Auto-Injected Dummy Data

#### Users & Salesmen
When the user list is empty, Demo Mode automatically injects 3 test Salesmen:

- **Zaid Khan** (Email: zaid@demo.com, Role: Salesman, Salary: 25,000.00, Commission: 2.5%)
- **Ahmed Ali** (Email: ahmed@demo.com, Role: Salesman, Salary: 30,000.00, Commission: 3.0%)
- **Bilal Sheikh** (Email: bilal@demo.com, Role: Salesman, Salary: 22,000.00, Commission: 2.0%)

#### Branches
Demo Mode includes sample branches:
- **Main Branch** (Code: MB-01, Location: Din Bridal Outlet)
- **Downtown Branch** (Code: DT-02, Location: City Center)

### 4. Salesman Dropdown Filtering
The Salesman dropdown in Sales/Purchase modals automatically filters to show only users with the "salesman" role, including the dummy salesmen in Demo Mode.

## UI Indicators

When Demo Mode is active, you'll see:
- **Yellow Badge**: "DEMO MODE - All changes are simulated" at the top of pages
- **Toast Messages**: All success messages include "(Demo Mode)" suffix

## Global Standards Applied

### Red Mark (Icon Auto-Hide)
- All search bars and input fields with icons automatically hide icons when typing
- Smooth `transition-all duration-300` animation
- Padding shifts from `pl-10` to `pl-3` when focused/has value

### Yellow Mark (2-Decimal Formatting)
- All financial figures (Salary, Commission, Totals) display with exactly 2 decimal places
- Example: `25000` displays as `25,000.00`

### Portal-Based Dropdowns
- All dropdowns/select menus use React Portals (`z-[9999]`)
- No clipping by modal footers or overflow containers

## Files Modified

1. **`lib/config/demoConfig.ts`**: Demo mode configuration and utilities
2. **`app/users/page.tsx`**: Auto-inject dummy salesmen
3. **`app/settings/branches/page.tsx`**: Demo mode support with dummy branches
4. **`components/sales/AddSaleModal.tsx`**: Demo mode salesman loading
5. **`components/users/UserFormModal.tsx`**: Mock saving in demo mode

## Testing Checklist

- [ ] Enable Demo Mode in `.env.local`
- [ ] Restart dev server
- [ ] Visit `/dashboard/users` - should see dummy salesmen
- [ ] Visit `/settings/branches` - should see dummy branches
- [ ] Create/Edit User - should show "(Demo Mode)" toast
- [ ] Add Sale - Salesman dropdown should show dummy salesmen
- [ ] Check icon auto-hide on all search bars
- [ ] Verify 2-decimal formatting on all financial displays
- [ ] Verify dropdowns don't clip (use Portals)

## Disabling Demo Mode

Set `NEXT_PUBLIC_DEMO_MODE=false` or remove the variable from `.env.local` and restart the server.

