'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

/**
 * Hook for prefetching page data on hover
 * Pre-fetches data when user hovers over navigation links
 */
export function usePrefetch() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const prefetchPage = (path: string) => {
    // Prefetch the route
    router.prefetch(path);

    // Prefetch data based on route
    if (path.includes('/dashboard/sales') || path === '/dashboard/sales') {
      queryClient.prefetchQuery({
        queryKey: ['sales'],
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
    } else if (path.includes('/inventory') || path === '/inventory') {
      queryClient.prefetchQuery({
        queryKey: ['inventory'],
        staleTime: 1000 * 60 * 5,
      });
    } else if (path.includes('/purchases') || path === '/purchases') {
      queryClient.prefetchQuery({
        queryKey: ['purchases'],
        staleTime: 1000 * 60 * 5,
      });
    }
  };

  return { prefetchPage };
}

