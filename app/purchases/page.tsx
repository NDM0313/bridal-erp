/**
 * Purchases Management Page
 * Manages procurement of inventory from suppliers
 * Follows docs/modules/Purchases.md specifications
 */

'use client';

import { useEffect, useState } from 'react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { purchasesApi, type Purchase } from '@/lib/api/purchases';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Eye, ShoppingBag, DollarSign, RotateCcw, Search, MoreVertical, FileText } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyState } from '@/components/placeholders/EmptyState';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface PurchaseStats {
  totalPurchase: number;
  amountDue: number;
  returns: number;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<PurchaseStats>({
    totalPurchase: 0,
    amountDue: 0,
    returns: 0,
  });

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await purchasesApi.getAll({ per_page: 100, status: 'final' });
      
      if (response.success && response.data) {
        setPurchases(response.data);

        // Calculate stats
        const totalPurchase = response.data.reduce((sum, p) => sum + (p.final_total || 0), 0);
        
        // Calculate amount due (assuming paid_amount field exists or calculate from payments)
        const amountDue = response.data.reduce((sum, p) => {
          const paid = (p as any).paid_amount || 0;
          const total = p.final_total || 0;
          return sum + Math.max(0, total - paid);
        }, 0);

        // Returns count (purchases with status indicating return)
        const returns = response.data.filter((p) => 
          (p as any).status === 'returned' || (p.ref_no || '').includes('RET')
        ).length;

        setStats({
          totalPurchase,
          amountDue,
          returns,
        });
      } else {
        throw new Error(response.error?.message || 'Failed to load purchases');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load purchases';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      final: { className: 'bg-green-500/10 text-green-500', label: 'Received' },
      draft: { className: 'bg-yellow-500/10 text-yellow-500', label: 'Pending' },
      ordered: { className: 'bg-blue-500/10 text-blue-500', label: 'Ordered' },
      returned: { className: 'bg-orange-500/10 text-orange-500', label: 'Returned' },
    };

    const variant = variants[status] || variants.draft;
    return (
      <Badge variant="outline" className={variant.className}>
        {variant.label}
      </Badge>
    );
  };

  // Filter purchases
  const filteredPurchases = purchases.filter((purchase) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      purchase.ref_no?.toLowerCase().includes(term) ||
      purchase.contact?.name?.toLowerCase().includes(term) ||
      false
    );
  });

  return (
    <ModernDashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Purchase Management</h1>
            <p className="mt-1 text-sm text-gray-400">Manage purchase orders, supplier dues, and inventory restocking</p>
          </div>
          <Link href="/purchases/new">
            <Button className="bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/20">
              <Plus className="h-4 w-4 mr-2" />
              New Purchase
            </Button>
          </Link>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Purchase Card - ShoppingBag (Orange) */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ShoppingBag size={80} className="text-orange-500" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400">
                  <ShoppingBag size={24} />
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-1">Total Purchase</p>
              <p className="text-2xl font-bold text-orange-400">{formatCurrency(stats.totalPurchase)}</p>
            </div>
          </div>

          {/* Amount Due Card - DollarSign (Red) */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <DollarSign size={80} className="text-red-500" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-red-500/10 text-red-400">
                  <DollarSign size={24} />
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-1">Amount Due</p>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(stats.amountDue)}</p>
            </div>
          </div>

          {/* Returns Card - RotateCcw (Yellow) */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <RotateCcw size={80} className="text-yellow-500" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-yellow-500/10 text-yellow-400">
                  <RotateCcw size={24} />
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-1">Returns</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.returns}</p>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <Input
              type="text"
              placeholder="Search by reference number or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Purchases Table */}
        {loading ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <Skeleton className="h-64" />
          </div>
        ) : error ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12">
            <div className="text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <Button variant="outline" onClick={loadPurchases}>
                Retry
              </Button>
            </div>
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12">
            <EmptyState
              icon={ShoppingBag}
              title="No purchases found"
              description={
                searchTerm
                  ? 'No purchases match your search criteria'
                  : 'Get started by creating your first purchase order'
              }
              action={
                !searchTerm
                  ? {
                      label: 'Create Purchase',
                      onClick: () => (window.location.href = '/purchases/new'),
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
                {filteredPurchases.map((purchase) => {
                  const paidAmount = (purchase as any).paid_amount || 0;
                  const totalAmount = purchase.final_total || 0;
                  const dueAmount = Math.max(0, totalAmount - paidAmount);
                  const refNo = purchase.ref_no || `PO-${purchase.id}`;

                  return (
                    <TableRow key={purchase.id} className="hover:bg-gray-800/30 transition-colors">
                      <TableCell>
                        <span className="font-mono text-gray-400">{refNo}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-white">
                          {purchase.contact?.name || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {purchase.transaction_date
                          ? format(new Date(purchase.transaction_date), 'MMM dd, yyyy')
                          : '—'}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {formatCurrency(totalAmount)}
                      </TableCell>
                      <TableCell className="text-green-400">
                        {paidAmount > 0 ? formatCurrency(paidAmount) : '—'}
                      </TableCell>
                      <TableCell className={cn('font-medium', dueAmount > 0 ? 'text-red-400' : 'text-gray-500')}>
                        {dueAmount > 0 ? formatCurrency(dueAmount) : '—'}
                      </TableCell>
                      <TableCell>{getStatusBadge(purchase.status)}</TableCell>
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
                          <DropdownMenuItem onClick={() => (window.location.href = `/purchases/${purchase.id}`)}>
                            <Eye size={14} className="inline mr-2" />
                            View Details
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
    </ModernDashboardLayout>
  );
}

