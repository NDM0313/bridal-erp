'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Calendar, User, Phone, Mail, Ruler, ArrowRight, CheckCircle, Package, Users, Printer } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProductionOrder } from '@/lib/types/modern-erp';
import apiClient, { getErrorMessage, ApiResponse } from '@/lib/api/apiClient';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/Label';

interface ProductionOrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder | null;
  onUpdate?: () => void;
}

// Status transition map
const STATUS_TRANSITIONS: Record<string, { next: string; label: string; variant: 'primary' | 'secondary' | 'outline'; color: string }> = {
  new: { next: 'dyeing', label: 'Start Dyeing', variant: 'primary', color: 'bg-blue-600 hover:bg-blue-700' },
  dyeing: { next: 'stitching', label: 'Send to Stitching', variant: 'primary', color: 'bg-yellow-600 hover:bg-yellow-700' },
  stitching: { next: 'completed', label: 'Mark Ready', variant: 'primary', color: 'bg-green-600 hover:bg-green-700' },
  completed: { next: 'dispatched', label: 'Mark Delivered', variant: 'outline', color: 'bg-gray-800 border-gray-700 hover:bg-gray-700' },
};

interface Vendor {
  id: number;
  name: string;
  mobile?: string;
  role?: string; // Extracted from address_line_1
}

