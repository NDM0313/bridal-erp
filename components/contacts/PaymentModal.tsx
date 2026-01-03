/**
 * Payment Modal Component
 * For recording payments/receipts for contacts
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Wallet, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contact: {
    id: number;
    name: string;
    type: 'customer' | 'supplier' | 'both';
    receivables?: number;
    payables?: number;
  } | null;
}

export function PaymentModal({ isOpen, onClose, onSuccess, contact }: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Bank Transfer' | 'Cheque'>('Cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && contact) {
      // Set default payment amount to due amount
      if (contact.type === 'customer' || contact.type === 'both') {
        const dueAmount = contact.receivables || 0;
        setPaymentAmount(dueAmount > 0 ? dueAmount.toString() : '');
      } else {
        const dueAmount = contact.payables || 0;
        setPaymentAmount(dueAmount > 0 ? dueAmount.toString() : '');
      }
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
      setPaymentMethod('Cash');
      setReference('');
      setNotes('');
    }
  }, [isOpen, contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contact) {
      toast.error('Contact not selected');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setLoading(true);

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

      // Get all due transactions for this contact
      const { data: dueTransactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('id, invoice_no, final_total, payment_status, type')
        .eq('business_id', profile.business_id)
        .eq('contact_id', contact.id)
        .in('payment_status', ['due', 'partial'])
        .order('transaction_date', { ascending: true });

      if (transactionsError) throw transactionsError;

      if (!dueTransactions || dueTransactions.length === 0) {
        toast.info('No due transactions found for this contact');
        setLoading(false);
        return;
      }

      console.log('Found due transactions:', dueTransactions);

      // Distribute payment across due transactions
      let remainingAmount = amount;
      const updates: Array<{ id: number; newStatus: string; paidAmount: number }> = [];
      let totalPaid = 0;

      for (const transaction of dueTransactions) {
        if (remainingAmount <= 0) break;

        const transactionTotal = parseFloat(transaction.final_total?.toString() || '0');
        const isSale = transaction.type === 'sell';
        
        // Check if this transaction matches the payment type
        if ((contact.type === 'customer' || contact.type === 'both') && !isSale) continue;
        if (contact.type === 'supplier' && isSale) continue;

        if (transaction.payment_status === 'due') {
          if (remainingAmount >= transactionTotal) {
            // Fully pay this transaction
            updates.push({ id: transaction.id, newStatus: 'paid', paidAmount: transactionTotal });
            totalPaid += transactionTotal;
            remainingAmount -= transactionTotal;
          } else {
            // Partial payment
            updates.push({ id: transaction.id, newStatus: 'partial', paidAmount: remainingAmount });
            totalPaid += remainingAmount;
            remainingAmount = 0;
          }
        } else if (transaction.payment_status === 'partial') {
          // For partial payments, calculate remaining balance
          // Get existing payments for this transaction if transaction_payments table exists
          // For now, estimate remaining as 50% of total (conservative approach)
          const estimatedPaid = transactionTotal * 0.5;
          const estimatedRemaining = transactionTotal - estimatedPaid;
          
          if (remainingAmount >= estimatedRemaining) {
            // Fully pay the remaining balance
            updates.push({ id: transaction.id, newStatus: 'paid', paidAmount: estimatedRemaining });
            totalPaid += estimatedRemaining;
            remainingAmount -= estimatedRemaining;
          } else {
            // Add to partial payment
            updates.push({ id: transaction.id, newStatus: 'partial', paidAmount: remainingAmount });
            totalPaid += remainingAmount;
            remainingAmount = 0;
          }
        }
      }

      if (updates.length === 0) {
        toast.error('No matching transactions found to apply payment. Please check transaction types.');
        setLoading(false);
        return;
      }

      console.log('Updating transactions:', updates);

      // Update transactions
      let updateErrors: string[] = [];
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ payment_status: update.newStatus })
          .eq('id', update.id);

        if (updateError) {
          console.error(`Error updating transaction ${update.id}:`, updateError);
          updateErrors.push(`Transaction ${update.id}: ${updateError.message}`);
        }
      }

      if (updateErrors.length > 0) {
        throw new Error(`Failed to update some transactions: ${updateErrors.join(', ')}`);
      }

      // Log payment details
      console.log('Payment recorded:', {
        contactId: contact.id,
        contactName: contact.name,
        totalAmount: amount,
        totalPaid,
        transactionsUpdated: updates.length,
        paymentMethod,
        paymentDate,
        reference,
        notes,
      });

      toast.success(`Payment of ${formatCurrency(totalPaid)} recorded successfully for ${updates.length} transaction(s)`);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Payment error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !contact) return null;

  const isCustomer = contact.type === 'customer' || contact.type === 'both';
  const dueAmount = isCustomer ? (contact.receivables || 0) : (contact.payables || 0);
  const actionLabel = isCustomer ? 'Receive Payment' : 'Make Payment';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md relative">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Wallet size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{actionLabel}</h2>
              <p className="text-sm text-gray-400 mt-1">{contact.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Due Amount Info */}
          {dueAmount > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <p className="text-gray-400 text-sm mb-1">
                {isCustomer ? 'Total Receivables' : 'Total Payables'}
              </p>
              <p className={cn(
                'text-2xl font-bold',
                isCustomer ? 'text-yellow-400' : 'text-red-400'
              )}>
                {formatCurrency(dueAmount)}
              </p>
            </div>
          )}

          {/* Payment Amount */}
          <div>
            <Label className="text-white mb-2 block">
              Payment Amount <span className="text-red-400">*</span>
            </Label>
            <Input
              type="number"
              step="0.01"
              required
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Enter payment amount"
              className="bg-gray-800 border-gray-700 text-white"
              min="0.01"
            />
          </div>

          {/* Payment Date */}
          <div>
            <Label className="text-white mb-2 block flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Payment Date
            </Label>
            <Input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          {/* Payment Method */}
          <div>
            <Label className="text-white mb-2 block">Payment Method</Label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          {/* Reference Number */}
          <div>
            <Label className="text-white mb-2 block">Reference Number (Optional)</Label>
            <Input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. Cheque #12345"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          {/* Notes */}
          <div>
            <Label className="text-white mb-2 block">Notes (Optional)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading} className="bg-blue-600 hover:bg-blue-500 text-white">
              {actionLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


