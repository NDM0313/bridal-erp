/**
 * Add Sale Modal Component
 * Redesigned to match screenshot exactly with right-side Sheet layout
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Search, Plus, Minus, Trash2, ShoppingBag, Calendar, HelpCircle, Pencil, UserPlus, User, FileText, DollarSign, ArrowDown, Save, Printer } from 'lucide-react';
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
}

interface AdditionalService {
  id: string;
  name: string;
  price: number;
}

interface Payment {
  id: string;
  method: 'Cash' | 'Card' | 'Bank Transfer';
  amount: number;
  reference?: string;
}

interface AddSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editSaleId?: number;
}

export function AddSaleModal({ isOpen, onClose, onSuccess, editSaleId }: AddSaleModalProps) {
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<string>('walkin');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [refNumber, setRefNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(''); // Will be auto-generated on submit
  const [salesman, setSalesman] = useState<string>('');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [services, setServices] = useState<AdditionalService[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Array<{ id: number; name: string }>>([]);
  const [salesmen, setSalesmen] = useState<Array<{ id: number; name: string }>>([]);
  const [products, setProducts] = useState<Array<{ id: number; name: string; sku: string; stock: number }>>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('Walk-in Customer');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState(-1);
  
  // Product search states
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productQuantity, setProductQuantity] = useState('1');
  const [productSalePrice, setProductSalePrice] = useState('0');
  const [selectedProductIndex, setSelectedProductIndex] = useState(-1);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  
  // Extra expenses
  const [extraExpenseType, setExtraExpenseType] = useState('Stitching');
  const [extraExpenseAmount, setExtraExpenseAmount] = useState('');
  const [extraExpenseNotes, setExtraExpenseNotes] = useState('');
  
  // Payment states
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Bank Transfer'>('Cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  
  // Discount
  const [discountPercent, setDiscountPercent] = useState('0');
  
  // Notes
  const [notes, setNotes] = useState('');

  // Optimized: Load data in parallel, non-blocking - modal opens immediately
  useEffect(() => {
    if (isOpen) {
      // Reset form immediately for instant UI
      if (!editSaleId) {
        resetForm();
      }
      
      // Load data in parallel without blocking modal render
      Promise.all([
        loadCustomers().catch(() => {}), // Fail silently, will retry on user interaction
        loadSalesmen().catch(() => {}),
        loadProducts().catch(() => {}),
      ]);
      
      // Load sale data for editing
      if (editSaleId) {
        loadSaleForEdit(editSaleId);
      }
    }
  }, [isOpen, editSaleId]);

  const resetForm = () => {
    setCustomer('walkin');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setRefNumber('');
    setInvoiceNumber('');
    setSalesman('');
    setItems([]);
    setServices([]);
    setPayments([]);
    setCustomerSearchTerm('Walk-in Customer');
    setProductSearchTerm('');
    setProductQuantity('1');
    setProductSalePrice('0');
    setExtraExpenseType('Stitching');
    setExtraExpenseAmount('');
    setExtraExpenseNotes('');
    setPaymentType('full');
    setPaymentMethod('Cash');
    setPaymentAmount('');
    setPaymentReference('');
    setDiscountPercent('0');
    setNotes('');
  };

  const loadSaleForEdit = async (saleId: number) => {
    try {
      setLoading(true);
      
      // Fetch transaction
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', saleId)
        .eq('type', 'sell')
        .single();
      
      if (txError || !transaction) {
        toast.error('Failed to load sale data');
        return;
      }

      // Set basic fields
      setDate(format(new Date(transaction.transaction_date), 'yyyy-MM-dd'));
      setRefNumber(transaction.ref_no || '');
      setInvoiceNumber(transaction.invoice_no || '');
      setNotes(transaction.additional_notes || '');
      
      // Set customer
      if (transaction.contact_id) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('id, name')
          .eq('id', transaction.contact_id)
          .single();
        
        if (contact) {
          setCustomer(contact.id.toString());
          setCustomerSearchTerm(contact.name);
        }
      }

      // Fetch sell lines
      const { data: sellLines } = await supabase
        .from('transaction_sell_lines')
        .select('*, variations(*, products(*))')
        .eq('transaction_id', saleId);
      
      if (sellLines) {
        const saleItems: SaleItem[] = sellLines.map((line, index) => {
          const product = (line.variations as any)?.products;
          const variation = line.variations as any;
          
          return {
            id: `item-${index}`,
            product_id: product?.id || line.product_id,
            product_name: product?.name || 'Unknown',
            sku: variation?.sub_sku || product?.sku || '',
            stock: 0, // Will be fetched if needed
            quantity: parseFloat(line.quantity?.toString() || '1'),
            unit_price: parseFloat(line.unit_price?.toString() || '0'),
            discount: parseFloat(line.line_discount_amount?.toString() || '0'),
            subtotal: parseFloat(line.line_total?.toString() || '0'),
          };
        });
        
        setItems(saleItems);
      }

      // Fetch payment data
      const { data: paymentsData } = await supabase
        .from('account_transactions')
        .select('amount, description')
        .eq('reference_type', 'sell')
        .eq('reference_id', saleId)
        .eq('type', 'credit');
      
      if (paymentsData && paymentsData.length > 0) {
        const totalPaid = paymentsData.reduce((sum, p) => sum + parseFloat(p.amount?.toString() || '0'), 0);
        const totalAmount = parseFloat(transaction.final_total?.toString() || '0');
        
        if (totalPaid < totalAmount) {
          setPaymentType('partial');
          setPaymentAmount(totalPaid.toString());
        } else {
          setPaymentType('full');
          setPaymentAmount(totalAmount.toString());
        }
        
        // Determine payment method from description
        const firstPayment = paymentsData[0];
        if (firstPayment.description?.includes('Cash')) {
          setPaymentMethod('Cash');
        } else if (firstPayment.description?.includes('Card')) {
          setPaymentMethod('Card');
        } else if (firstPayment.description?.includes('Bank')) {
          setPaymentMethod('Bank Transfer');
        }
      }
      
    } catch (err) {
      console.error('Error loading sale for edit:', err);
      toast.error('Failed to load sale data');
    } finally {
      setLoading(false);
    }
  };

  // Filter customers based on search term
  useEffect(() => {
    if (!customerSearchTerm || customerSearchTerm === 'Walk-in Customer') {
      setFilteredCustomers(customers);
      return;
    }
    const term = customerSearchTerm.toLowerCase();
    const filtered = customers.filter((c) => c.name.toLowerCase().includes(term));
    setFilteredCustomers(filtered);
  }, [customerSearchTerm, customers]);

  const loadCustomers = async () => {
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
        .from('contacts')
        .select('id, name')
        .eq('business_id', profile.business_id)
        .or('type.eq.customer,type.eq.both')
        .order('name');

      if (error) {
        console.error('Customers fetch error:', error);
        toast.error(`Failed to load customers: ${error.message || 'Network error'}`);
        return;
      }

      if (data) {
        setCustomers(data.map((c) => ({ id: c.id, name: c.name })));
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
      const errorMessage = err instanceof Error ? err.message : 'Network error. Please check your connection.';
      toast.error(`Failed to load customers: ${errorMessage}`);
    }
  };

  const loadSalesmen = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        return; // Don't show error for salesmen - it's optional
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
        return; // Don't show error for salesmen - it's optional
      }
      if (!profile) {
        console.warn('No business profile found');
        return;
      }

      // Load users as salesmen (or contacts with type 'salesman' if that exists)
      // For now, we'll use contacts or create a simple list
      // You can extend this to load from a salesmen table or user roles
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name')
        .eq('business_id', profile.business_id)
        .order('name')
        .limit(20);

      if (error) {
        console.error('Salesmen fetch error:', error);
        return; // Don't show error for salesmen - it's optional
      }

      if (data) {
        setSalesmen(data.map((c) => ({ id: c.id, name: c.name })));
      }
    } catch (err) {
      console.error('Failed to load salesmen:', err);
      // Don't show error for salesmen - it's optional
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
        toast.error(`Failed to load products: ${error.message || 'Network error'}`);
        return;
      }

      if (data) {
        setProducts(data.map((p) => ({ id: p.id, name: p.name, sku: p.sku || '', stock: 0 })));
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      const errorMessage = err instanceof Error ? err.message : 'Network error. Please check your connection.';
      toast.error(`Failed to load products: ${errorMessage}`);
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

    const newItem: SaleItem = {
      id: `item-${Date.now()}`,
      product_id: productToAdd.id,
      product_name: productToAdd.name,
      sku: productToAdd.sku,
      stock: productToAdd.stock,
      quantity: parseFloat(productQuantity) || 1,
      unit_price: parseFloat(productSalePrice) || 0,
      discount: 0,
      subtotal: (parseFloat(productSalePrice) || 0) * (parseFloat(productQuantity) || 1),
    };
    setItems([...items, newItem]);
    setProductSearchTerm('');
    setProductQuantity('1');
    setProductSalePrice('0');
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
      // Focus on price field using ref
      setTimeout(() => {
        priceInputRef.current?.focus();
        priceInputRef.current?.select();
      }, 50);
    }
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddProductFromSearch();
      // After adding, focus back on product search using ref
      setTimeout(() => {
        productSearchInputRef.current?.focus();
        productSearchInputRef.current?.select();
      }, 100);
    }
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

  const addExtraExpense = () => {
    if (!extraExpenseAmount || parseFloat(extraExpenseAmount) <= 0) {
      toast.error('Please enter a valid expense amount');
      return;
    }
    const newService: AdditionalService = {
      id: `service-${Date.now()}`,
      name: extraExpenseType,
      price: parseFloat(extraExpenseAmount),
    };
    setServices([...services, newService]);
    setExtraExpenseAmount('');
    setExtraExpenseNotes('');
  };

  const removeService = (serviceId: string) => {
    setServices(services.filter((s) => s.id !== serviceId));
  };

  const addPayment = () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    const newPayment: Payment = {
      id: `payment-${Date.now()}`,
      method: paymentMethod,
      amount: parseFloat(paymentAmount),
      reference: paymentReference || undefined,
    };
    setPayments([...payments, newPayment]);
    setPaymentAmount('');
    setPaymentReference('');
  };

  const removePayment = (paymentId: string) => {
    setPayments(payments.filter((p) => p.id !== paymentId));
  };

  const handleQuickPay = (percent: number) => {
    const invoiceAmount = grandTotal;
    const quickAmount = (invoiceAmount * percent) / 100;
    setPaymentAmount(quickAmount.toFixed(2));
  };

  // Calculations
  const itemsSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const servicesTotal = services.reduce((sum, s) => s.price, 0);
  const subtotal = itemsSubtotal + servicesTotal;
  const discountAmount = (subtotal * parseFloat(discountPercent || '0')) / 100;
  const grandTotal = subtotal - discountAmount;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balanceDue = grandTotal - totalPaid;

  const handleSubmit = async (saveAndPrint: boolean = false) => {
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
      console.log('=== STARTING SALE SUBMISSION ===');
      console.log('Items count:', items.length);
      console.log('Items:', items.map(i => ({ id: i.product_id, name: i.product_name })));

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('SUPABASE_ERROR', sessionError);
        throw new Error(`Session error: ${sessionError.message}`);
      }
      if (!session) {
        throw new Error('Please log in to create a sale');
      }
      console.log('✅ Session validated');

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (profileError) {
        console.error('SUPABASE_ERROR', profileError);
        throw new Error(`Profile error: ${profileError.message}`);
      }
      if (!profile) {
        throw new Error('Business profile not found');
      }
      console.log('✅ Profile loaded:', profile.business_id);

      const { data: location, error: locationError } = await supabase
        .from('business_locations')
        .select('id')
        .eq('business_id', profile.business_id)
        .limit(1)
        .single();

      if (locationError) {
        console.error('SUPABASE_ERROR', locationError);
        throw new Error(`Location error: ${locationError.message}`);
      }
      if (!location) {
        throw new Error('No business location found');
      }
      console.log('✅ Location loaded:', location.id);

      let customerType: 'retail' | 'wholesale' = 'retail';
      if (customer !== 'walkin') {
        const { data: contact, error: contactError } = await supabase
          .from('contacts')
          .select('customer_type')
          .eq('id', parseInt(customer))
          .single();
        
        if (contactError) {
          console.error('SUPABASE_ERROR', contactError);
          console.warn('Contact fetch error, using default retail type');
        } else {
          customerType = contact?.customer_type || 'retail';
        }
      }
      console.log('✅ Customer type:', customerType);

      const productIds = items.map(item => item.product_id);
      console.log('Product IDs to fetch:', productIds);
      
      if (productIds.length === 0) {
        throw new Error('No product IDs found in items');
      }

      // Handle single vs multiple product IDs for Supabase query
      // Note: variations table does NOT have unit_id, it's in products table
      let variationsQuery = supabase
        .from('variations')
        .select('id, product_id, product_variation_id, retail_price, wholesale_price');
      
      if (productIds.length === 1) {
        console.log('Using .eq() for single product ID:', productIds[0]);
        variationsQuery = variationsQuery.eq('product_id', productIds[0]);
      } else if (productIds.length > 1) {
        console.log('Using .in() for multiple product IDs:', productIds);
        variationsQuery = variationsQuery.in('product_id', productIds);
      } else {
        throw new Error('No product IDs found');
      }
      
      const { data: variationsData, error: variationsError } = await variationsQuery;
      
      if (variationsError) {
        console.error('SUPABASE_ERROR', variationsError);
        console.error('Variations Query Error:', {
          message: variationsError.message,
          details: variationsError.details,
          hint: variationsError.hint,
          code: variationsError.code,
        });
        throw new Error(`Failed to fetch variations: ${variationsError.message}${variationsError.details ? ` (${variationsError.details})` : ''}`);
      }

      if (!variationsData || variationsData.length === 0) {
        console.error('No variations found for product IDs:', productIds);
        const errorMsg = `Product variations not found for product IDs: ${productIds.join(', ')}`;
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }
      console.log('✅ Variations loaded:', variationsData.length);

      // Fetch products to get unit_id for each product
      let productsQuery = supabase
        .from('products')
        .select('id, unit_id');
      
      if (productIds.length === 1) {
        productsQuery = productsQuery.eq('id', productIds[0]);
      } else if (productIds.length > 1) {
        productsQuery = productsQuery.in('id', productIds);
      }
      
      const { data: productsData, error: productsError } = await productsQuery;
      
      if (productsError) {
        console.error('SUPABASE_ERROR', productsError);
        console.error('Products Query Error:', {
          message: productsError.message,
          details: productsError.details,
          hint: productsError.hint,
          code: productsError.code,
        });
        throw new Error(`Failed to fetch products: ${productsError.message}${productsError.details ? ` (${productsError.details})` : ''}`);
      }

      if (!productsData || productsData.length === 0) {
        console.error('No products found for product IDs:', productIds);
        throw new Error(`Products not found for product IDs: ${productIds.join(', ')}`);
      }
      console.log('✅ Products loaded:', productsData.length);

      // Generate invoice number
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', profile.business_id)
        .eq('type', 'sell')
        .eq('status', 'final')
        .gte('transaction_date', `${year}-${month}-01`)
        .lt('transaction_date', `${year}-${String(parseInt(month) + 1).padStart(2, '0')}-01`);
      
      const sequence = String((count || 0) + 1).padStart(4, '0');
      const invoiceNo = invoiceNumber || `INV-${year}${month}-${sequence}`;

      const customerId = customer === 'walkin' ? null : parseInt(customer);
      const paymentStatus = totalPaid >= grandTotal ? 'paid' : totalPaid > 0 ? 'partial' : 'due';
      
      // Determine status: 'draft' for save draft, 'final' for save & print
      const transactionStatus = saveAndPrint ? 'final' : 'draft';
      
      // Prepare transaction data
      const transactionData = {
        business_id: profile.business_id,
        location_id: location.id,
        type: 'sell',
        status: transactionStatus,
        payment_status: paymentStatus,
        contact_id: customerId,
        customer_type: customerType,
        invoice_no: invoiceNo,
        ref_no: refNumber || null,
        transaction_date: new Date(date).toISOString(),
        total_before_tax: parseFloat(subtotal.toString()),
        tax_amount: 0, // Tax is included in unit prices
        discount_amount: parseFloat(discountAmount.toString()),
        shipping_charges: parseFloat(servicesTotal.toString()),
        final_total: parseFloat(grandTotal.toString()),
        additional_notes: notes || null,
        created_by: session.user.id,
      };

      // Validate all required fields before submission
      if (!profile.business_id) {
        throw new Error('Business ID is missing');
      }
      if (!location?.id) {
        throw new Error('Location ID is missing');
      }
      if (!session?.user?.id) {
        throw new Error('User ID is missing');
      }

      // Log submission data for debugging
      console.log('=== SALE SUBMISSION DEBUG ===');
      console.log('Transaction Data:', JSON.stringify(transactionData, null, 2));
      console.log('Is Draft:', !saveAndPrint);
      console.log('Status:', transactionStatus);
      console.log('Customer ID:', customerId);
      console.log('Business ID:', profile.business_id);
      console.log('Location ID:', location.id);
      console.log('Created By (UUID):', session.user.id);
      
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();

      if (transactionError) {
        console.error('SUPABASE_ERROR', transactionError);
        console.error('Transaction Error Details:', {
          message: transactionError.message,
          details: transactionError.details,
          hint: transactionError.hint,
          code: transactionError.code,
        });
        throw new Error(`Failed to create transaction: ${transactionError.message}${transactionError.details ? ` (${transactionError.details})` : ''}${transactionError.hint ? ` Hint: ${transactionError.hint}` : ''}`);
      }

      if (!transaction) {
        throw new Error('Transaction was not created');
      }

      transactionId = transaction.id;

      // Create sell lines
      const sellLines = [];
      const stockUpdates: Array<{ variationId: number; locationId: number; quantityInPieces: number }> = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const variation = variationsData.find(v => v.product_id === item.product_id);
        
        if (!variation) {
          throw new Error(`Variation not found for product: ${item.product_name}`);
        }

        // Get unit_id from products table (not variations)
        const product = productsData.find(p => p.id === item.product_id);
        if (!product) {
          throw new Error(`Product not found: ${item.product_name}`);
        }

        let quantityInPieces = item.quantity;

        const lineSubtotal = (item.unit_price * item.quantity) - item.discount;
        const lineTax = lineSubtotal * 0.1;
        const lineTotal = lineSubtotal + lineTax;
        const salePrice = customerType === 'wholesale' ? variation.wholesale_price : variation.retail_price;

        sellLines.push({
          transaction_id: transaction.id,
          variation_id: variation.id,
          product_id: item.product_id,
          quantity: parseFloat(quantityInPieces.toString()),
          unit_id: product.unit_id || 1, // Get unit_id from product, not variation
          unit_price: parseFloat(item.unit_price.toString()),
          unit_price_inc_tax: parseFloat((item.unit_price * 1.1).toString()), // Price including tax
          item_tax: parseFloat(lineTax.toString()),
          line_total: parseFloat(lineTotal.toString()),
          line_discount_type: item.discount > 0 ? 'fixed' : null,
          line_discount_amount: parseFloat(item.discount.toString()),
        });

        stockUpdates.push({
          variationId: variation.id,
          locationId: location.id,
          quantityInPieces: quantityInPieces,
        });
      }

      // Validate sell lines before submission
      for (const line of sellLines) {
        if (!line.transaction_id || !line.variation_id || !line.product_id || !line.unit_id) {
          throw new Error(`Invalid sell line data: missing required fields. Line: ${JSON.stringify(line)}`);
        }
        if (line.quantity <= 0) {
          throw new Error(`Invalid quantity in sell line: ${line.quantity}`);
        }
        if (line.unit_price < 0) {
          throw new Error(`Invalid unit price in sell line: ${line.unit_price}`);
        }
      }

      // Log sell lines data for debugging
      console.log('Sell Lines Data:', JSON.stringify(sellLines, null, 2));
      console.log('Number of lines:', sellLines.length);
      
      const { error: linesError } = await supabase
        .from('transaction_sell_lines')
        .insert(sellLines);

      if (linesError) {
        console.error('SUPABASE_ERROR', linesError);
        console.error('Sell Lines Error Details:', {
          message: linesError.message,
          details: linesError.details,
          hint: linesError.hint,
          code: linesError.code,
        });
        throw new Error(`Failed to create sell lines: ${linesError.message}${linesError.details ? ` (${linesError.details})` : ''}${linesError.hint ? ` Hint: ${linesError.hint}` : ''}`);
      }
      
      console.log('✅ Sell lines created successfully');

      // Update stock only for final transactions (not drafts)
      if (transactionStatus === 'final') {
        console.log('Updating stock for final transaction...');
        for (const stockUpdate of stockUpdates) {
          const { data: currentStock, error: stockError } = await supabase
            .from('variation_location_details')
            .select('qty_available')
            .eq('variation_id', stockUpdate.variationId)
            .eq('location_id', stockUpdate.locationId)
            .maybeSingle();

          if (stockError) {
            console.error('Stock fetch error:', stockError);
            // Continue with other items even if one fails
            continue;
          }

          const currentQty = parseFloat(currentStock?.qty_available?.toString() || '0');
          const newStock = Math.max(0, currentQty - stockUpdate.quantityInPieces);

          if (currentStock) {
            const { error: updateError } = await supabase
              .from('variation_location_details')
              .update({ qty_available: newStock.toString() })
              .eq('variation_id', stockUpdate.variationId)
              .eq('location_id', stockUpdate.locationId);
            
            if (updateError) {
              console.error('Stock update error:', updateError);
            }
          } else {
            console.warn(`Stock record not found for variation ${stockUpdate.variationId} at location ${stockUpdate.locationId}`);
          }
        }
      } else {
        console.log('Skipping stock update for draft transaction');
      }

      // Create accounting entries for payments
      // Save each payment separately to account_transactions
      if (payments.length > 0 && totalPaid > 0) {
        try {
          const { createAccountTransactionForSale } = await import('@/lib/services/accountingService');
          
          // Create account transaction for each payment
          for (const payment of payments) {
            await createAccountTransactionForSale(
              profile.business_id,
              transaction.id,
              parseFloat(payment.amount.toString()),
              payment.method,
              session.user.id,
              `Sale - Invoice ${invoiceNo} - ${payment.method}${payment.reference ? ` (Ref: ${payment.reference})` : ''}`
            );
          }
          
          console.log(`✅ Created ${payments.length} payment entry/entries totaling ${formatCurrency(totalPaid)}`);
        } catch (accountingError) {
          console.error('Failed to create accounting entry:', accountingError);
          // Don't throw - log but continue
        }
      }

      console.log('✅ Transaction created successfully:', transaction.id);
      console.log('=== END SUBMISSION DEBUG ===');
      
      toast.success(`Sale ${saveAndPrint ? 'saved and printed' : 'saved as draft'} successfully!`);
      
      if (saveAndPrint) {
        // Wait a bit for transaction to be fully committed, then open invoice
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Navigate to invoice page with print parameter
        const invoiceUrl = `/sales/${transaction.id}/invoice?print=true`;
        console.log('Opening invoice URL:', invoiceUrl);
        window.open(invoiceUrl, '_blank');
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('=== SALE SUBMISSION ERROR ===');
      console.error('Raw Error:', err);
      console.error('Error Type:', typeof err);
      console.error('Error instanceof Error:', err instanceof Error);
      console.error('Error instanceof Object:', err instanceof Object);
      console.error('Transaction ID (if created):', transactionId);
      
      // Try to extract error information from various error types
      let errorMessage = 'Failed to create sale. Please check the console for details.';
      let errorDetails: any = null;

      if (err instanceof Error) {
        errorMessage = err.message;
        errorDetails = {
          name: err.name,
          message: err.message,
          stack: err.stack,
        };
      } else if (err && typeof err === 'object') {
        // Supabase error or other object error
        errorDetails = err;
        if ('message' in err) {
          errorMessage = String(err.message);
        } else if ('error' in err && typeof err.error === 'object' && err.error !== null && 'message' in err.error) {
          errorMessage = String(err.error.message);
        }
        
        // Log all properties of the error object
        console.error('Error Object Keys:', Object.keys(err));
        console.error('Error Object Values:', Object.values(err));
        console.error('Full Error Object:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
      } else {
        errorMessage = String(err);
      }

      // Log Supabase-specific error if present
      if (errorDetails && typeof errorDetails === 'object') {
        console.error('SUPABASE_ERROR', errorDetails);
        if ('details' in errorDetails) {
          console.error('Error Details:', errorDetails.details);
        }
        if ('hint' in errorDetails) {
          console.error('Error Hint:', errorDetails.hint);
        }
        if ('code' in errorDetails) {
          console.error('Error Code:', errorDetails.code);
        }
      }
      
      // Cleanup: Delete transaction if it was created but lines failed
      if (transactionId) {
        console.log('Cleaning up transaction:', transactionId);
        try {
          const { error: deleteError } = await supabase
            .from('transactions')
            .delete()
            .eq('id', transactionId);
          
          if (deleteError) {
            console.error('SUPABASE_ERROR', deleteError);
            console.error('Failed to cleanup transaction:', deleteError);
          }
        } catch (cleanupErr) {
          console.error('Cleanup error:', cleanupErr);
        }
      }
      
      toast.error(errorMessage);
      console.error('=== END ERROR DEBUG ===');
    } finally {
      setLoading(false);
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
                    <SheetTitle className="text-2xl font-bold text-white">New Sale Invoice</SheetTitle>
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
              {/* Top Fields - CUSTOMER, DATE, REF NUMBER, INVOICE NUMBER, SALESMAN */}
              <div className="grid grid-cols-5 gap-4">
                <div>
                  <Label className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                    <User size={16} />
                    CUSTOMER
                  </Label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={customerSearchTerm}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCustomerSearchTerm(value);
                        setShowCustomerDropdown(true);
                        setSelectedCustomerIndex(-1);
                        if (value === '') {
                          setCustomer('walkin');
                          setCustomerSearchTerm('Walk-in Customer');
                        }
                      }}
                      onFocus={() => {
                        if (customer === 'walkin') {
                          setCustomerSearchTerm('');
                        }
                        setShowCustomerDropdown(true);
                      }}
                      onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setShowCustomerDropdown(true);
                          setSelectedCustomerIndex(prev => 
                            prev < filteredCustomers.length ? prev + 1 : prev
                          );
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setShowCustomerDropdown(true);
                          setSelectedCustomerIndex(prev => prev > -1 ? prev - 1 : -1);
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          if (selectedCustomerIndex >= 0 && filteredCustomers[selectedCustomerIndex]) {
                            const selected = filteredCustomers[selectedCustomerIndex];
                            setCustomer(selected.id.toString());
                            setCustomerSearchTerm(selected.name);
                            setShowCustomerDropdown(false);
                            setSelectedCustomerIndex(-1);
                            // Focus on next field (DATE)
                            setTimeout(() => {
                              const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
                              dateInput?.focus();
                            }, 100);
                          } else if (customerSearchTerm === 'Walk-in Customer' || customerSearchTerm === '') {
                            setCustomer('walkin');
                            setCustomerSearchTerm('Walk-in Customer');
                            setShowCustomerDropdown(false);
                            setTimeout(() => {
                              const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
                              dateInput?.focus();
                            }, 100);
                          }
                        } else if (e.key === 'Escape') {
                          setShowCustomerDropdown(false);
                          setSelectedCustomerIndex(-1);
                        } else if (e.key === 'Tab') {
                          setShowCustomerDropdown(false);
                          setSelectedCustomerIndex(-1);
                        }
                      }}
                      placeholder="Select Customer"
                      className="bg-[#111827] border-gray-800 text-white h-10"
                    />
                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        <div
                          className={cn(
                            "px-4 py-2 hover:bg-gray-700 cursor-pointer text-white border-b border-gray-700",
                            selectedCustomerIndex === -1 && "bg-gray-700"
                          )}
                          onClick={() => {
                            setCustomer('walkin');
                            setCustomerSearchTerm('Walk-in Customer');
                            setShowCustomerDropdown(false);
                            setSelectedCustomerIndex(-1);
                          }}
                        >
                          Walk-in Customer
                        </div>
                        {filteredCustomers.map((c, index) => (
                          <div
                            key={c.id}
                            className={cn(
                              "px-4 py-2 hover:bg-gray-700 cursor-pointer text-white",
                              selectedCustomerIndex === index && "bg-gray-700"
                            )}
                            onClick={() => {
                              setCustomer(c.id.toString());
                              setCustomerSearchTerm(c.name);
                              setShowCustomerDropdown(false);
                              setSelectedCustomerIndex(-1);
                            }}
                          >
                            {c.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                        const billInput = document.querySelector('input[placeholder*="bill number"]') as HTMLInputElement;
                        billInput?.focus();
                        billInput?.select();
                      }
                    }}
                    className="bg-[#111827] border-gray-800 text-white h-10"
                  />
                </div>

                <div>
                  <Label className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                    <FileText size={16} />
                    BILL NUMBER
                  </Label>
                  <Input
                    type="text"
                    value={refNumber}
                    onChange={(e) => setRefNumber(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Tab') {
                        e.preventDefault();
                        const invInput = document.querySelector('input[placeholder="INV-001"][disabled]') as HTMLInputElement;
                        if (invInput) {
                          // Skip disabled invoice number, go to salesman
                          const salesmanSelect = document.querySelector('select[value=""]') as HTMLSelectElement;
                          salesmanSelect?.focus();
                        } else {
                          const salesmanSelect = document.querySelector('select[value=""]') as HTMLSelectElement;
                          salesmanSelect?.focus();
                        }
                      }
                    }}
                    placeholder="Enter bill number from book"
                    className="bg-[#111827] border-gray-800 text-white h-10 font-medium"
                  />
                </div>

                <div>
                  <Label className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                    <FileText size={16} />
                    INVOICE NUMBER (System)
                  </Label>
                  <Input
                    type="text"
                    value={(() => {
                      // Auto-generate preview based on current date
                      const date = new Date();
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      return invoiceNumber || `INV-${year}${month}-0001`;
                    })()}
                    disabled
                    readOnly
                    placeholder="Auto-generated"
                    className="bg-[#111827] border-gray-800 text-gray-500 h-10 cursor-not-allowed"
                    title="Auto-generated invoice number (read-only)"
                  />
                </div>

                <div>
                  <Label className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                    <User size={16} />
                    SALESMAN
                  </Label>
                  <select
                    value={salesman}
                    onChange={(e) => setSalesman(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Tab') {
                        e.preventDefault();
                        const productSearch = document.querySelector('input[placeholder*="Scan barcode"]') as HTMLInputElement;
                        productSearch?.focus();
                      }
                    }}
                    className="w-full bg-[#111827] border border-gray-800 rounded-lg px-4 py-2.5 text-white h-10"
                  >
                    <option value="">No Salesman</option>
                    {salesmen.map((s) => (
                      <option key={s.id} value={s.id.toString()}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ITEMS ENTRY Section */}
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
                        placeholder="Scan barcode or type name..."
                        className="bg-[#111827] border-gray-800 text-white pl-10"
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
                                setTimeout(() => {
                                  const qtyInput = document.querySelector('input[type="number"][min="1"][placeholder="1"]') as HTMLInputElement;
                                  if (!qtyInput) {
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
                      className="bg-[#111827] border-gray-800 text-white"
                    />
                  </div>
                  
                  <div className="w-32">
                    <Label className="text-gray-400 text-xs mb-2 block">3. Sale Price</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <Input
                        ref={priceInputRef}
                        type="number"
                        min="0"
                        step="0.01"
                        value={productSalePrice}
                        onChange={(e) => setProductSalePrice(e.target.value)}
                        onKeyDown={handlePriceKeyDown}
                        placeholder="0"
                        className="bg-[#111827] border-gray-800 text-white pl-7"
                      />
                    </div>
                  </div>
                  
                  <Button
                    type="button"
                    onClick={() => handleAddProductFromSearch()}
                    className="bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    <ArrowDown size={16} className="mr-2" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Product Table */}
              <div className="border border-gray-800 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Product Details</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
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
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateUnitPrice(item.id, parseFloat(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              className="w-24 bg-[#111827] border-gray-800 text-white"
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
                                className="w-16 text-center bg-[#111827] border-gray-800 text-white text-sm"
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
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Two Column Layout: EXTRA EXPENSES & INVOICE SUMMARY (Left) | PAYMENT (Right) */}
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* EXTRA EXPENSES */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-gray-400">
                      <DollarSign size={18} />
                      <h3 className="text-sm font-semibold uppercase">$ EXTRA EXPENSES</h3>
                    </div>
                    <div className="space-y-3">
                      <select
                        value={extraExpenseType}
                        onChange={(e) => setExtraExpenseType(e.target.value)}
                        className="w-full bg-[#111827] border border-gray-800 rounded-lg px-4 py-2.5 text-white"
                      >
                        <option value="Stitching">Stitching</option>
                        <option value="Dying">Dying</option>
                        <option value="Other">Other</option>
                      </select>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={extraExpenseAmount}
                        onChange={(e) => setExtraExpenseAmount(e.target.value)}
                        placeholder="Amount"
                        className="bg-[#111827] border-gray-800 text-white"
                      />
                      <Input
                        type="text"
                        value={extraExpenseNotes}
                        onChange={(e) => setExtraExpenseNotes(e.target.value)}
                        placeholder="Notes (optional)"
                        className="bg-[#111827] border-gray-800 text-white"
                      />
                      <Button
                        type="button"
                        onClick={addExtraExpense}
                        className="bg-purple-600 hover:bg-purple-500 text-white w-full"
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                    {services.length > 0 && (
                      <div className="space-y-2">
                        {services.map((service) => (
                          <div key={service.id} className="flex items-center justify-between bg-gray-800/50 p-2 rounded">
                            <div>
                              <div className="text-white text-sm">{service.name}</div>
                              <div className="text-gray-400 text-xs">{formatCurrency(service.price)}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeService(service.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* INVOICE SUMMARY */}
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
                          className="bg-[#111827] border-gray-800 text-white rounded px-2 py-1 text-sm"
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
                          className="w-20 bg-[#111827] border-gray-800 text-white text-sm"
                        />
                      </div>
                    </div>
                    <div className="pt-3 border-t border-gray-700">
                      <div className="flex justify-between">
                        <span className="text-lg font-semibold text-white">Grand Total:</span>
                        <span className="text-2xl font-bold text-blue-400">{formatCurrency(grandTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - PAYMENT */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase">PAYMENT</h3>
                    {paymentType === 'partial' && (
                      <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 rounded-md">
                        Partial
                      </Badge>
                    )}
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-2">INVOICE AMOUNT</div>
                    <div className="text-3xl font-bold text-white mb-4">{formatCurrency(grandTotal)}</div>
                    
                    <div className="mb-4">
                      <div className="text-xs text-gray-500 mb-2">Quick Pay</div>
                      <div className="grid grid-cols-4 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickPay(25)}
                          className="bg-[#111827] border-gray-800 text-white hover:bg-gray-700"
                        >
                          25%
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickPay(50)}
                          className="bg-[#111827] border-gray-800 text-white hover:bg-gray-700"
                        >
                          50%
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickPay(75)}
                          className="bg-[#111827] border-gray-800 text-white hover:bg-gray-700"
                        >
                          75%
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickPay(100)}
                          className="bg-green-600 hover:bg-green-500 text-white border-green-500"
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
                        className="w-full bg-[#111827] border border-gray-800 rounded-lg px-4 py-2.5 text-white"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="Amount"
                        className="bg-[#111827] border-gray-800 text-white"
                      />
                      <Button
                        type="button"
                        onClick={addPayment}
                        className="bg-blue-600 hover:bg-blue-500 text-white w-full"
                      >
                        <Plus size={16} className="mr-2" />
                        Add Payment
                      </Button>
                      <Input
                        type="text"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder="Reference (optional)"
                        className="bg-[#111827] border-gray-800 text-white"
                      />
                    </div>

                    {payments.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {payments.map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between bg-gray-800/50 p-2 rounded">
                            <div>
                              <div className="text-white text-sm">{payment.method}</div>
                              <div className="text-gray-400 text-xs">{formatCurrency(payment.amount)}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removePayment(payment.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Paid:</span>
                        <span className="text-green-400 font-semibold">{formatCurrency(totalPaid)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Balance Due:</span>
                        <span className="text-orange-400 font-semibold">{formatCurrency(balanceDue)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-800">
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
                  className="bg-blue-600 hover:bg-blue-500 text-white"
                >
                  <Printer size={16} className="mr-2" />
                  Save & Print
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
