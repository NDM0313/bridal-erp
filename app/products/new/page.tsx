'use client';

import { useRouter } from 'next/navigation';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { AddProductForm } from '@/components/products/AddProductForm';

export default function NewProductPage() {
  const router = useRouter();

  return (
    <ModernDashboardLayout>
      <AddProductForm
        onClose={() => router.back()}
        onSuccess={() => router.push('/products')}
      />
    </ModernDashboardLayout>
  );
}

