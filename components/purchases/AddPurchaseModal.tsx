/**
 * Add Purchase Modal Component
 * Matches Figma design with product table and summary section
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Search, Plus, Minus, Trash2, Truck, Calendar, HelpCircle, Pencil, FileText, User, CheckCircle2, ArrowDown, DollarSign, Save, Printer, Box } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { PackingOverlay } from './PackingOverlay';

interface PackingData {
  boxes: Array<{ id: string; pieces: Array<{ id: string; meters: number | string }> }>;
  loosePieces: Array<{ id: string; meters: number | string }>;
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
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Bank Transfer'>('Cash');
  const [paymentType, setPaymentType] = useState<'cash' | 'partial' | 'credit'>('cash'); // Cash, Partial, or Credit
  const [refNumber, setRefNumber] = useState(`PO-${String(Date.now()).slice(-3)}`);
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState(`SI-${String(Date.now()).slice(-3)}`);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productQuantity, setProductQuantity] = useState('1');
  const [productCostPrice, setProductCostPrice] = useState('0');
  const [selectedProductIndex, setSelectedProductIndex] = useState(-1);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [cogsAmount, setCogsAmount] = useState('0');
  const [cogsNotes, setCogsNotes] = useState('');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [packingDialogOpen, setPackingDialogOpen] = useState(false);
  const [currentPackingItem, setCurrentPackingItem] = useState<PurchaseItem | null>(null);

  // Optimized: Load data in parallel, non-blocking - modal opens immediately
  useEffect(() => {
    if (isOpen) {
      // Load data in parallel without blocking modal render
      Promise.all([
        loadSuppliers().catch(() => {}), // Fail silently, will retry on user interaction
        loadProducts().catch(() => {}),
      ]);
    }
  }, [isOpen]);

  const loadSuppliers = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        toast.error('Failed to authenticate. Please refresh the page.');
        return;
      }
      if (!session) {
        console.warn('No active session');
        toast.error('Please log in to continue.');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        toast.error('Failed to load business profile');
        return;
      }
      if (!profile) {
        console.warn('No business profile found');
        return;
      }

      const { data, error } = await supabase
        .from('contacts')
        .select('id, name')
        .eq('business_id', profile.business_id)
        .or('type.eq.supplier,type.eq.both')
        .order('name');

      if (error) {
        console.error('Suppliers fetch error:', error);
        const errorMessage = error.message || error.code || 'Network error';
        toast.error(`Failed to load suppliers: ${errorMessage}. Please check your connection.`);
        return;
      }

      if (data) {
        setSuppliers(data.map((c) => ({ id: c.id, name: c.name })));
      }
    } catch (err) {
      console.error('Failed to load suppliers:', err);
      const errorMessage = err instanceof Error ? err.message : 'Network error. Please check your connection.';
      const isNetworkError = err instanceof TypeError && err.message.includes('fetch');
      toast.error(
        isNetworkError 
          ? 'Network error. Please check your internet connection and try again.'
          : `Failed to load suppliers: ${errorMessage}`
      );
    }
  };

  const loadProducts = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        toast.error('Failed to authenticate. Please refresh the page.');
        return;
      }
      if (!session) {
        console.warn('No active session');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        toast.error('Failed to load business profile');
        return;
      }
      if (!profile) {
        console.warn('No business profile found');
        return;
      }

      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku')
        .eq('business_id', profile.business_id)
        .order('name')
        .limit(100);

      if (error) {
        console.error('Products fetch error:', error);
        const errorMessage = error.message || error.code || 'Network error';
        toast.error(`Failed to load products: ${errorMessage}. Please check your connection.`);
        return;
      }

      if (data) {
        setProducts(data.map((p) => ({ id: p.id, name: p.name, sku: p.sku || '', stock: 0 })));
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      const errorMessage = err instanceof Error ? err.message : 'Network error. Please check your connection.';
      const isNetworkError = err instanceof TypeError && err.message.includes('fetch');
      toast.error(
        isNetworkError 
          ? 'Network error. Please check your internet connection and try again.'
          : `Failed to load products: ${errorMessage}`
      );
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

  const itemsSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const itemDiscount = items.reduce((sum, item) => sum + item.discount, 0);
  const discountAmount = (itemsSubtotal * parseFloat(discountPercent.toString() || '0')) / 100;
  const cogs = parseFloat(cogsAmount || '0');
  const tax = (itemsSubtotal - itemDiscount - discountAmount) * 0.1; // 10% tax on discounted amount
  const grandTotal = itemsSubtotal - itemDiscount - discountAmount + tax + cogs;

  const handleSubmit = async (isFinal: boolean) => {
    // Validation
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
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) {
        toast.error('Business profile not found');
        setLoading(false);
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
        setLoading(false);
        return;
      }

      // Get variations and products for unit conversion
      const productIds = items.map(item => item.product_id);
      const { data: variationsData } = await supabase
        .from('variations')
        .select('id, product_id, product_variation_id')
        .in('product_id', productIds);

      if (!variationsData || variationsData.length === 0) {
        console.error('Variations data:', variationsData);
        console.error('Product IDs:', productIds);
        toast.error('Product variations not found');
        setLoading(false);
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

      // Determine payment status based on payment type and final status
      let paymentStatus: 'paid' | 'due' | 'partial' = 'due';
      if (isFinal) {
        paymentStatus = paymentType === 'cash' ? 'paid' : 'due';
      }

      // Create transaction
      const refNo = refNumber || `PUR-${Date.now()}`;
      
      // Convert date to ISO string format
      const transactionDate = date ? new Date(date).toISOString() : new Date().toISOString();
      
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          business_id: profile.business_id,
          location_id: location.id,
          type: 'purchase',
          status: isFinal ? 'final' : 'draft',
          payment_status: paymentStatus,
          contact_id: supplier === 'walkin' ? null : parseInt(supplier),
          ref_no: refNo,
          transaction_date: transactionDate,
          total_before_tax: parseFloat(itemsSubtotal.toString()),
          tax_amount: parseFloat(tax.toString()),
          discount_amount: parseFloat((itemDiscount + discountAmount).toString()),
          shipping_charges: parseFloat(cogs.toString()), // COGS stored in shipping_charges field
          final_total: parseFloat(grandTotal.toString()),
          additional_notes: notes || null,
          created_by: session.user.id,
        })
        .select()
        .single();

      if (transactionError) {
        console.error('Transaction creation error:', transactionError);
        console.error('Full error object:', JSON.stringify(transactionError, null, 2));
        throw new Error(`Failed to create transaction: ${transactionError.message || JSON.stringify(transactionError)}`);
      }

      if (!transaction) {
        console.error('Transaction is null after insert');
        throw new Error('Transaction was not created - no data returned');
      }

      console.log('Transaction created successfully:', transaction);

      transactionId = transaction.id;

      // Create account transaction for the purchase (only if final, cash payment, and paid)
      // Credit purchases don't create accounting entries immediately - they create payable
      if (isFinal && paymentType === 'cash' && transaction.payment_status === 'paid') {
        try {
          const { createAccountTransactionForPurchase } = await import('@/lib/services/accountingService');
          await createAccountTransactionForPurchase(
            profile.business_id,
            transaction.id,
            grandTotal,
            paymentMethod || 'Cash', // Use selected payment method
            session.user.id,
            `Purchase - Ref ${refNo}`
          );
        } catch (accountingError) {
          console.error('Failed to create accounting entry:', accountingError);
          // Don't fail the purchase - just log the error
        }
      }
      // Note: Credit purchases (payment_status = 'due') will be tracked as accounts payable
      // and can be paid later through payment management

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
        let quantityInPieces = item.quantity;

        // Calculate line totals
        const lineSubtotal = (item.unit_price * item.quantity) - item.discount;
        const lineTax = lineSubtotal * 0.1; // 10% tax
        const lineTotal = lineSubtotal + lineTax;
        const purchasePriceIncTax = item.unit_price + (item.unit_price * 0.1);

        const lineData = {
          transaction_id: transaction.id,
          variation_id: variation.id,
          product_id: item.product_id,
          quantity: parseFloat(item.quantity.toString()),
          unit_id: product?.unit_id || 1,
          purchase_price: parseFloat(item.unit_price.toString()),
          purchase_price_inc_tax: parseFloat(purchasePriceIncTax.toString()),
          item_tax: parseFloat(lineTax.toString()),
          line_total: parseFloat(lineTotal.toString()),
          line_discount_type: item.discount > 0 ? 'fixed' : null,
          line_discount_amount: parseFloat(item.discount.toString()),
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
      console.log('Inserting purchase lines:', purchaseLines);
      const { data: insertedLines, error: linesError } = await supabase
        .from('purchase_lines')
        .insert(purchaseLines)
        .select();

      if (linesError) {
        console.error('Purchase lines error:', linesError);
        console.error('Purchase lines data:', purchaseLines);
        throw new Error(`Failed to create purchase lines: ${linesError.message}`);
      }

      if (!insertedLines || insertedLines.length === 0) {
        throw new Error('No purchase lines were created');
      }

      console.log('Purchase lines created successfully:', insertedLines);

      // Update stock if finalizing (regardless of payment type - stock comes in on purchase)
      if (isFinal && stockUpdates.length > 0) {
        for (const stockUpdate of stockUpdates) {
          try {
            // Get current stock
            const { data: currentStock, error: stockFetchError } = await supabase
              .from('variation_location_details')
              .select('qty_available, product_id, product_variation_id')
              .eq('variation_id', stockUpdate.variationId)
              .eq('location_id', stockUpdate.locationId)
              .maybeSingle(); // Use maybeSingle() instead of single() to handle null case

            if (stockFetchError && stockFetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
              console.warn('Stock fetch error (non-critical):', stockFetchError);
            }

            const currentQty = parseFloat(currentStock?.qty_available?.toString() || '0');
            const newStock = currentQty + stockUpdate.quantityInPieces;

            if (currentStock) {
              // Update existing stock
              const { error: stockError } = await supabase
                .from('variation_location_details')
                .update({ qty_available: newStock.toString() })
                .eq('variation_id', stockUpdate.variationId)
                .eq('location_id', stockUpdate.locationId);

              if (stockError) {
                console.error('Failed to update stock:', stockError);
                // Don't fail the purchase - just log the error
                toast.warning(`Warning: Stock update failed for variation ${stockUpdate.variationId}`);
              }
            } else {
              // Create new stock record
              const variation = variationsData.find(v => v.id === stockUpdate.variationId);
              if (!variation) {
                console.error('Variation not found for stock update:', stockUpdate.variationId);
                continue; // Skip this stock update
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
                console.error('Failed to create stock record:', stockError);
                // Don't fail the purchase - just log the error
                toast.warning(`Warning: Stock creation failed for variation ${stockUpdate.variationId}`);
              }
            }
          } catch (stockErr) {
            console.error('Error updating stock:', stockErr);
            // Don't fail the purchase - just log the error
            toast.warning('Warning: Some stock updates may have failed');
          }
        }
      }

      // Save packing data if exists (for purchase items - if table exists)
      // Note: Currently packing structure is for sales, but can be extended for purchases
      // For now, we'll skip packing data for purchases unless purchase_item_packing table exists

      console.log('Purchase saved successfully!', { transactionId, isFinal });
      toast.success(`Purchase ${isFinal ? 'finalized' : 'saved as draft'} successfully!`);
      
      // Small delay to ensure data is saved before closing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Purchase submission error:', err);
      
      // Rollback transaction if created
      if (transactionId) {
        try {
          await supabase.from('transactions').delete().eq('id', transactionId);
        } catch (rollbackErr) {
          console.error('Failed to rollback transaction:', rollbackErr);
        }
      }
      
      // Detect network errors
      const isNetworkError = 
        err instanceof TypeError && err.message.includes('fetch') ||
        err instanceof Error && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'));
      
      if (isNetworkError) {
        toast.error('Network error. Please check your internet connection and try again.');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create purchase';
        toast.error(`Error: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredProductsForSearch = products.filter((product) =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  const handleAddProductFromSearch = (selectedProduct?: typeof products[0]) => {
    const productToAdd = selectedProduct || (selectedProductIndex >= 0 ? filteredProductsForSearch[selectedProductIndex] : filteredProductsForSearch[0]);
    
    if (!productToAdd) {
      if (!productSearchTerm) {
        toast.error('Please search for a product first');
      } else {
        toast.error('Product not found');
      }
      return;
    }

    const newItem: PurchaseItem = {
      id: `item-${Date.now()}`,
      product_id: productToAdd.id,
      product_name: productToAdd.name,
      sku: productToAdd.sku,
      stock: productToAdd.stock,
      quantity: parseFloat(productQuantity) || 1,
      unit_price: parseFloat(productCostPrice) || 0,
      discount: 0,
      subtotal: (parseFloat(productCostPrice) || 0) * (parseFloat(productQuantity) || 1),
    };
    setItems([...items, newItem]);
    setProductSearchTerm('');
    setProductQuantity('1');
    setProductCostPrice('0');
    setSelectedProductIndex(-1);
    setShowProductDropdown(false);
    toast.success('Product added');
  };

  // Refs for better focus management
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const productSearchInputRef = useRef<HTMLInputElement>(null);

  const handleProductSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowProductDropdown(true);
      setSelectedProductIndex(prev => 
        prev < filteredProductsForSearch.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setShowProductDropdown(true);
      setSelectedProductIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedProductIndex >= 0 && filteredProductsForSearch[selectedProductIndex]) {
        const selectedProduct = filteredProductsForSearch[selectedProductIndex];
        setProductSearchTerm(selectedProduct.name);
        setShowProductDropdown(false);
        setSelectedProductIndex(-1);
        // Focus on quantity field using ref
        setTimeout(() => {
          quantityInputRef.current?.focus();
          quantityInputRef.current?.select();
        }, 50);
      } else if (filteredProductsForSearch.length > 0) {
        // If no selection, just select first product and focus quantity
        const firstProduct = filteredProductsForSearch[0];
        setProductSearchTerm(firstProduct.name);
        setShowProductDropdown(false);
        setSelectedProductIndex(-1);
        setTimeout(() => {
          quantityInputRef.current?.focus();
          quantityInputRef.current?.select();
        }, 50);
      }
    } else if (e.key === 'Escape') {
      setShowProductDropdown(false);
      setSelectedProductIndex(-1);
    }
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Focus on cost price field using ref
      setTimeout(() => {
        priceInputRef.current?.focus();
        priceInputRef.current?.select();
      }, 50);
    }
  };

  const handleCostPriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Add product and reset
      handleAddProductFromSearch();
      // After adding, focus back on product search using ref
      setTimeout(() => {
        productSearchInputRef.current?.focus();
        productSearchInputRef.current?.select();
      }, 100);
    }
  };


  if (!isOpen) return null;

  const handleSheetOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent 
          side="right" 
          className="bg-[#0B0F1A] border-l border-gray-800 p-0 overflow-hidden [&>button]:hidden"
        >
        <div className="flex flex-col h-full w-full">
          {/* Header */}
          <SheetHeader className="border-b border-gray-800 p-6 bg-[#0B0F1A]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
                <div>
                  <SheetTitle className="text-2xl font-bold text-white">New Purchase Order</SheetTitle>
                  <p className="text-sm text-gray-400 mt-1">Standard Entry • {items.length} Items</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={async () => await handleSubmit(false)}
                disabled={loading}
                className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                <FileText size={16} className="mr-2" />
                Draft
              </Button>
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0B0F1A]">
            {/* Purchase Details - Top Section - 4 Fields: SUPPLIER, DATE, INVOICE NUMBER, SUPPLIER INVOICE NO. */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                  <User size={16} />
                  SUPPLIER
                </Label>
                <select
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Tab') {
                      e.preventDefault();
                      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
                      dateInput?.focus();
                    }
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white h-10"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id.toString()}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                  <Calendar size={16} />
                  DATE
                </Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Tab') {
                      e.preventDefault();
                      const invInput = document.querySelector('input[placeholder="PO-001"]') as HTMLInputElement;
                      invInput?.focus();
                      invInput?.select();
                    }
                  }}
                  className="bg-gray-800 border-gray-700 text-white h-10"
                />
              </div>

              <div>
                <Label className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                  <FileText size={16} />
                  INVOICE NUMBER
                </Label>
                <Input
                  type="text"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Tab') {
                      e.preventDefault();
                      const supInvInput = document.querySelector('input[placeholder="SI-001"]') as HTMLInputElement;
                      supInvInput?.focus();
                      supInvInput?.select();
                    }
                  }}
                  placeholder="PO-001"
                  className="bg-gray-800 border-gray-700 text-white h-10"
                />
              </div>

              <div>
                <Label className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                  <FileText size={16} />
                  SUPPLIER INVOICE NO.
                </Label>
                <Input
                  type="text"
                  value={supplierInvoiceNo}
                  onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Tab') {
                      e.preventDefault();
                      const productSearch = document.querySelector('input[placeholder*="Scan barcode"]') as HTMLInputElement;
                      productSearch?.focus();
                    }
                  }}
                  placeholder="SI-001"
                  className="bg-gray-800 border-gray-700 text-white h-10"
                />
              </div>
            </div>

            {/* Items Entry Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <FileText size={18} />
                  <h3 className="text-sm font-semibold uppercase">ITEMS ENTRY</h3>
                </div>
                <span className="text-xs text-gray-500">Enter to move</span>
              </div>
              
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label className="text-gray-400 text-xs mb-2 block">1. Find Product</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                      ref={productSearchInputRef}
                      type="text"
                      value={productSearchTerm}
                      onChange={(e) => {
                        setProductSearchTerm(e.target.value);
                        setShowProductDropdown(true);
                        setSelectedProductIndex(-1);
                      }}
                            onFocus={() => setShowProductDropdown(true)}
                            onKeyDown={handleProductSearchKeyDown}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Scan barcode or type name..."
                            className="bg-gray-800 border-gray-700 text-white pl-10"
                          />
                    {showProductDropdown && productSearchTerm && filteredProductsForSearch.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg max-h-60 overflow-y-auto z-20">
                        {filteredProductsForSearch.slice(0, 5).map((product, index) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                              setProductSearchTerm(product.name);
                              setShowProductDropdown(false);
                              setSelectedProductIndex(-1);
                              // Focus on quantity field - use more specific selector
                              setTimeout(() => {
                                const qtyInput = document.querySelector('input[type="number"][min="1"][placeholder="1"]') as HTMLInputElement;
                                if (!qtyInput) {
                                  // Fallback: find by label text
                                  const labels = Array.from(document.querySelectorAll('label'));
                                  const qtyLabel = labels.find(l => l.textContent?.includes('Quantity'));
                                  if (qtyLabel) {
                                    const nextInput = qtyLabel.nextElementSibling?.querySelector('input[type="number"]') as HTMLInputElement;
                                    nextInput?.focus();
                                    nextInput?.select();
                                  }
                                } else {
                                  qtyInput.focus();
                                  qtyInput.select();
                                }
                              }, 100);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-2 hover:bg-gray-700 text-white",
                              selectedProductIndex === index && "bg-gray-700"
                            )}
                          >
                            <div className="font-medium">{product.name}</div>
                            <div className="text-xs text-gray-400">{product.sku}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="w-24">
                  <Label className="text-gray-400 text-xs mb-2 block">2. Quantity</Label>
                  <Input
                    ref={quantityInputRef}
                    type="number"
                    min="1"
                    value={productQuantity}
                    onChange={(e) => setProductQuantity(e.target.value)}
                    onKeyDown={handleQuantityKeyDown}
                    placeholder="1"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                
                <div className="w-32">
                  <Label className="text-gray-400 text-xs mb-2 block">3. Cost Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      ref={priceInputRef}
                      type="number"
                      min="0"
                      step="0.01"
                      value={productCostPrice}
                      onChange={(e) => setProductCostPrice(e.target.value)}
                      onKeyDown={handleCostPriceKeyDown}
                      placeholder="0"
                      className="bg-gray-800 border-gray-700 text-white pl-7"
                    />
                  </div>
                </div>
                
                <Button
                  type="button"
                  onClick={() => handleAddProductFromSearch()}
                  className="bg-orange-600 hover:bg-orange-500 text-white"
                >
                  <ArrowDown size={16} className="mr-2" />
                  Add
                </Button>
              </div>
            </div>

            {/* Purchase Item List - Always Show */}
            <div className="border border-gray-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Product Details</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Packing</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                        No items added. Search and add products above.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-800/30">
                        <td className="px-4 py-3 text-gray-400">{String(index + 1).padStart(2, '0')}</td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-white font-medium">{item.product_name}</div>
                            <div className="text-xs text-gray-500">{item.sku}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {item.packing && item.packing.totalBoxes > 0 ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setCurrentPackingItem(item);
                                setPackingDialogOpen(true);
                              }}
                              className="bg-orange-600 hover:bg-orange-500 text-white border-orange-500"
                            >
                              <Truck size={14} className="mr-1" />
                              {item.packing.totalBoxes} / {item.packing.totalMeters.toFixed(0)} M
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setCurrentPackingItem(item);
                                setPackingDialogOpen(true);
                              }}
                              className="bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700"
                            >
                              <Plus size={14} className="mr-1" />
                              Add Pkg
                            </Button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateUnitPrice(item.id, parseFloat(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            onClick={(e) => e.stopPropagation()}
                            className="w-24 bg-gray-800 border-gray-700 text-white"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-white"
                            >
                              <Minus size={14} />
                            </button>
                            <Input
                              type="number"
                              min="1"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.id, parseFloat(e.target.value) || 1)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-16 text-center bg-gray-800 border-gray-700 text-white text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-white"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white font-medium">{formatCurrency(item.subtotal)}</td>
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

            {/* Two Column Layout: COGS & SUMMARY (Left) | PAYMENT (Right) */}
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* COGS Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-400">
                    <DollarSign size={18} />
                    <h3 className="text-sm font-semibold uppercase">COGS (Cost of Goods Sold)</h3>
                  </div>
                  <div className="space-y-3">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cogsAmount}
                      onChange={(e) => setCogsAmount(e.target.value)}
                      placeholder="Amount"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                    <Input
                      type="text"
                      value={cogsNotes}
                      onChange={(e) => setCogsNotes(e.target.value)}
                      placeholder="Notes (optional)"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>

                {/* SUMMARY Section */}
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">INVOICE SUMMARY</h3>
                  <div className="flex justify-between text-gray-400">
                    <span>Items Subtotal:</span>
                    <span className="text-white">{formatCurrency(itemsSubtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-gray-400">% Discount:</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white rounded px-2 py-1 text-sm"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="10">10%</option>
                        <option value="15">15%</option>
                        <option value="20">20%</option>
                      </select>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(e.target.value)}
                        className="w-20 bg-gray-800 border-gray-700 text-white text-sm"
                      />
                    </div>
                  </div>
                  {cogs > 0 && (
                    <div className="flex justify-between text-gray-400">
                      <span>COGS:</span>
                      <span className="text-white">{formatCurrency(cogs)}</span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-gray-700">
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold text-white">Grand Total:</span>
                      <span className="text-2xl font-bold text-orange-400">{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - PAYMENT */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase">PAYMENT</h3>
                  {paymentType === 'partial' && (
                    <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 rounded-md">
                      Partial
                    </Badge>
                  )}
                </div>
                
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-2">INVOICE AMOUNT</div>
                  <div className="text-3xl font-bold text-white mb-4">{formatCurrency(grandTotal)}</div>
                  
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentType('cash')}
                        className={cn(
                          "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                          paymentType === 'cash'
                            ? "bg-green-600 text-white"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        )}
                      >
                        Full Paid
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentType('partial')}
                        className={cn(
                          "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                          paymentType === 'partial'
                            ? "bg-orange-600 text-white"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        )}
                      >
                        Partial
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentType('credit')}
                        className={cn(
                          "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                          paymentType === 'credit'
                            ? "bg-blue-600 text-white"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        )}
                      >
                        Credit
                      </button>
                    </div>
                    {paymentType === 'cash' && (
                      <div className="flex items-center gap-3">
                        <CheckCircle2 size={20} className="text-green-500" />
                        <p className="text-sm text-gray-400">Full payment marked as Paid</p>
                      </div>
                    )}
                    {paymentType === 'partial' && (
                      <div className="mt-2">
                        <Label className="text-gray-400 text-xs mb-2 block">Partial Amount</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          max={grandTotal}
                          placeholder="Enter partial amount"
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                    )}
                    {paymentType === 'credit' && (
                      <div className="flex items-center gap-3 mt-2">
                        <p className="text-sm text-gray-400">Credit payment - Amount due: {formatCurrency(grandTotal)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Footer - Action Buttons */}
          <div className="sticky bottom-0 bg-[#0B0F1A] border-t border-gray-800 p-6 flex items-center justify-end gap-3 z-10">
            <Button
              type="button"
              variant="outline"
              onClick={async () => await handleSubmit(false)}
              disabled={loading}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              <Save size={16} className="mr-2" />
              Save
            </Button>
            <Button
              type="button"
              onClick={async () => await handleSubmit(true)}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-500 text-white"
            >
              <Printer size={16} className="mr-2" />
              Save & Print
            </Button>
          </div>
        </div>
        </SheetContent>
      </Sheet>

      {/* Packing Overlay - Secondary Layer (z-index: 60) */}
      {currentPackingItem && (
        <PackingOverlay
          isOpen={packingDialogOpen}
          onClose={() => {
            setPackingDialogOpen(false);
            setCurrentPackingItem(null);
          }}
          onSave={(packingData) => {
            if (packingData && currentPackingItem) {
              setItems(items.map(item => {
                if (item.id === currentPackingItem.id) {
                  // If packing data exists, update quantity from totalMeters (not totalPieces)
                  const newQuantity = packingData.totalMeters > 0 ? packingData.totalMeters : item.quantity;
                  const subtotal = (item.unit_price * newQuantity) - item.discount;
                  return { 
                    ...item, 
                    packing: {
                      boxes: packingData.boxes.map(box => ({
                        id: box.id,
                        pieces: box.pieces.map((p: { id: string; meters: number | string }) => ({
                          id: p.id,
                          meters: typeof p.meters === 'number' ? p.meters.toString() : String(p.meters || '')
                        }))
                      })),
                      loosePieces: packingData.loosePieces.map((p: { id: string; meters: number | string }) => ({
                        id: p.id,
                        meters: typeof p.meters === 'number' ? p.meters.toString() : String(p.meters || '')
                      })),
                      totalBoxes: packingData.totalBoxes,
                      totalPieces: packingData.totalPieces,
                      totalMeters: packingData.totalMeters
                    },
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
          productName={currentPackingItem?.product_name || ''}
          productSku={currentPackingItem?.sku || ''}
          initialData={currentPackingItem?.packing ? {
            boxes: currentPackingItem.packing.boxes.map(box => ({
              ...box,
              pieces: box.pieces.map(p => ({
                ...p,
                meters: typeof p.meters === 'number' ? p.meters.toString() : p.meters
              }))
            })),
            loosePieces: currentPackingItem.packing.loosePieces.map(p => ({
              ...p,
              meters: typeof p.meters === 'number' ? p.meters.toString() : p.meters
            })),
            totalBoxes: currentPackingItem.packing.totalBoxes,
            totalPieces: currentPackingItem.packing.totalPieces,
            totalMeters: currentPackingItem.packing.totalMeters
          } : null}
        />
      )}
    </>
  );
}

