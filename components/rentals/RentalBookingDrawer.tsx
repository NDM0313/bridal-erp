'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ShoppingBag,
  ArrowRight,
  Box,
  AlertCircle,
  X,
  Loader2,
} from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import apiClient, { getErrorMessage, ApiResponse } from '@/lib/api/apiClient';
import { RentalBooking, RentalConflict } from '@/lib/types/modern-erp';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RentalProductSearch, SearchProduct } from './RentalProductSearch';
import { CustomerSearch, Contact } from './CustomerSearch';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';

// Generate rental invoice number
async function generateRentalInvoiceNumber(businessId: number): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  // Get count of rental bookings this month
  const { count } = await supabase
    .from('rental_bookings')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .gte('created_at', `${year}-${month}-01`)
    .lt('created_at', `${year}-${String(parseInt(month) + 1).padStart(2, '0')}-01`);

  const sequence = String((count || 0) + 1).padStart(4, '0');
  return `RENT-${year}${month}-${sequence}`;
}

// Types
interface RentalBookingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  booking?: RentalBooking | null; // For edit mode
}

interface SecurityDetails {
  type: 'cash' | 'id_card' | 'both' | 'none';
  amount: number;
  docUrl?: string;
  reference?: string;
}

interface PaymentDetails {
  advanceAmount: number; // 50% of rental
  dueAmount: number; // Remaining 50%
  securityAmount: number; // Security deposit (calculated)
}

