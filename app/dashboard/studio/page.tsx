'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Loader2, Scissors, MoreVertical, Droplets, Shirt } from 'lucide-react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type KanbanColumn = {
  id: string;
  title: string;
  status: ProductionOrder['status'] | null;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'cutting',
    title: 'Cutting',
    status: 'new', // Using 'new' for cutting stage
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/10',
    borderColor: 'border-blue-900/50',
    icon: Scissors,
  },
  {
    id: 'dyeing',
    title: 'Dyeing',
    status: 'dyeing',
    color: 'text-purple-400',
    bgColor: 'bg-purple-900/10',
    borderColor: 'border-purple-900/50',
    icon: Droplets,
  },
  {
    id: 'stitching',
    title: 'Stitching',
    status: 'stitching',
    color: 'text-orange-400',
    bgColor: 'bg-orange-900/10',
    borderColor: 'border-orange-900/50',
    icon: Shirt,
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
            <h1 className="text-2xl font-bold text-white">Production Pipeline</h1>
            <p className="text-sm text-gray-400 mt-1">Track orders through manufacturing stages.</p>
          </div>
          <Button variant="primary" onClick={handleNewOrder} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white">
            <Plus size={18} />
            New Order
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
          <div className="flex gap-4 overflow-x-auto pb-4">
            {KANBAN_COLUMNS.map((column) => {
              const columnOrders = getOrdersForColumn(column.status);
              const Icon = column.icon;

              return (
                <div
                  key={column.id}
                  className={cn(
                    'flex-shrink-0 w-80 rounded-lg border p-4 space-y-3 min-h-[500px]',
                    column.bgColor,
                    column.borderColor
                  )}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Icon className={column.color} size={20} />
                      <h3 className={cn('text-sm font-semibold', column.color)}>
                        {column.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-1 rounded-full bg-gray-800 text-gray-400">
                        {columnOrders.length}
                      </span>
                      <button className="text-gray-400 hover:text-white">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Orders in this column */}
                  <div className="space-y-3">
                    {columnOrders.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-xs text-gray-600">No orders</p>
                      </div>
                    ) : (
                      columnOrders.map((order) => {
                        const customerName = order.customer?.name || 'No Customer';
                        const initials = customerName
                          .split(' ')
                          .map((word) => word[0])
                          .join('')
                          .toUpperCase()
                          .substring(0, 2);
                        const orderDate = order.deadline_date
                          ? format(new Date(order.deadline_date), 'dd MMM')
                          : format(new Date(order.created_at), 'dd MMM');

                        return (
                          <div
                            key={order.id}
                            onClick={() => handleOrderClick(order)}
                            className="bg-gray-800 border border-gray-700 rounded-lg p-4 cursor-pointer hover:border-gray-600 hover:shadow-lg transition-all"
                          >
                            {/* Order ID */}
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-mono text-gray-400">ORD-{order.id}</p>
                              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs">
                                WHOLESALE
                              </Badge>
                            </div>

                            {/* Product Name */}
                            <p className="text-sm font-bold text-white mb-2">
                              {order.item_name || 'Custom Order'}
                            </p>

                            {/* Customer Name */}
                            <p className="text-xs text-gray-400 mb-2">{customerName}</p>

                            {/* Date */}
                            <p className="text-xs text-gray-500 mb-3">{orderDate}</p>

                            {/* Customer Initial Badge */}
                            <div className="flex justify-end">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-gray-700 text-gray-300 text-xs">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          </div>
                        );
                      })
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

