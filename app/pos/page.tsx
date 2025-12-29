/**
 * POS Page - Modern Dark Theme
 * Uses ModernDashboardLayout + ModernPOS from Figma design
 * Client component - no caching config needed (rendered on client)
 */

'use client';

import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { ModernPOS } from '@/components/dashboard/ModernPOS';

/**
 * POS Page
 * Modern dark theme POS interface
 * Integrated with Supabase and role-based access control
 */
export default function POSPage() {
  return (
    <ModernDashboardLayout>
      <ModernPOS />
    </ModernDashboardLayout>
  );
}

