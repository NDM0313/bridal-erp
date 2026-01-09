/**
 * Main App Navigator
 * Role-based navigation setup
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../auth/AuthContext.js';
import { usePermissions } from '../hooks/usePermissions.js';

// Screens
import LoginScreen from '../screens/auth/LoginScreen.js';
import HomeScreen from '../screens/home/HomeScreen.js';
import WorkerStepsScreen from '../screens/worker/WorkerStepsScreen.js';
import UpdateStepScreen from '../screens/worker/UpdateStepScreen.js';
import SalesListScreen from '../screens/sales/SalesListScreen.js';
import CreateSaleScreen from '../screens/sales/CreateSaleScreen.js';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();
  const { hasPermission } = usePermissions();

  if (loading) {
    return null; // Or show loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            
            {/* Worker Screens */}
            {hasPermission('worker.steps.view') && (
              <>
                <Stack.Screen name="WorkerSteps" component={WorkerStepsScreen} />
                <Stack.Screen name="UpdateStep" component={UpdateStepScreen} />
              </>
            )}

            {/* Sales Screens */}
            {hasPermission('sales.view') && (
              <Stack.Screen name="SalesList" component={SalesListScreen} />
            )}
            {hasPermission('sales.create') && (
              <Stack.Screen name="CreateSale" component={CreateSaleScreen} />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
