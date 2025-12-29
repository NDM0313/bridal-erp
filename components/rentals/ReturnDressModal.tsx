'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Calendar, AlertTriangle, Shield, Package, User } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { RentalBooking } from '@/lib/types/modern-erp';
import apiClient, { getErrorMessage, ApiResponse } from '@/lib/api/apiClient';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ReturnDressModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: RentalBooking | null;
  onSuccess?: () => void;
}

export const ReturnDressModal = ({ isOpen, onClose, booking, onSuccess }: ReturnDressModalProps) => {
  const [penaltyAmount, setPenaltyAmount] = useState<string>('0');
  const [returnNotes, setReturnNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes or booking changes
  useEffect(() => {
    if (isOpen && booking) {
      setPenaltyAmount(booking.penalty_amount?.toString() || '0');
      setReturnNotes('');
      setIsSubmitting(false);
    }
  }, [isOpen, booking]);

  if (!isOpen || !booking) return null;

  const returnDate = new Date(booking.return_date);
  const currentDate = new Date();
  const isLate = currentDate > returnDate;
  const daysLate = isLate ? differenceInDays(currentDate, returnDate) : 0;

  const securityDeposit = booking.security_deposit_amount || 0;
  const penalty = parseFloat(penaltyAmount) || 0;
  const netRefund = Math.max(0, securityDeposit - penalty);

  const handleConfirmReturn = async () => {
    setIsSubmitting(true);

    try {
      // Use the status update endpoint with return-specific fields
      const response = await apiClient.patch<ApiResponse<RentalBooking>>(
        `/rentals/${booking.id}/status`,
        {
          status: 'returned',
          actualReturnDate: new Date().toISOString(),
          penaltyAmount: penalty,
          notes: returnNotes.trim() || undefined,
        }
      );

      if (response.data?.success) {
        toast.success('Return processed successfully!');
        onSuccess?.();
        onClose();
      } else {
        throw new Error(response.data?.error?.message || 'Failed to process return');
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      toast.error(`Failed to process return: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 bg-gray-950 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20 text-green-500">
              <Package size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Process Return</h3>
              <p className="text-xs text-gray-400">Booking #{booking.id}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Summary Section */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-white mb-3">Booking Summary</h4>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Product */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded bg-gray-800 flex items-center justify-center border border-gray-700">
                  {booking.product?.image ? (
                    <img
                      src={booking.product.image}
                      alt={booking.product.name}
                      className="h-full w-full rounded object-cover"
                    />
                  ) : (
                    <Package size={16} className="text-gray-500" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-400">Product</p>
                  <p className="text-sm font-medium text-white">
                    {booking.product?.name || 'Unknown Product'}
                  </p>
                </div>
              </div>

              {/* Customer */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                  <User size={16} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Customer</p>
                  <p className="text-sm font-medium text-white">
                    {booking.contact?.name || 'Unknown Customer'}
                  </p>
                </div>
              </div>
            </div>

            {/* Due Date */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-800">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-gray-500" />
                <span className="text-xs text-gray-400">Due Date:</span>
                <span className="text-sm font-medium text-white">
                  {format(returnDate, 'MMM dd, yyyy')}
                </span>
              </div>
              {isLate && (
                <Badge variant="outline" className="bg-red-900/20 text-red-400 border-red-900/50">
                  <AlertTriangle size={12} className="mr-1" />
                  {daysLate} {daysLate === 1 ? 'Day' : 'Days'} Late
                </Badge>
              )}
            </div>
          </div>

          {/* Financials Section */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Shield size={16} className="text-blue-400" />
              Financial Details
            </h4>

            {/* Security Deposit Held */}
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <span className="text-sm text-gray-400">Security Deposit Held</span>
              <span className="text-lg font-bold text-white">
                Rs. {securityDeposit.toLocaleString()}
              </span>
            </div>

            {/* Penalty / Damage Charges */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-400 uppercase">Penalty / Damage Charges</Label>
              <Input
                type="number"
                value={penaltyAmount}
                onChange={(e) => setPenaltyAmount(e.target.value)}
                placeholder="0.00"
                className="h-10 bg-gray-800 border-gray-700 text-white"
                min="0"
                step="0.01"
              />
              <p className="text-xs text-gray-500">
                Enter any charges for late return, damage, or cleaning fees
              </p>
            </div>

            {/* Net Refund Amount */}
            <div className="flex items-center justify-between p-4 bg-green-900/20 border border-green-900/50 rounded-lg">
              <span className="text-sm font-semibold text-gray-300">Net Refund Amount</span>
              <span className={cn(
                'text-2xl font-bold',
                netRefund > 0 ? 'text-green-400' : 'text-gray-400'
              )}>
                Rs. {netRefund.toLocaleString()}
              </span>
            </div>

            {penalty > securityDeposit && (
              <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-900/50 rounded-lg">
                <AlertTriangle size={16} className="text-red-400" />
                <p className="text-sm text-red-400">
                  Penalty exceeds security deposit. Customer owes: Rs.{' '}
                  {(penalty - securityDeposit).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Return Condition Notes */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-400 uppercase">Return Condition Notes</Label>
            <textarea
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              placeholder="Describe the condition of the returned item, any damages, cleaning required, etc."
              className="w-full min-h-[100px] px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-800 flex gap-3 bg-gray-950 sticky bottom-0">
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
            onClick={handleConfirmReturn}
            disabled={isSubmitting}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Package size={16} className="mr-2" />
                Confirm Return
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

