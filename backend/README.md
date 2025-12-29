# POS Backend API

Node.js + Express backend for POS System with Supabase integration.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Setup Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### 3. Setup User Profiles Table

Run the SQL script in Supabase SQL Editor:

```bash
# Open database/user_profiles_setup.sql
# Copy and run in Supabase SQL Editor
```

This creates:
- `user_profiles` table
- Updates `get_user_business_id()` function
- Sets up RLS policies

### 4. Start Server

```bash
npm run dev
```

Server will run on `http://localhost:3001`

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── supabase.js          # Supabase client configuration
│   ├── middleware/
│   │   ├── auth.js              # Authentication middleware
│   │   ├── errorHandler.js      # Error handling
│   │   └── requestContext.js    # Business context attachment
│   ├── routes/
│   │   └── products.js          # Product routes
│   ├── services/
│   │   └── productService.js    # Product business logic
│   └── server.js                # Express server setup
├── database/
│   └── user_profiles_setup.sql  # User profiles table setup
├── .env.example                  # Environment variables template
├── package.json
└── README.md
```

## 🔐 Authentication

All protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <supabase-jwt-token>
```

The middleware:
1. Verifies the JWT token with Supabase
2. Extracts user information
3. Gets user's `business_id` from `user_profiles` table
4. Attaches `business_id` to request context

## 📡 API Endpoints

### Products

- `GET /api/v1/products` - List products (with pagination)
- `GET /api/v1/products/search?q=term` - Search products
- `GET /api/v1/products/:id` - Get product by ID
- `POST /api/v1/products` - Create product
- `PUT /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Delete product (soft delete)

### Health Check

- `GET /health` - Server health check

## 📝 Example Requests

### Create Product

```bash
curl -X POST http://localhost:3001/api/v1/products \
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

### Get Products

```bash
curl http://localhost:3001/api/v1/products?page=1&per_page=20 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔒 Row Level Security (RLS)

All database operations respect Supabase RLS policies:
- Users can only access data from their business
- `business_id` is automatically filtered
- RLS policies enforce multi-tenancy isolation

## 🛠️ Development

### Run in Development Mode

```bash
npm run dev
```

### Run in Production Mode

```bash
npm start
```

## 📚 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anon key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `PORT` | Server port | No (default: 3001) |
| `NODE_ENV` | Environment | No (default: development) |
| `CORS_ORIGIN` | CORS origin | No (default: http://localhost:3000) |

## 🧪 Testing

To test the API:

1. Get a JWT token from Supabase Auth
2. Use it in Authorization header
3. Ensure user has a profile in `user_profiles` table

Example:
```bash
# Health check (no auth required)
curl http://localhost:3001/health

# Get products (auth required)
curl http://localhost:3001/api/v1/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📖 Next Steps

- [ ] Add more modules (variations, stock, sales)
- [ ] Add request validation
- [ ] Add rate limiting
- [ ] Add logging
- [ ] Add unit tests

## 🐛 Troubleshooting

### Error: "User is not associated with any business"
- User needs a profile in `user_profiles` table
- Run `create_user_profile()` function in Supabase

### Error: "Missing Supabase environment variables"
- Check `.env` file exists
- Verify all required variables are set

### RLS blocking queries
- Ensure `get_user_business_id()` function is updated
- Verify user has a profile in `user_profiles` table

