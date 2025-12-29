/**
 * Dashboard Page - Modern Dark Theme
 * Uses ModernDashboardLayout + ModernDashboardHome from Figma design
 * Client component - no caching config needed (rendered on client)
 */

'use client';

import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { ModernDashboardHome } from '@/components/dashboard/ModernDashboardHome';

/**
 * Dashboard Page
 * Modern dark theme dashboard with glassmorphism design
 * Integrated with Supabase and role-based access control
 */
export default function DashboardPage() {
  return (
    <ModernDashboardLayout>
      <ModernDashboardHome />
    </ModernDashboardLayout>
  );
}

