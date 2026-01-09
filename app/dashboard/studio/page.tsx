/**
 * Studio Page - Redirects to Production
 * Old studio components removed, now using /dashboard/production
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudioPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to new production module
    router.replace('/dashboard/production');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-400">Redirecting to Production...</p>
    </div>
  );
}

