'use client';

import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCallback } from 'react';

interface NavLinkWithPrefetchProps {
  href: string;
  isActive: boolean;
  collapsed: boolean;
  onClick: () => void;
  router: ReturnType<typeof useRouter>;
  children: React.ReactNode;
}

/**
 * Navigation Link with Data Prefetching
 * Prefetches route and query data on hover for instant page loads
 */
export function NavLinkWithPrefetch({
  href,
  isActive,
  collapsed,
  onClick,
  router,
  children,
}: NavLinkWithPrefetchProps) {
  const queryClient = useQueryClient();

  const handleMouseEnter = useCallback(() => {
    // Prefetch route
    router.prefetch(href);

    // Prefetch query data based on route
    if (href.includes('/dashboard/sales') || href === '/dashboard/sales') {
      queryClient.prefetchQuery({
        queryKey: ['sales'],
        staleTime: 1000 * 60 * 5,
      });
    } else if (href.includes('/inventory') || href === '/inventory') {
      queryClient.prefetchQuery({
        queryKey: ['inventory'],
        staleTime: 1000 * 60 * 5,
      });
    } else if (href.includes('/purchases') || href === '/purchases') {
      queryClient.prefetchQuery({
        queryKey: ['purchases'],
        staleTime: 1000 * 60 * 5,
      });
    }
  }, [href, router, queryClient]);

  return (
    <Link
      href={href}
      prefetch={true}
      scroll={true}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      className={cn(
        "w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
        isActive 
          ? "bg-blue-600/10 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)] border border-blue-500/20" 
          : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100",
        collapsed ? "justify-center" : "justify-start"
      )}
    >
      {children}
    </Link>
  );
}

