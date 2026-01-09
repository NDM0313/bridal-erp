# New Production Studio - Implementation Plan

**Date**: January 2026  
**Status**: 🚧 In Progress  
**Scope**: Frontend Only - Complete Redesign

---

## 🎯 CORE CONCEPT

**Production Studio = Post-Sale Production Controller**

NOT a ledger, NOT an accounting UI.
Studio manages the physical production workflow AFTER a sale is finalized.

---

## 🏗️ NEW STUDIO ARCHITECTURE

### 1. Studio Dashboard
**Route**: `/dashboard/studio`

**Purpose**: Pipeline view of all production orders

**Sections**:
- **New Production Sales** - Sales requiring production setup
- **Dyeing In Progress** - Currently at Dyeing stage
- **Handwork In Progress** - Currently at Handwork stage
- **Stitching In Progress** - Currently at Stitching stage
- **Completed** - Production finished

**Card Info**:
- Sale No
- Customer Name
- Current Step
- Assigned Person
- Due Date
- Status Badge

---

### 2. Production Setup Screen
**Route**: `/dashboard/studio/setup/:saleId`

**Purpose**: Configure production workflow for a specific sale

**Flow**:
1. **Step Selection** (Checkboxes)
   - ⬜ Dyeing
   - ⬜ Handwork
   - ⬜ Stitching
   
2. **Step Ordering** (Drag & Drop or Number Input)
   - Default: Dyeing → Handwork → Stitching
   - Allow custom order

3. **For Each Selected Step**:
   - Assign Vendor/Worker (Dropdown + "Add New" button)
   - Expected Completion Date
   - Rate/Cost (per unit or total)
   - Notes (optional)

4. **Actions**:
   - Save & Start Production
   - Cancel

---

### 3. Production Flow Screen
**Route**: `/dashboard/studio/production/:orderId`

**Purpose**: Track and update a single production order

**Display**:
- Sale Info (Customer, Sale No, Total Amount)
- **Dynamic Steps** (only selected ones, in configured order)

**For Each Step**:
- Step Name
- Assigned Person
- Status (Pending / In Progress / Completed)
- Due Date
- Cost (editable until completed, then locked)
- Progress (if applicable)
- Actions:
  - Start (if pending)
  - Update Progress (if in progress)
  - Complete (if in progress)

---

### 4. Add Vendor/Worker Modal
**Component**: `AddVendorModal.tsx`

**Purpose**: Quick add vendor/worker without leaving Studio

**Fields**:
- Name (required)
- Type (Dyer / Handwork / Stitching)
- Mobile (optional)
- Notes (optional)

**Action**:
- Save → Add to contacts → Select in dropdown

---

## 📊 COMPONENT STRUCTURE

```
components/studio/
├── StudioDashboard.tsx          (NEW - Pipeline view)
├── ProductionSetupScreen.tsx    (NEW - Step configuration)
├── ProductionFlowScreen.tsx     (NEW - Per-sale tracking)
├── AddVendorModal.tsx           (NEW - Quick vendor add)
├── ProductionCard.tsx           (NEW - Reusable card)
└── StepConfigCard.tsx           (NEW - Step setup card)
```

---

## 🔄 NAVIGATION FLOW

```
Studio Dashboard
    │
    ├─→ [New Production Sale] → Production Setup Screen
    │       │
    │       └─→ [Save & Start] → Production Flow Screen
    │
    ├─→ [In Progress Order] → Production Flow Screen
    │
    └─→ [Completed Order] → Production Flow Screen (read-only)
```

---

## 💰 COST HANDLING (STANDARD METHOD)

### Cost Entry
- **Where**: Production Setup Screen OR Production Flow Screen
- **When**: Before step completion
- **Who**: Manager/Admin only

### Cost Lock
- **Trigger**: When step is marked "Complete"
- **Action**: Cost becomes read-only, cannot be edited

### Accounting Integration
- **Auto-Post**: When step completed, system creates expense entry
- **Entry Type**: Expense
- **Category**: "Production Cost - {Step Name}"
- **Amount**: Locked step cost
- **Reference**: Production Order ID + Step Name

### UI Display
- **Studio**: Shows cost as editable field (before completion) or read-only (after)
- **Accounting**: Shows auto-posted expense with production reference
- **User**: NEVER enters same cost twice

---

## 🎨 UI/UX PRINCIPLES

### Design Standards
- ✅ Dark theme (match existing ERP)
- ✅ Clean, professional interface
- ✅ One primary action per context
- ✅ Status-driven button states
- ✅ Clear visual hierarchy

### What Studio UI IS
- Production pipeline tracker
- Step assignment interface
- Progress monitoring tool
- Cost entry point (pre-completion)

### What Studio UI IS NOT
- Accounting ledger
- Financial debit/credit screen
- Balance sheet viewer
- Double-entry interface

---

## 🚫 REMOVED (OLD STUDIO)

- ❌ Ledger-style tables
- ❌ Stage-specific ledger pages (`/dyeing`, `/handwork`, `/stitching`)
- ❌ Accounting-style columns
- ❌ Fixed step order (now dynamic)

---

## ✅ BACKEND/API CONFIRMATION

### No Changes Required To
- ✅ Backend APIs
- ✅ Database schema
- ✅ Business logic
- ✅ RLS policies
- ✅ Existing services

### Existing Data Used
- `sales` table (with `requires_production` flag or sale type)
- `production_orders` table
- `production_steps` table
- `contacts` table (vendors/workers)
- Accounting expense posting (via existing service)

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Cleanup
- [x] Delete old ledger components
- [x] Delete stage-specific pages
- [ ] Update main Studio page route

### Phase 2: Core Screens
- [ ] Create new Studio Dashboard
- [ ] Create Production Setup Screen
- [ ] Create Production Flow Screen

### Phase 3: Support Components
- [ ] Create Add Vendor Modal
- [ ] Create Production Card component
- [ ] Create Step Config Card

### Phase 4: Integration
- [ ] Update navigation
- [ ] Connect to existing sale data
- [ ] Test full flow

---

## 🎯 FINAL OUTCOME

### Manager Can
1. ✅ See all sales requiring production setup
2. ✅ Configure custom production workflow per sale
3. ✅ Assign work to vendors/workers
4. ✅ Track progress across all steps
5. ✅ Enter costs once, at the right time
6. ✅ Complete steps and lock costs
7. ✅ View completed production history

### System Achieves
- ✅ Real factory-style workflow
- ✅ Flexible steps per sale (not fixed order)
- ✅ Single cost entry (no duplication)
- ✅ Automatic accounting integration
- ✅ Clean, professional UI
- ✅ Scalable production management

---

**END OF PLAN**
