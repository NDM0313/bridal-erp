'use client';

import React, { useState, useEffect } from 'react';
import { Plus, MoreVertical, Calendar, ArrowRight, Loader2, Eye, Package, CheckCircle, Printer } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { Skeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyState } from '@/components/placeholders/EmptyState';
import { RentalBookingDrawer } from '@/components/rentals/RentalBookingDrawer';
import { ReturnDressModal } from '@/components/rentals/ReturnDressModal';
import apiClient, { getErrorMessage, ApiResponse } from '@/lib/api/apiClient';
import { RentalBooking } from '@/lib/types/modern-erp';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type StatusFilter = 'all' | 'reserved' | 'out' | 'returned';

export default function RentalsPage() {
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedBookingForReturn, setSelectedBookingForReturn] = useState<RentalBooking | null>(null);

  // Fetch bookings
  const fetchBookings = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      params.append('per_page', '50');

      const response = await apiClient.get<ApiResponse<RentalBooking[]>>(
        `/rentals?${params.toString()}`
      );

      if (response.data?.success && response.data.data) {
        // Normalize Supabase relations (arrays to single objects)
        const normalizedBookings: RentalBooking[] = response.data.data.map((booking: any) => ({
          ...booking,
          contact: Array.isArray(booking.contact) ? booking.contact[0] : booking.contact,
          product: Array.isArray(booking.product) ? booking.product[0] : booking.product,
          variation: Array.isArray(booking.variation) ? booking.variation[0] : booking.variation,
        }));
        setBookings(normalizedBookings);
      } else {
        throw new Error(response.data?.error?.message || 'Failed to load bookings');
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      toast.error(`Failed to load bookings: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  // Handle status update
  const handleStatusUpdate = async (bookingId: number, newStatus: string) => {
    try {
      const response = await apiClient.patch<ApiResponse<RentalBooking>>(
        `/rentals/${bookingId}/status`,
        { status: newStatus }
      );

      if (response.data?.success) {
        toast.success('Booking status updated successfully');
        fetchBookings(); // Refresh list
      } else {
        throw new Error(response.data?.error?.message || 'Failed to update status');
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      toast.error(`Failed to update status: ${errorMessage}`);
    }
  };

  // Handle return
  const handleReturn = (booking: RentalBooking) => {
    setSelectedBookingForReturn(booking);
    setIsReturnModalOpen(true);
  };

  // Get status badge variant
  const getStatusBadge = (status: RentalBooking['status']) => {
    const variants = {
      reserved: { className: 'bg-yellow-900/20 text-yellow-400 border-yellow-900/50', label: 'Reserved' },
      out: { className: 'bg-blue-900/20 text-blue-400 border-blue-900/50', label: 'Out' },
      returned: { className: 'bg-green-900/20 text-green-400 border-green-900/50', label: 'Returned' },
      overdue: { className: 'bg-red-900/20 text-red-400 border-red-900/50', label: 'Overdue' },
      cancelled: { className: 'bg-gray-900/20 text-gray-400 border-gray-900/50', label: 'Cancelled' },
    };

    const variant = variants[status] || variants.reserved;
    return (
      <Badge variant="outline" className={variant.className}>
        {variant.label}
      </Badge>
    );
  };

  // Filter counts
  const statusCounts = {
    all: bookings.length,
    reserved: bookings.filter((b) => b.status === 'reserved').length,
    out: bookings.filter((b) => b.status === 'out').length,
    returned: bookings.filter((b) => b.status === 'returned').length,
  };

  return (
    <ModernDashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Rental Management</h1>
            <p className="text-sm text-gray-400 mt-1">Manage rental bookings, returns, and inventory</p>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            New Booking
          </Button>
        </div>

        {/* Status Tabs */}
        <div className="border-b border-gray-800">
          <div className="flex gap-6">
            {(['all', 'reserved', 'out', 'returned'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  'pb-3 text-sm font-medium transition-all relative capitalize',
                  statusFilter === status
                    ? 'text-blue-400'
                    : 'text-gray-400 hover:text-gray-200'
                )}
              >
                {status === 'all' ? 'All' : status === 'reserved' ? 'Reserved' : status === 'out' ? 'Active' : 'Returned'}
                {statusFilter === status && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-full" />
                )}
                <span className="ml-2 text-xs text-gray-500">({statusCounts[status]})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl p-6">
            <Skeleton className="h-64" />
          </div>
        ) : error ? (
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl p-12">
            <div className="text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <Button variant="outline" onClick={fetchBookings}>
                Retry
              </Button>
            </div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl p-12">
            <EmptyState
              icon={Package}
              title="No bookings found"
              description={
                statusFilter === 'all'
                  ? 'Get started by creating your first rental booking'
                  : `No ${statusFilter} bookings found`
              }
              action={
                statusFilter === 'all'
                  ? {
                      label: 'Create Booking',
                      onClick: () => setIsDrawerOpen(true),
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-900/50">
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amounts</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => {
                  const pickupDate = new Date(booking.pickup_date);
                  const returnDate = new Date(booking.return_date);
                  const days = differenceInDays(returnDate, pickupDate);
                  const isOverdue = booking.status === 'out' && new Date() > returnDate;

                  return (
                    <TableRow key={booking.id}>
                      {/* Booking ID */}
                      <TableCell>
                        <span className="font-mono text-gray-400">#{booking.id}</span>
                      </TableCell>

                      {/* Customer */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-gray-800 text-gray-400 text-xs">
                              {booking.contact?.name?.substring(0, 2).toUpperCase() || 'CU'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-white font-medium text-sm">
                              {booking.contact?.name || 'Unknown Customer'}
                            </p>
                            {booking.contact?.mobile && (
                              <p className="text-gray-500 text-xs">{booking.contact.mobile}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Product */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {booking.product?.image ? (
                            <img
                              src={booking.product.image}
                              alt={booking.product.name}
                              className="h-10 w-10 rounded object-cover border border-gray-800"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-gray-800 flex items-center justify-center border border-gray-800">
                              <Package size={16} className="text-gray-500" />
                            </div>
                          )}
                          <div>
                            <p className="text-white font-medium text-sm">
                              {booking.product?.name || 'Unknown Product'}
                            </p>
                            {booking.product?.sku && (
                              <p className="text-gray-500 text-xs font-mono">{booking.product.sku}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Dates */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1 text-xs">
                              <Calendar size={12} className="text-blue-400" />
                              <span className="text-gray-400">Pickup:</span>
                              <span className="text-white">{format(pickupDate, 'MMM dd')}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs mt-1">
                              <ArrowRight size={12} className="text-green-400" />
                              <span className="text-gray-400">Return:</span>
                              <span className="text-white">{format(returnDate, 'MMM dd')}</span>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 ml-2">
                            {days}d
                          </div>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>{getStatusBadge(booking.status)}</TableCell>

                      {/* Amounts */}
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-white font-semibold text-sm">
                            Rs. {booking.rental_amount.toLocaleString()}
                          </span>
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-gray-500">Security:</span>
                            <span className={cn(
                              'font-medium',
                              booking.security_type === 'cash' ? 'text-green-400' : 'text-blue-400'
                            )}>
                              {booking.security_type === 'cash' ? 'Cash' : booking.security_type === 'id_card' ? 'ID Card' : booking.security_type === 'both' ? 'Both' : 'None'}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <DropdownMenu
                          trigger={
                            <button className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
                              <MoreVertical size={18} />
                            </button>
                          }
                        >
                          {booking.status === 'reserved' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusUpdate(booking.id, 'out')}
                            >
                              <Package size={14} className="inline mr-2" />
                              Mark as Out
                            </DropdownMenuItem>
                          )}
                          {booking.status === 'out' && (
                            <>
                              <DropdownMenuItem onClick={() => handleReturn(booking)}>
                                <CheckCircle size={14} className="inline mr-2" />
                                Return Dress
                              </DropdownMenuItem>
                              {isOverdue && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusUpdate(booking.id, 'overdue')}
                                  className="text-red-400"
                                >
                                  Mark as Overdue
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              window.open(`/dashboard/print/rental/${booking.id}`, '_blank');
                            }}
                          >
                            <Printer size={14} className="inline mr-2" />
                            Print Receipt
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Eye size={14} className="inline mr-2" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Booking Drawer */}
        <RentalBookingDrawer
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            fetchBookings(); // Refresh after booking creation
          }}
        />

        {/* Return Modal */}
        <ReturnDressModal
          isOpen={isReturnModalOpen}
          onClose={() => {
            setIsReturnModalOpen(false);
            setSelectedBookingForReturn(null);
          }}
          booking={selectedBookingForReturn}
          onSuccess={() => {
            fetchBookings(); // Refresh after return
          }}
        />
      </div>
    </ModernDashboardLayout>
  );
}

