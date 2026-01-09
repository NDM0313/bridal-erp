'use client';

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Wallet, Building2, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Loader2, MoreVertical, Landmark, CreditCard, Printer, FileText, Share2, X, ExternalLink, Paperclip, Search, Filter, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyState } from '@/components/placeholders/EmptyState';
import { FinancialAccount, AccountTransaction } from '@/lib/types/modern-erp';
import { SortableTableHeader, SortDirection } from '@/components/ui/SortableTableHeader';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';

// Dynamic imports for heavy modals - only load when needed
const TransactionModal = dynamic(
  () => import('@/components/finance/TransactionModal').then(mod => mod.TransactionModal),
  { ssr: false, loading: () => null }
);

const AccountModal = dynamic(
  () => import('@/components/finance/AccountModal').then(mod => ({ default: mod.AccountModal })),
  { ssr: false, loading: () => null }
);

// Import TransactionType separately (it's a type, not a component)
import type { TransactionType } from '@/components/finance/TransactionModal';

// Memoized transaction row component - Updated for new table structure
const TransactionRow = memo(({ transaction, onReferenceClick }: {
  transaction: AccountTransaction;
  onReferenceClick: (type: string, id: number) => void;
}) => {
  const isCredit = transaction.type === 'credit';
  const account = transaction.account as any;
  
  // Format date: "26 Dec, 11:00 AM"
  const formatTransactionDate = (date: Date) => {
    return format(date, 'd MMM, h:mm a');
  };

  // Get category from description or reference type
  const getCategory = () => {
    if (transaction.reference_type) {
      const categories: Record<string, string> = {
        'sell': 'Sales',
        'purchase': 'Purchase',
        'expense': 'Expense',
        'income': 'Income',
        'transfer': 'Transfer',
      };
      return categories[transaction.reference_type] || transaction.reference_type;
    }
    return transaction.description?.split(' - ')[0] || 'Other';
  };

  // Get payment method from account type or default
  const getPaymentMethod = () => {
    if (account?.type) {
      const methods: Record<string, string> = {
        'cash': 'Cash',
        'bank': 'Bank Transfer',
        'wallet': 'Mobile Wallet',
        'credit_card': 'Credit Card',
      };
      return methods[account.type] || account.type;
    }
    return 'Cash';
  };

  // Get status (always completed for account transactions, but can be pending for references)
  const getStatus = () => {
    // For account transactions, they're typically completed
    return 'Completed';
  };

  const status = getStatus();

  return (
    <TableRow className="hover:bg-slate-800/30 transition-colors">
      <TableCell className="px-4 py-3">
        <span className="text-slate-300 text-sm font-mono">#{transaction.id}</span>
      </TableCell>
      <TableCell className="px-4 py-3">
        <span className="text-slate-300 text-sm">
          {formatTransactionDate(new Date(transaction.transaction_date))}
        </span>
      </TableCell>
      <TableCell className="px-4 py-3">
        <span className="text-white text-sm">{getCategory()}</span>
      </TableCell>
      <TableCell className="px-4 py-3">
        <span className="text-slate-300 text-sm">{getPaymentMethod()}</span>
      </TableCell>
      <TableCell className="px-4 py-3 text-center">
        <Badge
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            status === 'Completed'
              ? "bg-green-500/20 text-green-400 border-green-500/30"
              : status === 'Pending'
              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
              : "bg-slate-500/20 text-slate-400 border-slate-500/30"
          )}
        >
          {status}
        </Badge>
      </TableCell>
      <TableCell className="px-4 py-3 text-right">
        <span
          className={cn(
            'font-semibold text-sm',
            isCredit ? 'text-green-400' : 'text-red-400'
          )}
        >
          {isCredit ? '+' : '-'}
          {new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(transaction.amount).replace('PKR', '$')}
        </span>
      </TableCell>
    </TableRow>
  );
});
TransactionRow.displayName = 'TransactionRow';

