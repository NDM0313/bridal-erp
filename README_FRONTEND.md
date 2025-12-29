# POS System - Frontend (Next.js)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- Backend API running on port 3001
- Supabase project configured

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
my-pos-system/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Dashboard page
│   ├── products/         # Products pages
│   ├── pos/              # POS/Sales page
│   ├── purchases/        # Purchases pages
│   ├── inventory/        # Inventory page
│   ├── reports/          # Reports page
│   └── login/           # Login page
├── components/           # React components
│   ├── layout/          # Layout components
│   └── ui/              # UI components
├── lib/                 # Utilities and helpers
│   ├── api/             # API client functions
│   ├── hooks/           # React hooks
│   └── utils.ts         # Utility functions
└── middleware.ts        # Next.js middleware for auth
```

## 🔐 Authentication

The app uses Supabase Auth for authentication:
- Login page: `/login`
- Protected routes require authentication
- Session managed via Supabase client

## 📱 Pages

### Dashboard (`/dashboard`)
- Summary statistics
- Quick actions
- Overview of business

### Products (`/products`)
- List all products
- Search functionality
- Create/Edit/Delete products

### POS / Sales (`/pos`)
- Shopping cart
- Process sales
- Customer type selection

### Purchases (`/purchases`)
- List purchase transactions
- Create new purchases
- View purchase details

### Inventory (`/inventory`)
- Current stock levels
- Low stock alerts
- Multi-unit display

### Reports (`/reports`)
- Sales summary
- Purchases summary
- Date range filtering

## 🔌 API Integration

All API calls go through the centralized client in `lib/api/client.ts`:
- Automatic JWT token injection
- Error handling
- Type-safe responses

## 🎨 Styling

- Tailwind CSS for styling
- Responsive design (mobile, tablet, desktop)
- Modern, clean UI

## 🛠️ Development

### Build for production:
```bash
npm run build
npm start
```

### Lint:
```bash
npm run lint
```

## 📝 Notes

- Backend API must be running on port 3001
- Supabase Auth must be configured
- All routes except `/login` are protected

