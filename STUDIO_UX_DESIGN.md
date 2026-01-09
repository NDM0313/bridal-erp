# Studio Dashboard - Advanced Ledger-Based UX Design

**Status**: UX Design Document  
**Date**: January 2026  
**Scope**: Frontend/UX Only - No Backend Changes

---

## 🎯 EXECUTIVE SUMMARY

**Design Philosophy**: Production management as a **LEDGER SYSTEM**  
**Core Concept**: Each production stage (Dyeing, Handwork, Stitching) has its own dedicated ledger screen  
**User Goal**: Managers instantly see what's pending, where it's stuck, and what action is needed

---

## 📱 SCREEN ARCHITECTURE

### Screen List (Studio Module)

1. **Studio Dashboard** (`/dashboard/studio`)
   - Entry point with stage cards
   - Real-time counts
   - Quick navigation to ledgers

2. **Dyeing Ledger** (`/dashboard/studio/dyeing`)
   - Dedicated ledger for Dyeing stage
   - All orders at Dyeing stage
   - Stage-specific actions

3. **Handwork Ledger** (`/dashboard/studio/handwork`)
   - Dedicated ledger for Handwork stage
   - All orders at Handwork stage
   - Stage-specific actions

4. **Stitching Ledger** (`/dashboard/studio/stitching`)
   - Dedicated ledger for Stitching stage
   - All orders at Stitching stage
   - Stage-specific actions

5. **Production Flow View** (`/dashboard/studio/flow/:orderId`)
   - Detailed stepper view (already exists)
   - Full order context
   - All steps with progress

6. **Completed Orders** (`/dashboard/studio/completed`)
   - Archive view of completed orders
   - Historical tracking

---

## 🏠 1. STUDIO DASHBOARD (Entry Point)

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  Studio Command Center                    [View Pipeline] │
│  Real-time production status across all stages            │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Dyeing    │  │  Handwork   │  │  Stitching   │   │
│  │   🟡 12     │  │   🔵 8      │  │   🟠 15      │   │
│  │   Orders    │  │   Orders    │  │   Orders     │   │
│  │             │  │             │  │             │   │
│  │ [View Ledger]│  │ [View Ledger]│  │ [View Ledger]│   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                           │
│  ┌───────────────────────────────────────────────────┐ │
│  │   Completed / Ready                                │ │
│  │   🟢 24 Orders                                      │ │
│  │   [View Completed]                                 │ │
│  └───────────────────────────────────────────────────┘ │
│                                                           │
│  ┌───────────────────────────────────────────────────┐ │
│  │   Recent Activity (Last 5 updates)                 │ │
│  │   • Order #PO-1234 - Stitching completed          │ │
│  │   • Order #PO-1235 - Handwork started             │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Component Structure

**File**: `components/studio/StudioDashboard.tsx` (already exists, enhance)

**Enhancements Needed**:
- Add "View Ledger" buttons on each card
- Add Recent Activity section
- Add quick stats (total pending, bottlenecks)

### Navigation from Dashboard

- **Click Dyeing Card** → Navigate to `/dashboard/studio/dyeing`
- **Click Handwork Card** → Navigate to `/dashboard/studio/handwork`
- **Click Stitching Card** → Navigate to `/dashboard/studio/stitching`
- **Click Completed Card** → Navigate to `/dashboard/studio/completed`
- **Click "View Pipeline"** → Navigate to existing Kanban view

---

## 📊 2. STAGE-WISE LEDGER SCREENS

### Ledger Concept

Each ledger is a **dedicated table view** showing all orders at that specific stage.

**Design Pattern**: Accounting Ledger
- Clear columns
- Easy to scan
- Action buttons per row
- Filters at top

---

### 2.1 DYEING LEDGER

**Route**: `/dashboard/studio/dyeing`  
**Component**: `components/studio/ledgers/DyeingLedger.tsx`

#### Column Definitions

