/**
 * Production Order Print/Job Card Page
 * Print-friendly job card for production orders
 * Auto-triggers print dialog when loaded
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Printer, X, Calendar, User, Phone, Ruler } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { supabase } from '@/utils/supabase/client';
import { ProductionOrder } from '@/lib/types/modern-erp';
import { Button } from '@/components/ui/Button';

export default function ProductionPrintPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id ? parseInt(params.id as string) : null;

  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  useEffect(() => {
    // Auto-print when order is loaded
    if (order && !loading) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [order, loading]);

  const fetchOrder = async () => {
    if (!orderId) return;

    setLoading(true);
    setError(null);

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

      // Fetch order with relations
      const { data: orderData, error: orderError } = await supabase
        .from('production_orders')
        .select(`
          *,
          customer:contacts(id, name, mobile, email),
          assigned_vendor:contacts(id, name, mobile, address_line_1)
        `)
        .eq('id', orderId)
        .eq('business_id', profile.business_id)
        .single();

      if (orderError) throw orderError;

      if (orderData) {
        // Normalize Supabase relations (arrays to single objects)
        const normalizedOrder: ProductionOrder = {
          ...orderData,
          customer: Array.isArray(orderData.customer) ? orderData.customer[0] : orderData.customer,
          assigned_vendor: Array.isArray(orderData.assigned_vendor)
            ? orderData.assigned_vendor[0]
            : orderData.assigned_vendor,
        };
        setOrder(normalizedOrder);
      }
    } catch (err) {
      console.error('Failed to fetch order:', err);
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  // Format measurement key (camelCase to Title Case)
  const formatMeasurementKey = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  // Get vendor role from address_line_1
  const getVendorRole = (vendor: ProductionOrder['assigned_vendor']): string => {
    if (!vendor) return '';
    if (vendor.address_line_1 && vendor.address_line_1.startsWith('Role: ')) {
      return vendor.address_line_1.replace('Role: ', '');
    }
    return '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading job card...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error || 'Order not found'}</p>
          <Button onClick={() => router.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const deadlineDate = order.deadline_date ? new Date(order.deadline_date) : null;
  const createdDate = new Date(order.created_at);
  const isOverdue = deadlineDate && deadlineDate < new Date();
  const daysLeft = deadlineDate ? differenceInDays(deadlineDate, new Date()) : null;

  const measurements = order.measurements || {};
  const hasMeasurements = Object.keys(measurements).length > 0;
  const vendorRole = getVendorRole(order.assigned_vendor);

  return (
    <>
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .print-page {
            page-break-after: auto;
            page-break-inside: avoid;
          }
        }
        @media screen {
          .print-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: white;
            color: black;
          }
        }
      `}</style>

      <div className="min-h-screen bg-white text-black">
        {/* Print Controls (Hidden when printing) */}
        <div className="no-print bg-gray-100 border-b border-gray-300 p-4 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Production Job Card</h2>
            <div className="flex gap-2">
              <Button
                onClick={() => window.print()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Printer size={16} className="mr-2" />
                Print
              </Button>
              <Button onClick={() => router.back()} variant="outline">
                <X size={16} className="mr-2" />
                Close
              </Button>
            </div>
          </div>
        </div>

        {/* Job Card Content */}
        <div className="print-container print-page">
          {/* Header - Large Order No */}
          <div className="mb-6 pb-4 border-b-4 border-black">
            <div className="text-center">
              <h1 className="text-5xl font-black mb-2 tracking-wide">PRODUCTION TICKET</h1>
              <p className="text-3xl font-bold text-gray-800">Order #{order.order_no || order.id}</p>
            </div>
          </div>

          {/* Timeline - Created Date | DEADLINE */}
          <div className="mb-6 pb-4 border-b-2 border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-gray-600" />
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Created</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {format(createdDate, 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
              {deadlineDate && (
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Deadline</p>
                    <p
                      className={`text-lg font-black ${
                        isOverdue ? 'text-red-600' : daysLeft !== null && daysLeft <= 3 ? 'text-orange-600' : 'text-black'
                      }`}
                    >
                      {format(deadlineDate, 'MMM dd, yyyy')}
                    </p>
                    {isOverdue && daysLeft !== null && (
                      <p className="text-xs text-red-600 font-semibold">
                        ({Math.abs(daysLeft)} days overdue)
                      </p>
                    )}
                    {!isOverdue && daysLeft !== null && (
                      <p className="text-xs text-gray-600">
                        ({daysLeft} {daysLeft === 1 ? 'day' : 'days'} left)
                      </p>
                    )}
                  </div>
                  <div
                    className={`px-3 py-1 border-2 font-bold text-xs ${
                      isOverdue
                        ? 'bg-red-100 border-red-600 text-red-800'
                        : daysLeft !== null && daysLeft <= 3
                        ? 'bg-orange-100 border-orange-600 text-orange-800'
                        : 'bg-yellow-100 border-yellow-600 text-yellow-800'
                    }`}
                  >
                    DEADLINE
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Client Info */}
          <div className="mb-6 pb-4 border-b-2 border-gray-800">
            <h2 className="text-lg font-bold mb-3 uppercase tracking-wide">Client Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <User size={16} className="text-gray-600" />
                  <p className="text-xs text-gray-600 uppercase">Customer Name</p>
                </div>
                <p className="text-lg font-bold text-black">
                  {order.customer?.name || 'No Customer'}
                </p>
              </div>
              {order.customer?.mobile && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Phone size={16} className="text-gray-600" />
                    <p className="text-xs text-gray-600 uppercase">Phone</p>
                  </div>
                  <p className="text-lg font-bold text-black">{order.customer.mobile}</p>
                </div>
              )}
            </div>
          </div>

          {/* Measurements Grid - Large and Bold */}
          {hasMeasurements ? (
            <div className="mb-6 pb-4 border-b-2 border-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <Ruler size={20} className="text-gray-800" />
                <h2 className="text-xl font-black uppercase tracking-wide">Measurements</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(measurements).map(([key, value]) => (
                  <div
                    key={key}
                    className="border-2 border-black p-4 text-center bg-gray-50"
                  >
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                      {formatMeasurementKey(key)}
                    </p>
                    <p className="text-3xl font-black text-black">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-6 pb-4 border-b-2 border-gray-800">
              <div className="border-2 border-dashed border-gray-400 p-6 text-center">
                <Ruler size={32} className="text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No measurements recorded</p>
              </div>
            </div>
          )}

          {/* Vendor Section */}
          {order.assigned_vendor && (
            <div className="mb-6 pb-4 border-b-2 border-gray-800">
              <h2 className="text-lg font-bold mb-2 uppercase tracking-wide">Assigned To</h2>
              <div className="bg-gray-100 border-2 border-gray-800 p-4">
                <p className="text-xl font-bold text-black">
                  {order.assigned_vendor.name}
                  {vendorRole && <span className="text-gray-600"> / {vendorRole}</span>}
                </p>
                {order.assigned_vendor.mobile && (
                  <p className="text-sm text-gray-700 mt-1">Phone: {order.assigned_vendor.mobile}</p>
                )}
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-3 uppercase tracking-wide">Cutting Instructions / Remarks</h2>
            <div className="border-2 border-gray-800 p-4 min-h-[120px] bg-gray-50">
              {order.description ? (
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{order.description}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">No instructions provided</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t-2 border-gray-300">
            <div className="flex justify-between items-center text-xs text-gray-600">
              <p>Status: <span className="font-bold uppercase">{order.status}</span></p>
              <p>Generated: {format(new Date(), 'MMM dd, yyyy HH:mm')}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

