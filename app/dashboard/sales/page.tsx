/**
 * Sales Management Page
 * Tracks all finalized sales invoices, monitors revenue, and manages payment statuses
 * Follows docs/modules/Sales.md specifications
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingBag, Calendar, TrendingUp, Plus, Search, Eye, FileText, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { Skeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyState } from '@/components/placeholders/EmptyState';
import { salesApi, type Sale } from '@/lib/api/sales';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { AddSaleModal } from '@/components/sales/AddSaleModal';

interface SalesStats {
  totalSales: number;
  todaySales: number;
  monthlyRevenue: number;
}

type PaymentStatus = 'Paid' | 'Partial' | 'Pending';

export default function SalesPage() {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<SalesStats>({
    totalSales: 0,
    todaySales: 0,
    monthlyRevenue: 0,
  });
  const [addSaleModalOpen, setAddSaleModalOpen] = useState(false);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await salesApi.getAll({ per_page: 100, status: 'final' });

      if (response.success && response.data) {
        setSales(response.data);

        // Calculate stats
        const today = new Date().toISOString().split('T')[0];
        const todaySales = response.data.filter(
          (s) => s.transaction_date?.startsWith(today)
        ).length;

        const thisMonth = new Date().toISOString().slice(0, 7);
        const monthlyRevenue = response.data
          .filter((s) => s.transaction_date?.startsWith(thisMonth))
          .reduce((sum, s) => sum + (s.final_total || 0), 0);

        setStats({
          totalSales: response.data.length,
          todaySales,
          monthlyRevenue,
        });
      } else {
        throw new Error(response.error?.message || 'Failed to load sales');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load sales';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Calculate payment status
  const getPaymentStatus = (sale: Sale): PaymentStatus => {
    // TODO: Get paid_amount from sale or payment records
    // For now, assume all final sales are paid
    const paidAmount = (sale as any).paid_amount || sale.final_total || 0;
    const totalAmount = sale.final_total || 0;

    if (paidAmount >= totalAmount) {
      return 'Paid';
    } else if (paidAmount > 0) {
      return 'Partial';
    } else {
      return 'Pending';
    }
  };

  // Get status badge
  const getStatusBadge = (status: PaymentStatus) => {
    const variants = {
      Paid: { className: 'bg-green-500/10 text-green-500', label: 'Paid' },
      Partial: { className: 'bg-yellow-500/10 text-yellow-500', label: 'Partial' },
      Pending: { className: 'bg-red-500/10 text-red-500', label: 'Pending' },
    };

    const variant = variants[status];
    return (
      <Badge variant="outline" className={variant.className}>
        {variant.label}
      </Badge>
    );
  };

  // Filter sales
  const filteredSales = sales.filter((sale) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      sale.invoice_no?.toLowerCase().includes(term) ||
      sale.contact?.name?.toLowerCase().includes(term) ||
      false
    );
  });

  return (
    <ModernDashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Sales Management</h1>
            <p className="text-sm text-gray-400 mt-1">Track invoices, revenue, and payment statuses</p>
          </div>
          <Button
            variant="primary"
            onClick={() => setAddSaleModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            New Sale
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Sales Card - ShoppingBag (Blue) */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ShoppingBag size={80} className="text-blue-500" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                  <ShoppingBag size={24} />
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-1">Total Sales</p>
              <p className="text-2xl font-bold text-white">{stats.totalSales}</p>
            </div>
          </div>

          {/* Today Sales Card - Calendar (Green) */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Calendar size={80} className="text-green-500" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-green-500/10 text-green-500">
                  <Calendar size={24} />
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-1">Today's Sales</p>
              <p className="text-2xl font-bold text-white">{stats.todaySales}</p>
            </div>
          </div>

          {/* Monthly Revenue Card - TrendingUp (Yellow) */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <TrendingUp size={80} className="text-yellow-500" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-yellow-500/10 text-yellow-500">
                  <TrendingUp size={24} />
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-1">Monthly Revenue</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(stats.monthlyRevenue)}</p>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <Input
              type="text"
              placeholder="Search by invoice number or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Sales Table */}
        {loading ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <Skeleton className="h-64" />
          </div>
        ) : error ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12">
            <div className="text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <Button variant="outline" onClick={loadSales}>
                Retry
              </Button>
            </div>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12">
            <EmptyState
              icon={ShoppingBag}
              title="No sales found"
              description={
                searchTerm
                  ? 'No sales match your search criteria'
                  : 'Get started by creating your first sale'
              }
              action={
                !searchTerm
                  ? {
                      label: 'Create Sale',
                      onClick: () => router.push('/pos'),
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-950/50 border-gray-800">
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead>Expenses</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => {
                  const paymentStatus = getPaymentStatus(sale);
                  const expenses = (sale as any).expense_amount || 0;
                  const subtotal = sale.final_total - expenses;

                  return (
                    <TableRow key={sale.id} className="hover:bg-gray-800/30 transition-colors">
                      <TableCell>
                        <span className="font-mono text-gray-400">{sale.invoice_no || `#${sale.id}`}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-white">
                          {sale.contact?.name || 'Walk-in Customer'}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {sale.transaction_date
                          ? format(new Date(sale.transaction_date), 'MMM dd, yyyy')
                          : '—'}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {formatCurrency(subtotal)}
                      </TableCell>
                      <TableCell className="text-orange-400">
                        {expenses > 0 ? formatCurrency(expenses) : '—'}
                      </TableCell>
                      <TableCell className="text-white font-bold">
                        {formatCurrency(sale.final_total || 0)}
                      </TableCell>
                      <TableCell>{getStatusBadge(paymentStatus)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
                            >
                              <MoreVertical size={18} />
                            </Button>
                          }
                        >
                          <DropdownMenuItem
                            onClick={() => router.push(`/sales/${sale.id}/invoice`)}
                          >
                            <Eye size={14} className="inline mr-2" />
                            View Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileText size={14} className="inline mr-2" />
                            Print Receipt
                          </DropdownMenuItem>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add Sale Modal */}
      <AddSaleModal
        isOpen={addSaleModalOpen}
        onClose={() => setAddSaleModalOpen(false)}
        onSuccess={() => {
          setAddSaleModalOpen(false);
          loadSales(); // Refresh sales list
        }}
      />
    </ModernDashboardLayout>
  );
}

