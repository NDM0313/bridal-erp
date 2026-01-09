/**
 * Production Setup Page
 * Configure production workflow for a sale
 */

'use client';

import { useParams } from 'next/navigation';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import ProductionSetupScreen from '@/components/studio/ProductionSetupScreen';

export default function ProductionSetupPage() {
  const params = useParams();
  const saleId = params.saleId ? parseInt(String(params.saleId)) : 0;

  if (!saleId) {
    return (
      <ModernDashboardLayout>
        <div className="p-6">
          <p className="text-red-400">Invalid sale ID</p>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout>
      <ProductionSetupScreen saleId={saleId} />
    </ModernDashboardLayout>
  );
}
