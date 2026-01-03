'use client';

import { useState, useEffect, Suspense, lazy, useMemo, useCallback } from 'react';
import { useModal } from '@/lib/context/ModalContext';
import { X } from 'lucide-react';

// Lazy load modals for better performance - only load when needed
// Using dynamic imports to reduce initial bundle size
const AddSaleModal = lazy(() => 
  import('@/components/sales/AddSaleModal').then(module => ({ default: module.AddSaleModal }))
);
const AddPurchaseModal = lazy(() => 
  import('@/components/purchases/AddPurchaseModal').then(module => ({ default: module.AddPurchaseModal }))
);
const AddProductForm = lazy(() => 
  import('@/components/products/AddProductForm').then(module => ({ default: module.AddProductForm }))
);
const AddUserModal = lazy(() => 
  import('@/components/users/AddUserModal').then(module => ({ default: module.AddUserModal }))
);

// Lightweight loading skeleton for modals
const ModalSkeleton = () => (
  <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center">
    <div className="bg-[#111827] rounded-lg w-full max-w-4xl max-h-[90vh] p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-800 rounded w-1/3"></div>
        <div className="h-4 bg-gray-800 rounded w-1/2"></div>
        <div className="space-y-2 mt-6">
          <div className="h-10 bg-gray-800 rounded"></div>
          <div className="h-10 bg-gray-800 rounded"></div>
          <div className="h-10 bg-gray-800 rounded"></div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * Global Modal Handler
 * Optimized with lazy loading and memoization for fast, smooth performance
 * Modals only load when opened, reducing initial bundle size
 */
export function GlobalModalHandler() {
  const { activeModal, closeModal } = useModal();
  
  // Optimized: Single state object instead of multiple states
  const modalStates = useMemo(() => ({
    sale: activeModal === 'newSale',
    purchase: activeModal === 'newPurchase',
    product: activeModal === 'newProduct',
    user: activeModal === 'newUser',
  }), [activeModal]);

  // Optimized: Memoized handlers to prevent re-renders
  // Use useCallback for individual handlers to ensure stability
  const handleSaleClose = useCallback(() => closeModal(), [closeModal]);
  const handleSaleSuccess = useCallback(() => {
    closeModal();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('refresh-sales'));
    }
  }, [closeModal]);

  const handlePurchaseClose = useCallback(() => closeModal(), [closeModal]);
  const handlePurchaseSuccess = useCallback(() => {
    closeModal();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('refresh-purchases'));
    }
  }, [closeModal]);

  const handleProductClose = useCallback(() => closeModal(), [closeModal]);
  const handleProductSuccess = useCallback(() => {
    closeModal();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('refresh-products'));
    }
  }, [closeModal]);

  const handleUserClose = useCallback(() => closeModal(), [closeModal]);
  const handleUserSuccess = useCallback(() => {
    closeModal();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('refresh-users'));
    }
  }, [closeModal]);

  const handlers = useMemo(() => ({
    sale: {
      close: handleSaleClose,
      success: handleSaleSuccess,
    },
    purchase: {
      close: handlePurchaseClose,
      success: handlePurchaseSuccess,
    },
    product: {
      close: handleProductClose,
      success: handleProductSuccess,
    },
    user: {
      close: handleUserClose,
      success: handleUserSuccess,
    },
  }), [handleSaleClose, handleSaleSuccess, handlePurchaseClose, handlePurchaseSuccess, handleProductClose, handleProductSuccess, handleUserClose, handleUserSuccess]);

  return (
    <>
      {/* Global Sale Modal - Lazy loaded, only renders when open */}
      {modalStates.sale && (
        <Suspense fallback={<ModalSkeleton />}>
          <AddSaleModal
            isOpen={true}
            onClose={handlers.sale.close}
            onSuccess={handlers.sale.success}
          />
        </Suspense>
      )}
      
      {/* Global Purchase Modal - Lazy loaded, only renders when open */}
      {modalStates.purchase && (
        <Suspense fallback={<ModalSkeleton />}>
          <AddPurchaseModal
            isOpen={true}
            onClose={handlers.purchase.close}
            onSuccess={handlers.purchase.success}
          />
        </Suspense>
      )}

      {/* Global Product Modal - Lazy loaded, only renders when open */}
      {modalStates.product && (
        <Suspense fallback={<ModalSkeleton />}>
          <div 
            className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
            style={{
              animation: 'fadeIn 0.15s ease-out',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handlers.product.close();
              }
            }}
          >
            <div 
              className="bg-[#111827] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              style={{
                animation: 'slideInUp 0.2s ease-out',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Add New Product</h2>
                  <button
                    onClick={handlers.product.close}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
                <AddProductForm
                  onSuccess={handlers.product.success}
                  onClose={handlers.product.close}
                />
              </div>
            </div>
          </div>
        </Suspense>
      )}

      {/* Global User Modal - Lazy loaded, only renders when open */}
      {modalStates.user && (
        <Suspense fallback={<ModalSkeleton />}>
          <AddUserModal
            isOpen={true}
            onClose={handlers.user.close}
            onSuccess={handlers.user.success}
          />
        </Suspense>
      )}
    </>
  );
}

