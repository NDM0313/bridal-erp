/**
 * Accounting Reports Page
 * Profit & Loss, Balance Sheet
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, TrendingUp, TrendingDown, FileText, Calendar } from 'lucide-react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Skeleton } from '@/components/placeholders/SkeletonLoader';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';

interface ProfitLossData {
  revenue: {
    sales: number;
    other_income: number;
    total: number;
  };
  expenses: {
    purchases: number;
    operating_expenses: number;
    other_expenses: number;
    total: number;
  };
  profit: {
    gross_profit: number;
    net_profit: number;
  };
}

interface BalanceSheetData {
  assets: {
    current_assets: {
      cash: number;
      bank: number;
      receivables: number;
      inventory: number;
      total: number;
    };
    total_assets: number;
  };
  liabilities: {
    payables: number;
    loans: number;
    total: number;
  };
  equity: {
    opening_balance: number;
    retained_earnings: number;
    total: number;
  };
}

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [profitLoss, setProfitLoss] = useState<ProfitLossData | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData | null>(null);
  const [activeTab, setActiveTab] = useState<'profit-loss' | 'balance-sheet'>('profit-loss');

  useEffect(() => {
    loadReports();
  }, [dateFrom, dateTo]);

  const loadReports = async () => {
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

      await Promise.all([
        loadProfitLoss(profile.business_id),
        loadBalanceSheet(profile.business_id),
      ]);
    } catch (err) {
      console.error('Failed to load reports:', err);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const loadProfitLoss = async (businessId: number) => {
    try {
      // Get sales revenue
      const { data: sales } = await supabase
        .from('transactions')
        .select('final_total')
        .eq('business_id', businessId)
        .eq('type', 'sell')
        .eq('status', 'final')
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo);

      const salesRevenue = (sales || []).reduce(
        (sum, t) => sum + parseFloat(t.final_total?.toString() || '0'),
        0
      );

      // Get other income (credit transactions from account_transactions)
      const { data: otherIncome } = await supabase
        .from('account_transactions')
        .select('amount')
        .eq('business_id', businessId)
        .eq('type', 'credit')
        .eq('reference_type', 'income')
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo);

      const otherIncomeAmount = (otherIncome || []).reduce(
        (sum, t) => sum + parseFloat(t.amount?.toString() || '0'),
        0
      );

      // Get purchases (expenses)
      const { data: purchases } = await supabase
        .from('transactions')
        .select('final_total')
        .eq('business_id', businessId)
        .eq('type', 'purchase')
        .eq('status', 'final')
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo);

      const purchasesAmount = (purchases || []).reduce(
        (sum, t) => sum + parseFloat(t.final_total?.toString() || '0'),
        0
      );

      // Get operating expenses (debit transactions)
      const { data: expenses } = await supabase
        .from('account_transactions')
        .select('amount')
        .eq('business_id', businessId)
        .eq('type', 'debit')
        .eq('reference_type', 'expense')
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo);

      const operatingExpenses = (expenses || []).reduce(
        (sum, t) => sum + parseFloat(t.amount?.toString() || '0'),
        0
      );

      const totalRevenue = salesRevenue + otherIncomeAmount;
      const totalExpenses = purchasesAmount + operatingExpenses;
      const grossProfit = salesRevenue - purchasesAmount;
      const netProfit = totalRevenue - totalExpenses;

      setProfitLoss({
        revenue: {
          sales: salesRevenue,
          other_income: otherIncomeAmount,
          total: totalRevenue,
        },
        expenses: {
          purchases: purchasesAmount,
          operating_expenses: operatingExpenses,
          other_expenses: 0,
          total: totalExpenses,
        },
        profit: {
          gross_profit: grossProfit,
          net_profit: netProfit,
        },
      });
    } catch (err) {
      console.error('Failed to load profit & loss:', err);
    }
  };

  const loadBalanceSheet = async (businessId: number) => {
    try {
      // Get cash and bank balances
      const { data: accounts } = await supabase
        .from('financial_accounts')
        .select('type, current_balance')
        .eq('business_id', businessId)
        .eq('is_active', true);

      let cashBalance = 0;
      let bankBalance = 0;

      (accounts || []).forEach((acc) => {
        const balance = parseFloat(acc.current_balance?.toString() || '0');
        if (acc.type === 'cash') {
          cashBalance += balance;
        } else if (acc.type === 'bank') {
          bankBalance += balance;
        }
      });

      // Get receivables (due sales)
      const { data: receivables } = await supabase
        .from('transactions')
        .select('final_total, payment_status')
        .eq('business_id', businessId)
        .eq('type', 'sell')
        .in('payment_status', ['due', 'partial']);

      const receivablesAmount = (receivables || []).reduce(
        (sum, t) => {
          const total = parseFloat(t.final_total?.toString() || '0');
          if (t.payment_status === 'partial') {
            return sum + total * 0.5; // Estimate 50% remaining
          }
          return sum + total;
        },
        0
      );

      // Get payables (due purchases)
      const { data: payables } = await supabase
        .from('transactions')
        .select('final_total, payment_status')
        .eq('business_id', businessId)
        .eq('type', 'purchase')
        .in('payment_status', ['due', 'partial']);

      const payablesAmount = (payables || []).reduce(
        (sum, t) => {
          const total = parseFloat(t.final_total?.toString() || '0');
          if (t.payment_status === 'partial') {
            return sum + total * 0.5; // Estimate 50% remaining
          }
          return sum + total;
        },
        0
      );

      // Get inventory value (simplified - would need stock valuation)
      const inventoryValue = 0; // TODO: Calculate from stock

      // Get opening balance
      const { data: openingAccounts } = await supabase
        .from('financial_accounts')
        .select('opening_balance')
        .eq('business_id', businessId)
        .eq('is_active', true);

      const openingBalance = (openingAccounts || []).reduce(
        (sum, acc) => sum + parseFloat(acc.opening_balance?.toString() || '0'),
        0
      );

      // Calculate retained earnings (net profit from all time)
      const { data: allSales } = await supabase
        .from('transactions')
        .select('final_total')
        .eq('business_id', businessId)
        .eq('type', 'sell')
        .eq('status', 'final');

      const { data: allPurchases } = await supabase
        .from('transactions')
        .select('final_total')
        .eq('business_id', businessId)
        .eq('type', 'purchase')
        .eq('status', 'final');

      const totalSales = (allSales || []).reduce(
        (sum, t) => sum + parseFloat(t.final_total?.toString() || '0'),
        0
      );
      const totalPurchases = (allPurchases || []).reduce(
        (sum, t) => sum + parseFloat(t.final_total?.toString() || '0'),
        0
      );

      const retainedEarnings = totalSales - totalPurchases;

      setBalanceSheet({
        assets: {
          current_assets: {
            cash: cashBalance,
            bank: bankBalance,
            receivables: receivablesAmount,
            inventory: inventoryValue,
            total: cashBalance + bankBalance + receivablesAmount + inventoryValue,
          },
          total_assets: cashBalance + bankBalance + receivablesAmount + inventoryValue,
        },
        liabilities: {
          payables: payablesAmount,
          loans: 0, // TODO: Add loan tracking
          total: payablesAmount,
        },
        equity: {
          opening_balance: openingBalance,
          retained_earnings: retainedEarnings,
          total: openingBalance + retainedEarnings,
        },
      });
    } catch (err) {
      console.error('Failed to load balance sheet:', err);
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

  const handleExport = (type: 'profit-loss' | 'balance-sheet') => {
    // TODO: Implement CSV export
    toast.info('Export functionality coming soon');
  };

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
            <div>
              <h1 className="text-2xl font-bold text-white">Accounting Reports</h1>
              <p className="text-sm text-gray-400 mt-1">Profit & Loss, Balance Sheet</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => handleExport(activeTab)}
            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
          >
            <Download size={16} className="mr-2" />
            Export
          </Button>
        </div>

        {/* Date Range Filter */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-xl p-4">
          <div className="flex items-center gap-4">
            <Calendar className="text-gray-400" size={20} />
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          </div>
        </div>

        {/* Reports Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="profit-loss" className="data-[state=active]:bg-blue-600">
              <TrendingUp size={16} className="mr-2" />
              Profit & Loss
            </TabsTrigger>
            <TabsTrigger value="balance-sheet" className="data-[state=active]:bg-blue-600">
              <FileText size={16} className="mr-2" />
              Balance Sheet
            </TabsTrigger>
          </TabsList>

          {/* Profit & Loss Tab */}
          <TabsContent value="profit-loss" className="mt-6">
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-xl overflow-hidden">
              {loading ? (
                <div className="p-6">
                  <Skeleton className="h-64" />
                </div>
              ) : profitLoss ? (
                <>
                  <div className="p-6 border-b border-gray-800">
                    <h2 className="text-lg font-bold text-white">Profit & Loss Statement</h2>
                    <p className="text-sm text-gray-400 mt-1">
                      {format(new Date(dateFrom), 'MMM dd, yyyy')} - {format(new Date(dateTo), 'MMM dd, yyyy')}
                    </p>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Revenue Section */}
                    <div>
                      <h3 className="text-md font-semibold text-white mb-3">Revenue</h3>
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell className="text-gray-400">Sales</TableCell>
                            <TableCell className="text-right text-white font-medium">
                              {formatCurrency(profitLoss.revenue.sales)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-gray-400">Other Income</TableCell>
                            <TableCell className="text-right text-white font-medium">
                              {formatCurrency(profitLoss.revenue.other_income)}
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-gray-800/50">
                            <TableCell className="text-white font-semibold">Total Revenue</TableCell>
                            <TableCell className="text-right text-green-400 font-bold">
                              {formatCurrency(profitLoss.revenue.total)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    {/* Expenses Section */}
                    <div>
                      <h3 className="text-md font-semibold text-white mb-3">Expenses</h3>
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell className="text-gray-400">Purchases</TableCell>
                            <TableCell className="text-right text-white font-medium">
                              {formatCurrency(profitLoss.expenses.purchases)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-gray-400">Operating Expenses</TableCell>
                            <TableCell className="text-right text-white font-medium">
                              {formatCurrency(profitLoss.expenses.operating_expenses)}
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-gray-800/50">
                            <TableCell className="text-white font-semibold">Total Expenses</TableCell>
                            <TableCell className="text-right text-red-400 font-bold">
                              {formatCurrency(profitLoss.expenses.total)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    {/* Profit Section */}
                    <div className="pt-4 border-t border-gray-800">
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell className="text-gray-400">Gross Profit</TableCell>
                            <TableCell className="text-right text-white font-medium">
                              {formatCurrency(profitLoss.profit.gross_profit)}
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-blue-900/20">
                            <TableCell className="text-white font-bold text-lg">Net Profit</TableCell>
                            <TableCell className={cn(
                              'text-right font-bold text-lg',
                              profitLoss.profit.net_profit >= 0 ? 'text-green-400' : 'text-red-400'
                            )}>
                              {formatCurrency(profitLoss.profit.net_profit)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center text-gray-400">
                  No data available
                </div>
              )}
            </div>
          </TabsContent>

          {/* Balance Sheet Tab */}
          <TabsContent value="balance-sheet" className="mt-6">
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-xl overflow-hidden">
              {loading ? (
                <div className="p-6">
                  <Skeleton className="h-64" />
                </div>
              ) : balanceSheet ? (
                <>
                  <div className="p-6 border-b border-gray-800">
                    <h2 className="text-lg font-bold text-white">Balance Sheet</h2>
                    <p className="text-sm text-gray-400 mt-1">
                      As of {format(new Date(dateTo), 'MMM dd, yyyy')}
                    </p>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Assets Section */}
                    <div>
                      <h3 className="text-md font-semibold text-white mb-3">Assets</h3>
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell className="text-gray-400 pl-6">Cash</TableCell>
                            <TableCell className="text-right text-white font-medium">
                              {formatCurrency(balanceSheet.assets.current_assets.cash)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-gray-400 pl-6">Bank</TableCell>
                            <TableCell className="text-right text-white font-medium">
                              {formatCurrency(balanceSheet.assets.current_assets.bank)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-gray-400 pl-6">Receivables</TableCell>
                            <TableCell className="text-right text-white font-medium">
                              {formatCurrency(balanceSheet.assets.current_assets.receivables)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-gray-400 pl-6">Inventory</TableCell>
                            <TableCell className="text-right text-white font-medium">
                              {formatCurrency(balanceSheet.assets.current_assets.inventory)}
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-gray-800/50">
                            <TableCell className="text-white font-semibold">Total Assets</TableCell>
                            <TableCell className="text-right text-green-400 font-bold">
                              {formatCurrency(balanceSheet.assets.total_assets)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    {/* Liabilities Section */}
                    <div>
                      <h3 className="text-md font-semibold text-white mb-3">Liabilities</h3>
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell className="text-gray-400 pl-6">Payables</TableCell>
                            <TableCell className="text-right text-white font-medium">
                              {formatCurrency(balanceSheet.liabilities.payables)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-gray-400 pl-6">Loans</TableCell>
                            <TableCell className="text-right text-white font-medium">
                              {formatCurrency(balanceSheet.liabilities.loans)}
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-gray-800/50">
                            <TableCell className="text-white font-semibold">Total Liabilities</TableCell>
                            <TableCell className="text-right text-red-400 font-bold">
                              {formatCurrency(balanceSheet.liabilities.total)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    {/* Equity Section */}
                    <div>
                      <h3 className="text-md font-semibold text-white mb-3">Equity</h3>
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell className="text-gray-400 pl-6">Opening Balance</TableCell>
                            <TableCell className="text-right text-white font-medium">
                              {formatCurrency(balanceSheet.equity.opening_balance)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-gray-400 pl-6">Retained Earnings</TableCell>
                            <TableCell className="text-right text-white font-medium">
                              {formatCurrency(balanceSheet.equity.retained_earnings)}
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-gray-800/50">
                            <TableCell className="text-white font-semibold">Total Equity</TableCell>
                            <TableCell className="text-right text-blue-400 font-bold">
                              {formatCurrency(balanceSheet.equity.total)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    {/* Balance Check */}
                    <div className="pt-4 border-t border-gray-800">
                      <div className={cn(
                        'p-4 rounded-lg',
                        Math.abs(balanceSheet.assets.total_assets - (balanceSheet.liabilities.total + balanceSheet.equity.total)) < 1
                          ? 'bg-green-900/20 border border-green-800'
                          : 'bg-red-900/20 border border-red-800'
                      )}>
                        <div className="flex justify-between items-center">
                          <span className="text-white font-semibold">Balance Check:</span>
                          <span className={cn(
                            'font-bold',
                            Math.abs(balanceSheet.assets.total_assets - (balanceSheet.liabilities.total + balanceSheet.equity.total)) < 1
                              ? 'text-green-400'
                              : 'text-red-400'
                          )}>
                            {Math.abs(balanceSheet.assets.total_assets - (balanceSheet.liabilities.total + balanceSheet.equity.total)) < 1
                              ? 'Balanced ✓'
                              : 'Unbalanced ✗'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center text-gray-400">
                  No data available
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ModernDashboardLayout>
  );
}

