'use client';

import React, { useState, useMemo, useCallback, memo } from 'react';
import { ShoppingBag, Calendar, TrendingUp, Plus, Search, Eye, FileText, MoreVertical, Download, Mail, Copy, Edit, Trash2, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { DropdownMenu, DropdownMenuItem, DropdownMenuContent } from '@/components/ui/DropdownMenu';
import { TableSkeleton } from '@/components/placeholders/TableSkeleton';
import { StatsSkeleton } from '@/components/placeholders/StatsSkeleton';
import { EmptyState } from '@/components/placeholders/EmptyState';
import { VirtualizedTable } from '@/components/ui/VirtualizedTable';
import dynamic from 'next/dynamic';
import { useSales, useDeleteSale } from '@/lib/hooks/useSales';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
// Dynamic import for heavy modal - reduces initial bundle size
const AddSaleModal = dynamic(
  () => import('@/components/sales/AddSaleModal').then(mod => ({ default: mod.AddSaleModal })),
  { ssr: false, loading: () => null }
);

type PaymentStatus = 'Paid' | 'Partial' | 'Pending';

// Memoized table row component
const SaleRow = memo(({ sale, onEdit, onView, onDelete, onPrint, onShare }: {
  sale: any;
  onEdit: (id: number) => void;
  onView: (id: number) => void;
  onDelete: (id: number) => void;
  onPrint: (id: number) => void;
  onShare: (id: number) => void;
}) => {
  const getPaymentStatus = (sale: any): PaymentStatus => {
    const paidAmount = sale.paid_amount || 0;
    const totalAmount = sale.final_total || 0;
    if (paidAmount >= totalAmount && totalAmount > 0) return 'Paid';
    if (paidAmount > 0 && paidAmount < totalAmount) return 'Partial';
    return 'Pending';
  };

  const getStatusBadge = (status: PaymentStatus) => {
    const variants = {
      Paid: { className: 'bg-green-500/10 text-green-500 border-green-500/20', label: 'Paid' },
      Partial: { className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', label: 'Partial' },
      Pending: { className: 'bg-red-500/10 text-red-500 border-red-500/20', label: 'Pending' },
    };
    const variant = variants[status];
    return (
      <Badge className={variant.className}>
        {variant.label}
      </Badge>
    );
  };

  const status = getPaymentStatus(sale);

  return (
    <TableRow className="hover:bg-slate-900/50 transition-colors" onClick={(e) => e.stopPropagation()}>
      <TableCell className="font-medium text-slate-100">{sale.invoice_no}</TableCell>
      <TableCell className="text-slate-300">{format(new Date(sale.transaction_date), 'MMM dd, yyyy')}</TableCell>
      <TableCell className="text-slate-300">{sale.customer_name || 'Walk-in Customer'}</TableCell>
      <TableCell className="text-slate-100 font-medium">{formatCurrency(sale.final_total)}</TableCell>
      <TableCell className="text-green-400">{formatCurrency(sale.paid_amount || 0)}</TableCell>
      <TableCell className={cn(
        "font-medium",
        (sale.due_amount || 0) > 0 ? "text-red-400" : "text-slate-400"
      )}>
        {formatCurrency(sale.due_amount || 0)}
      </TableCell>
      <TableCell>{getStatusBadge(status)}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(sale.id); }}>
              <Eye className="h-4 w-4 mr-2" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(sale.id); }}>
              <Edit className="h-4 w-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPrint(sale.id); }}>
              <FileText className="h-4 w-4 mr-2" /> Print Invoice
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare(sale.id); }}>
              <Mail className="h-4 w-4 mr-2" /> Share
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onDelete(sale.id); }}
              className="text-red-400"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

SaleRow.displayName = 'SaleRow';

