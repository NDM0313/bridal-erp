# POS Mobile App (React Native / Expo)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- Expo CLI installed: `npm install -g expo-cli`
- Backend API running on port 3001
- Supabase project configured

### Installation

1. Install dependencies:
```bash
cd mobile
npm install
```

2. Install additional dependencies:
```bash
npm install @react-native-community/netinfo
npm install @expo/vector-icons
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_API_URL=http://localhost:3001/api/v1
```

4. Start the development server:
```bash
npm start
```

5. Run on device:
- Scan QR code with Expo Go app (iOS/Android)
- Or press `i` for iOS simulator
- Or press `a` for Android emulator

## 📁 Project Structure

```
mobile/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Authentication screens
│   │   └── login.tsx      # Login screen
│   └── (tabs)/            # Main app tabs
│       ├── pos.tsx        # POS screen
│       ├── products.tsx   # Products screen
│       ├── sales.tsx      # Sales history
│       └── inventory.tsx  # Inventory screen
├── lib/                   # Utilities and helpers
│   ├── api/               # API client functions
│   ├── hooks/             # React hooks
│   └── supabase/          # Supabase client
└── assets/                # Images and icons
```

## 🔐 Authentication

- Supabase Auth integration
- Secure token storage using Expo SecureStore
- Protected navigation
- Auto-logout on session expiry

## 📱 Features

### POS Screen
- Product search and selection
- Shopping cart with quantity management
- Customer type toggle (Retail/Wholesale)
- Offline support (queues sales for sync)
- Fast checkout (2-3 taps)

### Products Screen
- Product list with search
- Read-only view (can be extended)
- Status indicators

### Sales History
- List of completed sales
- Invoice numbers and dates
- Customer information
- Total amounts

### Inventory
- Current stock levels
- Low stock filter
- Multi-location support
- Stock alerts

## 🔄 Offline Support

### Strategy
1. **Cart Persistence**: Cart saved to AsyncStorage
2. **Offline Queue**: Sales queued when offline
3. **Sync on Reconnect**: Automatic sync when back online
4. **Network Detection**: Real-time online/offline status

### Implementation
- Uses `@react-native-community/netinfo` for network detection
- Offline queue stored in AsyncStorage
- Sales API automatically queues when offline
- Manual sync can be added later

## 🎨 UX Features

- Touch-friendly UI (large buttons, easy taps)
- Fast POS flow (minimal taps to checkout)
- Tablet-friendly layout (responsive design)
- Clear error messages
- Loading indicators
- Offline mode indicator

## 🔌 API Integration

All API calls go through centralized client:
- Automatic JWT token injection
- Error handling
- Offline queue support
- Type-safe responses

## 📝 Notes

- Backend API must be running on port 3001
- Supabase Auth must be configured
- Network detection requires `@react-native-community/netinfo`
- For production, update API URL to production backend

## 🛠️ Development

### Build for production:
```bash
expo build:android
expo build:ios
```

### Run on specific platform:
```bash
npm run android
npm run ios
```

