# Figma Design Reference - Complete UI Specifications

## Overview
This document captures all UI/UX specifications from the Figma design screenshots. Use this as the single source of truth for implementing components.

---

## 1. Dashboard Page

### Top Header Bar
- **Left Section:**
  - Blue square logo with white 'E' + "ERP Master" text
  - Left arrow icon
  - Location pin icon + "Main Branch (HQ)" text
  
- **Center:**
  - Search bar: "Search products, orders, customers..." with magnifying glass icon
  
- **Right Section:**
  - **"+ Create New" Button (Blue)** - Opens dropdown with:
    - New Sale
    - New Purchase
    - Add Product
    - Add User
  - Sun icon (theme toggle)
  - Bell icon (notifications)

### Main Content - Stats Cards
- **Low Stock Alert Banner (Red):**
  - Background: Red with warning triangle icon
  - Text: "Low Stock Alert - 3 items are below minimum stock level"

- **Stat Cards (5 cards in row):**
  1. **Production Status:**
     - Purple icon (fabric swatch)
     - "5 Orders in Dyeing" (purple dot)
     - "2 Ready for Dispatch" (green dot)
     - "View Board →" button
  
  2. **Total Due (Receivables):**
     - Light blue downward arrow icon
     - Value: "$12,450.00"
     - Trend: "+4.5%" (green, upward arrow)
  
  3. **Supplier Due (Payables):**
     - Orange upward arrow icon
     - Value: "$4,200.50"
     - Trend: "-2.1%" (red, downward arrow)
  
  4. **Net Profit:**
     - Green dollar sign icon
     - Value: "$48,200.00"
     - Trend: "+14.2%" (green, upward arrow)
  
  5. **Total Sales:**
     - Purple shopping bag icon
     - Value: "$124,592.00"
     - Trend: "+12.5%" (green, upward arrow)

### Charts Section
- **Revenue & Profit Chart:**
  - Title: "Revenue & Profit"
  - Y-axis: 0 to 10000
  - Two overlapping area graphs:
    - Green (Profit)
    - Blue (Revenue)

### Critical Stock Widget
- Title: "Critical Stock" with red warning triangle icon
- Table with columns: Product Name, Current Stock, SKU, Min Required
- Example rows:
  - Wireless Mouse Gen 2: 2 (Min: 10)
  - USB-C Cable 2m: 5 (Min: 20)
  - Mechanical Keyboard Switch: 12 (Min: 50)
- Button: "View All Low Stock" (blue)

---

## 2. Add New Product Form

### Form Structure
- **Title:** "Add New Product" with subtitle "Complete product details for inventory"
- **Close Button:** X icon (top right)
- **Help Icon:** ? icon (bottom right)

### Sections (with colored left border):

#### 1. Product Identity (Purple bar + Cube icon)
- **Product Name *** (required)
  - Placeholder: "e.g. Cotton Premium Shirt"
  
- **SKU / Code *** (required)
  - Value: "AUTO-GENERATED"
  - Refresh icon button to regenerate
  
- **Barcode Type**
  - Dropdown: "Select Type"

#### 2. Classification (Purple bar)
- **Brand**
  - Dropdown: "Select Brand"
  
- **Category**
  - Dropdown: "Select Category"
  
- **Sub-Category**
  - Dropdown: "Select Sub-Category"
  
- **Unit**
  - Dropdown: "Select Unit"

#### 3. Pricing (Green dollar sign icon)
- **Purchase Price**
  - Number input, default: "0"
  
- **Profit Margin (%)**
  - Number input, default: "30"
  
- **Selling Price *** (required)
  - Number input, default: "0"
  - Green border when focused/calculated
  
- **Tax Type**
  - Dropdown: "Select Tax Type"

#### 4. Rental Options (Optional) (Purple bar)
- Collapsible section with dropdown arrow
- Currently collapsed

#### 5. Stock Management (Yellow bar)
- **Initial Stock**
  - Text/number input
  
- **Alert Quantity**
  - Text/number input
  
- **Enable Tracking**
  - Toggle switch (off position)

### Action Buttons (Bottom)
- **Cancel** (left, gray)
- **Save Product** (right, blue/primary)

---

## 3. Add New Contact Modal

### Modal Structure
- **Title:** "Add New Contact"
- **Subtitle:** "Create a customer or supplier profile"
- **Close Button:** X icon (top right)

### Contact Type Selection
- Two toggle buttons:
  - **Customer** (selected, blue highlight)
  - **Supplier** (unselected)

### Collapsible Sections:

#### BASIC INFORMATION (Expanded)
- **Business Name *** (required)
  - Placeholder: "e.g. Ahmed Retailers"
  
