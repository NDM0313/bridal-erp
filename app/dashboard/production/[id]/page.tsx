/**
 * Production Flow Page - NEW
 */

'use client';

import { useParams } from 'next/navigation';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import ProductionFlowScreen from '@/components/production/ProductionFlowScreen';

export default function ProductionFlowPage() {
  const params = useParams();
  const orderId = params.id ? parseInt(String(params.id)) : 0;

  if (!orderId) {
    return (
      <ModernDashboardLayout>
        <div className="p-6">
          <p className="text-red-400">Invalid order ID</p>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout>
      <ProductionFlowScreen orderId={orderId} />
    </ModernDashboardLayout>
  );
}
