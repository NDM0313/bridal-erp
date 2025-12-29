'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/**
 * New Purchase Page
 * FIX: Created missing route /purchases/new
 */
export default function NewPurchasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // TODO: Implement purchase form
  // For now, redirect back to purchases list
  const handleCancel = () => {
    router.push('/purchases');
  };

  return (
    <ModernDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/purchases">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">New Purchase</h1>
              <p className="mt-1 text-sm text-slate-400">Create a new purchase transaction</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
          <div className="text-center py-12">
            <p className="text-slate-400 mb-4">Purchase form coming soon</p>
            <Button onClick={handleCancel} variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-300">
              Back to Purchases
            </Button>
          </div>
        </div>
      </div>
    </ModernDashboardLayout>
  );
}