- **Mobile Number *** (required)
  - Placeholder: "+92 300 1234567"
  
- **Email Address**
  - Placeholder: "contact@business.com"

#### Financial Details (Collapsed)
- Dropdown arrow indicator

#### Tax Information (Collapsed)
- Dropdown arrow indicator

#### Billing Address (Collapsed)
- Dropdown arrow indicator

### Action Buttons (Bottom)
- **Cancel** (dark gray)
- **Save Contact** (blue)

---

## 4. Add New Purchase Modal

### Modal Header
- **Title:** "Add New Purchase" with orange truck icon
- **Close Button:** X icon

### Purchase Details Section
- **Supplier**
  - Dropdown: "Walk-in Customer" (with person icon)
  
- **Date**
  - Date picker: "December 29th, 2025" (with calendar icon)
  
- **Status**
  - Dropdown: "Draft"

### Product Addition Section
- **Search Bar:**
  - Placeholder: "Scan Barcode or Search Product..."
  - Magnifying glass icon
  - Filter/toggle icon on right

- **Table Headers:**
  - Product | Stock | Qty | Unit Price | Discount | Subtotal

- **Empty State:**
  - "No items added. Search or scan to add products."

### Notes Section
- **Label:** "Sale Notes / Staff Notes"
- **Placeholder:** "Add any notes relevant to this transaction..."

### Summary Section (Right)
- **Subtotal:** "$0.00"
- **Discount:** "-$0.00" (red text)
- **Order Tax (10%):** "$0.00"
- **Shipping & Handling:** "$0.00" with "Add (+)" link
- **Grand Total:** "$0.00" (large, bold, orange font)

### Action Buttons (Bottom)
- **Save as Draft** (left, dark gray)
- **Finalize Purchase • $0.00** (right, green)

---

## 5. Add New Sale Modal

### Modal Header
- **Title:** "Add New Sale" with camera/scanner icon
- **Close Button:** X icon

### Customer & Sale Details
- **Customer**
  - Dropdown: "Walk-in Customer" (with person icon)
  
- **Date**
  - Date picker: "December 29th, 2025" (with calendar icon)
  
- **Status**
  - Dropdown: "Draft"

### Product Search
- **Search Bar:**
  - Placeholder: "Scan Barcode or Search Product..."
  - Magnifying glass icon

### Product List Table
- **Headers:** Product | Stock | Qty | Unit Price | Discount | Subtotal
- **Example Row:**
  - Product: "Premium Cotton Fabric - Beige" with "FABRIC-001"
  - Stock: "50 Pc" (green pill badge)
  - Qty: Input "1" with "-" and "+" buttons + "Add Packing" button (box icon)
  - Unit Price: Input "85"
  - Discount: Input "0"
  - Subtotal: "$85.00"
  - Delete: Red trash icon

### Notes Section
- **Label:** "Sale Notes / Staff Notes"
- **Placeholder:** "Add any notes relevant to this transaction..."

### Additional Services Section
- **Title:** "Additional Services (Stitching/Dying)"
- **Empty State:** "No additional services added."
- **Button:** "Add Service" (blue, with + icon)

### Summary Section
- **Subtotal:** "$85.00"
- **Discount:** "-$0.00"
- **Order Tax (10%):** "$8.50"
- **Shipping & Handling:** "$0.00"
- **Grand Total:** "$93.50" (large, bold)

### Action Buttons (Bottom)
- **Save as Draft** (left, dark gray)
- **Finalize Sale • $93.50** (right, vibrant green)

---

## 6. Production Pipeline (Custom Studio)

### Page Header
- **Title:** "Production Pipeline"
- **Subtitle:** "Track orders through manufacturing stages."
- **Button:** "+ New Order" (blue, top right)

### Kanban Board (3 Columns)

#### Column 1: Cutting
- **Header:**
  - Scissors icon
  - "Cutting" text
  - "2" badge (gray pill)
  - Three-dot menu icon

- **Order Cards:**
  - **ORD-8822:** "10x Chiffon Suits", "Bridal Boutique", "15 Jan"
    - Purple "WHOLESALE" tag (top right)
    - Circular "B" badge (bottom right)
  
  - **ORD-8824:** "50x Lawn Sets", "Ali Textiles", "20 Jan"
    - Purple "WHOLESALE" tag (top right)
    - Circular "A" badge (bottom right)

#### Column 2: Dyeing
- **Header:**
  - Purple dye drop icon
  - "Dyeing" text
  - "1" badge (gray pill)
  - Three-dot menu icon

- **Order Cards:**
  - **ORD-8821:** "Red Bridal Lehenga", "Mrs. Saad", "12 Jan"
    - Circular "M" badge (bottom right)

