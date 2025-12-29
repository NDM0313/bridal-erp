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

// Types
interface RentalBookingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SecurityDetails {
  type: 'cash' | 'id_card' | 'both' | 'none';
  amount: number;
  docUrl?: string;
  reference?: string;
}

export const RentalBookingDrawer = ({ isOpen, onClose }: RentalBookingDrawerProps) => {
  // Date State
  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [pickupDate, setPickupDate] = useState<Date | undefined>(new Date());
  const [returnDate, setReturnDate] = useState<Date | undefined>(addDays(new Date(), 3));

  // Customer State
  const [selectedCustomer, setSelectedCustomer] = useState<Contact | null>(null);

  // Product State
  const [selectedProduct, setSelectedProduct] = useState<SearchProduct | null>(null);
  const [rentalAmount, setRentalAmount] = useState<string>('');

  // Security State
  const [securityDetails, setSecurityDetails] = useState<SecurityDetails>({
    type: 'cash',
    amount: 0,
  });

  // Conflict & Loading State
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState<string>('');

  // Auto-fill rental amount and security deposit when product is selected
  useEffect(() => {
    if (selectedProduct) {
      if (selectedProduct.rentPrice && selectedProduct.rentPrice > 0) {
        setRentalAmount(selectedProduct.rentPrice.toString());
      } else {
        setRentalAmount('');
      }

      const securityDeposit = selectedProduct.securityDeposit;
      if (securityDeposit && securityDeposit > 0) {
        setSecurityDetails((prev) => ({
          ...prev,
          amount: securityDeposit as number,
        }));
      }
    }
  }, [selectedProduct]);

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
        const response = await apiClient.get<ApiResponse<RentalConflict[]>>(
          `/rentals/check-conflicts?productId=${productId}&pickupDate=${pickupDate.toISOString()}&returnDate=${returnDate.toISOString()}`
        );

        if (response.data?.data && response.data.data.length > 0) {
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
  }, [selectedProduct, pickupDate, returnDate]);

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
      const productId = typeof selectedProduct.id === 'number' ? selectedProduct.id : parseInt(selectedProduct.id.toString());
      
      const response = await apiClient.post<ApiResponse<RentalBooking>>('/rentals', {
        contactId: selectedCustomer.id,
        productId: productId,
        pickupDate: pickupDate.toISOString(),
        returnDate: returnDate.toISOString(),
        rentalAmount: parseFloat(rentalAmount) || 0,
        securityDepositAmount: securityDetails.amount || 0,
        securityType: securityDetails.type,
        securityDocUrl: securityDetails.docUrl,
        notes: notes || undefined,
      });

      if (response.data?.success) {
        toast.success('Booking created successfully!');
        // Reset form
        setSelectedProduct(null);
        setSelectedCustomer(null);
        setRentalAmount('');
        setSecurityDetails({ type: 'cash', amount: 0 });
        setNotes('');
        setPickupDate(new Date());
        setReturnDate(addDays(new Date(), 3));
        onClose();
      } else {
        throw new Error(response.data?.error?.message || 'Failed to create booking');
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      
      // Check for conflict error (status 409)
      const isConflict = error && typeof error === 'object' && 'response' in error 
        && typeof (error as { response?: { status?: number } }).response?.status === 'number'
        && (error as { response: { status: number } }).response.status === 409;
      
      if (isConflict) {
        // Date conflict
        toast.error('Date conflict detected. Please choose different dates.');
        setConflictError('⚠️ This product is already booked for these dates.');
      } else {
        toast.error(errorMessage || 'Failed to create booking. Please try again.');
      }
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
              <h2 className="text-xl font-bold text-white">New Rental Booking</h2>
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
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6 relative overflow-hidden">
              <div className="absolute top-1/2 left-4 right-10 border-t-2 border-dashed border-gray-800 -z-0"></div>
              <ArrowRight className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-800 -z-0" size={16} />

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
              <Label className="text-xs text-gray-500 uppercase">Rental Amount</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={rentalAmount}
                onChange={(e) => setRentalAmount(e.target.value)}
                className="h-9 bg-gray-900 border-gray-700 text-white"
              />
            </div>

            {/* Security Section */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Security Deposit</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-400 text-xs uppercase">Type</Label>
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
                    <option value="cash">Cash Deposit</option>
                    <option value="id_card">ID Card</option>
                    <option value="both">Both</option>
                    <option value="none">None</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-400 text-xs uppercase">Amount</Label>
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
                </div>
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
                  <span className="text-gray-400 text-sm">Rental Amount</span>
                  <span className="text-white font-semibold">
                    {rentalAmount ? `Rs. ${parseFloat(rentalAmount).toLocaleString()}` : 'Rs. 0'}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm">Security Deposit</span>
                  <span className="text-white font-semibold">
                    Rs. {securityDetails.amount.toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-gray-800 mt-3 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 font-semibold">Total</span>
                    <span className="text-white font-bold text-lg">
                      Rs.{' '}
                      {(
                        (parseFloat(rentalAmount) || 0) + securityDetails.amount
                      ).toLocaleString()}
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

