# Adjustments, Transfers & Reports API Examples
## Step 6: Stock Adjustments, Transfers & Reports

## 📋 Overview

This module handles:
- Stock adjustments (manual increase/decrease)
- Stock transfers between locations
- Reports (inventory, sales, purchases)

---

## 🔧 Stock Adjustments

### 1. Create Adjustment (Increase Stock)

**POST** `/api/v1/adjustments`

**Request:**
```http
POST /api/v1/adjustments
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "locationId": 1,
  "items": [
    {
      "variationId": 10,
      "quantity": 2,
      "unitId": 3,
      "adjustmentType": "increase",
      "reason": "Found extra stock"
    }
  ],
  "status": "final"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": 1,
      "ref_no": "ADJ-202512-0001",
      "type": "stock_adjustment",
      "status": "final"
    },
    "items": [...],
    "stockUpdates": [
      {
        "variationId": 10,
        "locationId": 1,
        "adjustmentType": "increase",
        "quantity": 2,
        "unit": "Box",
        "quantityInPieces": 24,
        "newStock": 256
      }
    ]
  }
}
```

---

### 2. Create Adjustment (Decrease Stock)

**Request:**
```http
POST /api/v1/adjustments
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "locationId": 1,
  "items": [
    {
      "variationId": 10,
      "quantity": 10,
      "unitId": 1,
      "adjustmentType": "decrease",
      "reason": "Damaged items"
    }
  ],
  "status": "final"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction": {...},
    "stockUpdates": [
      {
        "variationId": 10,
        "adjustmentType": "decrease",
        "quantity": 10,
        "unit": "Pieces",
        "quantityInPieces": 10,
        "newStock": 246
      }
    ]
  }
}
```

---

## 🔄 Stock Transfers

### 1. Create Transfer

**POST** `/api/v1/transfers`

**Request:**
```http
POST /api/v1/transfers
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "fromLocationId": 1,
  "toLocationId": 2,
  "items": [
    {
      "variationId": 10,
      "quantity": 3,
      "unitId": 3
    }
  ],
  "status": "final"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": 1,
      "ref_no": "TRF-202512-0001",
      "type": "sell_transfer",
      "status": "final"
    },
    "items": [...],
    "stockUpdates": [
      {
        "variationId": 10,
        "fromLocationId": 1,
        "toLocationId": 2,
        "quantity": 3,
        "unit": "Box",
        "quantityInPieces": 36,
        "sourceStock": 210,
        "destStock": 36
      }
    ]
  }
}
```

**Explanation:**
- Transferred 3 Boxes (36 Pieces) from Location 1 to Location 2
- Source location: 246 - 36 = 210 Pieces
- Destination location: 0 + 36 = 36 Pieces

---

## 📊 Reports

### 1. Inventory Report

**GET** `/api/v1/reports/inventory`

**Request:**
```http
GET /api/v1/reports/inventory?location_id=1&low_stock_only=true
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "variationId": 10,
      "variationName": "Default",
      "subSku": "PROD-001-DEF",
      "productId": 1,
      "productName": "Test Product",
      "sku": "PROD-001",
      "category": "Electronics",
      "locationId": 1,
      "locationName": "Main Store",
      "qtyAvailable": 210,
      "qtyInPieces": 210,
      "qtyInSecondaryUnit": 17.5,
      "secondaryUnit": "Box",
      "baseUnit": "Pieces",
      "alertQuantity": 50,
      "isLowStock": false
    }
  ],
  "summary": {
    "totalVariations": 1,
    "totalLocations": 1,
    "lowStockItems": 0,
    "totalStockValue": 0
  }
}
```

---

### 2. Sales Summary Report

**GET** `/api/v1/reports/sales`

**Request:**
```http
GET /api/v1/reports/sales?date_from=2025-12-01&date_to=2025-12-31&location_id=1
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "summary": {
    "totalSales": 15000.00,
    "totalTransactions": 25,
    "retailSales": 8000.00,
    "wholesaleSales": 7000.00,
    "totalItems": 150,
    "averageTransactionValue": 600.00
  },
  "period": {
    "dateFrom": "2025-12-01",
    "dateTo": "2025-12-31"
  }
}
```

---

### 3. Purchase Summary Report

**GET** `/api/v1/reports/purchases`

**Request:**
```http
GET /api/v1/reports/purchases?date_from=2025-12-01&date_to=2025-12-31
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "summary": {
    "totalPurchases": 12000.00,
    "totalTransactions": 10,
    "totalItems": 200,
    "uniqueSuppliers": 3,
    "averageTransactionValue": 1200.00
  },
  "period": {
    "dateFrom": "2025-12-01",
    "dateTo": "2025-12-31"
  }
}
```

---

## ✅ Key Points

1. **Adjustments**: Manual stock changes with reason tracking
2. **Transfers**: Move stock between locations atomically
3. **Reports**: Current stock, sales, and purchase summaries
4. **Unit Conversion**: All operations convert Box to Pieces
5. **Final Only**: Only final transactions affect stock

---

**Ready to test!** 🚀