#### Column 3: Stitching
- **Header:**
  - Orange shirt icon
  - "Stitching" text
  - "1" badge (gray pill)
  - Three-dot menu icon

- **Order Cards:**
  - **ORD-8823:** "Velvet Shawl", "Zara Ahmed", "10 Jan"
    - Circular "Z" badge (bottom right)

### Card Design
- Dark background, rounded corners
- Order ID (bold)
- Product name (bold)
- Customer/Vendor name
- Date
- Tags and badges

---

## 7. New Custom Order Form

### Page Header
- **Title:** "New Custom Order" with blue scissors icon
- **Subtitle:** "Create a new bespoke or wholesale order."
- **Buttons:** "Cancel" (gray) and "Create Order" (blue, with document icon)

### Form Sections

#### Customer Details
- **Select Customer**
  - Dropdown: "Search customer..." with downward arrow
  
- **Due Date**
  - Date input: "dd/mm/yyyy" with calendar icon

#### Order Specifications
- **Item Name**
  - Text input: "e.g. Red Bridal Lehenga"
  
- **Design Reference (SKU)**
  - Text input: "Optional"
  
- **Measurements / Notes**
  - Large textarea: "Enter specific measurements or customization notes..."
  - Pencil icon (bottom right)

---

## 8. Vendor Management Page

### Page Header
- **Title:** "Vendor Management"
- **Subtitle:** "Manage your dyers, tailors, and material suppliers."
- **Button:** "Add Vendor" (blue, with + icon, top right)

### Search and Filter
- **Search Input:**
  - Placeholder: "Search vendors..."
  - Magnifying glass icon
  
- **Filter Button:**
  - Dark gray square button
  - Filter icon (three horizontal lines with downward triangle)

### Vendors Table
- **Headers:** Vendor Name | Service Type | Contact | Location | Active Orders | Status | Actions

- **Example Rows:**
  1. **Ali Dyer**
     - Service Type: "Dyer" (gray badge)
     - Contact: Phone icon + "+92 300 1112222"
     - Location: Location pin + "Lahore"
     - Active Orders: 5
     - Status: "Active" (green badge)
     - Actions: Three vertical dots
  
  2. **Master Sahab**
     - Service Type: "Tailor" (gray badge)
     - Contact: Phone icon + "+92 321 3334444"
     - Location: Location pin + "Karachi"
     - Active Orders: 12
     - Status: "Busy" (orange badge)
     - Actions: Three vertical dots
  
  3. **Embroidery Works**
     - Service Type: "Embroiderer" (gray badge)
     - Contact: Phone icon + "+92 333 5556666"
     - Location: Location pin + "Faisalabad"
     - Active Orders: 2
     - Status: "Active" (green badge)
     - Actions: Three vertical dots
  
  4. **Silk Traders**
     - Service Type: "Fabric Supplier" (gray badge)
     - Contact: Phone icon + "+92 300 7778888"
     - Location: Location pin + "Lahore"
     - Active Orders: 0
     - Status: "Active" (green badge)
     - Actions: Three vertical dots

---

## Common UI Patterns

### Colors
- **Primary Blue:** For buttons and active states
- **Green:** For success, active status, profit
- **Red:** For warnings, low stock, errors
- **Orange:** For payables, manufacturing
- **Purple:** For rentals, wholesale tags
- **Yellow:** For accounting, warnings

### Typography
- **Headings:** White, bold
- **Secondary Text:** `text-gray-400`
- **Values:** Large, bold, colored by context

### Buttons
- **Primary:** Blue background
- **Secondary:** Dark gray
- **Success:** Green (for finalize actions)
- **Ghost:** Transparent with colored text

### Badges
- **Status Badges:** Colored background with matching text
- **Service Type:** Gray badge
- **Stock:** Green pill for available stock

### Icons
- Lucide React icons throughout
- Consistent sizing (18-24px for most)
- Color-coded by context

### Modals
- Dark background overlay
- Rounded corners
- Close button (X) top right
- Help icon (?) bottom right
- Action buttons at bottom

---

## Implementation Checklist

- [ ] Dashboard "Create New" dropdown button
- [ ] Add Product form with all sections
- [ ] Add Contact modal with collapsible sections
- [ ] Add Purchase modal with product table
- [ ] Add Sale modal with additional services
- [ ] Production Pipeline Kanban board
- [ ] New Custom Order form
- [ ] Vendor Management table
- [ ] All color schemes and typography
- [ ] All icons and badges
- [ ] All button styles
- [ ] All modal patterns

---

**Last Updated:** Based on Figma screenshots provided
**Status:** Ready for implementation

