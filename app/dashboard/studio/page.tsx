'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyState } from '@/components/placeholders/EmptyState';
import { ProductionOrderCard } from '@/components/studio/ProductionOrderCard';
import { CreateOrderModal } from '@/components/studio/CreateOrderModal';
import { ProductionOrderDetailsModal } from '@/components/studio/ProductionOrderDetailsModal';
import { ProductionOrder } from '@/lib/types/modern-erp';
import apiClient, { getErrorMessage, ApiResponse } from '@/lib/api/apiClient';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Package } from 'lucide-react';

type KanbanColumn = {
  id: string;
  title: string;
  status: ProductionOrder['status'] | null;
  color: string;
  bgColor: string;
  borderColor: string;
};

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'pending',
    title: 'Pending / Fabric',
    status: 'new',
    color: 'text-gray-400',
    bgColor: 'bg-gray-900/30',
    borderColor: 'border-gray-800',
  },
  {
    id: 'dyeing',
    title: 'In Dyeing',
    status: 'dyeing',
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/10',
    borderColor: 'border-blue-900/50',
  },
  {
    id: 'stitching',
    title: 'In Stitching',
    status: 'stitching',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900/10',
    borderColor: 'border-yellow-900/50',
  },
  {
    id: 'ready',
    title: 'Ready / QC',
    status: 'completed',
    color: 'text-green-400',
    bgColor: 'bg-green-900/10',
    borderColor: 'border-green-900/50',
  },
];

export default function StudioPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);

  // Fetch production orders
  const fetchOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<ApiResponse<ProductionOrder[]>>(
        '/production?per_page=100'
      );

      if (response.data?.success && response.data.data) {
        // Normalize Supabase relations (arrays to single objects)
        const normalizedOrders: ProductionOrder[] = response.data.data.map((order: any) => ({
          ...order,
          customer: Array.isArray(order.customer) ? order.customer[0] : order.customer,
        }));
        setOrders(normalizedOrders);
      } else {
        throw new Error(response.data?.error?.message || 'Failed to load production orders');
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      toast.error(`Failed to load orders: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Filter orders by status for each column
  const getOrdersForColumn = (status: ProductionOrder['status'] | null) => {
    if (status === null) {
      // Show all orders that don't match other columns
      const otherStatuses = KANBAN_COLUMNS.map((col) => col.status).filter(Boolean);
      return orders.filter((order) => !otherStatuses.includes(order.status));
    }
    return orders.filter((order) => order.status === status);
  };

  // Handle new order button
  const handleNewOrder = () => {
    setIsCreateModalOpen(true);
  };

  // Handle order card click
  const handleOrderClick = (order: ProductionOrder) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  return (
    <ModernDashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Custom Studio</h1>
            <p className="text-sm text-gray-400 mt-1">Track production orders through manufacturing stages</p>
          </div>
          <Button variant="primary" onClick={handleNewOrder} className="flex items-center gap-2">
            <Plus size={18} />
            Create Custom Order
          </Button>
        </div>

        {/* Kanban Board */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {KANBAN_COLUMNS.map((column) => (
              <div
                key={column.id}
                className={cn(
                  'rounded-lg border p-4 space-y-3',
                  column.bgColor,
                  column.borderColor
                )}
              >
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl p-12">
            <div className="text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <Button variant="outline" onClick={fetchOrders}>
                Retry
              </Button>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl p-12">
            <EmptyState
              icon={Package}
              title="No production orders found"
              description="Get started by creating your first custom order"
              action={{
                label: 'Create Custom Order',
                onClick: handleNewOrder,
              }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {KANBAN_COLUMNS.map((column) => {
              const columnOrders = getOrdersForColumn(column.status);

              return (
                <div
                  key={column.id}
                  className={cn(
                    'rounded-lg border p-4 space-y-3 min-h-[400px]',
                    column.bgColor,
                    column.borderColor
                  )}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={cn('text-sm font-semibold uppercase tracking-wide', column.color)}>
                      {column.title}
                    </h3>
                    <span className={cn('text-xs font-bold px-2 py-1 rounded-full', column.bgColor, column.color)}>
                      {columnOrders.length}
                    </span>
                  </div>

                  {/* Orders in this column */}
                  <div className="space-y-3">
                    {columnOrders.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-xs text-gray-600">No orders</p>
                      </div>
                    ) : (
                      columnOrders.map((order) => (
                        <ProductionOrderCard
                          key={order.id}
                          order={order}
                          onClick={() => handleOrderClick(order)}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Order Modal */}
        <CreateOrderModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            fetchOrders(); // Refresh Kanban board after order creation
          }}
        />

        {/* Order Details Modal */}
        <ProductionOrderDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
          onUpdate={() => {
            fetchOrders(); // Refresh Kanban board after status update
          }}
        />
      </div>
    </ModernDashboardLayout>
  );
}

