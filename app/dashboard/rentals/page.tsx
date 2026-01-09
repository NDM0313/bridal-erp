'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, MoreVertical, Calendar, ArrowRight, Loader2, Eye, Package, CheckCircle, Printer, LayoutList, Search, Edit, Copy, Trash2, XCircle, Share2, AlertCircle } from 'lucide-react';
import { SortableTableHeader, SortDirection } from '@/components/ui/SortableTableHeader';
import { FilterDropdown, FilterOptions } from '@/components/ui/FilterDropdown';
import { format, differenceInDays } from 'date-fns';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { Skeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyState } from '@/components/placeholders/EmptyState';
import { RentalBookingDrawer } from '@/components/rentals/RentalBookingDrawer';
import { ReturnDressModal } from '@/components/rentals/ReturnDressModal';
import { RentalCalendar } from '@/components/rentals/RentalCalendar';
import { supabase } from '@/utils/supabase/client';
import { RentalBooking } from '@/lib/types/modern-erp';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type StatusFilter = 'all' | 'reserved' | 'out' | 'returned' | 'not_returned';

export default function RentalsPage() {
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedBookingForReturn, setSelectedBookingForReturn] = useState<RentalBooking | null>(null);
  const [selectedBookingForEdit, setSelectedBookingForEdit] = useState<RentalBooking | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection } | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({});
  
  // Calculate stats
  const activeRentals = bookings.filter(b => b.status === 'reserved' || b.status === 'out').length;
  const today = new Date().toISOString().split('T')[0];
  const returnsDueToday = bookings.filter(b => b.status === 'out' && b.return_date === today).length;
  const overdueItems = bookings.filter(b => {
    // Overdue: status is 'out' or 'reserved' and return_date has passed
    if ((b.status === 'out' || b.status === 'reserved') && b.return_date) {
      const returnDate = new Date(b.return_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      returnDate.setHours(0, 0, 0, 0);
      return returnDate < today;
    }
    return false;
  }).length;
  const totalRevenue = bookings
    .filter(b => b.status === 'returned')
    .reduce((sum, b) => sum + ((b as any).total_amount || (b as any).rental_amount || 0), 0);

  // Fetch bookings
  const fetchBookings = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) {
        throw new Error('Business not found');
      }

      // Build query
      let query = supabase
        .from('rental_bookings')
        .select(`
          *,
          contact:contacts(id, name, mobile, email),
          product:products(id, name, sku, image),
          variation:variations(id, name, sub_sku)
        `)
        .eq('business_id', profile.business_id)
        .order('pickup_date', { ascending: false })
        .limit(50);

      // Apply status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'not_returned') {
          // Filter for bookings that are not returned (status !== 'returned')
          query = query.neq('status', 'returned');
        } else {
          query = query.eq('status', statusFilter);
        }
      }

      const { data: bookingsData, error: bookingsError } = await query;

      if (bookingsError) throw bookingsError;

      if (bookingsData) {
        // Normalize Supabase relations (arrays to single objects)
        const normalizedBookings: RentalBooking[] = bookingsData.map((booking: any) => ({
          ...booking,
          contact: Array.isArray(booking.contact) ? booking.contact[0] : booking.contact,
          product: Array.isArray(booking.product) ? booking.product[0] : booking.product,
          variation: Array.isArray(booking.variation) ? booking.variation[0] : booking.variation,
        }));
        setBookings(normalizedBookings);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load bookings';
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) {
        throw new Error('Business not found');
      }

      const { error: updateError } = await supabase
        .from('rental_bookings')
        .update({ status: newStatus })
        .eq('id', bookingId)
        .eq('business_id', profile.business_id);

      if (updateError) throw updateError;

      toast.success('Booking status updated successfully');
      fetchBookings(); // Refresh list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status';
      toast.error(`Failed to update status: ${errorMessage}`);
    }
  };

  // Handle return
  const handleReturn = (booking: RentalBooking) => {
    setSelectedBookingForReturn(booking);
    setIsReturnModalOpen(true);
  };

  // Handle edit
  const handleEdit = (booking: RentalBooking) => {
    setSelectedBookingForEdit(booking);
    setIsDrawerOpen(true);
  };

  // Generate invoice number helper
  const generateRentalInvoiceNumber = async (businessId: number): Promise<string> => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    const { count } = await supabase
      .from('rental_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('created_at', `${year}-${month}-01`)
      .lt('created_at', `${year}-${String(parseInt(month) + 1).padStart(2, '0')}-01`);

    const sequence = String((count || 0) + 1).padStart(4, '0');
    return `RENT-${year}${month}-${sequence}`;
  };

  // Handle duplicate
  const handleDuplicate = async (booking: RentalBooking) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) {
        throw new Error('Business not found');
      }

      // Generate new invoice number
      const invoiceNumber = await generateRentalInvoiceNumber(profile.business_id);

      // Create duplicate booking
      const { data: newBooking, error: duplicateError } = await supabase
        .from('rental_bookings')
        .insert({
          business_id: profile.business_id,
          contact_id: booking.contact_id,
          product_id: booking.product_id,
          variation_id: booking.variation_id,
          invoice_number: invoiceNumber,
          pickup_date: booking.pickup_date,
          return_date: booking.return_date,
          rental_amount: booking.rental_amount,
          security_deposit_amount: booking.security_deposit_amount,
          security_type: booking.security_type,
          security_doc_url: booking.security_doc_url,
          notes: booking.notes,
          status: 'reserved',
          created_by: session.user.id,
        })
        .select()
        .single();

      if (duplicateError) {
        throw new Error(duplicateError.message || 'Failed to duplicate booking');
      }

      toast.success('Booking duplicated successfully!');
      fetchBookings();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate booking';
      toast.error(`Failed to duplicate booking: ${errorMessage}`);
    }
  };

  // Handle cancel
  const handleCancel = async (booking: RentalBooking) => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      await handleStatusUpdate(booking.id, 'cancelled');
      toast.success('Booking cancelled successfully!');
    } catch (err) {
      toast.error('Failed to cancel booking');
    }
  };

  // Handle delete
  const handleDelete = async (booking: RentalBooking) => {
    if (!confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) {
        throw new Error('Business not found');
      }

      const { error: deleteError } = await supabase
        .from('rental_bookings')
        .delete()
        .eq('id', booking.id)
        .eq('business_id', profile.business_id);

      if (deleteError) {
        throw new Error(deleteError.message || 'Failed to delete booking');
      }

      toast.success('Booking deleted successfully!');
      fetchBookings();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete booking';
      toast.error(`Failed to delete booking: ${errorMessage}`);
    }
  };

  // Handle share/WhatsApp
  const handleShare = (booking: RentalBooking) => {
    const invoiceNumber = booking.invoice_number || `#${booking.id}`;
    const customerName = booking.contact?.name || 'Customer';
    const productName = booking.product?.name || 'Product';
    const pickupDate = format(new Date(booking.pickup_date), 'MMM dd, yyyy');
    const returnDate = format(new Date(booking.return_date), 'MMM dd, yyyy');
    const amount = booking.rental_amount.toLocaleString();

    const message = `Rental Booking Details\n\n` +
      `Invoice: ${invoiceNumber}\n` +
      `Customer: ${customerName}\n` +
      `Product: ${productName}\n` +
      `Pickup: ${pickupDate}\n` +
      `Return: ${returnDate}\n` +
      `Amount: Rs. ${amount}\n` +
      `Status: ${booking.status.toUpperCase()}`;

    const whatsappUrl = `https://wa.me/${booking.contact?.mobile?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
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

  // Handle sorting
  const handleSort = useCallback((key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        if (current.direction === 'asc') {
          return { key, direction: 'desc' };
        } else {
          return null;
        }
      }
      return { key, direction: 'asc' };
    });
  }, []);

  // Filter and sort bookings
  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter((booking) => {
        if (booking.invoice_number?.toLowerCase().includes(term)) return true;
        if (booking.id.toString().includes(term)) return true;
        if (booking.contact?.name?.toLowerCase().includes(term)) return true;
        if (booking.contact?.mobile?.toLowerCase().includes(term)) return true;
        if (booking.contact?.email?.toLowerCase().includes(term)) return true;
        if (booking.product?.name?.toLowerCase().includes(term)) return true;
        if (booking.product?.sku?.toLowerCase().includes(term)) return true;
        if (booking.variation?.sub_sku?.toLowerCase().includes(term)) return true;
        return false;
      });
    }

    // Apply date range filter
    if (filters.dateRange?.start || filters.dateRange?.end) {
      result = result.filter((booking) => {
        const pickupDate = new Date(booking.pickup_date);
        if (filters.dateRange?.start && pickupDate < new Date(filters.dateRange.start)) return false;
        if (filters.dateRange?.end && pickupDate > new Date(filters.dateRange.end)) return false;
        return true;
      });
    }

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        let aVal: any;
        let bVal: any;

        if (sortConfig.key === 'invoice_number') {
          aVal = a.invoice_number || '';
          bVal = b.invoice_number || '';
        } else if (sortConfig.key === 'customer_name') {
          aVal = a.contact?.name || '';
          bVal = b.contact?.name || '';
        } else if (sortConfig.key === 'product_name') {
          aVal = a.product?.name || '';
          bVal = b.product?.name || '';
        } else if (sortConfig.key === 'pickup_date') {
          aVal = new Date(a.pickup_date).getTime();
          bVal = new Date(b.pickup_date).getTime();
        } else if (sortConfig.key === 'return_date') {
          aVal = new Date(a.return_date).getTime();
          bVal = new Date(b.return_date).getTime();
        } else if (sortConfig.key === 'rental_amount') {
          aVal = parseFloat((a as any).rental_amount) || 0;
          bVal = parseFloat((b as any).rental_amount) || 0;
        } else {
          aVal = (a as any)[sortConfig.key];
          bVal = (b as any)[sortConfig.key];
        }

        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [bookings, searchTerm, filters, sortConfig]);

  // Filter counts (based on all bookings, not filtered)
  const statusCounts = {
    all: bookings.length,
    reserved: bookings.filter((b) => b.status === 'reserved').length,
    out: bookings.filter((b) => b.status === 'out').length,
    returned: bookings.filter((b) => b.status === 'returned').length,
    not_returned: bookings.filter((b) => b.status !== 'returned').length,
  };

  return (
    <ModernDashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Rental Management</h1>
            <p className="text-sm text-gray-400 mt-1">Track active bookings, returns, and inventory availability.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle - Segmented Control */}
            <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1 border border-gray-700">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                  viewMode === 'list'
                    ? 'bg-gray-800 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-300'
                )}
              >
                <LayoutList size={16} />
                List
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                  viewMode === 'calendar'
                    ? 'bg-gray-800 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-300'
                )}
              >
                <Calendar size={16} />
                Calendar
              </button>
            </div>
            {/* New Booking Button - Pink Theme */}
            <Button
              variant="primary"
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-2 bg-pink-600 hover:bg-pink-500 shadow-pink-600/20"
            >
              <Plus size={18} />
              New Rental Booking
            </Button>
          </div>
        </div>

        {/* Quick Stats - Only visible in List View */}
        {viewMode === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
              <p className="text-gray-500 text-sm">Active Rentals</p>
              <h3 className="text-2xl font-bold text-white mt-1">{activeRentals}</h3>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
              <p className="text-gray-500 text-sm">Returns Due Today</p>
              <h3 className="text-2xl font-bold text-orange-400 mt-1">{returnsDueToday}</h3>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
              <p className="text-gray-500 text-sm">Overdue Items</p>
              <h3 className="text-2xl font-bold text-red-500 mt-1">{overdueItems}</h3>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
              <p className="text-gray-500 text-sm">Total Revenue</p>
              <h3 className="text-2xl font-bold text-green-500 mt-1">
                Rs. {totalRevenue.toLocaleString()}
              </h3>
            </div>
          </div>
        )}

        {/* Status Tabs with Search */}
        <div className="border-b border-gray-800">
          <div className="flex items-center justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex gap-6">
              {(['all', 'reserved', 'out', 'not_returned', 'returned'] as StatusFilter[]).map((status) => (
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
                  {status === 'all' 
                    ? 'All' 
                    : status === 'reserved' 
                    ? 'Reserved' 
                    : status === 'out' 
                    ? 'Active' 
                    : status === 'not_returned'
                    ? 'Not Returned'
                    : 'Returned'}
                  {statusFilter === status && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-full" />
                  )}
                  <span className="ml-2 text-xs text-gray-500">({statusCounts[status]})</span>
                </button>
              ))}
            </div>

            {/* Search & Filter Box - Only visible in List View */}
            {viewMode === 'list' && (
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none z-10" />
                  <Input
                    type="text"
                    placeholder="Search by invoice number, customer, product, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 h-9 w-64 bg-gray-800 border-gray-700 text-white text-sm placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-standard"
                  />
                </div>
                <FilterDropdown
                  onFilterChange={(f) => {
                    // Apply filters to bookings
                    if (f.status && f.status !== 'all') {
                      setStatusFilter(f.status as StatusFilter);
                    }
                  }}
                  activeFilters={{ status: statusFilter === 'all' ? undefined : statusFilter }}
                  showDateRange={true}
                  showStatus={true}
                  statusOptions={[
                    { value: 'all', label: 'All Status' },
                    { value: 'reserved', label: 'Reserved' },
                    { value: 'out', label: 'Active' },
                    { value: 'returned', label: 'Returned' },
                    { value: 'not_returned', label: 'Not Returned' },
                  ]}
                />
              </div>
            )}
          </div>
        </div>

        {/* Main Content - List or Calendar View */}
        {viewMode === 'calendar' ? (
          <RentalCalendar
            bookings={bookings}
            onDateClick={(date, productId) => {
              // Open booking drawer when date/product is clicked
              setIsDrawerOpen(true);
            }}
          />
        ) : loading ? (
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
        ) : filteredBookings.length === 0 ? (
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl p-12">
              <EmptyState
              icon={Package}
              title={searchTerm ? "No bookings found" : "No bookings found"}
              description={
                searchTerm
                  ? `No bookings match "${searchTerm}". Try a different search term.`
                  : statusFilter === 'all'
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
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl overflow-visible relative" style={{ isolation: 'isolate' }}>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-900/50">
                  <SortableTableHeader
                    label="Booking ID"
                    sortKey="invoice_number"
                    currentSort={sortConfig}
                    onSort={handleSort}
                  />
                  <SortableTableHeader
                    label="Customer"
                    sortKey="customer_name"
                    currentSort={sortConfig}
                    onSort={handleSort}
                  />
                  <SortableTableHeader
                    label="Product"
                    sortKey="product_name"
                    currentSort={sortConfig}
                    onSort={handleSort}
                  />
                  <SortableTableHeader
                    label="Pickup Date"
                    sortKey="pickup_date"
                    currentSort={sortConfig}
                    onSort={handleSort}
                  />
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Status
                  </TableHead>
                  <SortableTableHeader
                    label="Amount"
                    sortKey="rental_amount"
                    currentSort={sortConfig}
                    onSort={handleSort}
                  />
                  <TableHead className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => {
                  const pickupDate = new Date(booking.pickup_date);
                  const returnDate = new Date(booking.return_date);
                  const days = differenceInDays(returnDate, pickupDate);
                  // Check if overdue: status is 'out' and return date has passed
                  const isOverdue = (booking.status === 'out' || booking.status === 'reserved') && new Date() > returnDate;
                  const daysOverdue = isOverdue ? differenceInDays(new Date(), returnDate) : 0;

                  return (
                    <TableRow 
                      key={booking.id}
                      className={cn(
                        isOverdue && 'bg-red-950/20 border-l-4 border-l-red-500'
                      )}
                    >
                      {/* Invoice Number */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-gray-400">
                            {booking.invoice_number || `#${booking.id}`}
                          </span>
                          {isOverdue && (
                            <span title={`${daysOverdue} days overdue`}>
                              <AlertCircle size={14} className="text-red-400" />
                            </span>
                          )}
                        </div>
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
                              <ArrowRight size={12} className={isOverdue ? "text-red-400" : "text-green-400"} />
                              <span className="text-gray-400">Return:</span>
                              <span className={cn(
                                "text-white",
                                isOverdue && "text-red-400 font-semibold"
                              )}>
                                {format(returnDate, 'MMM dd')}
                              </span>
                              {isOverdue && (
                                <span className="text-red-400 font-semibold ml-1">
                                  ({daysOverdue}d overdue)
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={cn(
                            "text-xs ml-2",
                            isOverdue ? "text-red-400 font-semibold" : "text-gray-500"
                          )}>
                            {days}d
                          </div>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(booking.status)}
                          {isOverdue && (
                            <Badge variant="outline" className="bg-red-900/20 text-red-400 border-red-900/50 text-xs">
                              Overdue
                            </Badge>
                          )}
                        </div>
                      </TableCell>

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
                      <TableCell className="text-right relative">
                        <div className="relative inline-block">
                          <DropdownMenu
                            trigger={
                              <button className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-0 active:outline-none active:ring-0">
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
                            onClick={() => handleEdit(booking)}
                          >
                            <Edit size={14} className="inline mr-2" />
                            Edit Booking
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(booking)}
                          >
                            <Copy size={14} className="inline mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              window.open(`/dashboard/print/rental/${booking.id}`, '_blank');
                            }}
                          >
                            <Printer size={14} className="inline mr-2" />
                            Print Receipt
                          </DropdownMenuItem>
                          {booking.contact?.mobile && (
                            <DropdownMenuItem
                              onClick={() => handleShare(booking)}
                            >
                              <Share2 size={14} className="inline mr-2" />
                              Share via WhatsApp
                            </DropdownMenuItem>
                          )}
                          {booking.status !== 'returned' && booking.status !== 'cancelled' && (
                            <DropdownMenuItem
                              onClick={() => handleCancel(booking)}
                              className="text-orange-400"
                            >
                              <XCircle size={14} className="inline mr-2" />
                              Cancel Booking
                            </DropdownMenuItem>
                          )}
                          {booking.status === 'reserved' && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(booking)}
                              className="text-red-400"
                            >
                              <Trash2 size={14} className="inline mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              // View details - could open a modal or navigate
                              window.open(`/dashboard/print/rental/${booking.id}`, '_blank');
                            }}
                          >
                            <Eye size={14} className="inline mr-2" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </div>
        )}

        {/* Booking Drawer */}
        <RentalBookingDrawer
          isOpen={isDrawerOpen}
          booking={selectedBookingForEdit}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedBookingForEdit(null);
            fetchBookings(); // Refresh after booking creation/update
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

