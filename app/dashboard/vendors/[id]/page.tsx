'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Phone, Mail, Users, Package, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Skeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyState } from '@/components/placeholders/EmptyState';
import { ProductionOrder } from '@/lib/types/modern-erp';
import apiClient, { getErrorMessage, ApiResponse } from '@/lib/api/apiClient';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Vendor {
  id: number;
  name: string;
  mobile?: string;
  email?: string;
  address_line_1?: string; // Contains role info
}

type TabType = 'active' | 'history';

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.id ? parseInt(params.id as string) : null;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('active');

  // Fetch vendor details
  const fetchVendor = async () => {
    if (!vendorId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Get business_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) {
        throw new Error('Business not found');
      }

      // Fetch vendor contact
      const { data, error: fetchError } = await supabase
        .from('contacts')
        .select('id, name, mobile, email, address_line_1')
        .eq('id', vendorId)
        .eq('business_id', profile.business_id)
        .single();

      if (fetchError) throw fetchError;

      if (data) {
        setVendor({
          id: data.id,
          name: data.name,
          mobile: data.mobile || undefined,
          email: data.email || undefined,
          address_line_1: data.address_line_1 || undefined,
        });
      }
    } catch (err: any) {
      console.error('Failed to load vendor:', err);
      toast.error('Failed to load vendor details');
      setError(err.message || 'Failed to load vendor');
    }
  };

  // Fetch production orders for this vendor
  const fetchOrders = async () => {
    if (!vendorId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<ApiResponse<ProductionOrder[]>>(
        `/production?vendor_id=${vendorId}&per_page=100`
      );

      if (response.data?.success && response.data.data) {
        // Normalize Supabase relations (arrays to single objects)
        const normalizedOrders: ProductionOrder[] = response.data.data.map((order: any) => ({
          ...order,
          customer: Array.isArray(order.customer) ? order.customer[0] : order.customer,
          assigned_vendor: Array.isArray(order.assigned_vendor) ? order.assigned_vendor[0] : order.assigned_vendor,
        }));
        setOrders(normalizedOrders);
      } else {
        throw new Error(response.data?.error?.message || 'Failed to load orders');
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
    if (vendorId) {
      fetchVendor();
      fetchOrders();
    }
  }, [vendorId]);

  // Extract vendor role
  const getVendorRole = (): string => {
    if (vendor?.address_line_1 && vendor.address_line_1.startsWith('Role: ')) {
      return vendor.address_line_1.replace('Role: ', '');
    }
    return 'Vendor';
  };

  // Filter orders
  const activeOrders = orders.filter(
    (order) => order.status !== 'completed' && order.status !== 'dispatched' && order.status !== 'cancelled'
  );

  const completedOrders = orders.filter(
    (order) => order.status === 'completed' || order.status === 'dispatched'
  );

  // Stats
  const stats = {
    activeWorkload: activeOrders.length,
    totalHistory: orders.length,
  };

  // Handle order card click
  const handleOrderClick = (order: ProductionOrder) => {
    // TODO: Navigate to production order details page
    console.log('View order:', order);
  };

  // Get status badge
  const getStatusBadge = (status: ProductionOrder['status']) => {
    const variants = {
      new: { className: 'bg-gray-900/20 text-gray-400 border-gray-800', label: 'Pending' },
      dyeing: { className: 'bg-blue-900/20 text-blue-400 border-blue-900/50', label: 'In Dyeing' },
      stitching: { className: 'bg-yellow-900/20 text-yellow-400 border-yellow-900/50', label: 'In Stitching' },
      handwork: { className: 'bg-purple-900/20 text-purple-400 border-purple-900/50', label: 'Handwork' },
      completed: { className: 'bg-green-900/20 text-green-400 border-green-900/50', label: 'Ready / QC' },
      dispatched: { className: 'bg-indigo-900/20 text-indigo-400 border-indigo-900/50', label: 'Dispatched' },
      cancelled: { className: 'bg-red-900/20 text-red-400 border-red-900/50', label: 'Cancelled' },
    };

    const variant = variants[status] || variants.new;
    return (
      <Badge variant="outline" className={variant.className}>
        {variant.label}
      </Badge>
    );
  };

  if (!vendorId) {
    return (
      <ModernDashboardLayout>
        <div className="p-6">
          <div className="text-center">
            <p className="text-red-400">Invalid vendor ID</p>
            <Button variant="outline" onClick={() => router.push('/dashboard/vendors')} className="mt-4">
              Back to Vendors
            </Button>
          </div>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout>
      <div className="space-y-6 p-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/vendors')}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Vendors
        </Button>

        {/* Header */}
        {loading && !vendor ? (
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl p-6">
            <Skeleton className="h-32" />
          </div>
        ) : error && !vendor ? (
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl p-12">
            <div className="text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <Button variant="outline" onClick={() => { fetchVendor(); fetchOrders(); }}>
                Retry
              </Button>
            </div>
          </div>
        ) : vendor ? (
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl p-6">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-blue-500/20 text-blue-400 text-2xl font-bold">
                  {vendor.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-white">{vendor.name}</h1>
                  <Badge variant="outline" className="bg-blue-900/20 text-blue-400 border-blue-900/50">
                    {getVendorRole()}
                  </Badge>
                </div>

                {/* Contact Info */}
                <div className="flex flex-wrap gap-4 mt-4">
                  {vendor.mobile && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Phone size={16} className="text-gray-500" />
                      <span className="text-sm">{vendor.mobile}</span>
                    </div>
                  )}
                  {vendor.email && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Mail size={16} className="text-gray-500" />
                      <span className="text-sm">{vendor.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Current Workload</p>
                <p className="text-3xl font-bold text-white">{stats.activeWorkload}</p>
                <p className="text-xs text-gray-500 mt-1">Active orders</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/20 text-blue-400">
                <Package size={24} />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total History</p>
                <p className="text-3xl font-bold text-white">{stats.totalHistory}</p>
                <p className="text-xs text-gray-500 mt-1">All-time orders</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/20 text-green-400">
                <Users size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl overflow-hidden">
          {/* Tab Headers */}
          <div className="border-b border-gray-800">
            <div className="flex gap-6 px-6">
              {(['active', 'history'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'pb-4 text-sm font-medium transition-all relative capitalize',
                    activeTab === tab
                      ? 'text-blue-400'
                      : 'text-gray-400 hover:text-gray-200'
                  )}
                >
                  {tab === 'active' ? 'Currently Assigned' : 'Work History'}
                  {activeTab === tab && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-full" />
                  )}
                  <span className="ml-2 text-xs text-gray-500">
                    ({tab === 'active' ? activeOrders.length : completedOrders.length})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
            ) : activeTab === 'active' ? (
              // Currently Assigned Tab
              activeOrders.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No active orders"
                  description="This vendor currently has no active production orders"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => handleOrderClick(order)}
                      className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 cursor-pointer hover:border-indigo-500 transition-all"
                    >
                      <h3 className="text-white font-semibold">{order.order_no}</h3>
                      {getStatusBadge(order.status)}
                    </div>
                  ))}
                </div>
              )
            ) : (
              // Work History Tab
              completedOrders.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No completed orders"
                  description="This vendor has not completed any orders yet"
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-900/50">
                        <TableHead>Design #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Completed Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <span className="font-mono text-white font-semibold">#{order.order_no}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-gray-300 text-sm">
                              {order.customer?.name || 'No Customer'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {order.deadline_date ? (
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-gray-500" />
                                <span className="text-gray-300 text-sm">
                                  {format(new Date(order.deadline_date), 'MMM dd, yyyy')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-600 text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>
                            <span className="text-gray-300 text-sm">
                              {order.updated_at ? format(new Date(order.updated_at), 'MMM dd, yyyy') : '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOrderClick(order)}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            )}
          </div>
        </div>

        {/* TODO: Add production order details modal */}
      </div>
    </ModernDashboardLayout>
  );
}

