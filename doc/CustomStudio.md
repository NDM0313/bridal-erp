# Custom Studio & Production Module Documentation

## Overview
This module handles custom bridal orders, vendor management, and the production pipeline. It is critical for tracking the manufacturing process.

## Components
- `src/app/components/custom-studio/NewCustomOrder.tsx`: Form for new custom orders.
- `src/app/components/custom-studio/PipelineBoard.tsx`: Kanban-style board for production tracking.
- `src/app/components/custom-studio/VendorList.tsx`: Management of vendors/artisans.

## Recent Changes
- Fixed interactive elements like "3 dots" menus in Vendor Management and Production Pipeline.
- Visual improvements for the Kanban board in dark mode.

## Tech Stack
- React
- Tailwind CSS
- Drag and Drop (likely `react-dnd` or similar for pipeline)

## Cursor AI Instructions
When working on this module:
1. Ensure drag-and-drop functionality in `PipelineBoard` works smoothly.
2. Verify that the "3 dots" menus and other interactive popovers are z-indexed correctly and visible.
3. Maintain the consistent dark theme across complex UI components like the board.
