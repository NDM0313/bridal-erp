'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Wallet, Building2, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Skeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyState } from '@/components/placeholders/EmptyState';
import { FinancialAccount, AccountTransaction } from '@/lib/types/modern-erp';
import apiClient, { getErrorMessage, ApiResponse } from '@/lib/api/apiClient';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DollarSign } from 'lucide-react';
import { TransactionModal, TransactionType } from '@/components/finance/TransactionModal';

export default function FinancePage() {
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'none' | TransactionType>('none');

  // Fetch financial accounts
  const fetchAccounts = async () => {
    try {
      const response = await apiClient.get<ApiResponse<FinancialAccount[]>>('/accounting/accounts');

      if (response.data?.success && response.data.data) {
        setAccounts(response.data.data);
      } else {
        throw new Error(response.data?.error?.message || 'Failed to load accounts');
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
      const errorMessage = getErrorMessage(err);
      toast.error(`Failed to load accounts: ${errorMessage}`);
    }
  };

  // Fetch recent transactions
  const fetchTransactions = async () => {
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

      // Fetch last 10 transactions with account info
      const { data, error: fetchError } = await supabase
        .from('account_transactions')
        .select(`
          *,
          account:financial_accounts(id, name, type)
        `)
        .eq('business_id', profile.business_id)
        .order('transaction_date', { ascending: false })
        .limit(10);

      if (fetchError) throw fetchError;

      if (data) {
        // Normalize Supabase relations (arrays to single objects)
        const normalizedTransactions: AccountTransaction[] = data.map((tx: any) => ({
          ...tx,
          account: Array.isArray(tx.account) ? tx.account[0] : tx.account,
        }));
        setTransactions(normalizedTransactions);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
      toast.error('Failed to load transactions');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchAccounts(), fetchTransactions()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load finance data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Refresh data after successful transaction
  const handleTransactionSuccess = async () => {
    await Promise.all([fetchAccounts(), fetchTransactions()]);
  };

  // Get account icon based on type
  const getAccountIcon = (type: FinancialAccount['type']) => {
    switch (type) {
      case 'cash':
        return <Wallet size={24} className="text-green-400" />;
      case 'bank':
        return <Building2 size={24} className="text-blue-400" />;
      case 'wallet':
        return <Wallet size={24} className="text-purple-400" />;
      case 'credit_card':
        return <Wallet size={24} className="text-yellow-400" />;
      case 'loan':
        return <TrendingDown size={24} className="text-red-400" />;
      default:
        return <DollarSign size={24} className="text-gray-400" />;
    }
  };

  // Get account type label
  const getAccountTypeLabel = (type: FinancialAccount['type']) => {
    const labels = {
      cash: 'Cash',
      bank: 'Bank',
      wallet: 'Wallet',
      credit_card: 'Credit Card',
      loan: 'Loan',
    };
    return labels[type] || type;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('PKR', 'Rs.');
  };

  // Calculate total balance
  const totalBalance = accounts.reduce((sum, account) => sum + (account.current_balance || 0), 0);

  return (
    <ModernDashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Finance & Accounting</h1>
            <p className="text-sm text-gray-400 mt-1">Track cash flow, balances, and transactions</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              onClick={() => setActiveModal('income')}
            >
              <TrendingUp size={16} className="mr-2" />
              Add Income
            </Button>
            <Button
              variant="outline"
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              onClick={() => setActiveModal('expense')}
            >
              <TrendingDown size={16} className="mr-2" />
              Record Expense
            </Button>
            <Button
              variant="primary"
              className="flex items-center gap-2"
              onClick={() => setActiveModal('transfer')}
            >
              <ArrowUpRight size={16} />
              Transfer
            </Button>
          </div>
        </div>

        {/* Total Balance Card */}
        <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-2xl p-6 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-2">Total Balance</p>
              <p className="text-4xl font-bold text-white">{formatCurrency(totalBalance)}</p>
              <p className="text-xs text-gray-500 mt-2">Across all accounts</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-500/20 text-blue-400">
              <DollarSign size={32} />
            </div>
          </div>
        </div>

        {/* Account Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl p-12">
            <div className="text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl p-12">
            <EmptyState
              icon={Wallet}
              title="No accounts found"
              description="Get started by creating your first financial account (Cash, Bank, etc.)"
              action={{
                label: 'Create Account',
                onClick: () => {
                  // TODO: Open create account modal
                  toast.info('Create account functionality coming soon');
                },
              }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl p-6 hover:border-blue-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">{getAccountTypeLabel(account.type)}</p>
                    <h3 className="text-lg font-bold text-white">{account.name}</h3>
                    {account.account_number && (
                      <p className="text-xs text-gray-500 mt-1 font-mono">{account.account_number}</p>
                    )}
                  </div>
                  <div className="p-3 rounded-lg bg-gray-800/50">
                    {getAccountIcon(account.type)}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-800">
                  <p className="text-xs text-gray-400 mb-1">Current Balance</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(account.current_balance || 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent Transactions */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-gray-800">
            <h2 className="text-lg font-bold text-white">Recent Transactions</h2>
            <p className="text-sm text-gray-400 mt-1">Last 10 transactions across all accounts</p>
          </div>

          {loading ? (
            <div className="p-6">
              <Skeleton className="h-64" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12">
              <EmptyState
                icon={DollarSign}
                title="No transactions found"
                description="Transactions will appear here as you record income and expenses"
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-900/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => {
                  const isCredit = transaction.type === 'credit';
                  const account = transaction.account as any;

                  return (
                    <TableRow key={transaction.id}>
                      {/* Date */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300 text-sm">
                            {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
                          </span>
                          <span className="text-gray-600 text-xs">
                            {format(new Date(transaction.transaction_date), 'HH:mm')}
                          </span>
                        </div>
                      </TableCell>

                      {/* Description */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isCredit ? (
                            <ArrowDownRight size={14} className="text-green-400" />
                          ) : (
                            <ArrowUpRight size={14} className="text-red-400" />
                          )}
                          <span className="text-white text-sm">
                            {transaction.description || 'No description'}
                          </span>
                          {transaction.reference_type && (
                            <Badge variant="outline" className="bg-gray-800 text-gray-400 border-gray-700 text-xs">
                              {transaction.reference_type}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Account */}
                      <TableCell>
                        <span className="text-gray-300 text-sm">
                          {account?.name || 'Unknown Account'}
                        </span>
                      </TableCell>

                      {/* Amount */}
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            'font-semibold text-sm',
                            isCredit ? 'text-green-400' : 'text-red-400'
                          )}
                        >
                          {isCredit ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Transaction Modals */}
        {activeModal !== 'none' && (
          <TransactionModal
            isOpen={true}
            onClose={() => setActiveModal('none')}
            type={activeModal as TransactionType}
            onSuccess={handleTransactionSuccess}
          />
        )}
      </div>
    </ModernDashboardLayout>
  );
}

