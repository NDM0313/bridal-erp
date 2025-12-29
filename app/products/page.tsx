/**
 * Products Page - Modern Dark Theme
 * Uses ModernDashboardLayout + ModernProductList from Figma design
 * Client component - no caching config needed (rendered on client)
 */

'use client';

import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { ModernProductList } from '@/components/dashboard/ModernProductList';

/**
 * Products Page
 * Modern dark theme product list
 * Integrated with Supabase and role-based access control
 */
export default function ProductsPage() {
  return (
    <ModernDashboardLayout>
      <ModernProductList />
    </ModernDashboardLayout>
  );
}

