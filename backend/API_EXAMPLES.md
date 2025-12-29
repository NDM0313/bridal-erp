# API Request/Response Examples

## Authentication

All protected endpoints require a Bearer token:

```
Authorization: Bearer <supabase-jwt-token>
```

## Products API

### 1. Get All Products

**Request:**
```http
GET /api/v1/products?page=1&per_page=20&search=test&category_id=5
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Test Product",
      "sku": "TEST-001",
      "type": "single",
      "unit": {
        "id": 1,
        "actual_name": "Pieces",
        "short_name": "Pcs"
      },
      "secondary_unit": {
        "id": 2,
        "actual_name": "Box",
        "short_name": "Box",
        "base_unit_multiplier": 12
      },
      "brand": {
        "id": 1,
        "name": "Test Brand"
      },
      "category": {
        "id": 5,
        "name": "Electronics"
      },
      "enable_stock": true,
      "alert_quantity": 10,
      "is_inactive": false,
      "created_at": "2025-12-25T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 2. Get Product by ID

**Request:**
```http
GET /api/v1/products/1
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Test Product",
    "sku": "TEST-001",
    "type": "single",
    "unit": {
      "id": 1,
      "actual_name": "Pieces",
      "short_name": "Pcs"
    },
    "variations": [
      {
        "id": 10,
        "name": "Default",
        "sub_sku": "TEST-001-DEF",
        "retail_price": 100.00,
        "wholesale_price": 80.00,
        "default_purchase_price": 60.00,
        "deleted_at": null
      }
    ],
    "created_at": "2025-12-25T10:00:00Z"
  }
}
```

### 3. Search Products

**Request:**
```http
GET /api/v1/products/search?q=test&limit=10
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Test Product",
      "sku": "TEST-001",
      "type": "single",
      "is_inactive": false
    }
  ]
}
```

### 4. Create Product

**Request:**
```http
POST /api/v1/products
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "New Product",
  "type": "single",
  "unitId": 1,
  "secondaryUnitId": 2,
  "brandId": 1,
  "categoryId": 5,
  "sku": "NEW-001",
  "enableStock": true,
  "alertQuantity": 10,
  "productDescription": "Product description here",
  "weight": 1.5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "New Product",
    "sku": "NEW-001",
    "type": "single",
    "unit_id": 1,
    "secondary_unit_id": 2,
    "business_id": 1,
    "created_by": 1,
    "created_at": "2025-12-25T10:00:00Z"
  }
}
```

### 5. Update Product

**Request:**
```http
PUT /api/v1/products/2
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Updated Product Name",
  "alertQuantity": 20,
  "isInactive": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Updated Product Name",
    "sku": "NEW-001",
    "alert_quantity": 20,
    "is_inactive": false,
    "updated_at": "2025-12-25T10:05:00Z"
  }
}
```

### 6. Delete Product

**Request:**
```http
DELETE /api/v1/products/2
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

## Error Responses

### 401 Unauthorized

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid authorization header"
  }
}
```

### 403 Forbidden

```json
{
  "success": false,
  "error": {
    "code": "NO_BUSINESS_ASSOCIATED",
    "message": "User is not associated with any business"
  }
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Product not found"
  }
}
```

### 409 Conflict (Duplicate SKU)

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_SKU",
    "message": "SKU already exists for this business"
  }
}
```

### 422 Validation Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required fields: name, unitId, sku"
  }
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Internal server error"
  }
}
```

## Health Check

**Request:**
```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-12-25T10:00:00.000Z"
}
```

## cURL Examples

### Get Products
```bash
curl -X GET "http://localhost:3001/api/v1/products?page=1&per_page=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create Product
```bash
curl -X POST "http://localhost:3001/api/v1/products" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "type": "single",
    "unitId": 1,
    "sku": "TEST-001",
    "enableStock": true
  }'
```

### Update Product
```bash
curl -X PUT "http://localhost:3001/api/v1/products/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name"
  }'
```

### Delete Product
```bash
curl -X DELETE "http://localhost:3001/api/v1/products/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

