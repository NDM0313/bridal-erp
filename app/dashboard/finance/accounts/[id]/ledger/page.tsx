/**
 * Account Ledger Page
 * Shows detailed transaction history for a specific account
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Wallet, Building2, TrendingUp, TrendingDown, Info, Search, Filter, BarChart3, Calendar, DollarSign, Activity, X, Printer, FileText, Share2, Paperclip, ExternalLink } from 'lucide-react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Skeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyState } from '@/components/placeholders/EmptyState';
import { FinancialAccount, AccountTransaction } from '@/lib/types/modern-erp';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/DateRangePicker';

export default function AccountLedgerPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = parseInt(params.id as string);

  const [account, setAccount] = useState<FinancialAccount | null>(null);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string | null>(null);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [firstTransactionDate, setFirstTransactionDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'all' | 'debit' | 'credit'>('all');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (accountId) {
      loadAccount();
      loadTransactions();
    }
  }, [accountId, dateFrom, dateTo]);

  const loadAccount = async () => {
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
        .eq('id', accountId)
        .eq('business_id', profile.business_id)
        .single();

      if (fetchError) throw fetchError;
      setAccount(data);
    } catch (err) {
      console.error('Failed to load account:', err);
      setError(err instanceof Error ? err.message : 'Failed to load account');
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
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

      // Calculate opening balance: Get all transactions before dateFrom
      // This is the closing balance of the previous period (accounting standard)
      const { data: previousTransactions, error: prevError } = await supabase
        .from('account_transactions')
        .select('*')
        .eq('account_id', accountId)
        .eq('business_id', profile.business_id)
        .lt('transaction_date', dateFrom)
        .order('transaction_date', { ascending: true });

      if (prevError) {
        console.error('Failed to load previous transactions:', prevError);
      }

      // Calculate closing balance from previous transactions (accounting standard)
      // Opening balance = Account opening balance + all previous transactions' net effect
      let calculatedOpeningBalance = account?.opening_balance || 0;
      if (previousTransactions && previousTransactions.length > 0) {
        previousTransactions.forEach((tx) => {
          if (tx.type === 'credit') {
            calculatedOpeningBalance += parseFloat(tx.amount?.toString() || '0');
          } else {
            calculatedOpeningBalance -= parseFloat(tx.amount?.toString() || '0');
          }
        });
      }
      // Set opening balance (this is the closing balance of previous period)
      setOpeningBalance(calculatedOpeningBalance);

      // Get the first transaction date for this account (for "All Transactions" preset)
      const { data: firstTx, error: firstTxError } = await supabase
        .from('account_transactions')
        .select('transaction_date')
        .eq('account_id', accountId)
        .eq('business_id', profile.business_id)
        .order('transaction_date', { ascending: true })
        .limit(1)
        .single();

      if (!firstTxError && firstTx) {
        setFirstTransactionDate(format(new Date(firstTx.transaction_date), 'yyyy-MM-dd'));
      } else {
        // If no transactions exist, use account creation date or start of current year
        setFirstTransactionDate(format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'));
      }

      // Load transactions for the selected date range
      const { data, error: fetchError } = await supabase
        .from('account_transactions')
        .select('*')
        .eq('account_id', accountId)
        .eq('business_id', profile.business_id)
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo)
        .order('transaction_date', { ascending: true }); // Oldest first (01-Jan at top, 31-Dec at bottom)

      if (fetchError) throw fetchError;
      setTransactions(data || []);
    } catch (err) {
      console.error('Failed to load transactions:', err);
      toast.error('Failed to load transactions');
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
    }).format(amount).replace('PKR', 'Rs.');
  };

  const getAccountIcon = (type: FinancialAccount['type']) => {
    switch (type) {
      case 'cash':
        return <Wallet size={24} className="text-green-400" />;
      case 'bank':
        return <Building2 size={24} className="text-blue-400" />;
      default:
        return <Wallet size={24} className="text-gray-400" />;
    }
  };

  const calculateBalance = () => {
    // Start from calculated opening balance (accounting standard: closing balance of previous period)
    let balance = openingBalance;
    const runningBalance: Array<{ date: string; balance: number }> = [];

    // Since transactions are now sorted oldest first, calculate balance chronologically
    // Each transaction updates the balance: Credit increases, Debit decreases
    transactions.forEach((tx) => {
      if (tx.type === 'credit') {
        balance += parseFloat(tx.amount?.toString() || '0');
      } else if (tx.type === 'debit') {
        balance -= parseFloat(tx.amount?.toString() || '0');
      }
      // Store the balance after this transaction
      runningBalance.push({
        date: tx.transaction_date,
        balance: balance, // Current balance after this transaction
      });
    });

    // Final balance is the last calculated balance
    return { currentBalance: balance, runningBalance };
  };

  const applyQuickFilter = (days: number | null) => {
    setSelectedQuickFilter(days === null ? 'all' : days.toString());
    if (days === null) {
      // All transactions - set to start of year to today
      setDateFrom(format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'));
      setDateTo(format(new Date(), 'yyyy-MM-dd'));
    } else {
      // Last N days
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      setDateFrom(format(fromDate, 'yyyy-MM-dd'));
      setDateTo(format(toDate, 'yyyy-MM-dd'));
    }
  };

  const handleExport = () => {
    const { currentBalance } = calculateBalance();
    const csv = [
      ['Date', 'Description', 'Type', 'Amount', 'Balance'].join(','),
      ...transactions.map((tx) => {
        const amount = parseFloat(tx.amount?.toString() || '0');
        return [
          format(new Date(tx.transaction_date), 'yyyy-MM-dd'),
          `"${tx.description || ''}"`,
          tx.type,
          amount,
          '', // Balance will be calculated
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${account?.name || 'account'}-ledger-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Ledger exported successfully');
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const accountName = account?.name || 'Account';
    const balance = formatCurrency(currentBalance);
    const message = `*${accountName} Ledger*\n\nCurrent Balance: ${balance}\nDate Range: ${format(new Date(dateFrom), 'MMM dd, yyyy')} - ${format(new Date(dateTo), 'MMM dd, yyyy')}\n\nView full ledger: ${window.location.href}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (error && !account) {
    return (
      <ModernDashboardLayout>
        <div className="p-6">
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </div>
        </div>
      </ModernDashboardLayout>
    );
  }

  const { currentBalance, runningBalance } = calculateBalance();
  const totalCredits = transactions
    .filter((tx) => tx.type === 'credit')
    .reduce((sum, tx) => sum + parseFloat(tx.amount?.toString() || '0'), 0);
  const totalDebits = transactions
    .filter((tx) => tx.type === 'debit')
    .reduce((sum, tx) => sum + parseFloat(tx.amount?.toString() || '0'), 0);

  // Get opening balance date (accounting standard)
  // Opening balance date = One day before the first transaction in selected range, or dateFrom - 1 if no transactions
  const getOpeningBalanceDate = () => {
    if (transactions.length === 0) {
      // If no transactions in selected range, opening balance is the closing balance of dateFrom - 1
      const fromDate = new Date(dateFrom);
      fromDate.setDate(fromDate.getDate() - 1);
      return fromDate;
    }
    // If transactions exist, opening balance is the closing balance of the day before first transaction
    const firstTxDate = new Date(transactions[0].transaction_date);
    firstTxDate.setDate(firstTxDate.getDate() - 1);
    return firstTxDate;
  };

  const openingBalanceDate = getOpeningBalanceDate();
  // Use calculated opening balance (this is the closing balance of previous period - accounting standard)
  const openingBalanceAmount = openingBalance;

  // Filter transactions based on search and type
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = searchQuery === '' || 
      (tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       tx.reference_id?.toString().includes(searchQuery) ||
       tx.reference_type?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = transactionTypeFilter === 'all' || tx.type === transactionTypeFilter;
    return matchesSearch && matchesType;
  });

  // Calculate additional stats
  const transactionCount = filteredTransactions.length;
  const averageTransaction = transactionCount > 0 
    ? (totalCredits + totalDebits) / transactionCount 
    : 0;
  const netFlow = totalCredits - totalDebits;
  
  // Get date range info
  const dateRangeDays = Math.ceil(
    (new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  return (
    <ModernDashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="flex items-center gap-3">
              {account && getAccountIcon(account.type)}
              <div>
                <h1 className="text-2xl font-bold text-white">{account?.name || 'Account Ledger'}</h1>
                <p className="text-sm text-gray-400 mt-1">Transaction history and balance</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              <Printer size={16} className="mr-2" />
              Print
            </Button>
            <Button
              variant="outline"
              onClick={handleExportPDF}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              <FileText size={16} className="mr-2" />
              PDF
            </Button>
            <Button
              variant="outline"
              onClick={handleShareWhatsApp}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              <Share2 size={16} className="mr-2" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              <Download size={16} className="mr-2" />
              CSV
            </Button>
          </div>
        </div>

        {/* Account Summary Cards */}
        {account && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Current Balance</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(currentBalance)}</p>
            </div>
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Total Credits</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(totalCredits)}</p>
            </div>
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Total Debits</p>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(totalDebits)}</p>
            </div>
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Opening Balance</p>
              <p className="text-2xl font-bold text-gray-300">{formatCurrency(account.opening_balance || 0)}</p>
            </div>
          </div>
        )}

        {/* Date Range Filter */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-xl p-4 relative z-50">
          <label className="text-xs text-gray-400 mb-2 block">Date Range</label>
          <DateRangePicker
            value={{ from: dateFrom, to: dateTo }}
            onChange={(range) => {
              setDateFrom(range.from);
              setDateTo(range.to);
              setSelectedQuickFilter(null);
            }}
            firstTransactionDate={firstTransactionDate}
          />
        </div>

        {/* Transactions Table */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-xl overflow-hidden relative z-0">
          <div className="p-6 border-b border-gray-800">
            <h2 className="text-lg font-bold text-white">Transactions</h2>
            <p className="text-sm text-gray-400 mt-1">
              {transactions.length} transaction(s) found
              {transactions.length > 0 && ' (including opening balance)'}
            </p>
          </div>

          {loading ? (
            <div className="p-6">
              <Skeleton className="h-64" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-900/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-center">Attachment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Opening Balance Row - Always show (accounting standard: closing balance of previous period) */}
                {(transactions.length > 0 || openingBalanceAmount !== 0) && (
                  <TableRow className="bg-gray-900/30 border-b border-gray-800">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300 text-sm">
                          {format(openingBalanceDate, 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-white text-sm font-medium">
                        Opening Balance
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-400 text-sm">—</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {openingBalanceAmount < 0 && (
                        <span className="font-semibold text-sm text-red-400">
                          {formatCurrency(Math.abs(openingBalanceAmount))}
                        </span>
                      )}
                      {openingBalanceAmount >= 0 && (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {openingBalanceAmount > 0 && (
                        <span className="font-semibold text-sm text-green-400">
                          {formatCurrency(openingBalanceAmount)}
                        </span>
                      )}
                      {openingBalanceAmount <= 0 && (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        'font-semibold text-sm',
                        openingBalanceAmount >= 0 ? 'text-white' : 'text-red-400'
                      )}>
                        {formatCurrency(openingBalanceAmount)}
                      </span>
                    </TableCell>
                  </TableRow>
                )}

                {/* Transaction Rows */}
                {filteredTransactions.length === 0 && openingBalanceAmount === 0 ? (
                  <TableRow>
                    <td colSpan={6} className="text-center py-12">
                      <EmptyState
                        icon={Wallet}
                        title="No transactions found"
                        description="No transactions found for the selected date range"
                      />
                    </td>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction, index) => {
                    // Find original index in full transactions array for balance calculation
                    const originalIndex = transactions.findIndex(tx => tx.id === transaction.id);
                    const amount = parseFloat(transaction.amount?.toString() || '0');
                    const isCredit = transaction.type === 'credit';
                    // Calculate balance chronologically: Opening Balance + all transactions up to this point
                    // Use original index to calculate correct balance from all transactions
                    let balance = openingBalance;
                    for (let i = 0; i <= originalIndex; i++) {
                      const tx = transactions[i];
                      if (tx.type === 'credit') {
                        balance += parseFloat(tx.amount?.toString() || '0');
                      } else if (tx.type === 'debit') {
                        balance -= parseFloat(tx.amount?.toString() || '0');
                      }
                    }

                    return (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isCredit ? (
                              <TrendingDown size={14} className="text-green-400" />
                            ) : (
                              <TrendingUp size={14} className="text-red-400" />
                            )}
                            <span className="text-gray-300 text-sm">
                              {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-white text-sm">
                            {transaction.description || 'No description'}
                          </span>
                          {transaction.reference_type && (
                            <Badge variant="outline" className="ml-2 bg-gray-800 text-gray-400 border-gray-700 text-xs">
                              {transaction.reference_type}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {transaction.reference_id && transaction.reference_type ? (
                            <button
                              onClick={() => {
                                if (transaction.reference_type === 'sell') {
                                  router.push(`/sales/${transaction.reference_id}/invoice`);
                                } else if (transaction.reference_type === 'purchase') {
                                  router.push(`/dashboard/purchases/${transaction.reference_id}`);
                                } else {
                                  toast.info(`Reference: ${transaction.reference_type} #${transaction.reference_id}`);
                                }
                              }}
                              className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm transition-colors"
                            >
                              <Badge variant="outline" className="bg-gray-800 text-gray-400 border-gray-700 text-xs cursor-pointer hover:bg-gray-700">
                                {transaction.reference_type}
                              </Badge>
                              <span className="text-blue-400 hover:underline">#{transaction.reference_id}</span>
                              <ExternalLink size={12} />
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!isCredit && (
                            <span className="font-semibold text-sm text-red-400">
                              {formatCurrency(amount)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isCredit && (
                            <span className="font-semibold text-sm text-green-400">
                              {formatCurrency(amount)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            'font-semibold text-sm',
                            balance >= 0 ? 'text-white' : 'text-red-400'
                          )}>
                            {formatCurrency(balance)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}

                {/* Summary Row - Totals and Closing Balance */}
                {(transactions.length > 0 || openingBalanceAmount !== 0) && (
                  <TableRow className="bg-gray-900/50 border-t-2 border-gray-600">
                    <TableCell>
                      <span className="text-gray-300 text-sm font-medium">
                        {transactions.length > 0 
                          ? format(new Date(transactions[transactions.length - 1].transaction_date), 'MMM dd, yyyy')
                          : format(new Date(dateTo), 'MMM dd, yyyy')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-white text-sm font-bold">
                        Totals & Closing Balance
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-400 text-sm">—</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-sm text-red-400">
                        {formatCurrency(totalDebits)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-sm text-green-400">
                        {formatCurrency(totalCredits)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        'font-bold text-base',
                        currentBalance >= 0 ? 'text-white' : 'text-red-400'
                      )}>
                        {formatCurrency(currentBalance)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-gray-500 text-sm">—</span>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </ModernDashboardLayout>
  );
}

