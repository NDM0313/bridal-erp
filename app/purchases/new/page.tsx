'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { AddPurchaseModal } from '@/components/purchases/AddPurchaseModal';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/**
 * New Purchase Page
 * Modern purchase creation form
 */
export default function NewPurchasePage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(true);

  const handleClose = () => {
    setModalOpen(false);
    router.push('/purchases');
  };

  const handleSuccess = () => {
    setModalOpen(false);
    // Refresh the purchases list by navigating
    router.push('/purchases');
    router.refresh(); // Force refresh
  };

  return (
    <ModernDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/purchases">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-800">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">New Purchase</h1>
              <p className="mt-1 text-sm text-gray-400">Create a new purchase transaction</p>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      <AddPurchaseModal
        isOpen={modalOpen}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </ModernDashboardLayout>
  );
}

