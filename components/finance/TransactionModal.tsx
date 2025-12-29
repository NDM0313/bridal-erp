'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, TrendingUp, TrendingDown, ArrowLeftRight, Wallet, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { FinancialAccount } from '@/lib/types/modern-erp';
import apiClient, { getErrorMessage, ApiResponse } from '@/lib/api/apiClient';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export type TransactionType = 'income' | 'expense' | 'transfer';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: TransactionType;
  onSuccess?: () => void;
}

export const TransactionModal = ({ isOpen, onClose, type, onSuccess }: TransactionModalProps) => {
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [fromAccountId, setFromAccountId] = useState<number | null>(null);
  const [toAccountId, setToAccountId] = useState<number | null>(null);
  const [description, setDescription] = useState<string>('');

  // Validation errors
  const [errors, setErrors] = useState<{
    amount?: string;
    fromAccount?: string;
    toAccount?: string;
    description?: string;
  }>({});

  // Fetch accounts when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
      // Reset form
      setAmount('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setFromAccountId(null);
      setToAccountId(null);
      setDescription('');
      setErrors({});
    }
  }, [isOpen]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<ApiResponse<FinancialAccount[]>>('/accounting/accounts');
      if (response.data?.success && response.data.data) {
        setAccounts(response.data.data.filter((acc) => acc.is_active));
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    // Amount validation
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = 'Please enter a valid positive amount';
    }

    // Account validation based on type
    if (type === 'income') {
      if (!toAccountId) {
        newErrors.toAccount = 'Please select a destination account';
      }
    } else if (type === 'expense') {
      if (!fromAccountId) {
        newErrors.fromAccount = 'Please select a source account';
      }
    } else if (type === 'transfer') {
      if (!fromAccountId) {
        newErrors.fromAccount = 'Please select a source account';
      }
      if (!toAccountId) {
        newErrors.toAccount = 'Please select a destination account';
      }
      if (fromAccountId === toAccountId) {
        newErrors.toAccount = 'Source and destination accounts must be different';
      }
    }

    // Description validation
    if (!description.trim()) {
      newErrors.description = 'Please enter a description';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setSubmitting(true);
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

      const amountNum = parseFloat(amount);
      const transactionDate = new Date(date).toISOString();

      if (type === 'transfer') {
        // Use existing transfer endpoint
        const response = await apiClient.post<ApiResponse>('/accounting/transfers', {
          fromAccountId: fromAccountId!,
          toAccountId: toAccountId!,
          amount: amountNum,
          transferDate: transactionDate,
          notes: description.trim(),
        });

        if (response.data?.success) {
          toast.success('Fund transfer completed successfully!');
          onSuccess?.();
          onClose();
        } else {
          throw new Error(response.data?.error?.message || 'Failed to create transfer');
        }
      } else {
        // Create income or expense transaction directly in Supabase
        // Income = credit, Expense = debit
        const transactionType = type === 'income' ? 'credit' : 'debit';
        const accountId = type === 'income' ? toAccountId! : fromAccountId!;

        // Check account balance for expenses
        if (type === 'expense') {
          const account = accounts.find((acc) => acc.id === accountId);
          if (account && account.current_balance < amountNum) {
            toast.error(`Insufficient balance. Available: Rs. ${account.current_balance.toLocaleString()}`);
            setSubmitting(false);
            return;
          }
        }

        // Insert transaction
        const { data: transaction, error: txError } = await supabase
          .from('account_transactions')
          .insert({
            account_id: accountId,
            business_id: profile.business_id,
            type: transactionType,
            amount: amountNum,
            reference_type: 'expense', // Using 'expense' for manual income/expense entries
            description: description.trim(),
            transaction_date: transactionDate,
            created_by: session.user.id,
          })
          .select()
          .single();

        if (txError) throw txError;

        // Account balance is automatically updated by database trigger (update_account_balance)
        // No need to manually update it here

        toast.success(
          type === 'income' ? 'Income recorded successfully!' : 'Expense recorded successfully!'
        );
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error('Failed to create transaction:', error);
      const errorMessage = getErrorMessage(error);
      toast.error(`Failed to create transaction: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const getTitle = () => {
    switch (type) {
      case 'income':
        return 'Add Income';
      case 'expense':
        return 'Record Expense';
      case 'transfer':
        return 'Transfer Funds';
      default:
        return 'Transaction';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'income':
        return <TrendingUp size={20} className="text-green-400" />;
      case 'expense':
        return <TrendingDown size={20} className="text-red-400" />;
      case 'transfer':
        return <ArrowLeftRight size={20} className="text-blue-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 bg-gray-950 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {getIcon()}
            <h3 className="text-lg font-bold text-white">{getTitle()}</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label className="text-gray-400 text-sm">Amount *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={cn(
                'bg-gray-800 border-gray-700 text-white text-lg font-semibold',
                errors.amount && 'border-red-500'
              )}
              autoFocus
            />
            {errors.amount && <p className="text-xs text-red-400">{errors.amount}</p>}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="text-gray-400 text-sm">Date *</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          {/* Accounts */}
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={20} className="animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-400">Loading accounts...</span>
            </div>
          ) : (
            <>
              {/* From Account (Expense & Transfer) */}
              {(type === 'expense' || type === 'transfer') && (
                <div className="space-y-2">
                  <Label className="text-gray-400 text-sm">
                    {type === 'transfer' ? 'From Account *' : 'Account *'}
                  </Label>
                  <select
                    value={fromAccountId || ''}
                    onChange={(e) => setFromAccountId(e.target.value ? parseInt(e.target.value) : null)}
                    disabled={submitting}
                    className={cn(
                      'w-full h-10 rounded-md border bg-gray-800 border-gray-700 px-3 py-2 text-sm text-white',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      errors.fromAccount && 'border-red-500'
                    )}
                  >
                    <option value="">Select account...</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.type}) - Rs.{' '}
                        {account.current_balance.toLocaleString()}
                      </option>
                    ))}
                  </select>
                  {errors.fromAccount && (
                    <p className="text-xs text-red-400">{errors.fromAccount}</p>
                  )}
                </div>
              )}

              {/* To Account (Income & Transfer) */}
              {(type === 'income' || type === 'transfer') && (
                <div className="space-y-2">
                  <Label className="text-gray-400 text-sm">
                    {type === 'transfer' ? 'To Account *' : 'Account *'}
                  </Label>
                  <select
                    value={toAccountId || ''}
                    onChange={(e) => setToAccountId(e.target.value ? parseInt(e.target.value) : null)}
                    disabled={submitting}
                    className={cn(
                      'w-full h-10 rounded-md border bg-gray-800 border-gray-700 px-3 py-2 text-sm text-white',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      errors.toAccount && 'border-red-500'
                    )}
                  >
                    <option value="">Select account...</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.type}) - Rs.{' '}
                        {account.current_balance.toLocaleString()}
                      </option>
                    ))}
                  </select>
                  {errors.toAccount && <p className="text-xs text-red-400">{errors.toAccount}</p>}
                </div>
              )}
            </>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-gray-400 text-sm">Description *</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description..."
              rows={3}
              disabled={submitting}
              className={cn(
                'w-full rounded-md border bg-gray-800 border-gray-700 px-3 py-2 text-sm text-white placeholder:text-gray-600',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                'disabled:cursor-not-allowed disabled:opacity-50 resize-none',
                errors.description && 'border-red-500'
              )}
            />
            {errors.description && <p className="text-xs text-red-400">{errors.description}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-800 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting || loading}
            className="flex-1"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                {getIcon()}
                <span className="ml-2">
                  {type === 'income' ? 'Add Income' : type === 'expense' ? 'Record Expense' : 'Transfer'}
                </span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

