/**
 * Rental Booking Print/Invoice Page
 * Print-friendly invoice for rental bookings
 * Auto-triggers print dialog when loaded
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Printer, X } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/utils/supabase/client';
import { RentalBooking } from '@/lib/types/modern-erp';
import { Button } from '@/components/ui/Button';

export default function RentalPrintPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id ? parseInt(params.id as string) : null;

  const [booking, setBooking] = useState<RentalBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessInfo, setBusinessInfo] = useState<{
    name: string;
    address?: string;
    phone?: string;
  } | null>(null);

  useEffect(() => {
    if (bookingId) {
      fetchBooking();
    }
  }, [bookingId]);

  useEffect(() => {
    // Auto-print when booking is loaded
    if (booking && !loading) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [booking, loading]);

  const fetchBooking = async () => {
    if (!bookingId) return;

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

      // Fetch business info
      const { data: business } = await supabase
        .from('businesses')
        .select('name')
        .eq('id', profile.business_id)
        .single();

      if (business) {
        setBusinessInfo({
          name: business.name || 'Modern Boutique',
        });
      }

      // Fetch booking with relations
      const { data: bookingData, error: bookingError } = await supabase
        .from('rental_bookings')
        .select(`
          *,
          contact:contacts(id, name, mobile, email),
          product:products(id, name, sku, image),
          variation:variations(id, name, sub_sku)
        `)
        .eq('id', bookingId)
        .eq('business_id', profile.business_id)
        .single();

      if (bookingError) throw bookingError;

      if (bookingData) {
        // Normalize Supabase relations (arrays to single objects)
        const normalizedBooking: RentalBooking = {
          ...bookingData,
          contact: Array.isArray(bookingData.contact) ? bookingData.contact[0] : bookingData.contact,
          product: Array.isArray(bookingData.product) ? bookingData.product[0] : bookingData.product,
          variation: Array.isArray(bookingData.variation) ? bookingData.variation[0] : bookingData.variation,
        };
        setBooking(normalizedBooking);
      }
    } catch (err) {
      console.error('Failed to fetch booking:', err);
      setError(err instanceof Error ? err.message : 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(amount)
      .replace('PKR', 'Rs.');
  };

  const getSecurityTypeLabel = (type?: string) => {
    switch (type) {
      case 'cash':
        return 'Cash Deposit';
      case 'id_card':
        return 'ID Card';
      case 'both':
        return 'Cash + ID Card';
      case 'none':
        return 'No Security';
      default:
        return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error || 'Booking not found'}</p>
          <Button onClick={() => router.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const totalAmount = booking.rental_amount + booking.security_deposit_amount;
  const netPayable = booking.rental_amount; // Security deposit is refundable

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
            <h2 className="text-lg font-semibold text-gray-800">Rental Booking Invoice</h2>
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

        {/* Invoice Content */}
        <div className="print-container print-page">
          {/* Header */}
          <div className="mb-8 pb-6 border-b-2 border-gray-800">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">{businessInfo?.name || 'Modern Boutique'}</h1>
                <p className="text-gray-600 text-sm">
                  {businessInfo?.address || '123 Fashion Street, City, Country'}
                </p>
                {businessInfo?.phone && (
                  <p className="text-gray-600 text-sm">Phone: {businessInfo.phone}</p>
                )}
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold mb-2">RENTAL INVOICE</h2>
                <p className="text-gray-600 text-sm">Booking ID: #{booking.id}</p>
              </div>
            </div>
          </div>

          {/* Invoice Info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Customer Information</h3>
              <p className="text-gray-700">
                <strong>Name:</strong> {booking.contact?.name || 'N/A'}
              </p>
              {booking.contact?.mobile && (
                <p className="text-gray-700">
                  <strong>Phone:</strong> {booking.contact.mobile}
                </p>
              )}
              {booking.contact?.email && (
                <p className="text-gray-700">
                  <strong>Email:</strong> {booking.contact.email}
                </p>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Booking Details</h3>
              <p className="text-gray-700">
                <strong>Booking Date:</strong> {format(new Date(booking.booking_date), 'MMM dd, yyyy')}
              </p>
              <p className="text-gray-700">
                <strong>Status:</strong> {booking.status.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Product Table */}
          <div className="mb-8">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-800">
                    Product
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-800">
                    Pickup Date
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-800">
                    Return Date
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-800">
                    Rental Price
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-800">
                    Security Deposit
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-3">
                    <div>
                      <p className="font-semibold text-gray-800">
                        {booking.product?.name || 'Unknown Product'}
                      </p>
                      {booking.product?.sku && (
                        <p className="text-sm text-gray-600">SKU: {booking.product.sku}</p>
                      )}
                      {booking.variation?.name && (
                        <p className="text-sm text-gray-600">Variation: {booking.variation.name}</p>
                      )}
                    </div>
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-gray-700">
                    {format(new Date(booking.pickup_date), 'MMM dd, yyyy')}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-gray-700">
                    {format(new Date(booking.return_date), 'MMM dd, yyyy')}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-800">
                    {formatCurrency(booking.rental_amount)}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-800">
                    {formatCurrency(booking.security_deposit_amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mb-8 flex justify-end">
            <div className="w-80">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="py-2 text-right text-gray-700">Rental Amount:</td>
                    <td className="py-2 pl-4 text-right font-semibold text-gray-800">
                      {formatCurrency(booking.rental_amount)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-right text-gray-700">Security Deposit:</td>
                    <td className="py-2 pl-4 text-right font-semibold text-gray-800">
                      {formatCurrency(booking.security_deposit_amount)}
                    </td>
                  </tr>
                  <tr className="border-t-2 border-gray-800">
                    <td className="py-3 text-right font-bold text-lg text-gray-900">Total Amount:</td>
                    <td className="py-3 pl-4 text-right font-bold text-lg text-gray-900">
                      {formatCurrency(totalAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-right text-sm text-gray-600">Security Type:</td>
                    <td className="py-2 pl-4 text-right text-sm text-gray-600">
                      {getSecurityTypeLabel(booking.security_type)}
                    </td>
                  </tr>
                  <tr className="border-t border-gray-300">
                    <td className="py-2 text-right font-semibold text-gray-800">Net Payable:</td>
                    <td className="py-2 pl-4 text-right font-semibold text-gray-800">
                      {formatCurrency(netPayable)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {booking.notes && (
            <div className="mb-8 p-4 bg-gray-50 border border-gray-300 rounded">
              <h3 className="font-semibold text-gray-800 mb-2">Notes:</h3>
              <p className="text-gray-700 text-sm">{booking.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t-2 border-gray-300">
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">Terms & Conditions:</h3>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>Security deposit will be refunded upon return of the item in good condition.</li>
                <li>Late returns may incur additional charges.</li>
                <li>No refund on cancellation after pickup date.</li>
                <li>Customer is responsible for any damage or loss of the rented item.</li>
                <li>Please return the item on or before the return date to avoid penalties.</li>
              </ul>
            </div>
            <div className="mt-8 flex justify-between items-end">
              <div>
                <p className="text-gray-700 text-sm mb-1">Thank you for your business!</p>
                <p className="text-gray-600 text-xs">
                  Generated on {format(new Date(), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
              <div className="text-right">
                <div className="border-t-2 border-gray-800 w-48 pt-2 mt-16">
                  <p className="text-gray-700 text-sm">Authorized Signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

