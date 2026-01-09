/**
 * Salesman Ledger Page
 * View financial history for a specific salesman
 * Features:
 * - Commission earnings (credits)
 * - Salary payments (debits)
 * - Cash advances (debits)
 * - Running balance
 * - Date filtering
 * - Export functionality
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Download,
  Filter,
  User
} from 'lucide-react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Skeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyState } from '@/components/placeholders/EmptyState';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { formatDecimal, formatCurrency } from '@/lib/utils/formatters';
import { useRouter, useParams } from 'next/navigation';

interface LedgerEntry {
  id: number;
  transaction_date: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference_type?: string;
  reference_id?: number;
  created_at: string;
}

interface SalesmanInfo {
  id: number;
  full_name: string;
  email: string;
  base_salary: number;
  commission_percentage: number;
  role: string;
}

interface LedgerSummary {
  total_credits: number;
  total_debits: number;
  net_balance: number;
  commission_count: number;
  salary_count: number;
}

export default function SalesmanLedgerPage() {
  const router = useRouter();
  const params = useParams();
  const salesmanId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [salesmanInfo, setSalesmanInfo] = useState<SalesmanInfo | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary>({
    total_credits: 0,
    total_debits: 0,
    net_balance: 0,
    commission_count: 0,
    salary_count: 0
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (salesmanId) {
      loadSalesmanData();
    }
  }, [salesmanId, startDate, endDate]);

  const loadSalesmanData = async () => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to view ledger');
        return;
      }

      // Fetch salesman info
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, user_id, role, base_salary, commission_percentage')
        .eq('id', parseInt(salesmanId))
        .eq('role', 'salesman')
        .single();

      if (profileError || !profile) {
        toast.error('Salesman not found');
        router.push('/users');
        return;
      }

      // Fetch auth user details
      const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
      const authUser = authUsers?.find(u => u.id === profile.user_id);

      setSalesmanInfo({
        id: profile.id,
        full_name: authUser?.user_metadata?.full_name || authUser?.email || 'Unknown',
        email: authUser?.email || '',
        base_salary: profile.base_salary || 0,
        commission_percentage: profile.commission_percentage || 0,
        role: profile.role
      });

      // Build query for ledger entries
      let query = supabase
        .from('salesman_ledger')
        .select('*')
        .eq('user_id', parseInt(salesmanId))
        .order('transaction_date', { ascending: false });

      // Apply date filters if provided
      if (startDate) {
        query = query.gte('transaction_date', startDate);
      }
      if (endDate) {
        query = query.lte('transaction_date', endDate);
      }

      const { data: entries, error: entriesError } = await query;

      if (entriesError) {
        console.error('Error fetching ledger entries:', entriesError);
        toast.error('Failed to load ledger entries');
        return;
      }

      setLedgerEntries(entries || []);

      // Calculate summary
      const totalCredits = (entries || [])
        .filter(e => e.type === 'credit')
        .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);

      const totalDebits = (entries || [])
        .filter(e => e.type === 'debit')
        .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);

      const commissionCount = (entries || [])
        .filter(e => e.type === 'credit' && e.reference_type === 'sale')
        .length;

      const salaryCount = (entries || [])
        .filter(e => e.type === 'debit' && e.reference_type === 'salary')
        .length;

      setSummary({
        total_credits: totalCredits,
        total_debits: totalDebits,
        net_balance: totalCredits - totalDebits,
        commission_count: commissionCount,
        salary_count: salaryCount
      });

    } catch (err) {
      console.error('Failed to load salesman data:', err);
      toast.error('Failed to load salesman data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // Simple CSV export
    const headers = ['Date', 'Type', 'Amount', 'Description', 'Reference'];
    const rows = ledgerEntries.map(entry => [
      format(new Date(entry.transaction_date), 'yyyy-MM-dd'),
      entry.type,
      entry.amount.toFixed(2),
      entry.description,
      entry.reference_type || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salesman-ledger-${salesmanId}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Ledger exported successfully');
  };

  // Calculate running balance
  let runningBalance = 0;
  const entriesWithBalance = [...ledgerEntries].reverse().map(entry => {
    if (entry.type === 'credit') {
      runningBalance += parseFloat(entry.amount.toString());
    } else {
      runningBalance -= parseFloat(entry.amount.toString());
    }
    return {
      ...entry,
      balance: runningBalance
    };
  }).reverse();

  return (
    <ModernDashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/users')}
              className="bg-slate-800 border-slate-700 text-slate-200"
            >
              <ArrowLeft size={18} className="mr-2" />
              Back to Users
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Salesman Ledger</h1>
              {salesmanInfo && (
                <p className="text-sm text-gray-400 mt-1">
                  {salesmanInfo.full_name} ({salesmanInfo.email})
                </p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleExport}
            className="bg-green-500/10 border-green-500/30 text-green-300 hover:bg-green-500/20"
            disabled={ledgerEntries.length === 0}
          >
            <Download size={18} className="mr-2" />
            Export CSV
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-96" />
          </div>
        ) : (
          <>
            {/* Salesman Info & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Base Salary</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {formatCurrency(salesmanInfo?.base_salary || 0)}
                    </p>
                  </div>
                  <div className="bg-blue-500/20 p-3 rounded-lg">
                    <DollarSign size={24} className="text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Commission Rate</p>
                    <p className="text-2xl font-bold text-indigo-400 mt-1">
                      {formatDecimal(salesmanInfo?.commission_percentage || 0)}%
                    </p>
                  </div>
                  <div className="bg-indigo-500/20 p-3 rounded-lg">
                    <TrendingUp size={24} className="text-indigo-400" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Earnings</p>
                    <p className="text-2xl font-bold text-green-400 mt-1">
                      {formatCurrency(summary.total_credits)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {summary.commission_count} commissions
                    </p>
                  </div>
                  <div className="bg-green-500/20 p-3 rounded-lg">
                    <TrendingUp size={24} className="text-green-400" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Net Balance</p>
                    <p className={cn(
                      "text-2xl font-bold mt-1",
                      summary.net_balance >= 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {formatCurrency(summary.net_balance)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {summary.salary_count} payments
                    </p>
                  </div>
                  <div className={cn(
                    "p-3 rounded-lg",
                    summary.net_balance >= 0 ? "bg-green-500/20" : "bg-red-500/20"
                  )}>
                    <DollarSign size={24} className={summary.net_balance >= 0 ? "text-green-400" : "text-red-400"} />
                  </div>
                </div>
              </div>
            </div>

            {/* Date Filters */}
            <div className="flex flex-col md:flex-row gap-4 bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-gray-400" />
                <span className="text-sm text-gray-400">Filter by Date:</span>
              </div>
              <div className="flex flex-1 gap-4">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Start Date"
                  className="bg-slate-800 border-slate-700 text-white"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="End Date"
                  className="bg-slate-800 border-slate-700 text-white"
                />
                {(startDate || endDate) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="bg-slate-800 border-slate-700 text-slate-200"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Ledger Table */}
            {entriesWithBalance.length === 0 ? (
              <EmptyState
                icon={DollarSign}
                title="No ledger entries"
                description="No financial transactions found for this salesman"
              />
            ) : (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700 hover:bg-slate-800/50">
                      <TableHead className="text-gray-400">Date</TableHead>
                      <TableHead className="text-gray-400">Type</TableHead>
                      <TableHead className="text-gray-400">Description</TableHead>
                      <TableHead className="text-gray-400 text-right">Amount</TableHead>
                      <TableHead className="text-gray-400 text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entriesWithBalance.map((entry) => (
                      <TableRow 
                        key={entry.id} 
                        className="border-slate-700 hover:bg-slate-800/50 transition-colors"
                      >
                        {/* Date */}
                        <TableCell>
                          <span className="text-sm text-gray-300">
                            {format(new Date(entry.transaction_date), 'MMM dd, yyyy')}
                          </span>
                        </TableCell>

                        {/* Type */}
                        <TableCell>
                          {entry.type === 'credit' ? (
                            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                              <TrendingUp size={14} className="mr-1" />
                              Credit
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                              <TrendingDown size={14} className="mr-1" />
                              Debit
                            </Badge>
                          )}
                        </TableCell>

                        {/* Description */}
                        <TableCell>
                          <div>
                            <div className="text-white">{entry.description}</div>
                            {entry.reference_type && (
                              <div className="text-xs text-gray-500 mt-1">
                                Ref: {entry.reference_type}
                                {entry.reference_id && ` #${entry.reference_id}`}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Amount */}
                        <TableCell className="text-right">
                          <span className={cn(
                            "font-medium",
                            entry.type === 'credit' ? "text-green-400" : "text-red-400"
                          )}>
                            {entry.type === 'credit' ? '+' : '-'}
                            {formatCurrency(entry.amount)}
                          </span>
                        </TableCell>

                        {/* Running Balance */}
                        <TableCell className="text-right">
                          <span className={cn(
                            "font-bold",
                            entry.balance >= 0 ? "text-green-400" : "text-red-400"
                          )}>
                            {formatCurrency(entry.balance)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </div>
    </ModernDashboardLayout>
  );
}

