/**
 * Add Purchase Modal Component
 * Matches Figma design with product table and summary section
 */

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Plus, Minus, Trash2, Truck, Calendar, HelpCircle, Pencil, FileText, User, CheckCircle2, ArrowDown, DollarSign, Save, Printer, Box, Check, Paperclip, Banknote, Loader2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet';
import { AddProductForm } from '@/components/products/AddProductForm';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { useGlobalRefresh } from '@/lib/hooks/useGlobalRefresh';
import { PackingEntry, PackingEntryData } from './PackingOverlay';
import { ProductSearchPortal } from '@/components/inventory/ProductSearchPortal';
import { useBranchV2 } from '@/lib/context/BranchContextV2';

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
  packing?: PackingEntryData;
  // Variation details (for products with variations)
  variation_id?: number;
  variation_name?: string;
  variation_sku?: string; // Variation's sub_sku
  variation_stock?: number; // Variation's stock level
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
  const [purchaseStatus, setPurchaseStatus] = useState<'pending' | 'ordered' | 'received' | 'cancelled'>('pending');
  const [notes, setNotes] = useState('');
  const { handleSuccess } = useGlobalRefresh();
  const { activeBranch } = useBranchV2();
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: number; name: string }>>([]);
  const [products, setProducts] = useState<Array<{ id: number; name: string; sku: string; stock: number }>>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Bank Transfer'>('Cash');
  const [paymentType, setPaymentType] = useState<'cash' | 'partial' | 'credit'>('cash'); // Cash, Partial, or Credit
  const [refNumber, setRefNumber] = useState(`PO-${String(Date.now()).slice(-3)}`);
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState(`SI-${String(Date.now()).slice(-3)}`);
  const [invoiceNumber, setInvoiceNumber] = useState(''); // Auto-generated invoice number
  // Product search states - SIMPLIFIED (using ProductSearchPortal)
  const [productQuantity, setProductQuantity] = useState('1');
  const [productCostPrice, setProductCostPrice] = useState('0');
  const [cogsAmount, setCogsAmount] = useState('0');
  const [cogsNotes, setCogsNotes] = useState('');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [shippingAmount, setShippingAmount] = useState('0');
  const [showShippingInput, setShowShippingInput] = useState(false);
  
  // Payment states (matching Sales modal structure)
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [payments, setPayments] = useState<Array<{ id: string; method: 'Cash' | 'Card' | 'Bank Transfer'; amount: number; reference?: string }>>([]);
  // Packing states
  const [packingDialogOpen, setPackingDialogOpen] = useState(false);
  const [currentPackingItem, setCurrentPackingItem] = useState<PurchaseItem | null>(null);
  
  // Variation states - UPDATED: Include SKU and Stock
  const [productVariations, setProductVariations] = useState<Array<{
    id: number;
    product_id: number;
    product_variation_id: number | null;
    retail_price: number;
    wholesale_price: number;
    variation_name?: string;
    variation_type?: string; // Type (e.g., "Supplier", "SPL")
    variation_value?: string; // Value (e.g., "Ibrahim", "Hasan")
    sub_sku?: string; // SKU for this specific variation
    stock?: number; // Current stock level
  }>>([]);
  const [selectedVariationId, setSelectedVariationId] = useState<number | null>(null);
  const [showVariationModal, setShowVariationModal] = useState(false);
  const [selectedProductForVariation, setSelectedProductForVariation] = useState<typeof products[0] | null>(null);
  const firstVariationButtonRef = useRef<HTMLButtonElement | null>(null);
  // Add new product drawer
  const [showAddProductDrawer, setShowAddProductDrawer] = useState(false);
  const [quickAddProductName, setQuickAddProductName] = useState('');

  // Optimized: Load data in parallel, non-blocking - modal opens immediately
  useEffect(() => {
    if (isOpen) {
      // Load data in parallel without blocking modal render
      Promise.all([
        loadSuppliers().catch(() => {}), // Fail silently, will retry on user interaction
        loadProducts().catch(() => {}),
      ]);
    } else {
      // Reset shipping input state when modal closes
      setShowShippingInput(false);
    }
  }, [isOpen]);

  // SIMPLIFIED: Handle product selection from ProductSearchPortal
  const handleProductSelect = async (selectedProduct: { id: number; name: string; sku: string; stock?: number; variation_id?: number; variation_name?: string }) => {
    try {
      console.log('DEBUG: Product selected from portal', selectedProduct);
      
      // If variation_id is provided, it means a variation was selected directly
      if (selectedProduct.variation_id) {
        // Add product with specific variation
        addProductToItems({
          ...selectedProduct,
          variation_id: selectedProduct.variation_id,
          variation_name: selectedProduct.variation_name,
        } as any);
        return;
      }
      
      // Check variations IMMEDIATELY upon product selection
      const variations = await checkProductVariations(selectedProduct.id);
      console.log('DEBUG: Variations found', variations.length);
    
      if (variations.length > 0) {
        console.log('DEBUG: Product has variations, showing modal');
        // Product has variations - show modal
        setTimeout(() => {
          try {
            setProductVariations(variations);
            setSelectedProductForVariation(selectedProduct as any);
            setSelectedVariationId(null);
            setShowVariationModal(true);
            
            // Auto-focus first variation
            requestAnimationFrame(() => {
              setTimeout(() => {
                try {
                  if (firstVariationButtonRef.current) {
                    firstVariationButtonRef.current.focus({ preventScroll: false });
                  }
                } catch (focusError) {
                  console.error('Focus error:', focusError);
                }
              }, 100);
            });
          } catch (modalError) {
            console.error('Error opening variation modal:', modalError);
          }
        }, 50);
        
        return;
      }

      console.log('DEBUG: No variations, adding product directly');
      // No variations - add product directly
      addProductToItems(selectedProduct as any);
    } catch (error) {
      console.error('Error in handleProductSelect:', error);
      toast.error('Failed to add product');
    }
  };

  // Handle "Add New Product" from search portal
  const handleAddNewProduct = (productName: string) => {
    setQuickAddProductName(productName);
    setShowAddProductDrawer(true);
  };

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

  // CRITICAL: Calculate row total - exactly (unit_price * quantity) - NO discount in row total
  const calculateRowTotal = (unitPrice: number, quantity: number): number => {
    const price = parseFloat(String(unitPrice)) || 0;
    const qty = parseFloat(String(quantity)) || 0;
    return price * qty;
  };

  // STANDARDIZED: Update Quantity with functional state pattern - REACTIVE CALCULATION
  const updateQuantity = (itemId: string, quantity: number) => {
    const qty = parseFloat(String(quantity)) || 0;
    if (qty < 1) {
      removeItem(itemId);
      return;
    }
    // CRITICAL: Use functional state update to avoid stale closure
    // Row total = (unit_price * quantity) - discount is applied at summary level
    setItems(prev => prev.map((item) => {
      if (item.id === itemId) {
        const rowTotal = calculateRowTotal(item.unit_price, qty);
        return { ...item, quantity: qty, subtotal: rowTotal };
      }
      return item;
    }));
  };

  // STANDARDIZED: Update Unit Price with functional state pattern - REACTIVE CALCULATION
  const updateUnitPrice = (itemId: string, price: number) => {
    const unitPrice = parseFloat(String(price)) || 0;
    // CRITICAL: Use functional state update to avoid stale closure
    // Row total = (unit_price * quantity) - discount is applied at summary level
    setItems(prev => prev.map((item) => {
      if (item.id === itemId) {
        const rowTotal = calculateRowTotal(unitPrice, item.quantity);
        return { ...item, unit_price: unitPrice, subtotal: rowTotal };
      }
      return item;
    }));
  };

  const updateDiscount = (itemId: string, discount: number) => {
    const discountAmount = parseFloat(String(discount)) || 0;
    // CRITICAL: Use functional state update to avoid stale closure
    // Note: Discount is stored but NOT subtracted from row subtotal (applied at summary level)
    setItems(prev => prev.map((item) => {
      if (item.id === itemId) {
        // Keep subtotal as (price * quantity), discount is applied in summary
        const rowTotal = calculateRowTotal(item.unit_price, item.quantity);
        return { ...item, discount: discountAmount, subtotal: rowTotal };
      }
      return item;
    }));
  };

  // STANDARDIZED: Remove Item with functional state pattern
  const removeItem = (itemId: string) => {
    // CRITICAL: Use functional state update to avoid stale closure
    setItems(prev => prev.filter((item) => item.id !== itemId));
  };

  // Auto-generate Purchase Number using purchase-specific settings
  useEffect(() => {
    const generatePurchaseNumber = async () => {
      try {
        // Load purchase settings from localStorage
        const storedSettings = localStorage.getItem('studio_rently_settings');
        const settings = storedSettings ? JSON.parse(storedSettings) : null;
        
        const purchaseSettings = {
          purchase_prefix: settings?.purchase_prefix || 'PUR',
          purchase_format: settings?.purchase_format || 'long',
          purchase_custom_format: settings?.purchase_custom_format || '',
        };

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('business_id')
          .eq('user_id', session.user.id)
          .single();

        if (!profile?.business_id) return;

        const dateObj = new Date(date);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;

        // Find the last transaction to get the next sequence number
        const prefix = purchaseSettings.purchase_prefix || 'PUR';
        let searchPattern = `${prefix}-%`;
        
        if (purchaseSettings.purchase_format === 'long') {
          searchPattern = `${prefix}-${year}-%`;
        } else if (purchaseSettings.purchase_format === 'short') {
          searchPattern = `${prefix}-%`;
        }

        const { data: lastTransaction } = await supabase
          .from('transactions')
          .select('invoice_no')
          .eq('business_id', profile.business_id)
          .eq('type', 'purchase')
          .like('invoice_no', searchPattern)
          .order('invoice_no', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Extract sequence number from last transaction
        let sequence = 1;
        if (lastTransaction?.invoice_no) {
          const parts = lastTransaction.invoice_no.split('-');
          const lastSeq = parts[parts.length - 1];
          sequence = parseInt(lastSeq) + 1;
        }

        // Generate purchase number using utility
        const { generatePurchaseNumber: generatePur } = await import('@/lib/utils/invoiceGenerator');
        const generatedPurchase = generatePur(purchaseSettings, sequence, dateObj);
        setInvoiceNumber(generatedPurchase);
      } catch (err) {
        // Fallback: Generate a placeholder if database query fails
        const dateObj = new Date(date);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;
        setInvoiceNumber(`PUR-${dateStr}-0001`);
      }
    };

    if (isOpen) {
      generatePurchaseNumber();
    }
  }, [date, isOpen]);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // CRITICAL: Reactive Calculations - Sum of all row totals
  // Row total = (unit_price * quantity) for each item
  const itemsSubtotal = items.reduce((sum, item) => {
    const rowTotal = calculateRowTotal(item.unit_price, item.quantity);
    return sum + rowTotal;
  }, 0);
  
  // Item-level discounts (if any)
  const itemDiscountsTotal = items.reduce((sum, item) => {
    return sum + (parseFloat(String(item.discount)) || 0);
  }, 0);
  
  // Percentage discount on subtotal
  const discountPercentValue = parseFloat(discountPercent.toString() || '0') || 0;
  const discountAmount = (itemsSubtotal * discountPercentValue) / 100;
  
  // COGS and Shipping
  const cogs = parseFloat(cogsAmount || '0') || 0;
  const shipping = parseFloat(shippingAmount || '0') || 0;
  
  // Grand Total = (Subtotal - Discount) + COGS + Shipping
  const grandTotal = (itemsSubtotal - discountAmount) + cogs + shipping;
  
  // Payment calculations
  const totalPaid = payments.reduce((sum, p) => parseFloat(String(p.amount)) || 0, 0);
  const balanceDue = grandTotal - totalPaid;
  
  // Payment functions
  const addPayment = () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    const newPayment = {
      id: `payment-${Date.now()}`,
      method: paymentMethod,
      amount: parseFloat(paymentAmount),
      reference: paymentReference || undefined,
    };
    setPayments([...payments, newPayment]);
    setPaymentAmount('');
    setPaymentReference('');
    if (parseFloat(paymentAmount) < grandTotal) {
      setPaymentType('partial');
    } else {
      setPaymentType('cash');
    }
  };
  
  const removePayment = (paymentId: string) => {
    setPayments(payments.filter((p) => p.id !== paymentId));
  };
  
  const handleQuickPay = (percent: number) => {
    const invoiceAmount = grandTotal;
    const quickAmount = (invoiceAmount * percent) / 100;
    setPaymentAmount(quickAmount.toFixed(2));
    if (percent < 100) {
      setPaymentType('partial');
    } else {
      setPaymentType('cash');
    }
  };

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

      // CRITICAL: Use activeBranch from context (ERP standard - selected branch)
      if (!activeBranch || activeBranch.id === 'ALL') {
        toast.error('Please select a specific branch to create a purchase', {
          description: 'Data entry requires a specific branch selection.',
          duration: 5000,
        });
        setLoading(false);
        return;
      }

      if (typeof activeBranch.id !== 'number') {
        toast.error('Invalid branch selected. Please select a valid branch.');
        setLoading(false);
        return;
      }

      const locationId = Number(activeBranch.id);
      console.log('✅ Using active branch location:', locationId, 'Branch:', activeBranch.name);

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
      
      // Map purchase status to transaction status
      // 'received' and 'ordered' become 'final', 'pending' and 'cancelled' stay as-is
      let transactionStatus: string;
      if (purchaseStatus === 'received' || purchaseStatus === 'ordered') {
        transactionStatus = 'final';
      } else if (purchaseStatus === 'cancelled') {
        transactionStatus = 'cancelled';
      } else {
        transactionStatus = isFinal ? 'final' : 'draft';
      }

      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          business_id: profile.business_id,
          location_id: locationId,
          type: 'purchase',
          status: transactionStatus,
          payment_status: paymentStatus,
          contact_id: supplier === 'walkin' ? null : parseInt(supplier),
          ref_no: refNo,
          transaction_date: transactionDate,
          total_before_tax: parseFloat(itemsSubtotal.toString()),
          tax_amount: 0, // Tax removed from calculation
          discount_amount: parseFloat((itemDiscountsTotal + discountAmount).toString()),
          shipping_charges: parseFloat((cogs + shipping).toString()), // COGS + Shipping stored in shipping_charges field
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
          // Note: Discount fields removed as they don't exist in purchase_lines table
          // Discount is already accounted for in line_total calculation above
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

      console.log('Purchase saved successfully!', { transactionId, isFinal, purchaseStatus });
      
      // Refresh purchases list immediately
      await handleSuccess('purchases', `Purchase ${purchaseStatus === 'received' ? 'received' : purchaseStatus === 'ordered' ? 'ordered' : 'saved'} successfully!`, ['inventory']);
      
      // Small delay to ensure data is saved before closing
      await new Promise(resolve => setTimeout(resolve, 300));
      
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

  // Check and load variations for a product - UPDATED: Include SKU and Stock
  const checkProductVariations = async (productId: number) => {
    try {
      // Get current business location (default to first location for now)
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        console.error('No session found');
        return [];
      }

      // Try user_profiles first (standard method)
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.session.user.id)
        .single();

      if (profileError || !profile?.business_id) {
        // Fallback: Try to get business_id from get_user_business_id() function
        const { data: businessIdData, error: funcError } = await supabase
          .rpc('get_user_business_id');
        
        if (funcError || !businessIdData) {
          console.error('No business profile found:', profileError || funcError);
          return [];
        }
        
        // Use business_id from function
        if (profile) {
          profile.business_id = businessIdData;
        }
      }

      if (!profile || !profile.business_id) {
        console.error('No business profile found');
        return [];
      }

      // Get default location for this business
      const { data: locations } = await supabase
        .from('business_locations')
        .select('id')
        .eq('business_id', profile.business_id)
        .limit(1);

      const locationId = locations?.[0]?.id;
      if (!locationId) {
        console.error('No location found');
        return [];
      }

      // Fetch variations with SKU and stock information
      // Include both the variation type (product_variations.name) and value (variations.name)
      const { data: variations, error } = await supabase
        .from('variations')
        .select(`
          id, 
          product_id, 
          product_variation_id, 
          name,
          retail_price, 
          wholesale_price,
          sub_sku,
          product_variations(name)
        `)
        .eq('product_id', productId)
        .is('deleted_at', null);

      if (error) {
        console.error('Error loading variations:', error);
        return [];
      }

      // Fetch stock for each variation at the current location
      const variationIds = (variations || []).map((v: any) => v.id);
      const { data: stockData } = await supabase
        .from('variation_location_details')
        .select('variation_id, qty_available')
        .in('variation_id', variationIds)
        .eq('location_id', locationId);

      // Create a map of variation_id -> stock
      const stockMap = new Map<number, number>();
      (stockData || []).forEach((item: any) => {
        stockMap.set(item.variation_id, parseFloat(item.qty_available || '0'));
      });

      // Map variations with type, value, SKU, and stock
      // Format: { type: 'Supplier', value: 'Ibrahim', displayName: 'Supplier: Ibrahim' }
      const variationsWithDetails = (variations || []).map((v: any) => {
        const variationType = v.product_variations?.name || 'Variation';
        const variationValue = v.name || `#${v.id}`;
        const displayName = `${variationType}: ${variationValue}`;
        
        return {
          id: v.id,
          product_id: v.product_id,
          product_variation_id: v.product_variation_id,
          retail_price: v.retail_price,
          wholesale_price: v.wholesale_price,
          variation_type: variationType, // Type (e.g., "Supplier", "SPL")
          variation_value: variationValue, // Value (e.g., "Ibrahim", "Hasan")
          variation_name: displayName, // Combined display: "Supplier: Ibrahim"
          sub_sku: v.sub_sku || `SKU-${v.id}`, // Use sub_sku or generate fallback
          stock: stockMap.get(v.id) || 0, // Get stock from map or default to 0
        };
      });

      return variationsWithDetails;
    } catch (error) {
      console.error('Failed to check variations:', error);
      return [];
    }
  };


  // UPDATED: Add product with automatic variation price/SKU mapping
  const addProductToItems = (
    productToAdd: typeof products[0], 
    variationData?: {
      variation_id: number;
      variation_name: string;
      variation_sku: string;
      variation_stock: number;
      price: number; // Variation-specific price (wholesale for purchase)
    }
  ) => {
    console.log('DEBUG: addProductToItems called (Purchase)', { productToAdd, variationData });
    
    const qty = parseFloat(productQuantity) || 1;
    const price = parseFloat(String(variationData?.price || productCostPrice || 0)) || 0;
    
    const newItem: PurchaseItem = {
      id: `item-${Date.now()}`,
      product_id: productToAdd.id,
      product_name: productToAdd.name,
      sku: productToAdd.sku,
      stock: productToAdd.stock,
      quantity: qty,
      unit_price: price,
      discount: 0,
      subtotal: calculateRowTotal(price, qty), // CRITICAL: Use standardized calculation
      // Variation details
      variation_id: variationData?.variation_id,
      variation_name: variationData?.variation_name,
      variation_sku: variationData?.variation_sku,
      variation_stock: variationData?.variation_stock,
    };
    
    console.log('DEBUG: New item created (Purchase)', newItem);
    console.log('DEBUG: Current items count before add (Purchase)', items.length);
    
    // CRITICAL: Use setTimeout to ensure UI has time to process the click
    setTimeout(() => {
      // CRITICAL: Use functional state update to avoid stale closure
      setItems(prev => {
        const updated = [...prev, newItem];
        console.log('DEBUG: Items after add (Purchase)', updated.length, updated);
        return updated;
      });
    }, 0);
    setProductQuantity('1');
    setProductCostPrice('0');
    toast.success('Product added');
  };

  // HARD RESET: Clean all variation-related states (called on drawer close)
  const resetVariationStates = () => {
    setShowVariationModal(false);
    setProductVariations([]);
    setSelectedVariationId(null);
    setSelectedProductForVariation(null);
  };

  // STANDARDIZED: Handle variation selection with automatic price/SKU mapping
  const handleVariationSelect = (e?: React.MouseEvent | React.KeyboardEvent) => {
    // CRITICAL: Prevent any form submission or navigation
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      if ('nativeEvent' in e && e.nativeEvent) {
        e.nativeEvent.stopImmediatePropagation();
      }
    }
    
    if (!selectedProductForVariation) {
      toast.error('Product not found');
      resetVariationStates();
      return;
    }

    if (!selectedVariationId) {
      toast.error('Please select a variation');
      return;
    }

    const selectedVariation = productVariations.find(v => v.id === selectedVariationId);
    if (!selectedVariation) {
      toast.error('Variation not found');
      resetVariationStates();
      return;
    }

    // Use wholesale_price for purchase (cost price)
    const variationPrice = selectedVariation.wholesale_price || selectedVariation.retail_price || 0;

    // Store product reference before clearing state
    const productToAdd = selectedProductForVariation;

    // CLEAN EXIT STRATEGY: IMMEDIATELY reset all variation states (drawer stays open)
    setShowVariationModal(false);
    setProductVariations([]);
    setSelectedVariationId(null);
    setSelectedProductForVariation(null);

    // AUTOMATIC: Add product with variation data (price, SKU, stock auto-mapped)
    addProductToItems(productToAdd, {
      variation_id: selectedVariation.id,
      variation_name: selectedVariation.variation_name || `Variation #${selectedVariation.id}`,
      variation_sku: selectedVariation.sub_sku || `SKU-${selectedVariation.id}`,
      variation_stock: selectedVariation.stock || 0,
      price: variationPrice, // AUTOMATIC: Variation-specific price (wholesale for purchase)
    });
    
    // Focus back on product search after adding variation (drawer stays open)
    setTimeout(() => {
      productSearchInputRef.current?.focus();
      productSearchInputRef.current?.select();
    }, 150);
  };

  // Refs for better focus management
  const productSearchInputRef = useRef<HTMLInputElement>(null);
  const variationModalRef = useRef<HTMLDivElement>(null);

  // Manual Focus Override - Force focus after 100ms
  useEffect(() => {
    if (showVariationModal && productVariations.length > 0) {
      const timer = setTimeout(() => {
        if (firstVariationButtonRef.current) {
          try {
            firstVariationButtonRef.current.focus({ preventScroll: false });
            firstVariationButtonRef.current.scrollIntoView({ block: 'nearest', behavior: 'auto' });
            const variationId = firstVariationButtonRef.current.dataset.variationId;
            if (variationId) {
              setSelectedVariationId(Number(variationId));
            }
            return;
          } catch (err) {
            console.error('Focus error:', err);
          }
        }
        
        const firstButton = document.querySelector('button[data-variation-option]') as HTMLButtonElement;
        if (firstButton) {
          try {
            firstButton.focus({ preventScroll: false });
            firstButton.scrollIntoView({ block: 'nearest', behavior: 'auto' });
            const variationId = firstButton.dataset.variationId;
            if (variationId) {
              setSelectedVariationId(Number(variationId));
            }
          } catch (err) {
            console.error('Focus error:', err);
          }
        }
      }, 100);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [showVariationModal, productVariations.length]);

  // CRITICAL: Global Escape key handler for 100% reliability
  useEffect(() => {
    if (showVariationModal) {
      const handleGlobalEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && showVariationModal) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          // Use centralized reset function for consistency
          resetVariationStates();
        }
      };

      document.addEventListener('keydown', handleGlobalEscape, true);
      
      return () => {
        document.removeEventListener('keydown', handleGlobalEscape, true);
      };
    }
  }, [showVariationModal]);

  if (!isOpen) return null;

  // DRAWER LIFECYCLE MANAGEMENT: Hard reset on close
  const handleSheetOpenChange = (open: boolean) => {
    if (!open) {
      // HARD RESET: Clean all variation and product search states when drawer closes
      resetVariationStates();
      // Also reset product entry states
      setProductQuantity('1');
      setProductCostPrice('0');
      // Call parent's onClose
      onClose();
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent 
          side="right" 
          className="bg-[#0B0F1A] border-l border-gray-800 p-0 overflow-hidden [&>button]:hidden w-full sm:w-full md:max-w-[1280px] h-screen"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            // Skip keyboard handling when Packing dialog is open
            if (packingDialogOpen) {
              return;
            }
          }}
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
          <div className="flex-1 overflow-y-auto p-6 pb-12 space-y-6 bg-[#0B0F1A]">
            {/* Purchase Details - Top Section - 7 Fields: SUPPLIER, DATE, BILL NO., INV NO., SUPPLIER INVOICE NO., STATUS, BRANCH */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              <div>
                <Label className="text-gray-400 text-xs mb-2 uppercase">
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
                  className="w-full bg-[#111827] border border-gray-800 rounded-lg px-4 py-2.5 text-white h-10"
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
                <Label className="text-gray-400 text-xs mb-2 uppercase">
                  DATE
                </Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Tab') {
                      e.preventDefault();
                      const billInput = document.querySelector('input[placeholder*="PO-"]') as HTMLInputElement;
                      billInput?.focus();
                      billInput?.select();
                    }
                  }}
                  className="bg-[#111827] border-gray-800 text-white h-10"
                />
              </div>

              <div>
                <Label className="text-gray-400 text-xs mb-2 uppercase">
                  Bill No.
                </Label>
                <Input
                  type="text"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Tab') {
                      e.preventDefault();
                      const supInvInput = document.querySelector('input[placeholder*="SI-"]') as HTMLInputElement;
                      supInvInput?.focus();
                      supInvInput?.select();
                    }
                  }}
                  placeholder="PO-001"
                  className="bg-[#111827] border-gray-800 text-white h-10"
                />
              </div>

              <div>
                <Label className="text-gray-400 text-xs mb-2 uppercase">
                  Inv No.
                </Label>
                <Input
                  type="text"
                  value={invoiceNumber || ''}
                  disabled
                  readOnly
                  placeholder="Auto-generated"
                  className="bg-[#111827] border-gray-800 text-gray-500 h-10 cursor-not-allowed"
                  title="Auto-generated invoice number (read-only)"
                />
              </div>

              <div>
                <Label className="text-gray-400 text-xs mb-2 uppercase">
                  Supplier Inv No.
                </Label>
                <Input
                  type="text"
                  value={supplierInvoiceNo}
                  onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Tab') {
                      e.preventDefault();
                      const productSearch = document.querySelector('input[placeholder*="product name"]') as HTMLInputElement;
                      productSearch?.focus();
                    }
                  }}
                  placeholder="SI-001"
                  className="bg-[#111827] border-gray-800 text-white h-10"
                />
              </div>

              <div>
                <Label className="text-gray-400 text-xs mb-2 uppercase">
                  Status
                </Label>
                <select
                  value={purchaseStatus}
                  onChange={(e) => setPurchaseStatus(e.target.value as 'pending' | 'ordered' | 'received' | 'cancelled')}
                  className="w-full bg-[#111827] border border-gray-800 rounded-lg px-4 py-2.5 text-white h-10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="pending">Pending</option>
                  <option value="ordered">Ordered</option>
                  <option value="received">Received</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* BRANCH - Read-only label (Phase 2 Option A) */}
              <div>
                <Label className="text-gray-400 text-xs mb-2 uppercase">
                  BRANCH
                </Label>
                <div className="flex items-center gap-2 bg-[#111827] border border-gray-800 rounded-lg px-4 py-2.5 h-10">
                  <span className="text-white text-sm font-medium">
                    {activeBranch && activeBranch.id !== 'ALL' 
                      ? `${activeBranch.name}${activeBranch.code ? ` (${activeBranch.code})` : ''}`
                      : 'No Branch Selected'}
                  </span>
                  <span className="text-gray-500 text-xs">🔒</span>
                </div>
                {(!activeBranch || activeBranch.id === 'ALL') && (
                  <p className="text-xs text-red-400 mt-1">Please select a specific branch</p>
                )}
              </div>
            </div>

            {/* Items Entry Section - Full Width Matching Drawer (1024px) */}
            <div className="space-y-4 w-full max-w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <FileText size={18} />
                  <h3 className="text-sm font-semibold uppercase">ITEMS ENTRY</h3>
                </div>
                <span className="text-xs text-gray-500">Enter to move</span>
              </div>
              
              <div className="flex gap-3 items-end w-full">
                {/* Product Search Portal - Nuclear Option */}
                <div className="flex-1 min-w-0">
                  <Label className="text-gray-400 text-xs mb-2 block">1. Find Product</Label>
                  <ProductSearchPortal
                    products={products}
                    onSelect={handleProductSelect}
                    onAddNew={handleAddNewProduct}
                    placeholder="Type product name or SKU..."
                    autoFocus={false}
                  />
                </div>
              </div>
            </div>

            {/* STANDARDIZED Purchase Item Table - Optimized Compact Layout */}
            <div className="border border-gray-800 rounded-xl overflow-hidden w-full max-w-full">
              {(() => {
                // Packing column is always visible (header always shown)
                const colSpan = 8;
                
                return (
                  <table className="w-full" style={{ width: '100%', tableLayout: 'fixed' }} data-table="items">
                    <thead className="bg-gray-800/50">
                      <tr>
                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-400 uppercase" style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}>#</th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-400 uppercase" style={{ width: '22%', minWidth: '160px' }}>Name & SKU</th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-400 uppercase" style={{ width: '10%', minWidth: '80px' }} data-column="variation">Variation</th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-400 uppercase" style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }}>Packing</th>
                        <th className="px-2 py-3 text-right text-xs font-medium text-gray-400 uppercase" style={{ width: '110px', minWidth: '110px', maxWidth: '110px' }}>Qty</th>
                        <th className="px-2 py-3 text-right text-xs font-medium text-gray-400 uppercase" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>Cost</th>
                        <th className="px-2 py-3 text-right text-xs font-medium text-gray-400 uppercase" style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }}>Total</th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-400 uppercase" style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={colSpan} className="px-4 py-12 text-center text-gray-500">
                            No items added. Search and add products above.
                          </td>
                        </tr>
                      ) : (
                        items.map((item, index) => {
                          const hasPacking = item.packing && item.packing.boxes > 0;
                          return (
                            <tr key={item.id} className="hover:bg-gray-800/30 group">
                              <td className="px-2 py-3 text-gray-400 text-center align-middle" style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}>{String(index + 1).padStart(2, '0')}</td>
                              <td className="px-2 py-3 align-middle" style={{ width: '22%', minWidth: '160px' }}>
                                <div>
                                  <div className="text-white font-medium truncate">{item.product_name}</div>
                                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                                    SKU: {item.variation_sku || item.sku}
                                    {item.variation_stock !== undefined && (
                                      <span className={cn(
                                        "ml-2",
                                        item.variation_stock > 10 ? "text-emerald-400" : item.variation_stock > 0 ? "text-yellow-400" : "text-red-400"
                                      )}>
                                        • Stock: {item.variation_stock.toFixed(0)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 py-3 align-middle" style={{ width: '10%', minWidth: '80px' }} data-column="variation">
                                {item.variation_name ? (
                                  <div className="text-xs text-indigo-400 font-medium truncate" title={item.variation_name}>
                                    {item.variation_name}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500">—</div>
                                )}
                              </td>
                              <td 
                                className="px-2 py-3 align-middle relative" 
                                style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }}
                              >
                                {(() => {
                                  const hasPacking = item.packing && item.packing.boxes > 0;
                                  return hasPacking && item.packing ? (
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
                                      className="bg-orange-600 hover:bg-orange-500 text-white border-orange-500 text-xs px-2 py-1.5 h-7 opacity-100"
                                    >
                                      <Truck size={12} className="mr-1" />
                                      {item.packing.boxes} / {(item.packing.totalPieces || item.packing.piecesPerBox || 0).toFixed(0)} / {(item.packing.totalMeters || item.packing.metersPerPiece || 0).toFixed(2)}M
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
                                      className="bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 text-xs px-2 py-1.5 h-7 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                                    >
                                      <Plus size={12} className="mr-1" />
                                      Add Pkg
                                    </Button>
                                  );
                                })()}
                              </td>
                              <td className="px-2 py-3 align-middle text-right" style={{ width: '110px', minWidth: '110px', maxWidth: '110px' }}>
                                {/* Desktop: Clean input only | Mobile: With +/- buttons */}
                                <div className="flex items-center gap-1 justify-end">
                                  {/* Mobile-only: Minus button (visible < 640px, hidden >= 640px) */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      updateQuantity(item.id, item.quantity - 1);
                                    }}
                                    className="block sm:hidden p-1 rounded bg-gray-800 hover:bg-gray-700 text-white"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <Input
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      e.preventDefault();
                                      updateQuantity(item.id, parseFloat(e.target.value) || 1);
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    className="bg-[#111827] border-gray-800 text-white text-right text-sm h-9 focus:ring-2 focus:ring-indigo-500/50"
                                    style={{ width: '110px', minWidth: '110px', maxWidth: '110px' }}
                                  />
                                  {/* Mobile-only: Plus button (visible < 640px, hidden >= 640px) */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      updateQuantity(item.id, item.quantity + 1);
                                    }}
                                    className="block sm:hidden p-1 rounded bg-gray-800 hover:bg-gray-700 text-white"
                                    aria-label="Increase quantity"
                                  >
                                    <Plus size={12} />
                                  </button>
                                </div>
                              </td>
                              <td className="px-2 py-3 align-middle text-right" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                                <div className="flex justify-end">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.unit_price}
                                    onChange={(e) => {
                                      e.preventDefault();
                                      updateUnitPrice(item.id, parseFloat(e.target.value) || 0);
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    className="bg-[#111827] border-gray-800 text-white text-right h-9 focus:ring-2 focus:ring-indigo-500/50"
                                    style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}
                                  />
                                </div>
                              </td>
                              <td className="px-2 py-3 text-white font-medium text-right align-middle" style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }}>
                                {formatCurrency(calculateRowTotal(item.unit_price, item.quantity))}
                              </td>
                              <td className="px-2 py-3 text-center align-middle" style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    removeItem(item.id);
                                  }}
                                  className="text-red-400 hover:text-red-300 transition-colors p-1 rounded hover:bg-red-500/10 mx-auto"
                                  aria-label="Remove item"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {/* Two Column Layout: COGS & SUMMARY (Left) | PAYMENT (Right) */}
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* COGS Section (Extra Expenses equivalent) */}
                <div className="bg-[#111827] border border-gray-800 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase">Extra Expenses</h3>
                    {cogs > 0 && (
                      <div className="bg-purple-600/20 border border-purple-500/30 rounded px-3 py-1">
                        <span className="text-purple-400 font-semibold text-sm">{formatCurrency(cogs)}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    <div>
                      <Label className="text-gray-400 text-xs mb-1.5 block">Amount</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={cogsAmount}
                        onChange={(e) => setCogsAmount(e.target.value)}
                        placeholder="0.00"
                        className="bg-[#0B0F1A] border-gray-800 text-white text-sm h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs mb-1.5 block">Notes (optional)</Label>
                      <Input
                        type="text"
                        value={cogsNotes}
                        onChange={(e) => setCogsNotes(e.target.value)}
                        placeholder="e.g. Stitching, Packaging"
                        className="bg-[#0B0F1A] border-gray-800 text-white text-sm h-9"
                      />
                    </div>
                  </div>
                </div>

                {/* INVOICE SUMMARY Card */}
                <div className="bg-[#111827] border border-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">INVOICE SUMMARY</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Items Subtotal</span>
                      <span className="text-white font-medium">{formatCurrency(itemsSubtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-gray-400 text-sm">% Discount</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={discountPercent}
                          onChange={(e) => setDiscountPercent(e.target.value)}
                          className="w-16 bg-[#0B0F1A] border-gray-800 text-white text-sm text-right h-8"
                        />
                        <span className="text-gray-500 text-xs">%</span>
                        <span className="text-red-400 text-sm font-medium min-w-[60px] text-right">
                          -{formatCurrency(discountAmount)}
                        </span>
                      </div>
                    </div>
                    {cogs > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">COGS</span>
                        <span className="text-purple-400 font-medium">+{formatCurrency(cogs)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                      {!showShippingInput && shipping === 0 ? (
                        <button
                          type="button"
                          onClick={() => setShowShippingInput(true)}
                          className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1.5 transition-colors"
                        >
                          <Truck size={14} />
                          Add Shipping
                        </button>
                      ) : showShippingInput ? (
                        <div className="flex items-center gap-2 w-full">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={shippingAmount}
                            onChange={(e) => setShippingAmount(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setShowShippingInput(false);
                              } else if (e.key === 'Escape') {
                                setShippingAmount('0');
                                setShowShippingInput(false);
                              }
                            }}
                            placeholder="Enter shipping amount"
                            className="flex-1 bg-[#0B0F1A] border-gray-800 text-white text-sm h-8"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setShowShippingInput(false);
                              if (!shippingAmount || parseFloat(shippingAmount) <= 0) {
                                setShippingAmount('0');
                              }
                            }}
                            className="text-gray-400 hover:text-white"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-medium">{formatCurrency(shipping)}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setShippingAmount('0');
                              setShowShippingInput(true);
                            }}
                            className="text-gray-400 hover:text-white"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="pt-3 border-t border-gray-800">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-white">Grand Total</span>
                        <span className="text-2xl font-bold text-orange-400">{formatCurrency(grandTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - PAYMENT */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase">PAYMENT</h3>
                  {paymentType === 'partial' && (
                    <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 rounded-full px-3 py-1 text-xs">
                      Partial
                    </Badge>
                  )}
                </div>
                
                <div className="bg-[#111827] border border-gray-800 rounded-lg p-4">
                  <div className="text-xs text-gray-500 uppercase mb-1">INVOICE AMOUNT</div>
                  <div className="text-3xl font-bold text-white mb-6">{formatCurrency(grandTotal)}</div>
                  
                  <div className="mb-4">
                    <div className="text-xs text-gray-500 mb-2">Quick Pay</div>
                    <div className="grid grid-cols-4 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickPay(25)}
                        className="bg-[#0B0F1A] border-gray-800 text-white hover:bg-gray-800 h-8 text-xs"
                      >
                        25%
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickPay(50)}
                        className="bg-[#0B0F1A] border-gray-800 text-white hover:bg-gray-800 h-8 text-xs"
                      >
                        50%
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickPay(75)}
                        className="bg-[#0B0F1A] border-gray-800 text-white hover:bg-gray-800 h-8 text-xs"
                      >
                        75%
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          handleQuickPay(100);
                          setPaymentType('cash');
                        }}
                        className="bg-green-600 hover:bg-green-500 text-white border-green-500 h-8 text-xs"
                      >
                        100%
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <select
                      value={paymentMethod}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'Bank') {
                          setPaymentMethod('Bank Transfer');
                        } else {
                          setPaymentMethod(value as 'Cash' | 'Card' | 'Bank Transfer');
                        }
                      }}
                      className="w-full bg-[#0B0F1A] border border-gray-800 rounded px-3 py-2 text-white text-sm h-9"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Bank Transfer">Bank</option>
                    </select>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => {
                        setPaymentAmount(e.target.value);
                        if (parseFloat(e.target.value) < grandTotal) {
                          setPaymentType('partial');
                        } else {
                          setPaymentType('cash');
                        }
                      }}
                      placeholder="Amount"
                      className="bg-[#0B0F1A] border-gray-800 text-white text-sm h-9"
                    />
                    <Button
                      type="button"
                      onClick={addPayment}
                      className="bg-blue-600 hover:bg-blue-500 text-white w-full h-9"
                    >
                      <Plus size={16} className="mr-2" />
                      Add Payment
                    </Button>
                    <Input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Reference (optional)"
                      className="bg-[#0B0F1A] border-gray-800 text-white text-sm h-9"
                    />
                  </div>

                  {payments.length > 0 && (
                    <div className="mt-4 space-y-2 pt-4 border-t border-gray-800">
                      {payments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between bg-[#0B0F1A] border border-gray-800 rounded p-2.5">
                          <div className="flex items-center gap-2">
                            {payment.method === 'Cash' && <Banknote size={14} className="text-green-400" />}
                            {payment.method === 'Bank Transfer' && <Banknote size={14} className="text-blue-400" />}
                            {payment.method === 'Card' && <Banknote size={14} className="text-indigo-400" />}
                            <div>
                              <div className="text-white text-sm font-medium">
                                {payment.method === 'Bank Transfer' ? 'Bank' : payment.method}
                                {payment.reference && ` (${payment.reference})`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-white text-sm font-medium">{formatCurrency(payment.amount)}</span>
                            <button
                              type="button"
                              onClick={() => removePayment(payment.id)}
                              className="text-gray-400 hover:text-white transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Total Paid</span>
                      <span className="text-green-400 font-semibold text-sm">{formatCurrency(totalPaid)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Balance Due</span>
                      <span className="text-orange-400 font-semibold text-sm">{formatCurrency(balanceDue)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Footer - Action Buttons */}
          <div className="sticky bottom-0 bg-[#0B0F1A] border-t border-gray-800 p-6 flex items-center justify-between z-10">
            <Button
              type="button"
              variant="outline"
              onClick={async () => await handleSubmit(false)}
              disabled={loading}
              className="bg-[#111827] border-gray-800 text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  Save
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={async () => await handleSubmit(true)}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Printer size={16} className="mr-2" />
                  Save & Print
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="bg-[#111827] border-gray-800 text-white hover:bg-gray-800"
            >
              <Paperclip size={16} />
            </Button>
          </div>
        </div>
        </SheetContent>
      </Sheet>

      {/* Variation Selection Modal - CLEAN & PROFESSIONAL UI */}
      {showVariationModal && selectedProductForVariation && typeof window !== 'undefined' && createPortal(
        <>
          {/* Backdrop - Sub-modal level with proper blur and click handling */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            data-variation-backdrop="true"
            style={{ 
              zIndex: 70,
              pointerEvents: 'auto'
            }}
            onClick={(e) => {
              // CRITICAL: Prevent all event propagation
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              // Close modal only when clicking directly on backdrop
              if (e.target === e.currentTarget) {
                // Use centralized reset function for consistency
                resetVariationStates();
              }
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
          />
          
          {/* Dialog Content - Sub-modal level */}
          <div 
            ref={variationModalRef}
            role="dialog" // ARIA role
            aria-modal="true" // ARIA modal
            aria-labelledby="variation-modal-title" // ARIA title
            aria-describedby="variation-modal-description" // ARIA description
            data-variation-modal="true"
            data-nested-modal="true"
            className="fixed inset-0 flex items-center justify-center pointer-events-none"
            style={{ 
              zIndex: 70,
              pointerEvents: 'none'
            }}
          >
            <div 
              className="bg-[#0B0F1A] border border-gray-800 rounded-lg p-6 w-full max-w-md mx-4 pointer-events-auto shadow-2xl"
              style={{ 
                zIndex: 100,
                pointerEvents: 'auto'
              }}
              onClick={(e) => {
                // CRITICAL: Stop all click propagation
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
              }}
              onMouseDown={(e) => {
                // CRITICAL: Stop mousedown propagation
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
              }}
              onKeyDown={(e) => {
                // CRITICAL: Stop keydown propagation to prevent background actions
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                
                // Handle Escape key
                if (e.key === 'Escape') {
                  // Use centralized reset function for consistency
                  resetVariationStates();
                  return;
                }
                
                // Handle Enter key to select variation - CRITICAL: Prevent background Save
                if (e.key === 'Enter') {
                  if (selectedVariationId) {
                    handleVariationSelect(e);
                  }
                  return; // Always return to prevent bubbling
                }
                
                // Handle Arrow keys for navigation
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  const buttons = Array.from(
                    variationModalRef.current?.querySelectorAll('button[data-variation-option]') || []
                  ) as HTMLButtonElement[];
                  
                  if (buttons.length === 0) return;
                  
                  const currentIndex = buttons.findIndex(btn => btn === document.activeElement);
                  let nextIndex: number;
                  
                  if (currentIndex >= 0) {
                    nextIndex = e.key === 'ArrowDown' 
                      ? (currentIndex + 1) % buttons.length
                      : (currentIndex - 1 + buttons.length) % buttons.length;
                  } else {
                    nextIndex = 0;
                  }
                  
                  buttons[nextIndex]?.focus();
                  setSelectedVariationId(Number(buttons[nextIndex]?.dataset.variationId));
                }
              }}
            >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 id="variation-modal-title" className="text-lg font-semibold text-white">Select Variation</h3>
                <p id="variation-modal-description" className="sr-only" role="description">Select a variation for {selectedProductForVariation?.name || 'this product'}</p>
                <p className="text-xs text-gray-400 mt-1">Product: {selectedProductForVariation?.name || 'Unknown'}</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  // Use centralized reset function for consistency
                  resetVariationStates();
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                }}
                className="text-gray-400 hover:text-white transition-colors rounded p-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                tabIndex={0}
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Variation Tiles - Clean List Style */}
            <div className="space-y-2 max-h-80 overflow-y-auto mb-6" id="variation-options-container">
              {productVariations.map((variation, index) => {
                // Use wholesale_price for purchase (cost price)
                const price = variation.wholesale_price || variation.retail_price || 0;
                const isFirst = index === 0;
                const isSelected = selectedVariationId === variation.id;
                
                return (
                  <button
                    key={variation.id}
                    ref={isFirst ? firstVariationButtonRef : null}
                    data-variation-option="true"
                    data-variation-id={variation.id}
                    type="button"
                    tabIndex={index === 0 ? 0 : -1}
                    onClick={(e) => {
                      // CRITICAL: Stop all propagation
                      e.preventDefault();
                      e.stopPropagation();
                      e.nativeEvent.stopImmediatePropagation();
                      setSelectedVariationId(variation.id);
                      (e.currentTarget as HTMLButtonElement).focus();
                    }}
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.nativeEvent.stopImmediatePropagation();
                      setSelectedVariationId(variation.id);
                      setTimeout(() => {
                        handleVariationSelect(e);
                      }, 100);
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.nativeEvent.stopImmediatePropagation();
                    }}
                    onFocus={(e) => {
                      const btn = e.currentTarget;
                      btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    }}
                    className={cn(
                      "w-full text-left p-4 rounded-lg border transition-all cursor-pointer",
                      "bg-[#0B0F1A] border-gray-800",
                      "hover:bg-white/5 hover:border-indigo-500/50",
                      "focus:outline-none focus:border-indigo-500",
                      isSelected 
                        ? "border-2 border-indigo-600 bg-indigo-500/5" 
                        : "border border-gray-800"
                    )}
                    style={{
                      outline: 'none',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-white font-medium text-sm">
                            {variation.variation_name || `${variation.variation_type || 'Variation'}: ${variation.variation_value || `#${variation.id}`}`}
                          </div>
                          {isSelected && (
                            <Check size={16} className="text-indigo-500 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-xs px-2 py-0.5">
                            <DollarSign size={12} className="inline mr-1" />
                            {formatCurrency(price)}
                          </Badge>
                          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs px-2 py-0.5">
                            <Box size={12} className="inline mr-1" />
                            SKU: {variation.sub_sku || `SKU-${variation.id}`}
                          </Badge>
                          <Badge className={cn(
                            "text-xs px-2 py-0.5",
                            (variation.stock || 0) > 10 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : (variation.stock || 0) > 0
                              ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          )}>
                            Stock: {variation.stock?.toFixed(0) || '0'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-800">
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  // Use centralized reset function for consistency
                  resetVariationStates();
                }}
                variant="outline"
                className="flex-1 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  handleVariationSelect(e);
                }}
                disabled={!selectedVariationId}
                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check size={16} className="mr-2" />
                Select
              </Button>
            </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Quick Add Product Drawer */}
      <Sheet open={showAddProductDrawer} onOpenChange={setShowAddProductDrawer}>
        <SheetContent side="right" className="w-full sm:w-full md:max-w-[1024px] h-screen bg-[#0B0F1A] border-gray-800 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">Add Product</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <AddProductForm
              isOpen={showAddProductDrawer}
              onClose={() => {
                setShowAddProductDrawer(false);
                setQuickAddProductName('');
              }}
              onSuccess={async (_productId?: number, productName?: string) => {
                setShowAddProductDrawer(false);
                setQuickAddProductName('');
                await loadProducts();
                // ProductSearchPortal will automatically show the new product when user searches
              }}
              initialName={quickAddProductName}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Packing Entry - Inline Modal */}
      {currentPackingItem && (
        <PackingEntry
          isOpen={packingDialogOpen}
          onClose={() => {
            setPackingDialogOpen(false);
            setCurrentPackingItem(null);
          }}
          onSave={(packingData) => {
            if (packingData && currentPackingItem) {
              // CRITICAL FIX: Use totalMeters from packingData (already calculated in PackingOverlay)
              const totalMeters = packingData.totalMeters || 0;
              const totalPieces = packingData.totalPieces || 0;
              const newQuantity = totalMeters > 0 ? totalMeters : currentPackingItem.quantity;
              const subtotal = (currentPackingItem.unit_price * newQuantity) - currentPackingItem.discount;
              
              setItems(items.map(i => {
                if (i.id === currentPackingItem.id) {
                  return {
                    ...i,
                    packing: packingData,
                    quantity: newQuantity,
                    subtotal
                  };
                }
                return i;
              }));
              
              toast.success(`Packing saved: ${packingData.boxes} boxes, ${totalPieces} pieces, ${totalMeters.toFixed(2)} meters`);
            }
            setPackingDialogOpen(false);
            setCurrentPackingItem(null);
          }}
          productName={currentPackingItem.product_name}
          initialData={currentPackingItem.packing || null}
        />
      )}

    </>
  );
}