export const RentalBookingDrawer = ({ isOpen, onClose, booking: editBooking }: RentalBookingDrawerProps) => {
  const router = useRouter();
  const isEditMode = !!editBooking;
  
  // Date State
  const [bookingDate, setBookingDate] = useState<string>(
    editBooking?.booking_date 
      ? new Date(editBooking.booking_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [pickupDate, setPickupDate] = useState<Date | undefined>(
    editBooking?.pickup_date ? new Date(editBooking.pickup_date) : new Date()
  );
  const [returnDate, setReturnDate] = useState<Date | undefined>(
    editBooking?.return_date ? new Date(editBooking.return_date) : addDays(new Date(), 3)
  );

  // Customer State
  const [selectedCustomer, setSelectedCustomer] = useState<Contact | null>(
    editBooking?.contact ? {
      id: editBooking.contact.id,
      name: editBooking.contact.name,
      mobile: editBooking.contact.mobile,
      email: editBooking.contact.email,
    } : null
  );

  // Product State
  const [selectedProduct, setSelectedProduct] = useState<SearchProduct | null>(
    editBooking?.product ? {
      id: editBooking.product.id,
      name: editBooking.product.name,
      sku: editBooking.product.sku || '',
      image: editBooking.product.image || '',
      rentPrice: editBooking.rental_amount,
    } : null
  );
  const [rentalAmount, setRentalAmount] = useState<string>(
    editBooking?.rental_amount?.toString() || ''
  );
  const [advanceAmount, setAdvanceAmount] = useState<string>('');

  // Security State
  const [securityDetails, setSecurityDetails] = useState<SecurityDetails>({
    type: (editBooking?.security_type as any) || 'id_card',
    amount: editBooking?.security_deposit_amount || 0,
    docUrl: editBooking?.security_doc_url || undefined,
  });

  // Notes State
  const [notes, setNotes] = useState<string>(editBooking?.notes || '');

  // Payment calculations
  const rentalAmountNum = parseFloat(rentalAmount) || 0;
  const advanceAmountNum = parseFloat(advanceAmount) || 0;
  const dueAmount = Math.max(0, rentalAmountNum - advanceAmountNum); // Remaining after advance
  const securityAmount = Math.round(rentalAmountNum * 0.6); // 60% of rental as security (adjustable)

  // Conflict & Loading State
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load booking data when editBooking changes (for edit mode)
  useEffect(() => {
    if (editBooking && isOpen) {
      // Set dates
      if (editBooking.booking_date) {
        setBookingDate(new Date(editBooking.booking_date).toISOString().split('T')[0]);
      }
      if (editBooking.pickup_date) {
        setPickupDate(new Date(editBooking.pickup_date));
      }
      if (editBooking.return_date) {
        setReturnDate(new Date(editBooking.return_date));
      }

      // Set customer
      if (editBooking.contact) {
        setSelectedCustomer({
          id: editBooking.contact.id,
          name: editBooking.contact.name,
          mobile: editBooking.contact.mobile,
          email: editBooking.contact.email,
        });
      }

      // Set product
      if (editBooking.product) {
        setSelectedProduct({
          id: editBooking.product.id,
          name: editBooking.product.name,
          sku: editBooking.product.sku || '',
          image: editBooking.product.image || '',
          rentPrice: editBooking.rental_amount,
        });
      }

      // Set amounts
      if (editBooking.rental_amount) {
        setRentalAmount(editBooking.rental_amount.toString());
        // Calculate advance amount (50% of rental, or use existing if we have payment info)
        const calculatedAdvance = Math.round(editBooking.rental_amount * 0.5);
        setAdvanceAmount(calculatedAdvance.toString());
      }

      // Set security details
      setSecurityDetails({
        type: (editBooking.security_type as any) || 'id_card',
        amount: editBooking.security_deposit_amount || 0,
        docUrl: editBooking.security_doc_url || undefined,
      });

      // Set notes
      setNotes(editBooking.notes || '');
    } else if (!editBooking && isOpen) {
      // Reset form for new booking
      setBookingDate(new Date().toISOString().split('T')[0]);
      setPickupDate(new Date());
      setReturnDate(addDays(new Date(), 3));
      setSelectedCustomer(null);
      setSelectedProduct(null);
      setRentalAmount('');
      setAdvanceAmount('');
      setSecurityDetails({ type: 'id_card', amount: 0 });
      setNotes('');
    }
  }, [editBooking, isOpen]);

  // Auto-fill rental amount and security deposit when product is selected (only for new bookings)
  useEffect(() => {
    if (selectedProduct && !isEditMode) {
      if (selectedProduct.rentPrice && selectedProduct.rentPrice > 0) {
        setRentalAmount(selectedProduct.rentPrice.toString());
        // Auto-calculate advance as 50% of rental (editable)
        const calculatedAdvance = Math.round(selectedProduct.rentPrice * 0.5);
        setAdvanceAmount(calculatedAdvance.toString());
      } else {
        setRentalAmount('');
        setAdvanceAmount('');
      }

      // Auto-calculate security based on rental amount
      const calculatedSecurity = Math.round((selectedProduct.rentPrice || 0) * 0.6);
      if (calculatedSecurity > 0) {
        setSecurityDetails((prev) => ({
          ...prev,
          amount: calculatedSecurity,
        }));
      }
    }
  }, [selectedProduct, isEditMode]);

  // Date Conflict Detection
  useEffect(() => {
    const checkAvailability = async () => {
      if (!selectedProduct?.id || !pickupDate || !returnDate) {
        setConflictError(null);
        return;
      }

      setIsCheckingConflict(true);
      setConflictError(null);

      try {
        const productId = typeof selectedProduct.id === 'number' ? selectedProduct.id : parseInt(selectedProduct.id.toString());
        const pickupDateStr = pickupDate.toISOString();
        const returnDateStr = returnDate.toISOString();

        // Check for date conflicts using direct Supabase query
        // Find bookings where:
        // 1. Same product
        // 2. Status is 'reserved' or 'out' (active bookings)
        // 3. Date ranges overlap: (pickup_date <= new_return_date AND return_date >= new_pickup_date)
        
        // Fetch all active bookings for this product, then filter for overlaps in JavaScript
        const { data: allBookings, error: conflictError } = await supabase
          .from('rental_bookings')
          .select('id, pickup_date, return_date, status')
          .eq('product_id', productId)
          .in('status', ['reserved', 'out']);

        if (conflictError) {
          console.error('Conflict check query error:', conflictError);
          // Don't show error to user for conflict check failures
          return;
        }

        // Filter for actual overlaps (exclude current booking if editing)
        const actualConflicts = (allBookings || []).filter((booking) => {
          // Skip the current booking if in edit mode
          if (isEditMode && editBooking && booking.id === editBooking.id) {
            return false;
          }
          
          const bookingPickup = new Date(booking.pickup_date);
          const bookingReturn = new Date(booking.return_date);
          const newPickup = pickupDate;
          const newReturn = returnDate;

          // Check if date ranges overlap: (newPickup <= bookingReturn && newReturn >= bookingPickup)
          return (newPickup <= bookingReturn && newReturn >= bookingPickup);
        });

        if (actualConflicts.length > 0) {
          setConflictError('⚠️ This product is already booked for these dates.');
        } else {
          setConflictError(null);
        }
      } catch (error) {
        console.error('Conflict check failed:', error);
        // Don't show error to user for conflict check failures
      } finally {
        setIsCheckingConflict(false);
      }
    };

    // Debounce the check
    const timeoutId = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timeoutId);
  }, [selectedProduct, pickupDate, returnDate, isEditMode, editBooking]);

  // Handle Booking Submission
  const handleBookingSubmit = async () => {
    if (conflictError) {
      toast.error('Please resolve date conflicts before submitting');
      return;
    }

    if (!selectedProduct?.id || !pickupDate || !returnDate || !selectedCustomer) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user and business
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) {
        throw new Error('Business not found');
      }

      const productId = typeof selectedProduct.id === 'number' ? selectedProduct.id : parseInt(selectedProduct.id.toString());
      
      // Check for date conflicts before creating
      const pickupDateStr = pickupDate.toISOString();
      const returnDateStr = returnDate.toISOString();
      
      const { data: existingConflicts } = await supabase
        .from('rental_bookings')
        .select('id, pickup_date, return_date')
        .eq('product_id', productId)
        .in('status', ['reserved', 'out']);

      const hasConflict = (existingConflicts || []).some((booking) => {
        // Skip the current booking if in edit mode
        if (isEditMode && editBooking && booking.id === editBooking.id) {
          return false;
        }
        
        const bookingPickup = new Date(booking.pickup_date);
        const bookingReturn = new Date(booking.return_date);
        return (pickupDate <= bookingReturn && returnDate >= bookingPickup);
      });

      if (hasConflict) {
        toast.error('Date conflict detected. Please choose different dates.');
        setConflictError('⚠️ This product is already booked for these dates.');
        setIsSubmitting(false);
        return;
      }

      if (isEditMode && editBooking) {
        // Update existing booking
        const { data: updatedBooking, error: updateError } = await supabase
          .from('rental_bookings')
          .update({
            contact_id: selectedCustomer.id,
            product_id: productId,
            pickup_date: pickupDateStr,
            return_date: returnDateStr,
            rental_amount: parseFloat(rentalAmount) || 0,
            security_deposit_amount: securityDetails.amount || 0,
            security_type: securityDetails.type,
            security_doc_url: securityDetails.docUrl || null,
            notes: notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editBooking.id)
          .eq('business_id', profile.business_id)
          .select()
          .single();

        if (updateError) {
          throw new Error(updateError.message || 'Failed to update booking');
        }

        toast.success('Booking updated successfully!');
      } else {
        // Generate invoice number for new booking
        const invoiceNumber = await generateRentalInvoiceNumber(profile.business_id);

        // Create booking directly in Supabase
        const { data: newBooking, error: bookingError } = await supabase
          .from('rental_bookings')
          .insert({
            business_id: profile.business_id,
            contact_id: selectedCustomer.id,
            product_id: productId,
            invoice_number: invoiceNumber,
            pickup_date: pickupDateStr,
            return_date: returnDateStr,
            rental_amount: parseFloat(rentalAmount) || 0,
            security_deposit_amount: securityDetails.amount || 0,
            security_type: securityDetails.type,
            security_doc_url: securityDetails.docUrl || null,
            notes: notes || null,
            status: 'reserved',
            created_by: session.user.id,
          })
          .select()
          .single();

        if (bookingError) {
          throw new Error(bookingError.message || 'Failed to create booking');
        }

        toast.success('Booking created successfully!');
        // Reset form only if not in edit mode
        setSelectedProduct(null);
        setSelectedCustomer(null);
        setRentalAmount('');
        setSecurityDetails({ type: 'id_card', amount: 0 });
        setNotes('');
        setPickupDate(new Date());
        setReturnDate(addDays(new Date(), 3));
      }
      
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create booking. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const totalDays = pickupDate && returnDate ? differenceInDays(returnDate, pickupDate) : 0;
  const canSubmit = !conflictError && selectedProduct?.id && pickupDate && returnDate && selectedCustomer && !isSubmitting;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-6xl bg-gray-950 h-full shadow-2xl flex flex-col border-l border-gray-800 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-pink-500/20 text-pink-500">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isEditMode ? 'Edit Rental Booking' : 'New Rental Booking'}
              </h2>
              <p className="text-xs text-gray-400">Manage rental bookings, security & dates</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Side: Form */}
          <div className="w-1/2 flex flex-col border-r border-gray-800 p-6 overflow-y-auto">
            {/* Customer Selection */}
            <div className="space-y-2 mb-6">
              <Label className="text-xs text-gray-500 uppercase">Customer</Label>
              <CustomerSearch
                onSelect={setSelectedCustomer}
                selectedContact={selectedCustomer}
              />
            </div>

            {/* Booking Date */}
            <div className="space-y-2 mb-6">
              <Label className="text-xs text-gray-500 uppercase">Booking Date</Label>
              <Input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="h-9 bg-gray-900 border-gray-700 text-white"
              />
            </div>

            {/* Rental Timeline */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6 relative overflow-visible z-10">
              <div className="absolute top-1/2 left-4 right-10 border-t-2 border-dashed border-gray-800 z-0"></div>
              <ArrowRight className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-800 z-0" size={16} />

              <div className="relative z-10 flex items-end justify-between gap-4">
                {/* Pickup Date */}
                <div className="space-y-2 flex-1">
                  <Label className="text-xs text-blue-400 uppercase font-bold flex items-center gap-2">
                    <Box size={14} /> Pickup Date
                  </Label>
                  <Input
                    type="date"
                    value={pickupDate ? format(pickupDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : undefined;
                      setPickupDate(date);
                    }}
                    className={cn(
                      'h-11 bg-gray-800 border-gray-700 text-white',
                      conflictError && 'border-red-500 bg-red-900/10'
                    )}
                  />
                </div>

                {/* Duration */}
                <div className="bg-gray-950 px-3 py-1 rounded-full border border-gray-800 text-xs font-mono text-gray-400 mb-3 shrink-0">
                  {totalDays > 0 ? `${totalDays} Days` : '--'}
                </div>

                {/* Return Date */}
                <div className="space-y-2 flex-1">
                  <Label className="text-xs text-green-400 uppercase font-bold flex items-center gap-2">
                    Return Date <Box size={14} className="rotate-180" />
                  </Label>
                  <Input
                    type="date"
                    value={returnDate ? format(returnDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : undefined;
                      setReturnDate(date);
                    }}
                    min={pickupDate ? format(pickupDate, 'yyyy-MM-dd') : undefined}
                    className={cn(
                      'h-11 bg-gray-800 border-gray-700 text-white',
                      conflictError && 'border-red-500 bg-red-900/10'
                    )}
                  />
                </div>
              </div>

              {/* Conflict Error */}
              {conflictError && (
                <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle size={16} />
                  <span>{conflictError}</span>
                </div>
              )}

              {/* Checking Conflict Indicator */}
              {isCheckingConflict && (
                <div className="mt-3 flex items-center gap-2 text-gray-400 text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Checking availability...</span>
                </div>
              )}
            </div>

            {/* Product Selection */}
            <div className="space-y-2 mb-6">
              <Label className="text-xs text-gray-500 uppercase">Product</Label>
              <RentalProductSearch
                onSelect={setSelectedProduct}
                selectedProduct={selectedProduct}
                onAddProduct={() => {
                  // Open products page in new tab instead of navigating away
                  window.open('/products', '_blank');
                }}
              />
              {selectedProduct && (
                <div className="mt-2 p-3 bg-gray-900 border border-gray-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{selectedProduct.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{selectedProduct.sku}</p>
                    </div>
                    {selectedProduct.rentPrice && (
                      <p className="text-sm font-semibold text-pink-400">
                        Rs. {selectedProduct.rentPrice.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Rental Amount */}
            <div className="space-y-2 mb-6">
              <Label className="text-xs text-gray-500 uppercase">Total Rent</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={rentalAmount}
                onChange={(e) => {
                  setRentalAmount(e.target.value);
                  // Auto-update advance to 50% if rental changes (but keep editable)
                  const newRental = parseFloat(e.target.value) || 0;
                  if (newRental > 0 && !advanceAmount) {
                    setAdvanceAmount(Math.round(newRental * 0.5).toString());
                  }
                }}
                className="h-9 bg-gray-900 border-gray-700 text-white"
              />
            </div>

            {/* Payment & Security Section */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Payment & Security</h3>
              </div>

              {/* Advance Payment */}
              <div className="space-y-2">
                <Label className="text-gray-400 text-xs uppercase">Advance / Booking Amount</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={advanceAmount}
                  onChange={(e) => {
                    const newAdvance = e.target.value;
                    setAdvanceAmount(newAdvance);
                    // Ensure advance doesn't exceed rental amount
                    const rental = parseFloat(rentalAmount) || 0;
                    const advance = parseFloat(newAdvance) || 0;
                    if (advance > rental) {
                      setAdvanceAmount(rental.toString());
                    }
                  }}
                  max={rentalAmountNum}
                  className="h-9 bg-gray-800 border-gray-700 text-white"
                />
                <p className="text-xs text-gray-500">Payment at booking time</p>
              </div>

              {/* Due Amount */}
              <div className="space-y-2">
                <Label className="text-gray-400 text-xs uppercase">Balance Due</Label>
                <Input
                  type="number"
                  value={dueAmount}
                  readOnly
                  className="h-9 bg-gray-800 border-gray-700 text-white cursor-not-allowed"
                />
                <p className="text-xs text-gray-500">To be paid on delivery date</p>
              </div>

              {/* Security Deposit */}
              <div className="space-y-2">
                <Label className="text-gray-400 text-xs uppercase">Security Deposit</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={securityDetails.amount || ''}
                  onChange={(e) =>
                    setSecurityDetails({
                      ...securityDetails,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="h-9 bg-gray-800 border-gray-700 text-white"
                />
                <p className="text-xs text-gray-500">Taken when due payment is received on delivery</p>
              </div>

              {/* Security Type */}
              <div className="space-y-2">
                <Label className="text-gray-400 text-xs uppercase">Security Type</Label>
                <select
                  value={securityDetails.type}
                  onChange={(e) =>
                    setSecurityDetails({
                      ...securityDetails,
                      type: e.target.value as SecurityDetails['type'],
                    })
                  }
                  className="w-full h-9 px-3 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                >
                  <option value="id_card">ID Card</option>
                  <option value="cash">Cash Deposit</option>
                  <option value="both">Both (ID + Cash)</option>
                  <option value="none">None</option>
                </select>
                <p className="text-xs text-gray-500">Document will be returned on product return (if no damage)</p>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2 mb-6">
              <Label className="text-xs text-gray-500 uppercase">Notes</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                className="w-full min-h-[80px] px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
              />
            </div>
          </div>

          {/* Right Side: Summary */}
          <div className="w-1/2 flex flex-col bg-gray-900/50 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Booking Summary</h3>

            <div className="space-y-4 flex-1">
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm">Total Rent</span>
                  <span className="text-white font-semibold">
                    {rentalAmount ? `Rs. ${parseFloat(rentalAmount).toLocaleString()}` : 'Rs. 0'}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm">Advance / Booking Amount</span>
                  <span className="text-blue-400 font-semibold">
                    Rs. {advanceAmountNum.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm">Balance Due</span>
                  <span className="text-yellow-400 font-semibold">
                    Rs. {dueAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm">Security Deposit</span>
                  <span className="text-green-400 font-semibold">
                    Rs. {securityDetails.amount.toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-gray-800 mt-3 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 font-semibold">Total (Advance + Security)</span>
                    <span className="text-white font-bold text-lg">
                      Rs.{' '}
                      {(advanceAmountNum + securityDetails.amount).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-white mb-2">Booking Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Customer:</span>
                    <span className="text-white">
                      {selectedCustomer?.name || 'N/A'}
                    </span>
                  </div>
                  {selectedProduct && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Product:</span>
                      <span className="text-white truncate ml-2">{selectedProduct.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Duration:</span>
                    <span className="text-white">{totalDays} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pickup:</span>
                    <span className="text-white">
                      {pickupDate ? format(pickupDate, 'MMM dd, yyyy') : 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Return:</span>
                    <span className="text-white">
                      {returnDate ? format(returnDate, 'MMM dd, yyyy') : 'Not set'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleBookingSubmit}
                disabled={!canSubmit}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Confirm Booking'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

