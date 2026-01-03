'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

/**
 * Query Client Provider
 * Configures React Query with optimal settings for performance:
 * - Stale-While-Revalidate: Shows cached data instantly, updates in background
 * - Optimistic updates support
 * - Automatic refetching on window focus
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Stale-While-Revalidate: Use cached data first, then update
        staleTime: 1000 * 60 * 10, // 10 minutes - data is fresh for 10 min (increased for better caching)
        gcTime: 1000 * 60 * 60, // 60 minutes - cache persists for 1 hour (increased for instant tab switching)
        refetchOnWindowFocus: false, // Don't refetch on focus - use cached data for instant switching
        refetchOnReconnect: true, // Refetch when internet reconnects
        retry: 1, // Retry failed requests once
        refetchOnMount: false, // Don't refetch on mount if data is fresh - show cached data instantly
        // Always show cached data first, then update in background
        placeholderData: (previousData) => previousData,
      },
      mutations: {
        // Optimistic updates: Update UI immediately, rollback on error
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