| Column | Width | Data Source | Display Format |
|--------|-------|-------------|----------------|
| **Date** | 120px | `production_steps.started_at` or `production_orders.created_at` | `dd MMM yyyy` |
| **Order No** | 140px | `production_orders.order_no` | `PO-{invoice_no}` (clickable) |
| **Customer** | 180px | `contacts.name` (via sale) | Customer name (truncate if long) |
| **Total Qty** | 100px | `production_steps.step_qty` | `{qty} m` (meters) |
| **Completed** | 100px | `production_steps.completed_qty` | `{qty} m` |
| **Remaining** | 100px | `step_qty - completed_qty` | `{qty} m` (calculated) |
| **Progress** | 120px | `(completed_qty / step_qty) * 100` | Progress bar + % |
| **Worker** | 140px | `user_profiles.full_name` (via `assigned_user_id`) | Worker name or "Unassigned" |
| **Status** | 120px | `production_steps.status` | Badge (Pending/In Progress) |
| **Last Update** | 140px | `production_steps.updated_at` | `dd MMM, HH:mm` |
| **Action** | 140px | Context-based button | "Start" / "Update" / "Complete" |

#### Visual Status Indicators

- **Pending**: Gray badge, "Start" button
- **In Progress**: Blue badge, "Update Progress" button
- **Overdue** (if `deadline_date` exists): Red border, warning icon
- **High Remaining** (>50% remaining): Amber highlight

#### Row Actions (Status-Driven)

**Pending Status**:
- Primary: "Start" button → Sets status to `in_progress`, sets `started_at`

**In Progress Status**:
- Primary: "Update Progress" button → Opens inline qty input or modal
- Secondary: "Complete" button (disabled until `completed_qty == step_qty`)

**Completed Status**:
- Badge only: "Completed" (green)
- No action button

#### Filters Section

```
┌─────────────────────────────────────────────────────────┐
│  Filters: [Date Range ▼] [Status: All ▼] [Worker: All ▼]│
│  Search: [Order No / Customer...]              [Clear]   │
└─────────────────────────────────────────────────────────┘
```

**Filter Options**:
- **Date Range**: Last 7 days / Last 30 days / Custom range
- **Status**: All / Pending / In Progress / Completed
- **Worker**: All / [List of assigned workers]
- **Search**: Order No or Customer name

---

### 2.2 HANDWORK LEDGER

**Route**: `/dashboard/studio/handwork`  
**Component**: `components/studio/ledgers/HandworkLedger.tsx`

**Same structure as Dyeing Ledger**, but:
- Filters by `step_name = 'Handwork'`
- Shows only orders where Dyeing is completed (gated)
- Same columns, same actions

---

### 2.3 STITCHING LEDGER

**Route**: `/dashboard/studio/stitching`  
**Component**: `components/studio/ledgers/StitchingLedger.tsx`

**Same structure as Dyeing Ledger**, but:
- Filters by `step_name = 'Stitching'`
- Shows only orders where Handwork is completed (gated)
- Same columns, same actions

---

## 🔄 3. NAVIGATION FLOW

### Flow Diagram

```
Studio Dashboard
    │
    ├─→ Dyeing Ledger
    │       │
    │       └─→ [Click Order No] → Production Flow View
    │
    ├─→ Handwork Ledger
    │       │
    │       └─→ [Click Order No] → Production Flow View
    │
    ├─→ Stitching Ledger
    │       │
    │       └─→ [Click Order No] → Production Flow View
    │
    ├─→ Completed Orders
    │
    └─→ View Pipeline (Kanban) → Production Flow View
```

### Navigation Rules