export default function FinancePage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'none' | TransactionType>('none');
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<FinancialAccount | null>(null);
  const [accountModalMode, setAccountModalMode] = useState<'add' | 'edit'>('add');
  const [activeTab, setActiveTab] = useState<'transactions' | 'accounts'>('transactions');
  const [showInactiveAccounts, setShowInactiveAccounts] = useState(false);
  const [selectedReference, setSelectedReference] = useState<{ type: string; id: number } | null>(null);
  const [referenceDetails, setReferenceDetails] = useState<any>(null);
  const [loadingReference, setLoadingReference] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection }>({ key: '', direction: null });

  // Fetch financial accounts
  const fetchAccounts = async () => {
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

      let query = supabase
        .from('financial_accounts')
        .select('*')
        .eq('business_id', profile.business_id);

      // Only filter by is_active if not showing inactive accounts
      if (!showInactiveAccounts) {
        query = query.eq('is_active', true);
      }

      const { data, error: fetchError } = await query.order('name');

      if (fetchError) throw fetchError;

      if (data) {
        setAccounts(data as FinancialAccount[]);
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load accounts';
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
  }, [showInactiveAccounts]);

  // Refresh data after successful transaction
  const handleTransactionSuccess = async () => {
    await Promise.all([fetchAccounts(), fetchTransactions()]);
  };

  // Refresh data after account operation
  const handleAccountSuccess = async () => {
    await fetchAccounts();
  };

  // Load reference details
  const loadReferenceDetails = async (referenceType: string, referenceId: number) => {
    setLoadingReference(true);
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

      if (referenceType === 'purchase') {
        // Load purchase transaction
        const { data, error } = await supabase
          .from('transactions')
          .select(`
            *,
            contact:contacts(id, name, supplier_business_name, mobile, email),
            location:business_locations(id, name)
          `)
          .eq('id', referenceId)
          .eq('business_id', profile.business_id)
          .eq('type', 'purchase')
          .single();

        if (error) {
          console.error('Supabase error:', error);
          throw new Error(error.message || 'Failed to load reference details');
        }
        setReferenceDetails(data);
      } else if (referenceType === 'sell') {
        // Load sale transaction
        const { data, error } = await supabase
          .from('transactions')
          .select(`
            *,
            contact:contacts(id, name, mobile, email),
            location:business_locations(id, name)
          `)
          .eq('id', referenceId)
          .eq('business_id', profile.business_id)
          .eq('type', 'sell')
          .single();

        if (error) {
          console.error('Supabase error:', error);
          throw new Error(error.message || 'Failed to load reference details');
        }
        setReferenceDetails(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load reference details';
      console.error('Failed to load reference details:', errorMessage, err);
      toast.error(errorMessage);
    } finally {
      setLoadingReference(false);
    }
  };

  // Handle reference click - memoized for performance
  const handleReferenceClick = useCallback(async (referenceType: string, referenceId: number) => {
    setSelectedReference({ type: referenceType, id: referenceId });
    await loadReferenceDetails(referenceType, referenceId);
  }, []);

  // Toggle account status
  const handleToggleAccountStatus = async (account: FinancialAccount) => {
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

      const { error } = await supabase
        .from('financial_accounts')
        .update({ is_active: !account.is_active })
        .eq('id', account.id)
        .eq('business_id', profile.business_id);

      if (error) throw error;

      toast.success(`Account ${account.is_active ? 'deactivated' : 'activated'} successfully`);
      await fetchAccounts();
    } catch (err) {
      console.error('Failed to toggle account status:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update account status');
    }
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

  // Calculate statistics from transactions
  const stats = useMemo(() => {
    const totalBalance = accounts.reduce((sum, account) => sum + (account.current_balance || 0), 0);
    
    // Calculate income (credit transactions)
    const income = transactions
      .filter(tx => tx.type === 'credit')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    // Calculate expenses (debit transactions)
    const expenses = transactions
      .filter(tx => tx.type === 'debit')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    // Calculate net profit (income - expenses)
    const netProfit = income - expenses;
    
    return {
      totalBalance,
      income,
      expenses,
      netProfit,
    };
  }, [accounts, transactions]);

  // Handle sorting
  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        if (prev.direction === null) return { key, direction: 'asc' };
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        return { key: '', direction: null };
      }
      return { key, direction: 'asc' };
    });
  };

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return transactions;
    
    return [...transactions].sort((a, b) => {
      let aVal: any = a[sortConfig.key as keyof AccountTransaction];
      let bVal: any = b[sortConfig.key as keyof AccountTransaction];

      if (sortConfig.key === 'transaction_date') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (sortConfig.key === 'amount') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [transactions, sortConfig]);

  return (
    <ModernDashboardLayout>
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        {/* Header - Standardized */}
        <div className="flex items-center justify-between mb-8 animate-entrance">
          <div>
            <h1 className="text-2xl font-semibold text-indigo-400 mb-1">Accounts</h1>
            <p className="text-sm text-slate-400">Manage treasury, bank accounts, and funds</p>
          </div>
          <div className="flex gap-3">
            {activeTab === 'accounts' && (
              <Button
                variant="outline"
                className="bg-white text-gray-900 border-gray-300 hover:bg-gray-100"
                onClick={() => {
                  setAccountModalMode('add');
                  setSelectedAccount(null);
                  setAccountModalOpen(true);
                }}
              >
                <Plus size={16} className="mr-2" />
                Add Account
              </Button>
            )}
            {activeTab === 'transactions' && (
              <>
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
              </>
            )}
            <Button
              variant="primary"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              onClick={() => setActiveModal('transfer')}
            >
              <ArrowUpRight size={16} />
              Fund Transfer
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-800">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('transactions')}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'transactions'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              )}
            >
              Transactions
            </button>
            <button
              onClick={() => setActiveTab('accounts')}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'accounts'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              )}
            >
              Accounts List
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'transactions' ? (
          <>
            {/* Accounts Overview - 4 Vibrant Gradient Cards */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-indigo-400 mb-6">Accounts Overview</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Balance - Indigo to Blue Gradient */}
                <div className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-600 rounded-2xl p-6 transition-standard hover-lift animate-entrance shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-medium text-white/90">Total Balance</p>
                      <Wallet size={24} className="text-white/80" />
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{formatCurrency(stats.totalBalance)}</p>
                    <p className="text-xs text-white/70">Across all accounts</p>
                  </div>
                </div>

                {/* Income (Cash In) - Green to Emerald Gradient */}
                <div className="bg-gradient-to-br from-green-600 via-emerald-500 to-teal-600 rounded-2xl p-6 transition-standard hover-lift animate-entrance-delay-1 shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-medium text-white/90">Income</p>
                      <TrendingUp size={24} className="text-white/80" />
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{formatCurrency(stats.income)}</p>
                    <p className="text-xs text-white/70">Cash in flow</p>
                  </div>
                </div>

                {/* Expenses (Cash Out) - Orange to Red Gradient */}
                <div className="bg-gradient-to-br from-orange-600 via-red-500 to-rose-600 rounded-2xl p-6 transition-standard hover-lift animate-entrance-delay-2 shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-medium text-white/90">Expenses</p>
                      <TrendingDown size={24} className="text-white/80" />
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{formatCurrency(stats.expenses)}</p>
                    <p className="text-xs text-white/70">Cash out flow</p>
                  </div>
                </div>

                {/* Net Profit - Purple to Pink Gradient */}
                <div className="bg-gradient-to-br from-purple-600 via-pink-500 to-rose-500 rounded-2xl p-6 transition-standard hover-lift animate-entrance-delay-3 shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-medium text-white/90">Net Profit</p>
                      <DollarSign size={24} className="text-white/80" />
                    </div>
                    <p className={cn(
                      "text-3xl font-bold mb-1",
                      stats.netProfit >= 0 ? "text-white" : "text-red-200"
                    )}>
                      {formatCurrency(stats.netProfit)}
                    </p>
                    <p className="text-xs text-white/70">Income - Expenses</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Cards Grid */}
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
                      setAccountModalMode('add');
                      setSelectedAccount(null);
                      setAccountModalOpen(true);
                    },
                  }}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts.map((account, index) => (
                  <div
                    key={account.id}
                    className={cn(
                      "bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl p-6 hover:border-blue-500/50 transition-standard hover-lift cursor-pointer group",
                      index === 0 ? "animate-entrance" : index === 1 ? "animate-entrance-delay-1" : "animate-entrance-delay-2"
                    )}
                    onClick={() => router.push(`/dashboard/finance/accounts/${account.id}/ledger`)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
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

                    <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAccount(account);
                          setAccountModalMode('edit');
                          setAccountModalOpen(true);
                        }}
                        className="flex-1 bg-gray-800 border-gray-700 text-white hover:bg-gray-700 text-xs"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/finance/accounts/${account.id}/ledger`);
                        }}
                        className="flex-1 bg-blue-900/20 border-blue-700 text-blue-400 hover:bg-blue-900/30 text-xs"
                      >
                        Ledger
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Transaction History - Aligned & Standardized */}
            <div className="mt-8">
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-bold text-white">Transaction History</h2>
                      <Badge variant="outline" className="bg-slate-800/50 text-slate-300 border-slate-700 text-xs rounded-full px-3 py-1">
                        Recent 5
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Search Bar - Standardized */}
                      <div className="search-bar-container relative flex-1 max-w-xs">
                        <Search size={16} className="search-icon absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
                        <Input
                          type="text"
                          placeholder="Search transactions..."
                          className="search-input pl-10 pr-4 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 transition-standard rounded-xl"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 transition-standard hover-lift rounded-xl"
                      >
                        <Filter size={16} className="mr-1.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 transition-standard hover-lift rounded-xl"
                      >
                        <Download size={16} />
                      </Button>
                    </div>
                  </div>
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
                    <TableRow className="bg-slate-800/50">
                      <SortableTableHeader
                        columnKey="id"
                        label="ID"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3"
                      />
                      <SortableTableHeader
                        columnKey="transaction_date"
                        label="DATE"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3"
                      />
                      <SortableTableHeader
                        columnKey="description"
                        label="CATEGORY"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3"
                      />
                      <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">METHOD</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 text-center">STATUS</TableHead>
                      <SortableTableHeader
                        columnKey="amount"
                        label="AMOUNT"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3"
                      />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTransactions.map((transaction) => (
                      <TransactionRow
                        key={transaction.id}
                        transaction={transaction}
                        onReferenceClick={handleReferenceClick}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
              </div>
            </div>
          </>
        ) : (
          /* Accounts List Table */
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Accounts List</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {accounts.filter(acc => acc.is_active).length} active, {accounts.filter(acc => !acc.is_active).length} inactive
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowInactiveAccounts(!showInactiveAccounts)}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <div className={cn(
                      "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                      showInactiveAccounts ? "bg-blue-600" : "bg-gray-700"
                    )}>
                      <span
                        className={cn(
                          "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                          showInactiveAccounts ? "translate-x-5" : "translate-x-1"
                        )}
                      />
                    </div>
                    <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                      Show Inactive
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-6">
                <Skeleton className="h-64" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="p-12">
                <EmptyState
                  icon={Wallet}
                  title="No accounts found"
                  description="Get started by creating your first financial account"
                  action={{
                    label: 'Create Account',
                    onClick: () => {
                      setAccountModalMode('add');
                      setSelectedAccount(null);
                      setAccountModalOpen(true);
                    },
                  }}
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-800/50">
                    <SortableTableHeader
                      columnKey="name"
                      label="Account Name"
                      currentSort={sortConfig}
                      onSort={handleSort}
                    />
                    <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</TableHead>
                    <SortableTableHeader
                      columnKey="current_balance"
                      label="Balance"
                      currentSort={sortConfig}
                      onSort={handleSort}
                      className="text-right"
                    />
                    <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Number</TableHead>
                    <SortableTableHeader
                      columnKey="opening_balance"
                      label="Opening Balance"
                      currentSort={sortConfig}
                      onSort={handleSort}
                      className="text-right"
                    />
                    <TableHead className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => {
                    const getTypeIcon = () => {
                      switch (account.type) {
                        case 'bank':
                          return <Landmark size={14} className="text-blue-400" />;
                        case 'cash':
                          return <Wallet size={14} className="text-green-400" />;
                        case 'wallet':
                        case 'credit_card':
                          return <CreditCard size={14} className="text-purple-400" />;
                        default:
                          return <Wallet size={14} className="text-gray-400" />;
                      }
                    };

                    return (
                      <TableRow key={account.id} className={cn(
                        "hover:bg-gray-900/50 transition-opacity",
                        !account.is_active && "opacity-60"
                      )}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-bold",
                              account.is_active ? "text-white" : "text-gray-500"
                            )}>
                              {account.name}
                            </span>
                            {!account.is_active && (
                              <Badge variant="outline" className="bg-gray-800/50 text-gray-500 border-gray-700 text-xs">
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-gray-800 text-gray-300 border-gray-700 flex w-fit items-center gap-1.5">
                            {getTypeIcon()}
                            {getAccountTypeLabel(account.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-500 font-mono text-xs">
                            {account.account_number || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-gray-400">
                            {formatCurrency(account.opening_balance || 0)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-green-500 text-base">
                            {formatCurrency(account.current_balance || 0)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleToggleAccountStatus(account)}
                              className={cn(
                                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer',
                                account.is_active ? 'bg-white' : 'bg-gray-700'
                              )}
                            >
                              <span
                                className={cn(
                                  'inline-block h-4 w-4 transform rounded-full bg-black transition-transform',
                                  account.is_active ? 'translate-x-6' : 'translate-x-1'
                                )}
                              />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu
                            trigger={
                              <button className="p-1 hover:bg-gray-800 rounded">
                                <MoreVertical size={16} className="text-gray-400" />
                              </button>
                            }
                          >
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={() => router.push(`/dashboard/finance/accounts/${account.id}/ledger`)}
                              >
                                View Ledger
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedAccount(account);
                                  setAccountModalMode('edit');
                                  setAccountModalOpen(true);
                                }}
                              >
                                Edit Account
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  // Toggle status
                                  handleToggleAccountStatus(account);
                                }}
                              >
                                {account.is_active ? 'Deactivate' : 'Activate'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Transaction Modals */}
        {activeModal !== 'none' && (
          <TransactionModal
            isOpen={true}
            onClose={() => setActiveModal('none')}
            type={activeModal as TransactionType}
            onSuccess={handleTransactionSuccess}
          />
        )}

        {/* Account Modal */}
        <AccountModal
          isOpen={accountModalOpen}
          onClose={() => {
            setAccountModalOpen(false);
            setSelectedAccount(null);
          }}
          onSuccess={handleAccountSuccess}
          account={selectedAccount}
          mode={accountModalMode}
        />

        {/* Reference Details Modal */}
        {selectedReference && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900 z-10">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {selectedReference.type === 'purchase' ? 'Purchase' : 'Sale'} Details
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Reference #{selectedReference.id}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedReference(null);
                    setReferenceDetails(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={18} />
                </Button>
              </div>

              <div className="p-6">
                {loadingReference ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="animate-spin text-gray-400" />
                    <span className="ml-3 text-gray-400">Loading details...</span>
                  </div>
                ) : referenceDetails ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Reference Number</p>
                        <p className="text-white font-medium">{referenceDetails.ref_no || `#${selectedReference.id}`}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Date</p>
                        <p className="text-white font-medium">
                          {format(new Date(referenceDetails.transaction_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">
                          {selectedReference.type === 'purchase' ? 'Supplier' : 'Customer'}
                        </p>
                        <p className="text-white font-medium">
                          {Array.isArray(referenceDetails.contact) 
                            ? referenceDetails.contact[0]?.name || referenceDetails.contact[0]?.supplier_business_name
                            : referenceDetails.contact?.name || referenceDetails.contact?.supplier_business_name || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Total Amount</p>
                        <p className="text-white font-medium text-lg">
                          {formatCurrency(referenceDetails.final_total || referenceDetails.total_amount || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Status</p>
                        <Badge variant="outline" className="bg-gray-800 text-gray-300 border-gray-700">
                          {referenceDetails.status || 'N/A'}
                        </Badge>
                      </div>
                      {referenceDetails.location && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Location</p>
                          <p className="text-white font-medium">
                            {Array.isArray(referenceDetails.location) 
                              ? referenceDetails.location[0]?.name 
                              : referenceDetails.location?.name || 'N/A'}
                          </p>
                        </div>
                      )}
                    </div>

                    {referenceDetails.notes && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Notes</p>
                        <p className="text-white text-sm">{referenceDetails.notes}</p>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-800 flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (selectedReference.type === 'sell') {
                            router.push(`/sales/${selectedReference.id}/invoice`);
                          } else if (selectedReference.type === 'purchase') {
                            router.push(`/dashboard/purchases`);
                          }
                          setSelectedReference(null);
                          setReferenceDetails(null);
                        }}
                        className="flex-1 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                      >
                        View Full Details
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedReference(null);
                          setReferenceDetails(null);
                        }}
                        className="flex-1 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-400">No details found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ModernDashboardLayout>
  );
}

