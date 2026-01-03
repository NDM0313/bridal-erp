/**
 * POS Page - Full Screen (No Sidebar)
 * Modern dark theme POS interface
 * Client component - no caching config needed (rendered on client)
 */

'use client';

import { ModernPOS } from '@/components/dashboard/ModernPOS';

/**
 * POS Page
 * Full screen POS interface without sidebar
 * Integrated with Supabase and role-based access control
 */
export default function POSPage() {
  return <ModernPOS />;
}