export default function SalesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [addSaleModalOpen, setAddSaleModalOpen] = useState(false);
  const [editSaleId, setEditSaleId] = useState<number | null>(null);

  // Use React Query hook - instant cached data, background refresh
  const { data, isLoading, error, refetch } = useSales();
  const deleteSale = useDeleteSale();

  const sales = data?.sales || [];
  const stats = data?.stats || { totalSales: 0, todaySales: 0, monthlyRevenue: 0 };

  // Memoized filtered sales
  const filteredSales = useMemo(() => {
    if (!searchTerm) return sales;
    const term = searchTerm.toLowerCase();
    return sales.filter((sale) =>
      sale.invoice_no?.toLowerCase().includes(term) ||
      sale.customer_name?.toLowerCase().includes(term)
    );
  }, [sales, searchTerm]);

  // Memoized callbacks
  const handleEdit = useCallback((id: number) => {
    setEditSaleId(id);
    setAddSaleModalOpen(true);
  }, []);

  const handleView = useCallback((id: number) => {
    router.push(`/sales/${id}/invoice`);
  }, [router]);

  const handleDelete = useCallback((id: number) => {
    if (confirm('Are you sure you want to delete this sale?')) {
      deleteSale.mutate(id);
    }
  }, [deleteSale]);

  const handlePrint = useCallback((id: number) => {
    window.open(`/sales/${id}/invoice?print=true`, '_blank');
  }, []);

  const handleShare = useCallback((id: number) => {
    const url = `${window.location.origin}/sales/${id}/invoice`;
    navigator.clipboard.writeText(url);
    toast.success('Invoice link copied to clipboard');
  }, []);

  const handleModalClose = useCallback(() => {
    setAddSaleModalOpen(false);
    setEditSaleId(null);
  }, []);

  const handleModalSuccess = useCallback(() => {
    setAddSaleModalOpen(false);
    setEditSaleId(null);
    refetch(); // Refresh data
    toast.success('Sale saved successfully');
  }, [refetch]);

  return (
    <ModernDashboardLayout>
      <div className="space-y-6">
        {/* Header - Fixed height to prevent CLS */}
        <div className="flex items-center justify-between h-16">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Sales Management</h1>
            <p className="mt-1 text-sm text-slate-400">Track all sales transactions and revenue</p>
          </div>
          <Button
            onClick={() => {
              setEditSaleId(null);
              setAddSaleModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Sale
          </Button>
        </div>

        {/* Stats Cards - Fixed height skeleton */}
        {isLoading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Sales</p>
                  <p className="text-2xl font-bold text-slate-100 mt-1">{stats.totalSales}</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <ShoppingBag className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </div>
            <div className="p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Today's Sales</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.todaySales}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </div>
            <div className="p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-purple-400 mt-1">{formatCurrency(stats.monthlyRevenue)}</p>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search - Fixed height */}
        <div className="h-14 flex items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by invoice number or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#111827] border-slate-800 text-slate-200 placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Table - Skeleton matches exact layout */}
        {isLoading ? (
          <TableSkeleton rows={10} columns={8} />
        ) : error ? (
          <div className="p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
            <EmptyState
              icon={Info}
              title="Failed to load sales"
              description={error instanceof Error ? error.message : 'Unknown error'}
            />
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
            <EmptyState
              icon={ShoppingBag}
              title="No sales found"
              description={searchTerm ? "Try adjusting your search term." : "Start by creating your first sale."}
            />
          </div>
        ) : filteredSales.length > 20 ? (
          // Use virtualized table for large datasets (>20 rows)
          <VirtualizedTable
            data={filteredSales}
            columns={[
              { key: 'invoice_no', header: 'Invoice #', width: 150, render: (sale) => sale.invoice_no },
              { key: 'transaction_date', header: 'Date', width: 150, render: (sale) => format(new Date(sale.transaction_date), 'MMM dd, yyyy') },
              { key: 'customer_name', header: 'Customer', width: 200, render: (sale) => sale.customer_name || 'Walk-in Customer' },
              { key: 'final_total', header: 'Total', width: 120, render: (sale) => formatCurrency(sale.final_total) },
              { key: 'paid_amount', header: 'Paid', width: 120, render: (sale) => <span className="text-green-400">{formatCurrency(sale.paid_amount || 0)}</span> },
              { key: 'due_amount', header: 'Due', width: 120, render: (sale) => <span className={cn("font-medium", (sale.due_amount || 0) > 0 ? "text-red-400" : "text-slate-400")}>{formatCurrency(sale.due_amount || 0)}</span> },
              { key: 'payment_status', header: 'Status', width: 120, render: (sale) => {
                const status = sale.paid_amount >= sale.final_total && sale.final_total > 0 ? 'Paid' : sale.paid_amount > 0 ? 'Partial' : 'Pending';
                const variants = {
                  Paid: 'bg-green-500/10 text-green-400 border-green-500/20',
                  Partial: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                  Pending: 'bg-red-500/10 text-red-400 border-red-500/20',
                };
                return <Badge className={variants[status as keyof typeof variants]}>{status}</Badge>;
              }},
              { key: 'actions', header: 'Actions', width: 100, render: (sale) => (
                <DropdownMenu>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleView(sale.id); }}>
                      <Eye className="h-4 w-4 mr-2" /> View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(sale.id); }}>
                      <Edit className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePrint(sale.id); }}>
                      <FileText className="h-4 w-4 mr-2" /> Print
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleShare(sale.id); }}>
                      <Mail className="h-4 w-4 mr-2" /> Share
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(sale.id); }} className="text-red-400">
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )},
            ]}
            height={600}
            rowHeight={60}
          />
        ) : (
          <div className="p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <SaleRow
                      key={sale.id}
                      sale={sale}
                      onEdit={handleEdit}
                      onView={handleView}
                      onDelete={handleDelete}
                      onPrint={handlePrint}
                      onShare={handleShare}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Sale Modal */}
      <AddSaleModal
        isOpen={addSaleModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editSaleId={editSaleId || undefined}
      />
    </ModernDashboardLayout>
  );
}
