/**
 * Add Purchase Modal Component
 * Matches Figma design with product table and summary section
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Search, Plus, Minus, Trash2, Truck, Calendar, HelpCircle, Box, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { PackingEntryDialog } from '@/components/sales/PackingEntryDialog';

interface PackingData {
  boxes: Array<{ id: string; pieces: Array<{ id: string; meters: number }> }>;
  loosePieces: Array<{ id: string; meters: number }>;
  totalBoxes: number;
  totalPieces: number;
  totalMeters: number;
}

interface PurchaseItem {
  id: string;
  product_id: number;
  product_name: string;
  sku: string;
  stock: number;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
  packing?: PackingData;
}

interface AddPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddPurchaseModal({ isOpen, onClose, onSuccess }: AddPurchaseModalProps) {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [supplier, setSupplier] = useState<string>('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [status, setStatus] = useState<'draft' | 'final'>('draft');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: number; name: string }>>([]);
  const [products, setProducts] = useState<Array<{ id: number; name: string; sku: string; stock: number }>>([]);
  const [packingDialogOpen, setPackingDialogOpen] = useState(false);
  const [currentPackingItem, setCurrentPackingItem] = useState<PurchaseItem | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSuppliers();
      loadProducts();
    }
  }, [isOpen]);

  const loadSuppliers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) return;

      const { data } = await supabase
        .from('contacts')
        .select('id, name')
        .eq('business_id', profile.business_id)
        .or('type.eq.supplier,type.eq.both')
        .order('name');

      if (data) {
        setSuppliers(data.map((c) => ({ id: c.id, name: c.name })));
      }
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    }
  };

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

      const { data } = await supabase
        .from('products')
        .select('id, name, sku')
        .eq('business_id', profile.business_id)
        .order('name')
        .limit(100);

      if (data) {
        setProducts(data.map((p) => ({ id: p.id, name: p.name, sku: p.sku || '', stock: 0 })));
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  const addProduct = (product: typeof products[0]) => {
    const existingItem = items.find((item) => item.product_id === product.id);
    if (existingItem) {
      updateQuantity(existingItem.id, existingItem.quantity + 1);
      return;
    }

    const newItem: PurchaseItem = {
      id: `item-${Date.now()}`,
      product_id: product.id,
      product_name: product.name,
      sku: product.sku,
      stock: product.stock,
      quantity: 1,
      unit_price: 0,
      discount: 0,
      subtotal: 0, // Will be calculated when unit_price is set
    };
    setItems([...items, newItem]);
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(itemId);
      return;
    }
    setItems(items.map((item) => {
      if (item.id === itemId) {
        // If packing data exists, don't allow manual quantity change
        if (item.packing && item.packing.totalPieces > 0) {
          toast.info('Quantity is calculated from Box/PC data. Update packing to change quantity.');
          return item;
        }
        const subtotal = (item.unit_price * quantity) - item.discount;
        return { ...item, quantity, subtotal };
      }
      return item;
    }));
  };

  const updateUnitPrice = (itemId: string, price: number) => {
    setItems(items.map((item) => {
      if (item.id === itemId) {
        const subtotal = (price * item.quantity) - item.discount;
        return { ...item, unit_price: price, subtotal };
      }
      return item;
    }));
  };

  const updateDiscount = (itemId: string, discount: number) => {
    setItems(items.map((item) => {
      if (item.id === itemId) {
        const subtotal = (item.unit_price * item.quantity) - discount;
        return { ...item, discount, subtotal };
      }
      return item;
    }));
  };

  const removeItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId));
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const discount = items.reduce((sum, item) => sum + item.discount, 0);
  const tax = subtotal * 0.1; // 10% tax
  const shipping = 0;
  const grandTotal = subtotal - discount + tax + shipping;

  // Calculate total packing breakdown
  const packingTotals = items.reduce(
    (acc, item) => {
      if (item.packing && item.packing.totalPieces > 0) {
        acc.totalBoxes += item.packing.totalBoxes;
        acc.totalPieces += item.packing.totalPieces;
      }
      // Total meters should include all item quantities, not just packing meters
      acc.totalMeters += item.quantity;
      return acc;
    },
    { totalBoxes: 0, totalPieces: 0, totalMeters: 0 }
  );

  const handleSubmit = async (isFinal: boolean) => {
    if (!supplier) {
      toast.error('Please select a supplier');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    // Validate items
    for (const item of items) {
      if (item.unit_price <= 0) {
        toast.error(`Please enter unit price for ${item.product_name}`);
        return;
      }
      if (item.quantity <= 0) {
        toast.error(`Please enter quantity for ${item.product_name}`);
        return;
      }
    }

    setLoading(true);
    let transactionId: number | null = null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to create a purchase');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) {
        toast.error('Business profile not found');
        return;
      }

      // Get default location
      const { data: location } = await supabase
        .from('business_locations')
        .select('id')
        .eq('business_id', profile.business_id)
        .limit(1)
        .single();

      if (!location) {
        toast.error('No business location found');
        return;
      }

      // Get variations and products for unit conversion
      const productIds = items.map(item => item.product_id);
      const { data: variationsData } = await supabase
        .from('variations')
        .select('id, product_id, product_variation_id')
        .in('product_id', productIds);

      if (!variationsData || variationsData.length === 0) {
        toast.error('Product variations not found');
        return;
      }

      // Get products for unit_id
      const { data: productsData } = await supabase
        .from('products')
        .select('id, unit_id')
        .in('id', productIds);

      // Get base unit for stock conversion
      const { data: baseUnit } = await supabase
        .from('units')
        .select('id')
        .eq('business_id', profile.business_id)
        .is('base_unit_id', null)
        .limit(1)
        .single();

      // Create transaction
      const refNo = `PUR-${Date.now()}`;
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          business_id: profile.business_id,
          location_id: location.id,
          type: 'purchase',
          status: isFinal ? 'final' : 'draft',
          payment_status: isFinal ? 'paid' : 'due',
          contact_id: supplier === 'walkin' ? null : parseInt(supplier),
          ref_no: refNo,
          transaction_date: date,
          total_before_tax: subtotal,
          tax_amount: tax,
          discount_amount: discount,
          shipping_charges: shipping,
          final_total: grandTotal,
          additional_notes: notes,
          created_by: session.user.id,
        })
        .select()
        .single();

      if (transactionError) {
        throw new Error(`Failed to create transaction: ${transactionError.message}`);
      }

      transactionId = transaction.id;

      // Create purchase lines and collect for stock update
      const purchaseLines = [];
      const stockUpdates: Array<{ variationId: number; locationId: number; quantityInPieces: number }> = [];

      for (const item of items) {
        const variation = variationsData.find(v => v.product_id === item.product_id);
        const product = productsData?.find(p => p.id === item.product_id);
        
        if (!variation) {
          throw new Error(`Variation not found for product: ${item.product_name}`);
        }

        // Calculate quantity in pieces for stock update
        // If packing data exists, use totalMeters (which is already in meters)
        // For stock, we need to convert meters to pieces if needed
        // For now, assuming quantity is already in base unit (pieces) or meters
        // If it's meters, we'll need unit conversion - for simplicity, treating quantity as pieces
        let quantityInPieces = item.quantity;
        
        // If packing data exists, quantity is in meters, need to convert
        // For fabric: 1 meter = 1 piece (simplified, adjust based on your business logic)
        // You may need to add unit conversion logic here based on your product units
        if (item.packing && item.packing.totalMeters > 0) {
          // For fabric products, meters might be the base unit
          // Adjust this conversion based on your business logic
          quantityInPieces = item.packing.totalMeters;
        }

        const lineData = {
          transaction_id: transaction.id,
          variation_id: variation.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_id: product?.unit_id || 1,
          unit_price: item.unit_price,
          discount_amount: item.discount,
          subtotal: item.subtotal,
        };

        purchaseLines.push(lineData);

        // Prepare stock update (only if finalizing)
        if (isFinal) {
          stockUpdates.push({
            variationId: variation.id,
            locationId: location.id,
            quantityInPieces: quantityInPieces,
          });
        }
      }

      // Insert purchase lines
      const { data: insertedLines, error: linesError } = await supabase
        .from('purchase_lines')
        .insert(purchaseLines)
        .select();

      if (linesError) {
        throw new Error(`Failed to create purchase lines: ${linesError.message}`);
      }

      // Update stock if finalizing
      if (isFinal && stockUpdates.length > 0) {
        for (const stockUpdate of stockUpdates) {
          // Get current stock
          const { data: currentStock } = await supabase
            .from('variation_location_details')
            .select('qty_available, product_id, product_variation_id')
            .eq('variation_id', stockUpdate.variationId)
            .eq('location_id', stockUpdate.locationId)
            .single();

          const newStock = (parseFloat(currentStock?.qty_available?.toString() || '0')) + stockUpdate.quantityInPieces;

          if (currentStock) {
            // Update existing stock
            const { error: stockError } = await supabase
              .from('variation_location_details')
              .update({ qty_available: newStock.toString() })
              .eq('variation_id', stockUpdate.variationId)
              .eq('location_id', stockUpdate.locationId);

            if (stockError) {
              throw new Error(`Failed to update stock: ${stockError.message}`);
            }
          } else {
            // Create new stock record
            const variation = variationsData.find(v => v.id === stockUpdate.variationId);
            if (!variation) {
              throw new Error('Variation not found for stock update');
            }

            const { error: stockError } = await supabase
              .from('variation_location_details')
              .insert({
                variation_id: stockUpdate.variationId,
                product_id: variation.product_id,
                product_variation_id: variation.product_variation_id || null,
                location_id: stockUpdate.locationId,
                qty_available: newStock.toString(),
              });

            if (stockError) {
              throw new Error(`Failed to create stock record: ${stockError.message}`);
            }
          }
        }
      }

      // Save packing data if exists (for purchase items - if table exists)
      // Note: Currently packing structure is for sales, but can be extended for purchases
      // For now, we'll skip packing data for purchases unless purchase_item_packing table exists

      toast.success(`Purchase ${isFinal ? 'finalized' : 'saved as draft'} successfully!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      // Rollback transaction if created
      if (transactionId) {
        await supabase.from('transactions').delete().eq('id', transactionId);
      }
      toast.error(err instanceof Error ? err.message : 'Failed to create purchase');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto relative">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
              <Truck size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Add New Purchase</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Purchase Details */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-white mb-2 block">Supplier</Label>
              <select
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              >
                <option value="">Select Supplier</option>
                <option value="walkin">Walk-in Customer</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id.toString()}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-white mb-2 block">Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white pl-10"
                />
              </div>
            </div>

            <div>
              <Label className="text-white mb-2 block">Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'draft' | 'final')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              >
                <option value="draft">Draft</option>
                <option value="final">Final</option>
              </select>
            </div>
          </div>

          {/* Product Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Scan Barcode or Search Product..."
              className="bg-gray-800 border-gray-700 text-white pl-10"
            />
            {searchTerm && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg max-h-60 overflow-y-auto z-20">
                {filteredProducts.length > 0 ? (
                  filteredProducts.slice(0, 5).map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        addProduct(product);
                        setSearchTerm('');
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white"
                    >
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-gray-400">{product.sku}</div>
                    </button>
                  ))
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      // Open new product page or modal
                      window.open('/products/new', '_blank');
                      setSearchTerm('');
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-700 text-white border-t border-gray-700 flex items-center gap-2"
                  >
                    <Plus size={18} className="text-blue-400" />
                    <div>
                      <div className="font-medium text-blue-400">Add New Product</div>
                      <div className="text-xs text-gray-400">Create "{searchTerm}"</div>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Product Table */}
          <div className="border border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase min-w-[200px]">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Unit Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Discount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Subtotal</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      No items added. Search or scan to add products.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="group hover:bg-gray-800/30">
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-white font-medium">{item.product_name}</div>
                          <div className="text-xs text-gray-500">{item.sku}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
                          {item.stock} Pc
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2 w-full min-w-[200px]">
                          {item.packing && item.packing.totalPieces > 0 ? (
                            // If packing data exists, show styled Qty button like Figma
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setCurrentPackingItem(item);
                                  setPackingDialogOpen(true);
                                }}
                                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-medium transition-colors w-full justify-between"
                              >
                                <div className="flex items-center gap-2">
                                  <Box className="w-4 h-4" />
                                  <span>{item.packing.totalBoxes} Box</span>
                                  <span>/</span>
                                  <span>{item.packing.totalPieces} Pc</span>
                                  <span>/</span>
                                  <span className="text-green-300">{item.packing.totalMeters.toFixed(1)} M</span>
                                </div>
                                <Pencil className="w-4 h-4" />
                              </button>
                              <div className="text-xs text-gray-400 text-center">
                                Qty: <span className="text-white font-semibold">{item.quantity.toFixed(2)} M</span>
                              </div>
                            </>
                          ) : (
                            // If no packing data, show "Add Packing" button on top, then quantity controls (Figma style)
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setCurrentPackingItem(item);
                                  setPackingDialogOpen(true);
                                }}
                                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-700 transition-colors mb-2 opacity-0 group-hover:opacity-100 transition-opacity w-full"
                              >
                                <Box size={12} />
                                <span>Add Packing</span>
                              </button>
                              <div className="flex items-center gap-1.5 w-full">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  className="p-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 transition-colors flex items-center justify-center flex-shrink-0"
                                  style={{ borderWidth: '1px' }}
                                >
                                  <Minus size={14} />
                                </button>
                                <Input
                                  type="number"
                                  min="1"
                                  step="0.01"
                                  value={item.quantity}
                                  onChange={(e) => updateQuantity(item.id, parseFloat(e.target.value) || 1)}
                                  onFocus={(e) => e.target.select()}
                                  className="flex-1 min-w-0 text-center bg-gray-800 border-gray-700 text-white text-sm font-medium h-[30px] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="p-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 transition-colors flex items-center justify-center flex-shrink-0"
                                  style={{ borderWidth: '1px' }}
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateUnitPrice(item.id, parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          className="w-24 bg-gray-800 border-gray-700 text-white"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.discount}
                          onChange={(e) => updateDiscount(item.id, parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          className="w-24 bg-gray-800 border-gray-700 text-white"
                        />
                      </td>
                      <td className="px-4 py-3 text-white font-medium">
                        {formatCurrency(item.subtotal)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Notes and Summary */}
          <div className="grid grid-cols-2 gap-6">
            {/* Notes */}
            <div>
              <Label className="text-white mb-2 block">Sale Notes / Staff Notes</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes relevant to this transaction..."
                className="w-full h-32 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder:text-gray-500 resize-none"
              />
            </div>

            {/* Summary */}
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
              {/* Packing Breakdown */}
              {items.length > 0 && (
                <div className="mb-4 pb-3 border-b border-gray-700">
                  <div className="text-xs text-gray-500 mb-2">Packing Summary</div>
                  <div className="flex items-center gap-4 text-sm">
                    {packingTotals.totalBoxes > 0 && (
                      <>
                        <div className="flex items-center gap-1.5">
                          <Box className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-gray-400">{packingTotals.totalBoxes}</span>
                          <span className="text-gray-500">Box</span>
                        </div>
                        <span className="text-gray-600">/</span>
                      </>
                    )}
                    {packingTotals.totalPieces > 0 && (
                      <>
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400">{packingTotals.totalPieces}</span>
                          <span className="text-gray-500">Pc</span>
                        </div>
                        <span className="text-gray-600">/</span>
                      </>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="text-green-400 font-medium">{packingTotals.totalMeters.toFixed(2)}</span>
                      <span className="text-gray-500">M</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-between text-gray-400">
                <span>Subtotal:</span>
                <span className="text-white">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Discount:</span>
                <span className="text-red-400">-{formatCurrency(discount)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Order Tax (10%):</span>
                <span className="text-white">{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Shipping & Handling:</span>
                <div className="flex items-center gap-2">
                  <span className="text-white">{formatCurrency(shipping)}</span>
                  <button
                    type="button"
                    className="text-blue-400 hover:text-blue-300 text-sm"
                    onClick={() => toast.info('Shipping feature coming soon')}
                  >
                    Add (+)
                  </button>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-700">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-white">Grand Total:</span>
                  <span className="text-2xl font-bold text-orange-400">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-800">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              onClick={() => handleSubmit(true)}
              isLoading={loading}
              className="bg-green-600 hover:bg-green-500 text-white"
            >
              Finalize Purchase • {formatCurrency(grandTotal)}
            </Button>
          </div>
        </div>

        {/* Help Icon */}
        <button className="fixed bottom-6 right-6 p-3 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors">
          <HelpCircle size={20} />
        </button>
      </div>

      {/* Packing Entry Dialog */}
      {currentPackingItem && (
        <PackingEntryDialog
          isOpen={packingDialogOpen}
          onClose={() => {
            setPackingDialogOpen(false);
            setCurrentPackingItem(null);
          }}
          onSave={(packingData) => {
            if (packingData) {
              setItems(items.map(item => {
                if (item.id === currentPackingItem.id) {
                  // If packing data exists, update quantity from totalMeters (not totalPieces)
                  const newQuantity = packingData.totalMeters > 0 ? packingData.totalMeters : item.quantity;
                  const subtotal = (item.unit_price * newQuantity) - item.discount;
                  return { 
                    ...item, 
                    packing: packingData,
                    quantity: newQuantity,
                    subtotal
                  };
                }
                return item;
              }));
              toast.success(`Packing saved: ${packingData.totalBoxes} boxes, ${packingData.totalPieces} pieces, ${packingData.totalMeters.toFixed(2)} meters`);
            }
            setPackingDialogOpen(false);
            setCurrentPackingItem(null);
          }}
          productName={currentPackingItem.product_name}
          productSku={currentPackingItem.sku}
          initialData={currentPackingItem.packing || null}
        />
      )}
    </div>
  );
}

