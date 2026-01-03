'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Search, Plus, Minus, Save, AlertCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AdjustmentItem {
  id: string;
  product_id: number;
  variation_id: number;
  product_name: string;
  variation_name: string;
  sku: string;
  adjustment_type: 'increase' | 'decrease';
  quantity: string;
  unit_id: number;
  unit_name: string;
  reason: string;
}

interface StockAdjustmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StockAdjustmentDrawer({ isOpen, onClose, onSuccess }: StockAdjustmentDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [items, setItems] = useState<AdjustmentItem[]>([]);
  const [products, setProducts] = useState<Array<{ id: number; name: string; sku: string; variations: Array<{ id: number; name: string; sub_sku: string; unit_id: number; unit_name: string }> }>>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProductIndex, setSelectedProductIndex] = useState(-1);
  const productSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadProducts();
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setItems([]);
      setProductSearchTerm('');
    }
  }, [isOpen]);

  const loadProducts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) return;

      const { data: productsData, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          sku,
          variations (
            id,
            name,
            sub_sku,
            unit_id,
            units (
              name
            )
          )
        `)
        .eq('business_id', profile.business_id)
        .order('name');

      if (error) throw error;

      const formattedProducts = (productsData || []).map((product: any) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        variations: (product.variations || []).map((variation: any) => ({
          id: variation.id,
          name: variation.name || 'Default',
          sub_sku: variation.sub_sku || product.sku,
          unit_id: variation.unit_id,
          unit_name: variation.units?.name || 'Pieces',
        })),
      }));

      setProducts(formattedProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.variations.some(v => v.sub_sku.toLowerCase().includes(productSearchTerm.toLowerCase()))
  );

  const handleAddProduct = () => {
    if (!productSearchTerm) {
      toast.error('Please search for a product first');
      return;
    }

    const selectedProduct = filteredProducts[selectedProductIndex >= 0 ? selectedProductIndex : 0];
    if (!selectedProduct || !selectedProduct.variations.length) {
      toast.error('Product not found or has no variations');
      return;
    }

    const variation = selectedProduct.variations[0]; // Use first variation by default
    const newItem: AdjustmentItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      product_id: selectedProduct.id,
      variation_id: variation.id,
      product_name: selectedProduct.name,
      variation_name: variation.name,
      sku: variation.sub_sku,
      adjustment_type: 'increase',
      quantity: '1',
      unit_id: variation.unit_id,
      unit_name: variation.unit_name,
      reason: '',
    };

    setItems([...items, newItem]);
    setProductSearchTerm('');
    setSelectedProductIndex(-1);
    setShowProductDropdown(false);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof AdjustmentItem, value: string | number) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error('Please add at least one item to adjust');
      return;
    }

    // Validate all items
    for (const item of items) {
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        toast.error(`Please enter a valid quantity for ${item.product_name}`);
        return;
      }
      if (!item.reason.trim()) {
        toast.error(`Please enter a reason for ${item.product_name}`);
        return;
      }
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to continue');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id, location_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) {
        toast.error('Business profile not found');
        return;
      }

      // Create transaction
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          type: 'stock_adjustment',
          business_id: profile.business_id,
          location_id: profile.location_id,
          transaction_date: date,
          status: 'final',
          created_by: session.user.id,
          ref_no: `ADJ-${Date.now()}`,
        })
        .select()
        .single();

      if (txError) throw txError;

      // Create adjustment lines and update stock
      for (const item of items) {
        const quantity = parseFloat(item.quantity);
        const adjustmentType = item.adjustment_type;

        // Get unit multiplier
        const { data: unit } = await supabase
          .from('units')
          .select('base_unit_multiplier')
          .eq('id', item.unit_id)
          .single();

        const multiplier = unit?.base_unit_multiplier || 1;
        const qtyInPieces = quantity * multiplier;

        // Create adjustment line
        const { error: lineError } = await supabase
          .from('stock_adjustment_lines')
          .insert({
            transaction_id: transaction.id,
            product_id: item.product_id,
            variation_id: item.variation_id,
            quantity: quantity,
            unit_id: item.unit_id,
            adjustment_type: adjustmentType,
            reason: item.reason,
          });

        if (lineError) throw lineError;

        // Update variation stock
        const { data: variation } = await supabase
          .from('variations')
          .select('qty_available')
          .eq('id', item.variation_id)
          .single();

        if (!variation) throw new Error('Variation not found');

        const currentStock = variation.qty_available || 0;
        const newStock = adjustmentType === 'increase'
          ? currentStock + qtyInPieces
          : Math.max(0, currentStock - qtyInPieces);

        const { error: updateError } = await supabase
          .from('variations')
          .update({ qty_available: newStock })
          .eq('id', item.variation_id);

        if (updateError) throw updateError;
      }

      toast.success('Stock adjusted successfully');
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to adjust stock:', error);
      toast.error(error.message || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[calc(100vw-280px)] max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold text-slate-100">Stock Adjustment</SheetTitle>
          <p className="text-sm text-slate-400 mt-1">Fix stock errors, damage, theft, or audit discrepancies</p>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Date */}
          <div>
            <Label className="text-slate-300">Adjustment Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-2 bg-[#111827] border-slate-800 text-slate-200"
            />
          </div>

          {/* Product Search */}
          <div>
            <Label className="text-slate-300">Add Product</Label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                ref={productSearchInputRef}
                type="text"
                placeholder="Search product by name or SKU..."
                value={productSearchTerm}
                onChange={(e) => {
                  setProductSearchTerm(e.target.value);
                  setShowProductDropdown(true);
                  setSelectedProductIndex(-1);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddProduct();
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedProductIndex(prev => 
                      prev < filteredProducts.length - 1 ? prev + 1 : prev
                    );
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedProductIndex(prev => prev > 0 ? prev - 1 : -1);
                  }
                }}
                onFocus={() => setShowProductDropdown(true)}
                className="pl-10 bg-[#111827] border-slate-800 text-slate-200"
                onClick={(e) => e.stopPropagation()}
              />
              {showProductDropdown && filteredProducts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-[#111827] border border-slate-800 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredProducts.map((product, index) => (
                    <div
                      key={product.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setProductSearchTerm(product.name);
                        setSelectedProductIndex(index);
                        setShowProductDropdown(false);
                        handleAddProduct();
                      }}
                      className={cn(
                        "px-4 py-2 cursor-pointer hover:bg-slate-800",
                        selectedProductIndex === index && "bg-slate-800"
                      )}
                    >
                      <div className="text-sm text-slate-200">{product.name}</div>
                      <div className="text-xs text-slate-400">{product.sku}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          {items.length > 0 && (
            <div className="space-y-4">
              <Label className="text-slate-300">Adjustment Items</Label>
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-slate-800">
                  <thead className="bg-slate-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Reason</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-950/50 divide-y divide-slate-800">
                    {items.map((item) => (
                      <tr key={item.id} onClick={(e) => e.stopPropagation()}>
                        <td className="px-4 py-3">
                          <div className="text-sm text-slate-200">{item.product_name}</div>
                          <div className="text-xs text-slate-400">{item.variation_name} - {item.sku}</div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={item.adjustment_type}
                            onChange={(e) => handleItemChange(item.id, 'adjustment_type', e.target.value as 'increase' | 'decrease')}
                            className="px-3 py-1.5 rounded bg-[#111827] border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="increase">Add</option>
                            <option value="decrease">Subtract</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                              className="w-24 bg-[#111827] border-slate-800 text-slate-200"
                              min="0"
                              step="0.01"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="text-xs text-slate-400">{item.unit_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="text"
                            value={item.reason}
                            onChange={(e) => handleItemChange(item.id, 'reason', e.target.value)}
                            placeholder="Reason..."
                            className="bg-[#111827] border-slate-800 text-slate-200"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-800">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || items.length === 0}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {loading ? 'Processing...' : 'Save Adjustment'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