export const ProductionOrderDetailsModal = ({ isOpen, onClose, order, onUpdate }: ProductionOrderDetailsModalProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);

  // Fetch vendors on mount
  useEffect(() => {
    if (isOpen && order) {
      fetchVendors();
      // Pre-fill selected vendor if order already has one
      if (order.assigned_vendor_id) {
        setSelectedVendorId(order.assigned_vendor_id);
      } else {
        setSelectedVendorId(null);
      }
    }
  }, [isOpen, order]);

  const fetchVendors = async () => {
    setLoadingVendors(true);
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

      // Fetch vendors (suppliers)
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, mobile, address_line_1')
        .eq('business_id', profile.business_id)
        .or('type.eq.supplier,type.eq.both')
        .order('name')
        .limit(100);

      if (error) throw error;

      if (data) {
        const vendorsList: Vendor[] = data.map((v) => {
          let role: string | undefined;
          if (v.address_line_1 && v.address_line_1.startsWith('Role: ')) {
            role = v.address_line_1.replace('Role: ', '');
          }
          return {
            id: v.id,
            name: v.name,
            mobile: v.mobile || undefined,
            role,
          };
        });
        setVendors(vendorsList);
      }
    } catch (err) {
      console.error('Failed to load vendors:', err);
      toast.error('Failed to load vendors');
    } finally {
      setLoadingVendors(false);
    }
  };

  if (!isOpen || !order) return null;

  const deadlineDate = order.deadline_date ? new Date(order.deadline_date) : null;
  const currentDate = new Date();
  const daysLeft = deadlineDate ? differenceInDays(deadlineDate, currentDate) : null;
  const isOverdue = deadlineDate ? currentDate > deadlineDate : false;

  const measurements = order.measurements as Record<string, any> | undefined;
  const hasMeasurements = measurements && Object.keys(measurements).length > 0;

  const statusTransition = STATUS_TRANSITIONS[order.status];
  const canTransition = statusTransition !== undefined;

  // Check if vendor selection is required (for dyeing or stitching)
  const requiresVendor = statusTransition && (statusTransition.next === 'dyeing' || statusTransition.next === 'stitching');
  const vendorLabel = statusTransition?.next === 'dyeing' ? 'Assign Dyer' : statusTransition?.next === 'stitching' ? 'Assign Tailor' : 'Assign Vendor';
  const isVendorValid = !requiresVendor || selectedVendorId !== null;

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!statusTransition) return;

    // Validate vendor selection for dyeing/stitching
    if (requiresVendor && !selectedVendorId) {
      toast.error(`Please select a ${statusTransition.next === 'dyeing' ? 'Dyer' : 'Tailor'} before proceeding`);
      return;
    }

    setIsUpdating(true);

    try {
      const payload: any = { status: statusTransition.next };
      if (selectedVendorId) {
        payload.assigned_vendor_id = selectedVendorId;
      }

      const response = await apiClient.patch<ApiResponse<ProductionOrder>>(
        `/production/${order.id}/status`,
        payload
      );

      if (response.data?.success) {
        toast.success(`Order moved to ${statusTransition.label}`);
        onUpdate?.();
        onClose();
      } else {
        throw new Error(response.data?.error?.message || 'Failed to update status');
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      toast.error(`Failed to update status: ${errorMessage}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Get status badge
  const getStatusBadge = () => {
    const variants = {
      new: { className: 'bg-gray-900/20 text-gray-400 border-gray-800', label: 'Pending' },
      dyeing: { className: 'bg-blue-900/20 text-blue-400 border-blue-900/50', label: 'In Dyeing' },
      stitching: { className: 'bg-yellow-900/20 text-yellow-400 border-yellow-900/50', label: 'In Stitching' },
      handwork: { className: 'bg-purple-900/20 text-purple-400 border-purple-900/50', label: 'Handwork' },
      completed: { className: 'bg-green-900/20 text-green-400 border-green-900/50', label: 'Ready / QC' },
      dispatched: { className: 'bg-indigo-900/20 text-indigo-400 border-indigo-900/50', label: 'Dispatched' },
      cancelled: { className: 'bg-red-900/20 text-red-400 border-red-900/50', label: 'Cancelled' },
    };

    const variant = variants[order.status] || variants.new;
    return (
      <Badge variant="outline" className={variant.className}>
        {variant.label}
      </Badge>
    );
  };

  // Format measurement key (camelCase to Title Case)
  const formatMeasurementKey = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 bg-gray-950 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-500">
              <Package size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Production Order Details</h3>
              <p className="text-xs text-gray-400">Design #{order.order_no}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge()}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (order) {
                  window.open(`/dashboard/print/production/${order.id}`, '_blank');
                }
              }}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              title="Print Job Card"
            >
              <Printer size={16} className="mr-2" />
              Print Job Card
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Customer Section */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <User size={16} className="text-blue-400" />
              Customer Information
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Customer Name</p>
                <p className="text-sm font-medium text-white">
                  {order.customer?.name || 'No Customer'}
                </p>
              </div>
              
              {order.customer?.mobile && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Phone</p>
                    <p className="text-sm text-gray-300">{order.customer.mobile}</p>
                  </div>
                </div>
              )}
              
              {order.customer?.email && (
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Email</p>
                    <p className="text-sm text-gray-300">{order.customer.email}</p>
                  </div>
                </div>
              )}

              {deadlineDate && (
                <div className="flex items-center gap-2">
                  <Calendar
                    size={14}
                    className={cn(
                      isOverdue ? 'text-red-400' : daysLeft !== null && daysLeft <= 3 ? 'text-yellow-400' : 'text-gray-500'
                    )}
                  />
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Deadline</p>
                    <p
                      className={cn(
                        'text-sm font-medium',
                        isOverdue
                          ? 'text-red-400'
                          : daysLeft !== null && daysLeft <= 3
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      )}
                    >
                      {format(deadlineDate, 'MMM dd, yyyy')}
                      {isOverdue && daysLeft !== null && (
                        <span className="ml-2 text-xs">({Math.abs(daysLeft)} days overdue)</span>
                      )}
                      {!isOverdue && daysLeft !== null && (
                        <span className="ml-2 text-xs">
                          ({daysLeft} {daysLeft === 1 ? 'day' : 'days'} left)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Measurements Section - Tailor's Ticket */}
          {hasMeasurements ? (
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-blue-500/30 rounded-lg p-6 space-y-4 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Ruler size={18} className="text-blue-400" />
                  <h4 className="text-sm font-bold text-white uppercase tracking-wide">Tailor's Ticket</h4>
                </div>
                <div className="text-xs text-gray-400 font-mono">#{order.order_no}</div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(measurements).map(([key, value]) => (
                  <div
                    key={key}
                    className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-center"
                  >
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                      {formatMeasurementKey(key)}
                    </p>
                    <p className="text-lg font-bold text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
              <Ruler size={24} className="text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No measurements recorded</p>
            </div>
          )}

          {/* Order Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Total Cost</p>
              <p className="text-lg font-bold text-white">Rs. {order.total_cost.toLocaleString()}</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Final Price</p>
              <p className="text-lg font-bold text-white">Rs. {order.final_price.toLocaleString()}</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Created</p>
              <p className="text-sm text-gray-300">
                {format(new Date(order.created_at), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>

          {/* Description */}
          {order.description && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-2">Description</p>
              <p className="text-sm text-gray-300">{order.description}</p>
            </div>
          )}
        </div>

        {/* Footer with Action Button */}
        <div className="p-5 border-t border-gray-800 space-y-3 bg-gray-950 sticky bottom-0">
          {/* Vendor Selection (only for dyeing/stitching) */}
          {canTransition && requiresVendor && (
            <div className="space-y-2">
              <Label className="text-sm text-gray-400 flex items-center gap-2">
                <Users size={14} />
                {vendorLabel} *
              </Label>
              <select
                value={selectedVendorId || ''}
                onChange={(e) => setSelectedVendorId(e.target.value ? parseInt(e.target.value) : null)}
                disabled={isUpdating || loadingVendors}
                className={cn(
                  'w-full h-10 rounded-md border bg-gray-800 border-gray-700 px-3 py-2 text-sm text-white',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  !selectedVendorId && requiresVendor && 'border-red-500/50 focus:ring-red-500/50'
                )}
              >
                <option value="">Select {statusTransition.next === 'dyeing' ? 'Dyer' : 'Tailor'}...</option>
                {loadingVendors ? (
                  <option disabled>Loading vendors...</option>
                ) : vendors.length === 0 ? (
                  <option disabled>No vendors available</option>
                ) : (
                  vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name} {vendor.role ? `(${vendor.role})` : ''}
                    </option>
                  ))
                )}
              </select>
              {!selectedVendorId && requiresVendor && (
                <p className="text-xs text-red-400">Please select a vendor to continue</p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              disabled={isUpdating}
            >
              Close
            </Button>
            {canTransition && (
              <Button
                variant={statusTransition.variant}
                onClick={handleStatusUpdate}
                disabled={isUpdating || !isVendorValid}
                className={cn('flex-1', statusTransition.color)}
              >
                {isUpdating ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <ArrowRight size={16} className="mr-2" />
                    {statusTransition.label}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

