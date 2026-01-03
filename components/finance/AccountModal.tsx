/**
 * Account Management Modal
 * Add/Edit/Delete financial accounts
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Wallet, Building2, Trash2, Loader2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { FinancialAccount } from '@/lib/types/modern-erp';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/Sheet';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  account?: FinancialAccount | null;
  mode: 'add' | 'edit';
}

export function AccountModal({ isOpen, onClose, onSuccess, account, mode }: AccountModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'cash' as 'cash' | 'bank' | 'wallet' | 'credit_card' | 'loan',
    account_number: '',
    bank_name: '',
    branch_name: '',
    opening_balance: '0',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && account) {
        setFormData({
          name: account.name || '',
          type: account.type,
          account_number: account.account_number || '',
          bank_name: account.bank_name || '',
          branch_name: account.branch_name || '',
          opening_balance: (account.opening_balance || 0).toString(),
          notes: account.notes || '',
        });
      } else {
        setFormData({
          name: '',
          type: 'cash',
          account_number: '',
          bank_name: '',
          branch_name: '',
          opening_balance: '0',
          notes: '',
        });
      }
    }
  }, [isOpen, mode, account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Account name is required');
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

      const openingBalance = parseFloat(formData.opening_balance) || 0;

      if (mode === 'add') {
        // Check if account name already exists
        const { data: existing } = await supabase
          .from('financial_accounts')
          .select('id')
          .eq('business_id', profile.business_id)
          .eq('name', formData.name.trim())
          .single();

        if (existing) {
          toast.error('Account name already exists');
          setLoading(false);
          return;
        }

        // Create new account
        const { data: newAccount, error } = await supabase
          .from('financial_accounts')
          .insert({
            business_id: profile.business_id,
            name: formData.name.trim(),
            type: formData.type,
            account_number: formData.account_number.trim() || null,
            bank_name: formData.bank_name.trim() || null,
            branch_name: formData.branch_name.trim() || null,
            opening_balance: openingBalance,
            current_balance: openingBalance,
            is_active: true,
            notes: formData.notes.trim() || null,
            created_by: session.user.id,
          })
          .select()
          .single();

        if (error) throw error;

        // If opening balance > 0, create opening balance transaction
        if (openingBalance > 0) {
          await supabase.from('account_transactions').insert({
            account_id: newAccount.id,
            business_id: profile.business_id,
            type: 'credit',
            amount: openingBalance,
            reference_type: 'opening_balance',
            reference_id: newAccount.id,
            description: 'Opening balance',
            transaction_date: new Date().toISOString(),
            created_by: session.user.id,
          });
        }

        toast.success('Account created successfully!');
      } else {
        // Update existing account
        if (!account) {
          throw new Error('Account not found');
        }

        const { error } = await supabase
          .from('financial_accounts')
          .update({
            name: formData.name.trim(),
            type: formData.type,
            account_number: formData.account_number.trim() || null,
            bank_name: formData.bank_name.trim() || null,
            branch_name: formData.branch_name.trim() || null,
            notes: formData.notes.trim() || null,
          })
          .eq('id', account.id)
          .eq('business_id', profile.business_id);

        if (error) throw error;

        toast.success('Account updated successfully!');
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Account operation error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save account');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!account) return;

    if (!confirm(`Are you sure you want to delete "${account.name}"? This action cannot be undone.`)) {
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

      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('financial_accounts')
        .update({ is_active: false })
        .eq('id', account.id)
        .eq('business_id', profile.business_id);

      if (error) throw error;

      toast.success('Account deleted successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg bg-gray-900 border-gray-800 overflow-y-auto">
        <SheetHeader className="border-b border-gray-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {formData.type === 'cash' ? (
                <Wallet size={20} className="text-green-400" />
              ) : (
                <Building2 size={20} className="text-blue-400" />
              )}
              <div>
                <SheetTitle className="text-white">
                  {mode === 'add' ? 'Add New Account' : 'Edit Account'}
                </SheetTitle>
                <SheetDescription className="text-gray-400">
                  {mode === 'add' ? 'Create a financial account for tracking' : 'Update account details'}
                </SheetDescription>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Account Title */}
          <div className="space-y-2">
            <Label className="text-gray-400 text-sm font-medium uppercase tracking-wide">ACCOUNT TITLE</Label>
            <Input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Meezan Bank Corporate"
              className="bg-gray-800 border-gray-700 text-white h-11"
              disabled={loading}
            />
          </div>

          {/* Account Type */}
          <div className="space-y-2">
            <Label className="text-gray-400 text-sm font-medium uppercase tracking-wide">ACCOUNT TYPE</Label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              disabled={loading || mode === 'edit'}
              className={cn(
                'w-full h-11 rounded-md border bg-gray-800 border-gray-700 px-4 py-2.5 text-sm text-white',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank Account</option>
              <option value="wallet">Mobile Wallet</option>
              <option value="credit_card">Credit Card</option>
              <option value="loan">Loan</option>
            </select>
          </div>

          {/* Bank Details (only for bank type) */}
          {formData.type === 'bank' && (
            <>
              <div className="space-y-2">
                <Label className="text-gray-400 text-sm">Bank Name</Label>
                <Input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  placeholder="e.g., Meezan Bank"
                  className="bg-gray-800 border-gray-700 text-white"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-400 text-sm">Branch Name</Label>
                <Input
                  type="text"
                  value={formData.branch_name}
                  onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                  placeholder="e.g., Main Branch"
                  className="bg-gray-800 border-gray-700 text-white"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-400 text-sm font-medium uppercase tracking-wide">IBAN / ACCOUNT NUMBER</Label>
                <Input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  placeholder="PK36MEZN. . ."
                  className="bg-gray-800 border-gray-700 text-white h-11"
                  disabled={loading}
                />
              </div>
            </>
          )}

          {/* Opening Balance (only for add mode) */}
          {mode === 'add' && (
            <div className="space-y-2">
              <Label className="text-gray-400 text-sm font-medium uppercase tracking-wide">OPENING BALANCE</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.opening_balance}
                  onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                  placeholder="0.00"
                  className="bg-gray-800 border-gray-700 text-white h-11 pl-8"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Active Status */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-400 text-sm font-bold">Active Status</Label>
                <p className="text-xs text-gray-500 mt-1">Enable or disable transactions for this account.</p>
              </div>
              <div className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                true ? 'bg-green-500' : 'bg-gray-700'
              )}>
                <span className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  true ? 'translate-x-6' : 'translate-x-1'
                )} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-gray-400 text-sm">Notes</Label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
              className="w-full rounded-md border bg-gray-800 border-gray-700 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              disabled={loading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-800">
            {mode === 'edit' && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                disabled={loading}
                className="bg-red-900/20 border-red-800 text-red-400 hover:bg-red-900/30"
              >
                <Trash2 size={16} className="mr-2" />
                Delete
              </Button>
            )}
            <div className={cn('flex gap-3', mode === 'edit' ? 'ml-auto' : 'w-full')}>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    {mode === 'add' ? 'Creating...' : 'Updating...'}
                  </>
                ) : (
                  mode === 'add' ? 'Create Account' : 'Update Account'
                )}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

