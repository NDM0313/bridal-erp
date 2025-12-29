'use client';

/**
 * Sale Edit Guard Component
 * Prevents editing of finalized sales
 * 
 * SECURITY: Read-only protection for finalized transactions
 */

import { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SaleEditGuardProps {
  status: string;
  children: ReactNode;
  onCancel?: () => void;
}

export function SaleEditGuard({ status, children, onCancel }: SaleEditGuardProps) {
  const isFinalized = status === 'final';

  if (isFinalized) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">Transaction Finalized</h3>
            <p className="text-sm text-yellow-800 mb-4">
              This transaction has been finalized and cannot be edited. Finalized transactions are locked
              to maintain data integrity and audit trail.
            </p>
            <p className="text-xs text-yellow-700 mb-4">
              If you need to make changes, please create a return or adjustment transaction instead.
            </p>
            {onCancel && (
              <Button variant="ghost" onClick={onCancel} size="sm">
                Go Back
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

