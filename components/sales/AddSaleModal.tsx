/**
 * Add Sale Modal Component
 * Matches Figma design with additional services section
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Search, Plus, Minus, Trash2, ShoppingBag, Calendar, HelpCircle, Box, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { PackingEntryDialog } from './PackingEntryDialog';

interface PackingData {
  boxes: Array<{ id: string; pieces: Array<{ id: string; meters: number }> }>;
  loosePieces: Array<{ id: string; meters: number }>;
  totalBoxes: number;
  totalPieces: number;
  totalMeters: number;
}

interface SaleItem {
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

interface AdditionalService {
  id: string;
  name: string;
  price: number;
}

interface AddSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddSaleModal({ isOpen, onClose, onSuccess }: AddSaleModalProps) {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customer, setCustomer] = useState<string>('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [status, setStatus] = useState<'draft' | 'final'>('draft');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [services, setServices] = useState<AdditionalService[]>([]);
  const [customers, setCustomers] = useState<Array<{ id: number; name: string }>>([]);
  const [products, setProducts] = useState<Array<{ id: number; name: string; sku: string; stock: number }>>([]);
  const [packingDialogOpen, setPackingDialogOpen] = useState(false);
  const [currentPackingItem, setCurrentPackingItem] = useState<SaleItem | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      loadProducts();
    }
  }, [isOpen]);

  const loadCustomers = async () => {
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
        .or('type.eq.customer,type.eq.both')
        .order('name');

      if (data) {
        setCustomers(data.map((c) => ({ id: c.id, name: c.name })));
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
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

    const newItem: SaleItem = {
      id: `item-${Date.now()}`,
      product_id: product.id,
      product_name: product.name,
      sku: product.sku,
      stock: product.stock,
      quantity: 1,
      unit_price: 0,
      discount: 0,
      subtotal: 0,
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

  const addService = () => {
    const newService: AdditionalService = {
      id: `service-${Date.now()}`,
      name: '',
      price: 0,
    };
    setServices([...services, newService]);
  };

  const updateService = (serviceId: string, field: 'name' | 'price', value: string | number) => {
    setServices(services.map((s) => (s.id === serviceId ? { ...s, [field]: value } : s)));
  };

  const removeService = (serviceId: string) => {
    setServices(services.filter((s) => s.id !== serviceId));
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const itemsSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const servicesTotal = services.reduce((sum, s) => sum + s.price, 0);
  const subtotal = itemsSubtotal + servicesTotal;
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
        acc.totalMeters += item.packing.totalMeters;
      }
      return acc;
    },
    { totalBoxes: 0, totalPieces: 0, totalMeters: 0 }
  );

  const handleSubmit = async (isFinal: boolean) => {
    if (!customer) {
      toast.error('Please select a customer');
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
        toast.error('Please log in to create a sale');
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

      // Get customer type for pricing
      let customerType: 'retail' | 'wholesale' | null = null;
      if (customer !== 'walkin') {
        const { data: contact } = await supabase
          .from('contacts')
          .select('customer_type')
          .eq('id', parseInt(customer))
          .single();
        customerType = contact?.customer_type || 'retail';
      } else {
        customerType = 'retail'; // Walk-in customers are retail
      }

      // Get variations for products
      const productIds = items.map(item => item.product_id);
      const { data: variationsData } = await supabase
        .from('variations')
        .select('id, product_id, product_variation_id, retail_price, wholesale_price')
        .in('product_id', productIds);

      if (!variationsData || variationsData.length === 0) {
        toast.error('Product variations not found');
        return;
      }

      // Validate stock availability if finalizing
      if (isFinal) {
        for (const item of items) {
          const variation = variationsData.find(v => v.product_id === item.product_id);
          if (!variation) continue;

          // Get current stock
          const { data: stock } = await supabase
            .from('variation_location_details')
            .select('qty_available')
            .eq('variation_id', variation.id)
            .eq('location_id', location.id)
            .single();

          const availableStock = parseFloat(stock?.qty_available?.toString() || '0');
          const requiredQuantity = item.quantity;

          if (availableStock < requiredQuantity) {
            toast.error(`Insufficient stock for ${item.product_name}. Available: ${availableStock}, Required: ${requiredQuantity}`);
            return;
          }
        }
      }

      // Create transaction
      const refNo = `SAL-${Date.now()}`;
      const customerId = customer === 'walkin' ? null : parseInt(customer);
      
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          business_id: profile.business_id,
          location_id: location.id,
          type: 'sell',
          status: isFinal ? 'final' : 'draft',
          payment_status: isFinal ? 'paid' : 'due',
          contact_id: customerId,
          customer_type: customerType,
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

      // Create sell lines and collect for stock update and packing
      const sellLines = [];
      const stockUpdates: Array<{ variationId: number; locationId: number; quantityInPieces: number }> = [];
      const packingDataMap = new Map<number, { item: SaleItem; lineIndex: number }>();

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const variation = variationsData.find(v => v.product_id === item.product_id);
        
        if (!variation) {
          throw new Error(`Variation not found for product: ${item.product_name}`);
        }

        // Calculate quantity in pieces for stock update
        let quantityInPieces = item.quantity;
        
        // If packing data exists, quantity is in meters
        if (item.packing && item.packing.totalMeters > 0) {
          quantityInPieces = item.packing.totalMeters;
          // Store packing data for later insertion
          packingDataMap.set(i, { item, lineIndex: i });
        }

        const lineData = {
          transaction_id: transaction.id,
          variation_id: variation.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: item.discount,
          subtotal: item.subtotal,
        };

        sellLines.push(lineData);

        // Prepare stock update (only if finalizing)
        if (isFinal) {
          stockUpdates.push({
            variationId: variation.id,
            locationId: location.id,
            quantityInPieces: quantityInPieces,
          });
        }
      }

      // Insert sell lines
      const { data: insertedLines, error: linesError } = await supabase
        .from('transaction_sell_lines')
        .insert(sellLines)
        .select();

      if (linesError) {
        throw new Error(`Failed to create sell lines: ${linesError.message}`);
      }

      // Save packing data if exists
      for (const [itemIndex, { item, lineIndex }] of packingDataMap.entries()) {
        if (!item.packing || !insertedLines || !insertedLines[lineIndex]) continue;

        const sellLine = insertedLines[lineIndex];
        const packing = item.packing;

        // Create packing record
        const { data: packingRecord, error: packingError } = await supabase
          .from('sale_item_packing')
          .insert({
            transaction_sell_line_id: sellLine.id,
            entry_mode: packing.boxes.length > 0 ? 'detailed' : 'quick',
            quick_boxes: packing.totalBoxes,
            quick_pieces: packing.totalPieces,
            quick_meters: packing.totalMeters,
            total_boxes: packing.totalBoxes,
            total_pieces: packing.totalPieces,
            total_meters: packing.totalMeters,
          })
          .select()
          .single();

        if (packingError) {
          console.error('Failed to save packing data:', packingError);
          // Don't throw - packing is optional
          continue;
        }

        // Save detailed packing data (boxes and pieces) if in detailed mode
        if (packing.boxes.length > 0 && packingRecord) {
          for (const box of packing.boxes) {
            const { data: boxRecord, error: boxError } = await supabase
              .from('packing_boxes')
              .insert({
                packing_id: packingRecord.id,
                box_number: parseInt(box.id.replace('box-', '')) || 1,
              })
              .select()
              .single();

            if (boxError) {
              console.error('Failed to save box:', boxError);
              continue;
            }

            // Save pieces in this box
            for (const piece of box.pieces) {
              await supabase
                .from('packing_pieces')
                .insert({
                  box_id: boxRecord.id,
                  packing_id: packingRecord.id,
                  piece_number: parseInt(piece.id.replace('piece-', '')) || 1,
                  meters: piece.meters,
                  is_loose: false,
                });
            }
          }

          // Save loose pieces
          for (const loosePiece of packing.loosePieces) {
            await supabase
              .from('packing_pieces')
              .insert({
                box_id: null,
                packing_id: packingRecord.id,
                piece_number: parseInt(loosePiece.id.replace('loose-', '')) || 1,
                meters: loosePiece.meters,
                is_loose: true,
              });
          }
        }
      }

      // Update stock if finalizing (deduct stock)
      if (isFinal && stockUpdates.length > 0) {
        for (const stockUpdate of stockUpdates) {
          // Get current stock
          const { data: currentStock } = await supabase
            .from('variation_location_details')
            .select('qty_available')
            .eq('variation_id', stockUpdate.variationId)
            .eq('location_id', stockUpdate.locationId)
            .single();

          if (!currentStock) {
            throw new Error(`Stock record not found for variation ${stockUpdate.variationId} at location ${stockUpdate.locationId}`);
          }

          const currentQty = parseFloat(currentStock.qty_available?.toString() || '0');
          const newStock = Math.max(0, currentQty - stockUpdate.quantityInPieces);

          if (newStock < 0) {
            throw new Error(`Insufficient stock. Available: ${currentQty}, Required: ${stockUpdate.quantityInPieces}`);
          }

          // Update stock
          const { error: stockError } = await supabase
            .from('variation_location_details')
            .update({ qty_available: newStock.toString() })
            .eq('variation_id', stockUpdate.variationId)
            .eq('location_id', stockUpdate.locationId);

          if (stockError) {
            throw new Error(`Failed to update stock: ${stockError.message}`);
          }
        }
      }

      toast.success(`Sale ${isFinal ? 'finalized' : 'saved as draft'} successfully!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      // Rollback transaction if created
      if (transactionId) {
        await supabase.from('transactions').delete().eq('id', transactionId);
      }
      toast.error(err instanceof Error ? err.message : 'Failed to create sale');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto relative">
        {/* Header - Figma Design */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <ShoppingBag size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">Add New Sale</h2>
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
          {/* Sale Details - Figma Design */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-400 text-sm mb-2 block flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Customer
              </Label>
              <select
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="walkin">Walk-in Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id.toString()}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-gray-400 text-sm mb-2 block flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white pl-10 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-400 text-sm mb-2 block">Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'draft' | 'final')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
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
                    <tr key={item.id} className="hover:bg-gray-800/30">
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
                                  <span className="text-green-300">{item.quantity.toFixed(1)} M</span>
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

          {/* Notes and Additional Services */}
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

            {/* Additional Services */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Additional Services (Stitching/Dying)</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addService}
                  className="text-blue-400 hover:text-blue-300"
                >
                  <Plus size={16} className="mr-1" />
                  Add Service
                </Button>
              </div>
              {services.length === 0 ? (
                <p className="text-gray-500 text-sm">No additional services added.</p>
              ) : (
                <div className="space-y-2">
                  {services.map((service) => (
                    <div key={service.id} className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={service.name}
                        onChange={(e) => updateService(service.id, 'name', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        placeholder="Service name"
                        className="flex-1 bg-gray-900 border-gray-700 text-white"
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={service.price}
                        onChange={(e) => updateService(service.id, 'price', parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="Price"
                        className="w-24 bg-gray-900 border-gray-700 text-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeService(service.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="space-y-3">
              {/* Packing Breakdown */}
              {packingTotals.totalPieces > 0 && (
                <div className="mb-4 pb-3 border-b border-gray-700">
                  <div className="text-xs text-gray-500 mb-2">Packing Summary</div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-gray-400">{packingTotals.totalBoxes}</span>
                      <span className="text-gray-500">Box</span>
                    </div>
                    <span className="text-gray-600">/</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">{packingTotals.totalPieces}</span>
                      <span className="text-gray-500">Pc</span>
                    </div>
                    <span className="text-gray-600">/</span>
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
                <span className="text-white">{formatCurrency(shipping)}</span>
              </div>
              <div className="pt-3 border-t border-gray-700">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-white">Grand Total:</span>
                  <span className="text-2xl font-bold text-blue-400">{formatCurrency(grandTotal)}</span>
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
              className="bg-green-600 hover:bg-green-500 text-white text-lg font-semibold px-6 py-3"
            >
              Finalize Sale • {formatCurrency(grandTotal)}
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

