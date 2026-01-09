/**
 * Production Dashboard Page - NEW
 */

'use client';

import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import ProductionDashboard from '@/components/production/ProductionDashboard';

export default function ProductionPage() {
  return (
    <ModernDashboardLayout>
      <ProductionDashboard />
    </ModernDashboardLayout>
  );
}
