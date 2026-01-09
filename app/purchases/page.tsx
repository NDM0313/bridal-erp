'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { DropdownMenu, DropdownMenuItem, DropdownMenuContent } from '@/components/ui/DropdownMenu';
import { formatCurrency } from '@/lib/utils';
import { Plus, Eye, ShoppingBag, DollarSign, RotateCcw, Search, MoreVertical, FileText, Mail, Edit, Trash2 } from 'lucide-react';
import { SortableTableHeader, SortDirection } from '@/components/ui/SortableTableHeader';
import { FilterDropdown, FilterOptions } from '@/components/ui/FilterDropdown';
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
const PurchaseRow = memo(({ purchase, onView, className }: { purchase: any; onView: (id: number) => void; className?: string }) => {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      final: { className: 'bg-green-100 text-green-700', label: 'Received' },
      draft: { className: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
      pending: { className: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
      ordered: { className: 'bg-blue-100 text-blue-700', label: 'Ordered' },
      received: { className: 'bg-green-100 text-green-700', label: 'Received' },
      cancelled: { className: 'bg-red-100 text-red-700', label: 'Cancelled' },
      returned: { className: 'bg-orange-100 text-orange-700', label: 'Returned' },
    };
    const variant = variants[status] || variants.draft;
    return (
      <Badge className={cn("px-3 py-1 rounded-full text-xs font-medium", variant.className)}>
        {variant.label}
      </Badge>
    );
  };

  const totalAmount = purchase.final_total || 0;

  return (
    <TableRow className={cn("hover:bg-slate-900/50 transition-colors", className)} onClick={(e) => e.stopPropagation()}>
      <TableCell className="text-slate-400 text-sm">
        {purchase.transaction_date ? format(new Date(purchase.transaction_date), 'MMM dd, yyyy') : '—'}
      </TableCell>
      <TableCell>
        <span className="text-slate-100">{purchase.supplier_name || 'N/A'}</span>
      </TableCell>
      <TableCell className="text-slate-100 font-medium">{formatCurrency(totalAmount)}</TableCell>
      <TableCell>{getStatusBadge(purchase.status)}</TableCell>
      <TableCell className="text-right">
        <DropdownMenu
          trigger={
            <button className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-0 active:outline-none active:ring-0">
              <MoreVertical size={18} />
            </button>
          }
        >
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onView(purchase.id)}>
              <Eye className="h-4 w-4 mr-2" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FileText className="h-4 w-4 mr-2" /> Print Receipt
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

PurchaseRow.displayName = 'PurchaseRow';

export default function PurchasesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection } | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({});

  // Use React Query hook - instant cached data, background refresh
  const { data, isLoading, error, refetch } = usePurchases();

  const purchases = data?.purchases || [];
  const stats = data?.stats || { totalPurchases: 0, totalValue: 0 };

  // Handle sorting
  const handleSort = useCallback((key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        if (current.direction === 'asc') {
          return { key, direction: 'desc' };
        } else {
          return null;
        }
      }
      return { key, direction: 'asc' };
    });
  }, []);

  // Memoized filtered and sorted purchases
  const filteredPurchases = useMemo(() => {
    let result = [...purchases];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((purchase) =>
        purchase.invoice_no?.toLowerCase().includes(term) ||
        purchase.ref_no?.toLowerCase().includes(term) ||
        purchase.supplier_name?.toLowerCase().includes(term)
      );
    }

    // Apply date range filter
    if (filters.dateRange?.start || filters.dateRange?.end) {
      result = result.filter((purchase) => {
        const purchaseDate = new Date(purchase.transaction_date);
        if (filters.dateRange?.start && purchaseDate < new Date(filters.dateRange.start)) return false;
        if (filters.dateRange?.end && purchaseDate > new Date(filters.dateRange.end)) return false;
        return true;
      });
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      result = result.filter((purchase) => {
        const status = purchase.status || 'draft';
        return status === filters.status;
      });
    }

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        let aVal: any = a[sortConfig.key];
        let bVal: any = b[sortConfig.key];

        if (sortConfig.key === 'transaction_date') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }

        if (['final_total', 'paid_amount'].includes(sortConfig.key)) {
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
    }

    return result;
  }, [purchases, searchTerm, filters, sortConfig]);

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
      p.status === 'returned' || (p.invoice_no || '').includes('RET')
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
            <div className="p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50 transition-standard hover-lift animate-entrance">
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
            <div className="p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50 transition-standard hover-lift animate-entrance-delay-1">
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
            <div className="p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50 transition-standard hover-lift animate-entrance-delay-2">
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

        {/* Search & Filter Bar */}
        <div className="h-14 flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
            <Input
              type="text"
              placeholder="Search by reference number or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 bg-[#111827] border-slate-800 text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
            />
          </div>
          <FilterDropdown
            onFilterChange={setFilters}
            activeFilters={filters}
            showDateRange={true}
            showStatus={true}
            statusOptions={[
              { value: 'all', label: 'All Status' },
              { value: 'final', label: 'Received' },
              { value: 'draft', label: 'Draft' },
              { value: 'ordered', label: 'Ordered' },
              { value: 'returned', label: 'Returned' },
            ]}
          />
        </div>

        {/* Table - Skeleton matches exact layout */}
        {isLoading ? (
          <TableSkeleton rows={10} columns={5} />
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
              { key: 'date', header: 'Date', width: 150, render: (p) => <span className="text-slate-400 text-sm">{p.transaction_date ? format(new Date(p.transaction_date), 'MMM dd, yyyy') : '—'}</span> },
              { key: 'supplier', header: 'Supplier', width: 200, render: (p) => <span className="text-slate-100">{p.supplier_name || 'N/A'}</span> },
              { key: 'total', header: 'Amount', width: 150, render: (p) => <span className="text-slate-100 font-medium">{formatCurrency(p.final_total)}</span> },
              { 
                key: 'status', 
                header: 'Status', 
                width: 130, 
                render: (p) => {
                  const variants: Record<string, { className: string; label: string }> = {
                    final: { className: 'bg-green-100 text-green-700', label: 'Received' },
                    draft: { className: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
                    pending: { className: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
                    ordered: { className: 'bg-blue-100 text-blue-700', label: 'Ordered' },
                    received: { className: 'bg-green-100 text-green-700', label: 'Received' },
                    cancelled: { className: 'bg-red-100 text-red-700', label: 'Cancelled' },
                    returned: { className: 'bg-orange-100 text-orange-700', label: 'Returned' },
                  };
                  const variant = variants[p.status] || variants.draft;
                  return <Badge className={cn("px-3 py-1 rounded-full text-xs font-medium", variant.className)}>{variant.label}</Badge>;
                }
              },
              { 
                key: 'actions', 
                header: 'Actions', 
                width: 100, 
                render: (p) => (
                  <DropdownMenu
                    trigger={
                      <button className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-0 active:outline-none active:ring-0">
                        <MoreVertical size={18} />
                      </button>
                    }
                  >
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleView(p.id)}>
                        <Eye className="h-4 w-4 mr-2" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {}}>
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
                    <SortableTableHeader
                      label="Date"
                      sortKey="transaction_date"
                      currentSort={sortConfig}
                      onSort={handleSort}
                    />
                    <SortableTableHeader
                      label="Supplier"
                      sortKey="supplier_name"
                      currentSort={sortConfig}
                      onSort={handleSort}
                    />
                    <SortableTableHeader
                      label="Amount"
                      sortKey="final_total"
                      currentSort={sortConfig}
                      onSort={handleSort}
                    />
                    <TableHead className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider min-w-[130px]">
                      Status
                    </TableHead>
                    <TableHead className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((purchase, index) => (
                    <PurchaseRow 
                      key={purchase.id} 
                      purchase={purchase} 
                      onView={handleView}
                      className={cn(
                        "animate-entrance",
                        index === 0 && "animate-entrance",
                        index === 1 && "animate-entrance-delay-1",
                        index === 2 && "animate-entrance-delay-2",
                        index >= 3 && "animate-entrance-delay-3"
                      )}
                    />
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
