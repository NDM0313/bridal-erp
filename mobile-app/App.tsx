/**
 * Root App Component
 * Initializes auth and navigation
 */

import React from 'react';
import { AuthProvider } from './src/auth/AuthContext.js';
import AppNavigator from './src/navigation/AppNavigator.js';

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
