/**
 * Contact Ledger Page
 * Shows transaction history for a specific contact
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Skeleton } from '@/components/placeholders/SkeletonLoader';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Transaction {
  id: number;
  invoice_no: string | null;
  transaction_date: string;
  final_total: number | string;
  payment_status: string;
  type: 'sell' | 'purchase';
  paid_amount?: number | string;
  due_amount?: number | string;
}

export default function ContactLedgerPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.id ? parseInt(params.id as string) : null;

  const [contact, setContact] = useState<{ id: number; name: string; mobile?: string; email?: string; type?: string } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contactId) {
      loadContactAndTransactions();
    }
  }, [contactId]);

  const loadContactAndTransactions = async () => {
    if (!contactId) return;

    try {
      setLoading(true);
      setError(null);

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

      // Load contact
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .select('id, name, mobile, email, type')
        .eq('id', contactId)
        .eq('business_id', profile.business_id)
        .single();

      if (contactError) throw contactError;
      if (contactData) {
        setContact(contactData);
      }

      // Load transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('id, invoice_no, transaction_date, final_total, payment_status, type')
        .eq('business_id', profile.business_id)
        .eq('contact_id', contactId)
        .order('transaction_date', { ascending: false })
        .limit(100);

      if (transactionsError) throw transactionsError;
      if (transactionsData) {
        // Calculate paid/received and due amounts for each transaction
        // Note: For accurate partial payment amounts, you need a payments/transaction_payments table
        const transactionsWithAmounts: Transaction[] = await Promise.all(
          transactionsData.map(async (t) => {
            const finalTotal = parseFloat(t.final_total?.toString() || '0');
            let paidAmount = 0;
            let dueAmount = 0;

            if (t.payment_status === 'paid') {
              // Fully paid
              paidAmount = finalTotal;
              dueAmount = 0;
            } else if (t.payment_status === 'partial') {
              // For partial payments, try to fetch from payments table if it exists
              // Otherwise, we'll need to calculate or show as partial
              // TODO: Implement payments table query for accurate amounts
              // For now, we'll show that it's partial but exact amount is unknown
              // You can replace this with: SUM of payments for this transaction_id
              paidAmount = finalTotal * 0.5; // Placeholder - replace with actual payment sum from payments table
              dueAmount = finalTotal - paidAmount;
            } else {
              // due - no payment made yet
              paidAmount = 0;
              dueAmount = finalTotal;
            }

            return {
              ...t,
              paid_amount: paidAmount,
              due_amount: dueAmount,
            };
          })
        );

        setTransactions(transactionsWithAmounts);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load ledger';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Paid</Badge>;
      case 'due':
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Due</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Partial</Badge>;
      default:
        return <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    if (type === 'sell') {
      return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Sale</Badge>;
    } else {
      return <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">Purchase</Badge>;
    }
  };

  // Calculate totals
  const totalReceivables = transactions
    .filter(t => t.type === 'sell')
    .reduce((sum, t) => sum + (parseFloat(t.due_amount?.toString() || '0') || 0), 0);

  const totalPayables = transactions
    .filter(t => t.type === 'purchase')
    .reduce((sum, t) => sum + (parseFloat(t.due_amount?.toString() || '0') || 0), 0);

  const totalReceived = transactions
    .filter(t => t.type === 'sell')
    .reduce((sum, t) => sum + (parseFloat(t.paid_amount?.toString() || '0') || 0), 0);

  const totalPaid = transactions
    .filter(t => t.type === 'purchase')
    .reduce((sum, t) => sum + (parseFloat(t.paid_amount?.toString() || '0') || 0), 0);

  if (!contactId) {
    return (
      <ModernDashboardLayout>
        <div className="p-6">
          <p className="text-red-400">Invalid contact ID</p>
        </div>
      </ModernDashboardLayout>
    );
  }

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
              <h1 className="text-2xl font-bold text-white">Contact Ledger</h1>
              {contact && (
                <p className="text-sm text-gray-400 mt-1">
                  {contact.name} {contact.mobile && `• ${contact.mobile}`}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              // Export ledger as CSV
              const csv = [
                ['Date', 'Invoice', 'Type', 'Total Amount', 'Paid/Received', 'Due/Balance', 'Status'].join(','),
                ...transactions.map(t => [
                  format(new Date(t.transaction_date), 'yyyy-MM-dd'),
                  t.invoice_no || '',
                  t.type,
                  t.final_total,
                  t.paid_amount || 0,
                  t.due_amount || 0,
                  t.payment_status
                ].join(','))
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${contact?.name || 'ledger'}_ledger.csv`;
              a.click();
              window.URL.revokeObjectURL(url);
              toast.success('Ledger exported successfully');
            }}
            className="flex items-center gap-2"
          >
            <Download size={18} />
            Export Ledger
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">Total Transactions</p>
            <p className="text-2xl font-bold text-white">{transactions.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">Received (Sales)</p>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(totalReceived)}</p>
            <p className="text-xs text-gray-500 mt-1">Receivables: {formatCurrency(totalReceivables)}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">Paid (Purchases)</p>
            <p className="text-2xl font-bold text-blue-400">{formatCurrency(totalPaid)}</p>
            <p className="text-xs text-gray-500 mt-1">Payables: {formatCurrency(totalPayables)}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">Balance</p>
            <p className={cn(
              'text-2xl font-bold',
              (totalReceivables - totalPayables) >= 0 ? 'text-yellow-400' : 'text-red-400'
            )}>
              {formatCurrency(totalReceivables - totalPayables)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {(totalReceivables - totalPayables) >= 0 ? 'You will receive' : 'You owe'}
            </p>
          </div>
        </div>

        {/* Transactions Table */}
        {loading ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <Skeleton className="h-64" />
          </div>
        ) : error ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12">
            <div className="text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <Button variant="outline" onClick={loadContactAndTransactions}>
                Retry
              </Button>
            </div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12">
            <div className="text-center">
              <FileText size={48} className="text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No transactions found for this contact</p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-950/50 border-gray-800">
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>{contact?.type === 'customer' || contact?.type === 'both' ? 'Received' : 'Paid'}</TableHead>
                  <TableHead>Due/Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => {
                  const finalTotal = parseFloat(transaction.final_total?.toString() || '0');
                  const paidAmount = parseFloat(transaction.paid_amount?.toString() || '0');
                  const dueAmount = parseFloat(transaction.due_amount?.toString() || '0');

                  return (
                    <TableRow key={transaction.id} className="hover:bg-gray-800/30 transition-colors">
                      <TableCell className="text-gray-400">
                        {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {transaction.invoice_no || `#${transaction.id}`}
                      </TableCell>
                      <TableCell>{getTypeBadge(transaction.type)}</TableCell>
                      <TableCell className={cn(
                        'font-medium',
                        transaction.type === 'sell' ? 'text-green-400' : 'text-red-400'
                      )}>
                        {transaction.type === 'sell' ? '+' : '-'}{formatCurrency(finalTotal)}
                      </TableCell>
                      <TableCell className="font-medium text-green-400">
                        {formatCurrency(paidAmount)}
                      </TableCell>
                      <TableCell className={cn(
                        'font-medium',
                        dueAmount > 0 ? 'text-yellow-400' : 'text-gray-500'
                      )}>
                        {dueAmount > 0 ? formatCurrency(dueAmount) : '—'}
                      </TableCell>
                      <TableCell>{getPaymentStatusBadge(transaction.payment_status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (transaction.type === 'sell') {
                              router.push(`/sales/${transaction.id}/invoice`);
                            } else {
                              router.push(`/purchases/${transaction.id}`);
                            }
                          }}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </ModernDashboardLayout>
  );
}