1. **From Dashboard**: Click stage card → Navigate to that stage's ledger
2. **From Ledger**: Click Order No → Navigate to Production Flow View
3. **From Ledger**: Click "View Flow" button → Navigate to Production Flow View
4. **From Flow View**: Back button → Return to previous ledger or dashboard
5. **Breadcrumbs**: Show current location (Dashboard > Dyeing Ledger > Order #PO-1234)

---

## 🎨 4. VISUAL DESIGN SPECIFICATIONS

### Color Scheme (Dark Theme)

- **Dyeing**: Amber/Yellow (`#F59E0B` / `amber-500`)
- **Handwork**: Blue (`#3B82F6` / `blue-500`)
- **Stitching**: Orange (`#F97316` / `orange-500`)
- **Completed**: Green (`#10B981` / `green-500`)
- **Pending**: Gray (`#6B7280` / `gray-500`)
- **In Progress**: Blue (`#3B82F6` / `blue-500`)
- **Overdue**: Red (`#EF4444` / `red-500`)

### Status Badges

```tsx
// Pending
<Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
  Pending
</Badge>

// In Progress
<Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
  In Progress
</Badge>

// Completed
<Badge className="bg-green-500/20 text-green-400 border-green-500/30">
  Completed
</Badge>
```

### Progress Bar

```tsx
<Progress 
  value={(completed_qty / step_qty) * 100} 
  className="h-2"
/>
<span className="text-xs text-gray-400 ml-2">
  {Math.round((completed_qty / step_qty) * 100)}%
</span>
```

### Table Row States

- **Normal**: `bg-gray-800/50 border-gray-700`
- **Hover**: `bg-gray-700/50 border-gray-600`
- **Overdue**: `border-l-4 border-red-500`
- **High Remaining**: `bg-amber-500/5`

---

## 🔍 5. FILTERS & CONTROLS DESIGN

### Filter Bar Component

**Component**: `components/studio/ledgers/LedgerFilters.tsx`

```tsx
interface LedgerFiltersProps {
  onDateRangeChange: (range: { start: Date; end: Date }) => void;
  onStatusFilter: (status: string) => void;
  onWorkerFilter: (workerId: string) => void;
  onSearch: (query: string) => void;
  availableWorkers: Worker[];
}
```

**Layout**:
- Compact horizontal bar
- Date picker (compact)
- Status dropdown
- Worker dropdown
- Search input
- Clear filters button

**Responsive**:
- Desktop: All filters in one row
- Tablet: Two rows (filters + search)
- Mobile: Stacked vertically

---

## ⚡ 6. ACTION BUTTONS (Status-Driven)

### Button Logic

**Pending → Start**:
```tsx
<Button 
  size="sm"
  onClick={() => handleStartStep(stepId)}
  className="bg-blue-600 hover:bg-blue-500"
>
  Start
</Button>
```

**In Progress → Update Progress**:
```tsx
<Button 
  size="sm"
  onClick={() => handleUpdateProgress(stepId)}
  className="bg-indigo-600 hover:bg-indigo-500"
>
  Update Progress
</Button>
```

**In Progress → Complete** (only if `completed_qty == step_qty`):
```tsx
<Button 
  size="sm"
  onClick={() => handleCompleteStep(stepId)}
  disabled={completed_qty !== step_qty}
  className="bg-green-600 hover:bg-green-500 disabled:opacity-50"
>
  Complete
</Button>
```

---

## 📋 7. COMPONENT STRUCTURE

### New Components to Create

```
components/studio/
├── StudioDashboard.tsx (enhance existing)
├── ledgers/
│   ├── DyeingLedger.tsx (NEW)
│   ├── HandworkLedger.tsx (NEW)
│   ├── StitchingLedger.tsx (NEW)
│   ├── CompletedLedger.tsx (NEW)
│   ├── LedgerTable.tsx (reusable table)
│   ├── LedgerFilters.tsx (reusable filters)
│   └── LedgerRow.tsx (reusable row)
└── ProductionFlowPage.tsx (existing, link from ledgers)
```

### Reusable Ledger Components

**LedgerTable.tsx**: Generic table wrapper
- Handles sorting
- Handles pagination
- Handles row selection

**LedgerRow.tsx**: Single row component
- Status-based styling
- Action buttons
- Progress display

**LedgerFilters.tsx**: Filter bar
- Date range
- Status filter
- Worker filter
- Search

---

## 🗂️ 8. DATA FETCHING STRATEGY

### API Endpoints (Assume Existing)

**Dashboard Counts**:
- `GET /api/v1/production/dashboard/counts`
- Returns: `{ dyeing: 12, handwork: 8, stitching: 15, completed: 24 }`

**Stage Ledger Data**:
- `GET /api/v1/production/steps?stage=dyeing&status=pending,in_progress`
- Returns: Array of production steps with order details

**Update Step Progress**:
- `PATCH /api/v1/production/steps/:id/progress`
- Payload: `{ completed_qty: 40 }`

**Update Step Status**:
- `PATCH /api/v1/production/steps/:id/status`
- Payload: `{ status: 'in_progress' }`

---

## 📐 9. RESPONSIVE DESIGN

### Breakpoints

- **Desktop** (≥1024px): Full ledger table, all columns visible
- **Tablet** (768px-1023px): Hide some columns, horizontal scroll
- **Mobile** (<768px): Card view instead of table, swipe actions

### Mobile Ledger View

Instead of table, show cards:
```
┌─────────────────────────┐
│ Order #PO-1234          │
│ Customer: ABC Textiles  │
│ Progress: ████░░ 60%    │
│ Status: In Progress     │
│ [Update Progress]       │
└─────────────────────────┘
```

---

## ✅ 10. UX RATIONALE

### Why Ledger Approach?

1. **Familiar Pattern**: Managers understand ledger format (like accounting)
2. **Quick Scanning**: Easy to see what's pending at a glance
3. **Clear Separation**: Each stage has its own space (no confusion)
4. **Action Clarity**: One primary action per row (no decision paralysis)
5. **Historical Context**: Date columns show when work started/updated

### Why Separate Ledgers?

1. **Focus**: Managers can focus on one stage at a time
2. **Performance**: Smaller datasets per view (faster loading)
3. **Clarity**: No mixing of stages (Dyeing vs Handwork confusion)
4. **Workflow**: Matches actual production workflow (sequential stages)

### Why Status-Driven Actions?

1. **Prevents Errors**: Can't complete if not started
2. **Clear State**: Always know what action is available
3. **Guided Workflow**: System guides user through correct sequence

---

## 🔒 11. BACKEND/API CONFIRMATION

### ✅ No Backend Changes Required

- All APIs assumed to exist
- Database schema unchanged
- Business logic unchanged
- RLS policies unchanged

### ✅ Frontend-Only Implementation

- New React components
- New routes/pages
- UI state management
- Data fetching hooks

### ✅ Integration Points

- Use existing `ProductionFlowPage.tsx`
- Use existing `useStudioDashboard` hook
- Use existing Supabase client
- Use existing API endpoints

---

## 📝 12. IMPLEMENTATION CHECKLIST

### Phase 1: Dashboard Enhancement
- [ ] Add "View Ledger" buttons to stage cards
- [ ] Add Recent Activity section
- [ ] Add quick stats display

### Phase 2: Ledger Components
- [ ] Create `LedgerTable.tsx` (reusable)
- [ ] Create `LedgerRow.tsx` (reusable)
- [ ] Create `LedgerFilters.tsx` (reusable)

### Phase 3: Stage Ledgers
- [ ] Create `DyeingLedger.tsx`
- [ ] Create `HandworkLedger.tsx`
- [ ] Create `StitchingLedger.tsx`
- [ ] Create `CompletedLedger.tsx`

### Phase 4: Navigation
- [ ] Add routes for each ledger
- [ ] Add breadcrumbs
- [ ] Link Order No to Production Flow View
- [ ] Add back navigation

### Phase 5: Actions
- [ ] Implement "Start" action
- [ ] Implement "Update Progress" action
- [ ] Implement "Complete" action
- [ ] Add status validation

### Phase 6: Filters
- [ ] Date range filter
- [ ] Status filter
- [ ] Worker filter
- [ ] Search functionality

### Phase 7: Responsive
- [ ] Desktop layout
- [ ] Tablet layout
- [ ] Mobile card view

---

## 🎯 FINAL OUTCOME

**Managers will be able to**:
1. ✅ Instantly see counts per stage (Dashboard)
2. ✅ Focus on one stage at a time (Separate Ledgers)
3. ✅ Quickly scan pending work (Ledger Table)
4. ✅ Take clear actions (Status-Driven Buttons)
5. ✅ Track progress visually (Progress Bars)
6. ✅ Filter and search efficiently (Filters)
7. ✅ View full order context (Production Flow View)

**System achieves**:
- ✅ Enterprise-level production UX maturity
- ✅ Clear separation of concerns (stages)
- ✅ Familiar patterns (ledger format)
- ✅ Actionable interface (status-driven)
- ✅ Scalable structure (reusable components)

---

## 📚 APPENDIX: Component Props Examples

### DyeingLedger Component

```tsx
interface DyeingLedgerProps {
  // No props needed - fetches own data
}

export const DyeingLedger: React.FC<DyeingLedgerProps> = () => {
  const { data: steps, isLoading } = useProductionSteps('Dyeing');
  const { activeBranch } = useBranchV2();
  
  // Filter by business_id and location_id
  // Display in ledger format
  // Handle actions
}
```

### LedgerTable Component

```tsx
interface LedgerTableProps {
  steps: ProductionStep[];
  onRowClick: (stepId: number) => void;
  onAction: (stepId: number, action: 'start' | 'update' | 'complete') => void;
  isLoading?: boolean;
}

export const LedgerTable: React.FC<LedgerTableProps> = ({
  steps,
  onRowClick,
  onAction,
  isLoading,
}) => {
  // Render table with columns
  // Handle sorting
  // Handle pagination
}
```

---

**END OF UX DESIGN DOCUMENT**
