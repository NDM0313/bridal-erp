'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, TrendingUp, TrendingDown, ArrowLeftRight, Wallet, Building2, Minimize2, Clock, Calendar, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { FinancialAccount } from '@/lib/types/modern-erp';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/Sheet';

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
  const [time, setTime] = useState<string>(format(new Date(), 'HH:mm'));
  const [fromAccountId, setFromAccountId] = useState<number | null>(null);
  const [toAccountId, setToAccountId] = useState<number | null>(null);
  const [description, setDescription] = useState<string>('');
  const [proofFile, setProofFile] = useState<File | null>(null);

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
      setTime(format(new Date(), 'HH:mm'));
      setFromAccountId(null);
      setToAccountId(null);
      setDescription('');
      setProofFile(null);
      setErrors({});
      
      // Auto-select default accounts after accounts are loaded
      const autoSelectDefaults = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          const { data: profile } = await supabase
            .from('user_profiles')
            .select('business_id')
            .eq('user_id', session.user.id)
            .single();

          if (!profile) return;

          // Get default accounts
          const { getOrCreateDefaultAccounts } = await import('@/lib/services/accountingService');
          const { cashAccount, bankAccount } = await getOrCreateDefaultAccounts(
            profile.business_id,
            session.user.id
          );

          // Auto-select based on transaction type
          if (type === 'income') {
            // Income defaults to Cash in Hand
            setToAccountId(cashAccount.id);
          } else if (type === 'expense') {
            // Expense defaults to Cash in Hand
            setFromAccountId(cashAccount.id);
          } else if (type === 'transfer') {
            // Transfer: from Cash to Bank (default)
            setFromAccountId(cashAccount.id);
            setToAccountId(bankAccount.id);
          }
        } catch (err) {
          console.error('Failed to auto-select default accounts:', err);
        }
      };

      // Wait a bit for accounts to load, then auto-select
      setTimeout(autoSelectDefaults, 500);
    }
  }, [isOpen, type]);

  const fetchAccounts = async () => {
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

      const { data, error: fetchError } = await supabase
        .from('financial_accounts')
        .select('*')
        .eq('business_id', profile.business_id)
        .eq('is_active', true)
        .order('name');

      if (fetchError) throw fetchError;

      if (data) {
        setAccounts(data as FinancialAccount[]);
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
      const transactionDate = new Date(`${date}T${time}`).toISOString();

      if (type === 'transfer') {
        // Create transfer: debit from source, credit to destination
        const fromAccount = accounts.find((acc) => acc.id === fromAccountId);
        const toAccount = accounts.find((acc) => acc.id === toAccountId);

        // Check source account balance
        if (fromAccount && fromAccount.current_balance < amountNum) {
          toast.error(`Insufficient balance. Available: ${formatCurrency(fromAccount.current_balance)}`);
          setSubmitting(false);
          return;
        }

        // Create debit transaction (from account)
        const { data: debitTx, error: debitError } = await supabase
          .from('account_transactions')
          .insert({
            account_id: fromAccountId!,
            business_id: profile.business_id,
            type: 'debit',
            amount: amountNum,
            reference_type: 'transfer',
            description: `Transfer to ${toAccount?.name || 'account'}: ${description.trim() || 'Fund transfer'}`,
            transaction_date: transactionDate,
            created_by: session.user.id,
          })
          .select()
          .single();

        if (debitError) throw debitError;

        // Create credit transaction (to account)
        const { error: creditError } = await supabase
          .from('account_transactions')
          .insert({
            account_id: toAccountId!,
            business_id: profile.business_id,
            type: 'credit',
            amount: amountNum,
            reference_type: 'transfer',
            reference_id: debitTx.id,
            description: `Transfer from ${fromAccount?.name || 'account'}: ${description.trim() || 'Fund transfer'}`,
            transaction_date: transactionDate,
            created_by: session.user.id,
          });

        if (creditError) throw creditError;

        // Account balances are automatically updated by database trigger
        toast.success('Fund transfer completed successfully!');
        onSuccess?.();
        onClose();
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to create transaction';
      toast.error(`Failed to create transaction: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

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

  const fromAccount = accounts.find(acc => acc.id === fromAccountId);
  const toAccount = accounts.find(acc => acc.id === toAccountId);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('PKR', 'Rs.');
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg bg-gray-900 border-gray-800 overflow-y-auto">
        <SheetHeader className="border-b border-gray-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getIcon()}
              <div>
                <SheetTitle className="text-white text-xl">{getTitle()}</SheetTitle>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white p-2">
                <Minimize2 size={16} />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white p-2">
                <X size={18} />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="p-6 space-y-6">
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

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-400 text-sm">Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white pl-10 h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400 text-sm">Time</Label>
              <div className="relative">
                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white pr-10 h-11"
                />
              </div>
            </div>
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
                  <Label className="text-gray-400 text-sm font-medium">
                    {type === 'transfer' ? 'FROM ACCOUNT' : 'ACCOUNT'}
                  </Label>
                  <select
                    value={fromAccountId || ''}
                    onChange={(e) => setFromAccountId(e.target.value ? parseInt(e.target.value) : null)}
                    disabled={submitting}
                    className={cn(
                      'w-full h-11 rounded-md border bg-gray-800 border-gray-700 px-3 py-2.5 text-sm text-white',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      errors.fromAccount && 'border-red-500'
                    )}
                  >
                    <option value="">Select account...</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                  {fromAccount && (
                    <p className="text-xs text-green-400">
                      Available: {formatCurrency(fromAccount.current_balance || 0)}
                    </p>
                  )}
                  {errors.fromAccount && (
                    <p className="text-xs text-red-400">{errors.fromAccount}</p>
                  )}
                </div>
              )}

              {/* Transfer Arrow */}
              {type === 'transfer' && fromAccountId && toAccountId && (
                <div className="flex justify-center">
                  <div className="p-2 rounded-full bg-blue-600/20 border border-blue-600/50">
                    <ArrowLeftRight size={20} className="text-blue-400" />
                  </div>
                </div>
              )}

              {/* To Account (Income & Transfer) */}
              {(type === 'income' || type === 'transfer') && (
                <div className="space-y-2">
                  <Label className="text-gray-400 text-sm font-medium">
                    {type === 'transfer' ? 'TO ACCOUNT' : 'ACCOUNT'}
                  </Label>
                  <select
                    value={toAccountId || ''}
                    onChange={(e) => setToAccountId(e.target.value ? parseInt(e.target.value) : null)}
                    disabled={submitting}
                    className={cn(
                      'w-full h-11 rounded-md border bg-gray-800 border-gray-700 px-3 py-2.5 text-sm text-white',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      errors.toAccount && 'border-red-500'
                    )}
                  >
                    <option value="">Select account...</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                  {toAccount && (
                    <p className="text-xs text-gray-400">
                      Current Balance: {formatCurrency(toAccount.current_balance || 0)}
                    </p>
                  )}
                  {errors.toAccount && <p className="text-xs text-red-400">{errors.toAccount}</p>}
                </div>
              )}
            </>
          )}

          {/* Amount to Transfer */}
          {type === 'transfer' && (
            <div className="space-y-2">
              <Label className="text-gray-400 text-sm font-medium">Amount to Transfer</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="5,000"
                  className={cn(
                    'bg-gray-800 border-gray-700 text-white text-lg font-semibold pl-8 h-11',
                    errors.amount && 'border-red-500'
                  )}
                  autoFocus
                />
              </div>
              {errors.amount && <p className="text-xs text-red-400">{errors.amount}</p>}
            </div>
          )}

          {/* Amount (for income/expense) */}
          {type !== 'transfer' && (
            <div className="space-y-2">
              <Label className="text-gray-400 text-sm font-medium">Amount *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={cn(
                  'bg-gray-800 border-gray-700 text-white text-lg font-semibold h-11',
                  errors.amount && 'border-red-500'
                )}
                autoFocus
              />
              {errors.amount && <p className="text-xs text-red-400">{errors.amount}</p>}
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-gray-400 text-sm font-medium">Description / Note</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Monthly utility bill payment"
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

          {/* Proof / Attachment (for transfer) */}
          {type === 'transfer' && (
            <div className="space-y-2">
              <Label className="text-gray-400 text-sm font-medium">Proof / Attachment</Label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer bg-gray-800/50 hover:bg-gray-800 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Paperclip className="w-8 h-8 mb-2 text-gray-400" />
                  <p className="text-sm text-gray-400">Upload Receipt/Screenshot</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setProofFile(file);
                  }}
                  accept="image/*,.pdf"
                />
              </label>
              {proofFile && (
                <p className="text-xs text-green-400">{proofFile.name}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <SheetFooter className="border-t border-gray-800 pt-4">
          <div className="flex gap-3 w-full">
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
              className="flex-1 bg-blue-600 hover:bg-blue-700"
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
                    {type === 'income' ? 'Add Income' : type === 'expense' ? 'Record Expense' : 'Transfer Now'}
                  </span>
                </>
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

