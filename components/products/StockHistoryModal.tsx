/**
 * StockHistoryModal Component
 * Shows stock movement history for a product
 * Displays transactions, adjustments, and stock changes
 */

'use client';

import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Package, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Product } from '@/lib/types/modern-erp';
import { supabase } from '@/utils/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface StockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

interface StockHistoryEntry {
  id: number;
  date: string;
  type: 'sale' | 'purchase' | 'adjustment' | 'transfer';
  quantity: number;
  location?: string;
  reference?: string;
  user?: string;
}

export function StockHistoryModal({ isOpen, onClose, product }: StockHistoryModalProps) {
  const [history, setHistory] = useState<StockHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      loadStockHistory();
    }
  }, [isOpen, product]);

  const loadStockHistory = async () => {
    if (!product) return;

    setLoading(true);
    try {
      // Get product variations
      const { data: variations } = await supabase
        .from('variations')
        .select('id')
        .eq('product_id', product.id);

      if (!variations || variations.length === 0) {
        setHistory([]);
        return;
      }

      const variationIds = variations.map((v) => v.id);

      // Get stock movements from variation_location_details (we'll track via updated_at)
      // For now, we'll show a placeholder - in production, you'd have a stock_movements table
      const { data: stockData } = await supabase
        .from('variation_location_details')
        .select('id, qty_available, updated_at, location_id, variation_id')
        .in('variation_id', variationIds)
        .order('updated_at', { ascending: false })
        .limit(50);

      // Get locations
      const locationIds = stockData?.map((s) => s.location_id) || [];
      const { data: locations } = await supabase
        .from('business_locations')
        .select('id, name')
        .in('id', locationIds);

      const locationMap = new Map(locations?.map((l) => [l.id, l.name]) || []);

      // Transform to history entries (simplified - in production, use actual stock_movements table)
      const historyEntries: StockHistoryEntry[] =
        stockData?.map((stock, index) => ({
          id: stock.id,
          date: stock.updated_at,
          type: 'adjustment' as const,
          quantity: parseFloat(stock.qty_available?.toString() || '0'),
          location: locationMap.get(stock.location_id) || 'Unknown',
          reference: `Stock Update #${stock.id}`,
        })) || [];

      setHistory(historyEntries);
    } catch (err) {
      console.error('Failed to load stock history:', err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  const getTypeBadge = (type: StockHistoryEntry['type']) => {
    const variants = {
      sale: { className: 'bg-red-500/10 text-red-500 border-red-500/20', label: 'Sale' },
      purchase: { className: 'bg-green-500/10 text-green-500 border-green-500/20', label: 'Purchase' },
      adjustment: { className: 'bg-blue-500/10 text-blue-500 border-blue-500/20', label: 'Adjustment' },
      transfer: { className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', label: 'Transfer' },
    };
    const variant = variants[type] || variants.adjustment;
    return (
      <Badge variant="outline" className={cn('text-xs', variant.className)}>
        {variant.label}
      </Badge>
    );
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center ${
        isOpen ? 'animate-in fade-in duration-200' : 'hidden'
      }`}
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-800 bg-gray-950 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-500">
              <Package size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Stock History</h3>
              <p className="text-xs text-gray-400">{product.name} ({product.sku})</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-gray-500" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <Package size={48} className="text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No stock history available</p>
              <p className="text-sm text-gray-500 mt-2">
                Stock movements will appear here once transactions are recorded
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-950/50 border-gray-800">
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-gray-800/30">
                    <TableCell className="text-gray-300 text-sm">
                      {format(new Date(entry.date), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>{getTypeBadge(entry.type)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {entry.type === 'sale' ? (
                          <TrendingDown size={14} className="text-red-400" />
                        ) : (
                          <TrendingUp size={14} className="text-green-400" />
                        )}
                        <span
                          className={cn(
                            'text-sm font-medium',
                            entry.type === 'sale' ? 'text-red-400' : 'text-green-400'
                          )}
                        >
                          {entry.type === 'sale' ? '-' : '+'}
                          {entry.quantity}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm">{entry.location || '—'}</TableCell>
                    <TableCell className="text-gray-400 text-sm">{entry.reference || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-800 bg-gray-950 flex items-center justify-end sticky bottom-0">
          <Button variant="outline" onClick={onClose} className="border-gray-700 text-gray-300 hover:bg-gray-800">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

