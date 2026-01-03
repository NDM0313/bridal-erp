'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { formatCurrency } from '@/lib/utils';
import { Plus, Eye, ShoppingBag, DollarSign, RotateCcw, Search, MoreVertical, FileText, Mail, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { TableSkeleton } from '@/components/placeholders/TableSkeleton';
import { StatsSkeleton } from '@/components/placeholders/StatsSkeleton';
import { EmptyState } from '@/components/placeholders/EmptyState';
import { usePurchases } from '@/lib/hooks/usePurchases';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { VirtualizedTable } from '@/components/ui/VirtualizedTable';

// Memoized table row component
const PurchaseRow = memo(({ purchase, onView }: { purchase: any; onView: (id: number) => void }) => {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      final: { className: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'Received' },
      draft: { className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', label: 'Pending' },
      ordered: { className: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Ordered' },
      returned: { className: 'bg-orange-500/10 text-orange-400 border-orange-500/20', label: 'Returned' },
    };
    const variant = variants[status] || variants.draft;
    return (
      <Badge className={variant.className}>
        {variant.label}
      </Badge>
    );
  };

  const paidAmount = purchase.paid_amount || 0;
  const totalAmount = purchase.final_total || 0;
  const dueAmount = Math.max(0, totalAmount - paidAmount);
  const refNo = purchase.ref_no || `PO-${purchase.id}`;

  return (
    <TableRow className="hover:bg-slate-900/50 transition-colors" onClick={(e) => e.stopPropagation()}>
      <TableCell>
        <span className="font-mono text-slate-300">{refNo}</span>
      </TableCell>
      <TableCell>
        <span className="text-slate-100">{purchase.supplier_name || 'N/A'}</span>
      </TableCell>
      <TableCell className="text-slate-400 text-sm">
        {purchase.transaction_date ? format(new Date(purchase.transaction_date), 'MMM dd, yyyy') : '—'}
      </TableCell>
      <TableCell className="text-slate-100 font-medium">{formatCurrency(totalAmount)}</TableCell>
      <TableCell className="text-green-400">
        {paidAmount > 0 ? formatCurrency(paidAmount) : '—'}
      </TableCell>
      <TableCell className={cn('font-medium', dueAmount > 0 ? 'text-red-400' : 'text-slate-500')}>
        {dueAmount > 0 ? formatCurrency(dueAmount) : '—'}
      </TableCell>
      <TableCell>{getStatusBadge(purchase.status)}</TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(purchase.id); }}>
            <Eye className="h-4 w-4 mr-2" /> View Details
          </DropdownMenuItem>
          <DropdownMenuItem>
            <FileText className="h-4 w-4 mr-2" /> Print Receipt
          </DropdownMenuItem>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

PurchaseRow.displayName = 'PurchaseRow';

export default function PurchasesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  // Use React Query hook - instant cached data, background refresh
  const { data, isLoading, error, refetch } = usePurchases();

  const purchases = data?.purchases || [];
  const stats = data?.stats || { totalPurchases: 0, totalValue: 0 };

  // Memoized filtered purchases
  const filteredPurchases = useMemo(() => {
    if (!searchTerm) return purchases;
    const term = searchTerm.toLowerCase();
    return purchases.filter((purchase) =>
      purchase.ref_no?.toLowerCase().includes(term) ||
      purchase.supplier_name?.toLowerCase().includes(term)
    );
  }, [purchases, searchTerm]);

  // Memoized callbacks
  const handleView = useCallback((id: number) => {
    window.location.href = `/purchases/${id}`;
  }, []);

  // Calculate additional stats
  const purchaseStats = useMemo(() => {
    const totalPurchase = purchases
      .filter(p => p.status === 'final')
      .reduce((sum, p) => sum + (p.final_total || 0), 0);
    
    const amountDue = purchases
      .filter(p => p.payment_status === 'due' && p.status === 'final')
      .reduce((sum, p) => sum + (p.final_total || 0), 0);
    
    const returns = purchases.filter(p => 
      p.status === 'returned' || (p.ref_no || '').includes('RET')
    ).length;

    return { totalPurchase, amountDue, returns };
  }, [purchases]);

  return (
    <ModernDashboardLayout>
      <div className="space-y-6">
        {/* Header - Fixed height */}
        <div className="flex items-center justify-between h-16">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Purchase Management</h1>
            <p className="mt-1 text-sm text-slate-400">Manage purchase orders, supplier dues, and inventory restocking</p>
          </div>
          <Link href="/purchases/new">
            <Button className="bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/20">
              <Plus className="h-4 w-4 mr-2" />
              New Purchase
            </Button>
          </Link>
        </div>

        {/* Stats Cards - Fixed height skeleton */}
        {isLoading ? (
          <StatsSkeleton count={3} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Purchase</p>
                  <p className="text-2xl font-bold text-orange-400 mt-1">{formatCurrency(purchaseStats.totalPurchase)}</p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <ShoppingBag className="h-6 w-6 text-orange-400" />
                </div>
              </div>
            </div>
            <div className="p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Amount Due</p>
                  <p className="text-2xl font-bold text-red-400 mt-1">{formatCurrency(purchaseStats.amountDue)}</p>
                </div>
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <DollarSign className="h-6 w-6 text-red-400" />
                </div>
              </div>
            </div>
            <div className="p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Returns</p>
                  <p className="text-2xl font-bold text-yellow-400 mt-1">{purchaseStats.returns}</p>
                </div>
                <div className="p-3 bg-yellow-500/10 rounded-lg">
                  <RotateCcw className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search - Fixed height */}
        <div className="h-14 flex items-center p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              type="text"
              placeholder="Search by reference number or supplier..."
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
              icon={ShoppingBag}
              title="Failed to load purchases"
              description={error instanceof Error ? error.message : 'Unknown error'}
            />
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
            <EmptyState
              icon={ShoppingBag}
              title="No purchases found"
              description={searchTerm ? 'No purchases match your search criteria' : 'Get started by creating your first purchase order'}
              action={!searchTerm ? {
                label: 'Create Purchase',
                onClick: () => (window.location.href = '/purchases/new'),
              } : undefined}
            />
          </div>
        ) : filteredPurchases.length > 20 ? (
          // Use virtualized table for large datasets (>20 rows)
          <VirtualizedTable
            data={filteredPurchases}
            columns={[
              { key: 'ref_no', header: 'Ref No', width: 150, render: (p) => <span className="font-mono text-slate-300">{p.ref_no || `PO-${p.id}`}</span> },
              { key: 'supplier', header: 'Supplier', width: 200, render: (p) => <span className="text-slate-100">{p.supplier_name || 'N/A'}</span> },
              { key: 'date', header: 'Date', width: 150, render: (p) => <span className="text-slate-400 text-sm">{p.transaction_date ? format(new Date(p.transaction_date), 'MMM dd, yyyy') : '—'}</span> },
              { key: 'total', header: 'Total', width: 120, render: (p) => <span className="text-slate-100 font-medium">{formatCurrency(p.final_total)}</span> },
              { key: 'paid', header: 'Paid', width: 120, render: (p) => <span className="text-green-400">{(p as any).paid_amount > 0 ? formatCurrency((p as any).paid_amount) : '—'}</span> },
              { 
                key: 'due', 
                header: 'Due', 
                width: 120, 
                render: (p) => {
                  const paid = (p as any).paid_amount || 0;
                  const total = p.final_total || 0;
                  const due = Math.max(0, total - paid);
                  return <span className={cn('font-medium', due > 0 ? 'text-red-400' : 'text-slate-500')}>{due > 0 ? formatCurrency(due) : '—'}</span>;
                }
              },
              { 
                key: 'status', 
                header: 'Status', 
                width: 120, 
                render: (p) => {
                  const variants: Record<string, { className: string; label: string }> = {
                    final: { className: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'Received' },
                    draft: { className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', label: 'Pending' },
                    ordered: { className: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Ordered' },
                    returned: { className: 'bg-orange-500/10 text-orange-400 border-orange-500/20', label: 'Returned' },
                  };
                  const variant = variants[p.status] || variants.draft;
                  return <Badge className={variant.className}>{variant.label}</Badge>;
                }
              },
              { 
                key: 'actions', 
                header: 'Actions', 
                width: 100, 
                render: (p) => (
                  <DropdownMenu>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleView(p.id); }}>
                        <Eye className="h-4 w-4 mr-2" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <FileText className="h-4 w-4 mr-2" /> Print Receipt
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              },
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
                    <TableHead>Ref No</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((purchase) => (
                    <PurchaseRow key={purchase.id} purchase={purchase} onView={handleView} />
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </ModernDashboardLayout>
  );
}
