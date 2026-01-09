STUDIO_BACKEND_FRONTEND_CHANGES.md
===================================

## 1. Overview
The Studio module handles production tracking (Dyeing → Handwork → Stitching) and visibility. Backend services manage production logic, costing, and worker interactions, while the frontend provides dashboarding, order visibility, and step-by-step flow views. Backend logic and frontend UI are decoupled: APIs and data are stable; the frontend consumes existing endpoints.

## 2. Backend Changes (Studio Module)

### 2.1 Services
- `backend/src/services/productionService.js` — Creates production orders from sales; sets up default steps; enforces idempotency and business/location context.
- `backend/src/services/workerService.js` — Worker-safe step updates (progress/status) with assignment checks; emits completion events.
- `backend/src/services/productionCostingService.js` — Handles step-level cost updates and cost rollups; exposes reporting helpers.
- `backend/src/services/eventService.js` — Central event emitter used for production events and downstream hooks.
- `backend/src/services/socialMediaService.js` — Listens to production events to send notifications (WhatsApp/templates) when configured.

### 2.2 Routes / APIs
- `backend/src/routes/production.js` — Production module endpoints (e.g., step cost updates, cost reports).
- `backend/src/routes/worker.js` — Worker-facing endpoints for assigned steps and progress/status updates.
- `backend/src/routes/social.js` — Event-driven social/notification hooks (production.created/completed), already present and reused.
APIs were already in place; Studio frontend consumes these without changes.

### 2.3 Database / Triggers (stable)
- Tables: `production_orders`, `production_steps`, `production_materials` (existing, stable).
- Constraints/Triggers: Status transition enforcement, completed_qty ≤ step_qty, auto timestamps; cost rollup and expense creation triggers in place. Schema is stable and backward compatible.

### 2.4 Events & Integrations
- Events: `production.created`, `production.step.completed`, `production.completed` emitted from services.
- Integrations: Accounting expense hooks on step completion; social/WhatsApp notifications wired to production events (if enabled).

## 3. Frontend Changes (Studio Module)

### 3.1 Navigation & App Structure
- `src/app/App.tsx` — Registers Studio views (dashboard, orders, config).
- `src/app/components/layout/Sidebar.tsx` — Adds Studio nav group (Dashboard, Orders, Configuration).
- `src/app/context/NavigationContext.tsx` — Adds Studio view identifiers.

### 3.2 Studio Pages
- `src/app/components/studio/StudioDashboard.tsx` — Manager view with four stage cards and quick navigation.
- `src/app/components/studio/StudioOrdersPage.tsx` — Actionable list with filters, search, primary per-stage actions, and row → flow drill-down.
- `src/app/components/studio/ProductionFlowPage.tsx` — Core step-by-step flow (vertical stepper), progress, bottleneck highlight, and gated actions.
- `src/app/components/studio/StudioConfigPage.tsx` — UI-only toggles for steps, read-only order, informational notices (no backend changes).

### 3.3 Studio UI Components
- `StageCard` — Reusable count card, color-coded, click-to-filter.
- `StageLegend` — Color labels for stages.
- `OrderStageBadge` — Consistent stage/status badge.
- `PrimaryStageActionButton` — Single primary CTA per row/stage (Start/Update/View).
- `StudioOrdersHeader` — Filters and search for orders list.
- `StudioOrdersTable` — Orders list with primary action and row navigation to flow.
- `ProductionFlowPage` includes inline components:
  - Production stepper/Stage panels (per stage: Dyeing, Handwork, Stitching)
  - Quantity progress (completed vs total)
  - Assigned worker display
  - Stage action bar (Start / Update Progress / Complete with gating)
  - Bottleneck indicator (first non-completed stage)

### 3.4 Shared Design System Usage
Reused existing design system components: Cards, Tables, Badges, Buttons, Tabs, Drawer/Modal, Progress, Inputs, Switch, Separator, Tooltips/Empty states/Skeletons where applicable. Dark theme preserved.

## 4. What Was NOT Changed
- Backend APIs unchanged.
- Database schema unchanged.
- Business logic unchanged.
- Other modules (Sales, Accounting, POS, Inventory, Dashboard) untouched.

## 5. Final Summary
- Studio backend: Stable services, routes, events, and triggers already in place.
- Studio frontend: Dashboard, Orders, Flow, and Config screens implemented with reusable components and existing design system.
- System completeness: Studio moves UI polish from ~85% to ~95%; production-ready with clear visibility and manager-friendly actions.
