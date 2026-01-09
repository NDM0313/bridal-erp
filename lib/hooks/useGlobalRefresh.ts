'use client';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Global Auto-Refresh Hook
 * Provides a unified way to refresh all module lists after mutations
 */
export function useGlobalRefresh() {
  const queryClient = useQueryClient();

  /**
   * Refresh a specific module's data
   */
  const refreshModule = async (module: 'sales' | 'purchases' | 'products' | 'users' | 'accounts' | 'rentals' | 'expenses' | 'inventory' | 'contacts') => {
    const queryKeys: Record<typeof module, string[]> = {
      sales: ['sales'],
      purchases: ['purchases'],
      products: ['products'],
      users: ['users'],
      accounts: ['accounts', 'transactions'],
      rentals: ['rentals'],
      expenses: ['expenses'],
      inventory: ['inventory'],
      contacts: ['contacts'],
    };

    const keys = queryKeys[module] || [];
    
    // Invalidate all related queries
    for (const key of keys) {
      await queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  /**
   * Refresh multiple modules at once
   */
  const refreshModules = async (modules: Array<'sales' | 'purchases' | 'products' | 'users' | 'accounts' | 'rentals' | 'expenses' | 'inventory' | 'contacts'>) => {
    await Promise.all(modules.map(module => refreshModule(module)));
  };

  /**
   * Show success toast and refresh module
   */
  const handleSuccess = async (
    module: 'sales' | 'purchases' | 'products' | 'users' | 'accounts' | 'rentals' | 'expenses' | 'inventory' | 'contacts',
    message: string = 'Saved successfully',
    additionalModules?: Array<'sales' | 'purchases' | 'products' | 'users' | 'accounts' | 'rentals' | 'expenses' | 'inventory' | 'contacts'>
  ) => {
    // Refresh primary module
    await refreshModule(module);
    
    // Refresh additional modules if provided
    if (additionalModules && additionalModules.length > 0) {
      await refreshModules(additionalModules);
    }
    
    toast.success(message);
  };

  return {
    refreshModule,
    refreshModules,
    handleSuccess,
  };
}

