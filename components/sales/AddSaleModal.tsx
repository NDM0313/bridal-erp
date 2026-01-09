/**
 * Add Sale Modal Component
 * Redesigned to match screenshot exactly with right-side Sheet layout
 */

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Plus, Minus, Trash2, ShoppingBag, Calendar, HelpCircle, Pencil, UserPlus, User, FileText, DollarSign, ArrowDown, Save, Printer, Check, PlusCircle, Truck, Paperclip, Banknote, Loader2, Package } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { AddProductForm } from '@/components/products/AddProductForm';
import { useGlobalRefresh } from '@/lib/hooks/useGlobalRefresh';
import { PackingEntry, PackingEntryData } from '@/components/purchases/PackingOverlay';
import { ProductSearchPortal } from '@/components/inventory/ProductSearchPortal';
import { isDemoMode } from '@/lib/config/demoConfig';
import { useBranchV2 } from '@/lib/context/BranchContextV2';
import { useRole } from '@/lib/hooks/useRole';

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
  packing?: PackingEntryData;
  // Variation details (for products with variations)
  variation_id?: number;
  variation_name?: string;
  variation_sku?: string; // Variation's sub_sku
  variation_stock?: number; // Variation's stock level
  requires_production?: boolean;
}

interface AdditionalService {
  id: string;
  name: string;
  price: number;
  notes?: string;
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
  const { handleSuccess } = useGlobalRefresh();
  const [customer, setCustomer] = useState<string>('walkin');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [refNumber, setRefNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(''); // Will be auto-generated on submit
  const [salesman, setSalesman] = useState<string>('');
  const [sendToStudio, setSendToStudio] = useState(false); // hidden toggle (auto-enabled by products)
  const [saleType, setSaleType] = useState<'Regular' | 'Studio'>('Regular'); // UI-only dropdown
  const [branchId, setBranchId] = useState<number | null>(null);
  
  // Get active branch from context
  const { activeBranch, branches } = useBranchV2();
  const { role, isAdmin } = useRole();
  
  const [items, setItems] = useState<SaleItem[]>([]);
  const [services, setServices] = useState<AdditionalService[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Array<{ id: number; name: string }>>([]);
  const [salesmen, setSalesmen] = useState<Array<{ id: number; name: string }>>([]);
  const [products, setProducts] = useState<Array<{ id: number; name: string; sku: string; stock: number; requires_production?: boolean }>>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('Walk-in Customer');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState(-1);
  
  // Product search states - SIMPLIFIED (using ProductSearchPortal)
  const [productQuantity, setProductQuantity] = useState('1');
  const [productSalePrice, setProductSalePrice] = useState('0');
  
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
  
  // Add New Product states (for Quick Add from search)
  const [showAddProductDrawer, setShowAddProductDrawer] = useState(false);
  const [quickAddProductName, setQuickAddProductName] = useState('');
  const variationModalRef = useRef<HTMLDivElement | null>(null);
  
  // Packing states
  const [packingDialogOpen, setPackingDialogOpen] = useState(false);
  const [currentPackingItem, setCurrentPackingItem] = useState<SaleItem | null>(null);
  
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
  
  // Shipping
  const [shippingAmount, setShippingAmount] = useState('0');
  const [showShippingInput, setShowShippingInput] = useState(false);
  
  // Notes
  const [notes, setNotes] = useState('');

  // Auto-tag branch when modal opens
  useEffect(() => {
    if (isOpen && activeBranch && !editSaleId) {
      setBranchId(activeBranch.id);
    }
  }, [isOpen, activeBranch, editSaleId]);

  // Auto-enable Studio toggle if any item requires production
  useEffect(() => {
    if (items.some((i) => i.requires_production)) {
      setSendToStudio(true);
    }
  }, [items]);

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
    } else {
      // Reset shipping input state when modal closes
      setShowShippingInput(false);
    }
  }, [isOpen, editSaleId]);

  const resetForm = () => {
    setCustomer('walkin');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setRefNumber('');
    setInvoiceNumber('');
    setSalesman('');
    setSendToStudio(false);
    setItems([]);
    setServices([]);
    setPayments([]);
    setCustomerSearchTerm('Walk-in Customer');
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
    setShippingAmount('0');
    setShowShippingInput(false);
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

  // Auto-generate Invoice Number using settings (Invoice for regular sales, POS Receipt for walk-in)
  useEffect(() => {
    const generateInvoiceNumber = async () => {
      try {
        // Load settings from localStorage
        const storedSettings = localStorage.getItem('studio_rently_settings');
        const settings = storedSettings ? JSON.parse(storedSettings) : null;
        
        // Determine if this is a POS transaction (walk-in customer)
        const isPOSTransaction = customer === 'walkin' || customerSearchTerm === 'Walk-in Customer';
        
        let numberSettings;
        if (isPOSTransaction) {
          // Use POS Receipt settings for walk-in customers
          numberSettings = {
            prefix: settings?.pos_receipt_prefix || 'POS',
            format: settings?.pos_receipt_format || 'long',
            custom_format: settings?.pos_receipt_custom_format || '',
          };
        } else {
          // Use Invoice settings for regular sales
          numberSettings = {
            prefix: settings?.invoice_prefix || 'INV',
            format: settings?.invoice_format || 'long',
            custom_format: settings?.invoice_custom_format || '',
          };
        }

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

        // Find the last transaction to get the next sequence number
        const prefix = numberSettings.prefix || (isPOSTransaction ? 'POS' : 'INV');
        let searchPattern = `${prefix}-%`;
        
        if (numberSettings.format === 'long') {
          searchPattern = `${prefix}-${year}-%`;
        } else if (numberSettings.format === 'short') {
          searchPattern = `${prefix}-%`;
        }

        const { data: lastTransaction } = await supabase
          .from('transactions')
          .select('invoice_no')
          .eq('business_id', profile.business_id)
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

        // Generate number using appropriate utility
        if (isPOSTransaction) {
          const { generatePOSReceiptNumber } = await import('@/lib/utils/invoiceGenerator');
          const posSettings = {
            pos_receipt_prefix: numberSettings.prefix,
            pos_receipt_format: numberSettings.format,
            pos_receipt_custom_format: numberSettings.custom_format,
          };
          const generatedNumber = generatePOSReceiptNumber(posSettings, sequence, dateObj);
          setInvoiceNumber(generatedNumber);
        } else {
          const { generateInvoiceNumber: generateInv } = await import('@/lib/utils/invoiceGenerator');
          const invoiceSettings = {
            invoice_prefix: numberSettings.prefix,
            invoice_format: numberSettings.format,
            invoice_custom_format: numberSettings.custom_format,
          };
          const generatedInvoice = generateInv(invoiceSettings, sequence, dateObj);
          setInvoiceNumber(generatedInvoice);
        }
      } catch (err) {
        // Fallback: Generate a placeholder if database query fails
        const dateObj = new Date(date);
        const year = dateObj.getFullYear();
        const isPOSTransaction = customer === 'walkin' || customerSearchTerm === 'Walk-in Customer';
        const prefix = isPOSTransaction ? 'POS' : 'INV';
        setInvoiceNumber(`${prefix}-${year}-0001`);
      }
    };

    if (isOpen && !editSaleId) {
      generateInvoiceNumber();
    }
  }, [date, isOpen, editSaleId, customer, customerSearchTerm]);

  // Filter customers based on search term - only show when typing
  useEffect(() => {
    if (!customerSearchTerm || customerSearchTerm === 'Walk-in Customer' || customerSearchTerm.trim() === '') {
      // Don't show all customers when search is empty - only show when user types
      setFilteredCustomers([]);
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
      // Demo mode: Use dummy salesmen immediately
      if (isDemoMode()) {
        const dummySalesmen = [
          { id: 9991, name: 'Zaid Khan' },
          { id: 9992, name: 'Ahmed Ali' },
          { id: 9993, name: 'Bilal Sheikh' },
        ];
        setSalesmen(dummySalesmen);
        return;
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.warn('Session error (salesmen):', sessionError);
        // Fallback to empty or demo data
        if (isDemoMode()) {
          const dummySalesmen = [
            { id: 9991, name: 'Zaid Khan' },
            { id: 9992, name: 'Ahmed Ali' },
            { id: 9993, name: 'Bilal Sheikh' },
          ];
          setSalesmen(dummySalesmen);
        } else {
          setSalesmen([]);
        }
        return; // Don't show error for salesmen - it's optional
      }
      if (!session) {
        console.warn('No active session (salesmen)');
        // Fallback to empty or demo data
        if (isDemoMode()) {
          const dummySalesmen = [
            { id: 9991, name: 'Zaid Khan' },
            { id: 9992, name: 'Ahmed Ali' },
            { id: 9993, name: 'Bilal Sheikh' },
          ];
          setSalesmen(dummySalesmen);
        } else {
          setSalesmen([]);
        }
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (profileError) {
        console.warn('Profile error (salesmen):', profileError);
        // Fallback to empty or demo data
        if (isDemoMode()) {
          const dummySalesmen = [
            { id: 9991, name: 'Zaid Khan' },
            { id: 9992, name: 'Ahmed Ali' },
            { id: 9993, name: 'Bilal Sheikh' },
          ];
          setSalesmen(dummySalesmen);
        } else {
          setSalesmen([]);
        }
        return; // Don't show error for salesmen - it's optional
      }
      if (!profile) {
        console.warn('No business profile found (salesmen)');
        // Fallback to empty or demo data
        if (isDemoMode()) {
          const dummySalesmen = [
            { id: 9991, name: 'Zaid Khan' },
            { id: 9992, name: 'Ahmed Ali' },
            { id: 9993, name: 'Bilal Sheikh' },
          ];
          setSalesmen(dummySalesmen);
        } else {
          setSalesmen([]);
        }
        return;
      }

      // FIXED: Load salesmen from view (includes name from auth.users)
      const { data, error } = await supabase
        .from('v_salesmen')
        .select('id, name, email')
        .eq('business_id', profile.business_id)
        .order('name');

      if (error) {
        // Better error logging
        const errorMessage = error.message || JSON.stringify(error);
        console.warn('Salesmen fetch error (non-critical):', errorMessage);
        
        // Fallback: Try direct user_profiles query (without name/email)
        const { data: fallbackData } = await supabase
          .from('user_profiles')
          .select('id, user_id')
          .eq('business_id', profile.business_id)
          .eq('role', 'salesman')
          .order('id');

        if (fallbackData && fallbackData.length > 0) {
          // Use user_id as name fallback
          const salesmenWithIds = fallbackData.map(prof => ({
            id: prof.id,
            name: `Salesman ${prof.id}`,
          }));
          setSalesmen(salesmenWithIds);
        } else if (isDemoMode()) {
          const dummySalesmen = [
            { id: 9991, name: 'Zaid Khan' },
            { id: 9992, name: 'Ahmed Ali' },
            { id: 9993, name: 'Bilal Sheikh' },
          ];
          setSalesmen(dummySalesmen);
        } else {
          setSalesmen([]);
        }
        return; // Don't show error for salesmen - it's optional
      }

      if (data && data.length > 0) {
        // Map view data to dropdown format
        const salesmenWithNames = data.map(salesman => ({
          id: salesman.id,
          name: salesman.name || salesman.email || `Salesman ${salesman.id}`,
        }));
        
        setSalesmen(salesmenWithNames);
        console.log(`✅ Loaded ${salesmenWithNames.length} salesmen from database`);
      } else {
        // Demo mode: Use dummy salesmen if no real data
        if (isDemoMode()) {
          const dummySalesmen = [
            { id: 9991, name: 'Zaid Khan' },
            { id: 9992, name: 'Ahmed Ali' },
            { id: 9993, name: 'Bilal Sheikh' },
          ];
          setSalesmen(dummySalesmen);
        } else {
          setSalesmen([]);
        }
      }
    } catch (err: any) {
      // Better error logging
      const errorMessage = err?.message || err?.toString() || 'Unknown error';
      console.warn('Failed to load salesmen (non-critical):', errorMessage);
      
      // Always fallback to demo data if in demo mode, or empty array
      if (isDemoMode()) {
        const dummySalesmen = [
          { id: 9991, name: 'Zaid Khan' },
          { id: 9992, name: 'Ahmed Ali' },
          { id: 9993, name: 'Bilal Sheikh' },
        ];
        setSalesmen(dummySalesmen);
      } else {
        setSalesmen([]);
      }
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
        .select('id, name, sku, requires_production')
        .eq('business_id', profile.business_id)
        .order('name')
        .limit(100);

      if (error) {
        console.error('Products fetch error:', error);
        toast.error(`Failed to load products: ${error.message || 'Network error'}`);
        return;
      }

      if (data) {
        setProducts(data.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku || '',
          stock: 0,
          requires_production: p.requires_production,
        })));
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      const errorMessage = err instanceof Error ? err.message : 'Network error. Please check your connection.';
      toast.error(`Failed to load products: ${errorMessage}`);
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

  // SIMPLIFIED: Handle product selection from ProductSearchPortal
  const handleProductSelect = async (selectedProduct: { id: number; name: string; sku: string; stock?: number }) => {
    try {
      console.log('DEBUG: Product selected from portal', selectedProduct);
      
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

  // Manual Focus Override - Force focus after 100ms (subtle, no ugly blue box)
  useEffect(() => {
    if (showVariationModal && productVariations.length > 0) {
      const timer = setTimeout(() => {
        // Strategy 1: Use ref if available
        if (firstVariationButtonRef.current) {
          try {
            firstVariationButtonRef.current.focus({ preventScroll: false });
            firstVariationButtonRef.current.scrollIntoView({ block: 'nearest', behavior: 'auto' });
            // Auto-select first variation
            const variationId = firstVariationButtonRef.current.dataset.variationId;
            if (variationId) {
              setSelectedVariationId(Number(variationId));
            }
            return;
          } catch (err) {
            console.error('Focus error:', err);
          }
        }
        
        // Strategy 2: Find by data attribute
        const firstButton = document.querySelector('button[data-variation-option]') as HTMLButtonElement;
        if (firstButton) {
          try {
            firstButton.focus({ preventScroll: false });
            firstButton.scrollIntoView({ block: 'nearest', behavior: 'auto' });
            // Also select the first variation
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

  // CRITICAL: Disable pointer events on parent Sheet backdrop when variation modal is open
  useEffect(() => {
    if (showVariationModal) {
      const sheetBackdrop = document.querySelector('[data-sheet-backdrop="true"]') as HTMLElement;
      if (sheetBackdrop) {
        sheetBackdrop.style.pointerEvents = 'none';
      }
      return () => {
        if (sheetBackdrop) {
          sheetBackdrop.style.pointerEvents = 'auto';
        }
      };
    }
  }, [showVariationModal]);

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

      // Use capture phase to catch Escape before other handlers
      document.addEventListener('keydown', handleGlobalEscape, true);
      
      return () => {
        document.removeEventListener('keydown', handleGlobalEscape, true);
      };
    }
  }, [showVariationModal]);

  // UPDATED: Add product with automatic variation price/SKU mapping
  const addProductToItems = (
    productToAdd: typeof products[0], 
    variationData?: {
      variation_id: number;
      variation_name: string;
      variation_sku: string;
      variation_stock: number;
      price: number; // Variation-specific price
    }
  ) => {
    console.log('DEBUG: addProductToItems called', { productToAdd, variationData });
    
    const customerType = customer === 'walkin' ? 'retail' : 'wholesale';
    
    // If variation data provided, use variation's price, SKU, and stock
    const finalPrice = variationData 
      ? variationData.price 
      : parseFloat(productSalePrice) || 0;
    
    const finalSku = variationData 
      ? variationData.variation_sku 
      : productToAdd.sku;
    
    const finalStock = variationData 
      ? variationData.variation_stock 
      : productToAdd.stock;

    const qty = parseFloat(productQuantity) || 1;
    const price = parseFloat(String(finalPrice)) || 0;
    
    const newItem: SaleItem = {
      id: `item-${Date.now()}`,
      product_id: productToAdd.id,
      product_name: productToAdd.name,
      sku: finalSku, // Use variation SKU if available
      stock: finalStock, // Use variation stock if available
      quantity: qty,
      unit_price: price, // AUTOMATIC: Use variation price
      discount: 0,
      subtotal: calculateRowTotal(price, qty), // CRITICAL: Use standardized calculation
      // Variation details
      variation_id: variationData?.variation_id,
      variation_name: variationData?.variation_name,
      variation_sku: variationData?.variation_sku,
      variation_stock: variationData?.variation_stock,
      // track production requirement
      requires_production: productToAdd.requires_production,
    };
    
    console.log('DEBUG: New item created', newItem);
    console.log('DEBUG: Current items count before add', items.length);
    
    // CRITICAL: Use setTimeout to ensure UI has time to process the click
    setTimeout(() => {
      // CRITICAL: Use functional state update to avoid stale closure
      setItems(prev => {
        const updated = [...prev, newItem];
        console.log('DEBUG: Items after add', updated.length, updated);
        if (productToAdd.requires_production) {
          setSendToStudio(true);
        }
        return updated;
      });
    }, 0);
    setProductQuantity('1');
    setProductSalePrice('0');
    setShowVariationModal(false);
    setProductVariations([]);
    setSelectedVariationId(null);
    setSelectedProductForVariation(null);
    
    toast.success(variationData ? 'Variation added' : 'Product added');
    
    // CRITICAL: Focus on the quantity field of the newly added item
    setTimeout(() => {
      // Find the quantity input for the newly added item
      const quantityInputs = document.querySelectorAll<HTMLInputElement>('input[type="number"][min="1"]');
      if (quantityInputs.length > 0) {
        // Focus on the last quantity input (the one we just added)
        const lastQuantityInput = quantityInputs[quantityInputs.length - 1];
        lastQuantityInput?.focus();
        lastQuantityInput?.select();
      }
    }, 150);
  };

  // HARD RESET: Clean all variation-related states (called on drawer close)
  const resetVariationStates = () => {
    setShowVariationModal(false);
    setProductVariations([]);
    setSelectedVariationId(null);
    setSelectedProductForVariation(null);
  };

  // UPDATED: Handle variation selection with automatic price/SKU mapping
  const handleVariationSelect = (e?: React.MouseEvent | React.KeyboardEvent) => {
    // CRITICAL: Prevent any form submission or navigation
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      if ('nativeEvent' in e) {
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

    // CRITICAL: Get variation-specific price based on customer type
    const customerType = customer === 'walkin' ? 'retail' : 'wholesale';
    const variationPrice = customerType === 'wholesale' 
      ? selectedVariation.wholesale_price 
      : selectedVariation.retail_price;

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
      price: variationPrice, // AUTOMATIC: Variation-specific price
    });
    
    // Focus will be handled by addProductToItems (quantity field)
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

  const addExtraExpense = () => {
    if (!extraExpenseAmount || parseFloat(extraExpenseAmount) <= 0) {
      toast.error('Please enter a valid expense amount');
      return;
    }
    const newService: AdditionalService = {
      id: `service-${Date.now()}`,
      name: extraExpenseType,
      price: parseFloat(extraExpenseAmount),
      notes: extraExpenseNotes || undefined,
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
  
  const servicesTotal = services.reduce((sum, s) => parseFloat(String(s.price)) || 0, 0);
  
  // Subtotal = Sum of all row totals
  const subtotal = itemsSubtotal;
  
  // Percentage discount on subtotal
  const discountPercentValue = parseFloat(discountPercent || '0') || 0;
  const discountAmount = (subtotal * discountPercentValue) / 100;
  
  // Shipping amount
  const shipping = parseFloat(shippingAmount || '0') || 0;
  
  // Grand Total = (Subtotal - Discount) + Extra Expenses + Shipping
  const grandTotal = (subtotal - discountAmount) + servicesTotal + shipping;
  
  const totalPaid = payments.reduce((sum, p) => parseFloat(String(p.amount)) || 0, 0);
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

      // CRITICAL: Use activeBranch from context (ERP standard - selected branch)
      // Guard Rule: Block if no branch or "All Locations" selected
      if (!activeBranch || activeBranch.id === 'ALL') {
        toast.error('Please select a specific branch to continue', {
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
        location_id: locationId,
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
      if (!locationId) {
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
      console.log('Location ID:', locationId, '(from activeBranch:', activeBranch.name, ')');
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
      
      // Refresh sales list immediately
      await handleSuccess('sales', `Sale ${saveAndPrint ? 'saved and printed' : 'saved as draft'} successfully!`, ['inventory']);
      
      if (saveAndPrint) {
        // Wait a bit for transaction to be fully committed, then open invoice
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Navigate to invoice page with print parameter
        const invoiceUrl = `/sales/${transaction.id}/invoice?print=true`;
        console.log('Opening invoice URL:', invoiceUrl);
        window.open(invoiceUrl, '_blank');
      } else {
        await new Promise(resolve => setTimeout(resolve, 300));
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

  // DRAWER LIFECYCLE MANAGEMENT: Hard reset on close
  const handleSheetOpenChange = (open: boolean) => {
    if (!open) {
      // HARD RESET: Clean all variation states when drawer closes
      resetVariationStates();
      // Also reset product entry states
      setProductQuantity('1');
      setProductSalePrice('0');
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
              {/* Header Row - Strict Sequence: Customer → Date → Bill No → Invoice No → Salesman → Sale Type → Branch */}
              <div className="flex items-start justify-between gap-4 w-full flex-wrap">
                {/* 1. Customer Selection */}
                <div className="flex-1 min-w-[140px]">
                  <Label className="text-gray-400 text-xs mb-2 uppercase block">CUSTOMER</Label>
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
                          setFilteredCustomers([]);
                        } else {
                          if (customerSearchTerm && customerSearchTerm !== 'Walk-in Customer') {
                            const term = customerSearchTerm.toLowerCase();
                            const filtered = customers.filter((c) => c.name.toLowerCase().includes(term));
                            setFilteredCustomers(filtered);
                          } else {
                            setFilteredCustomers([]);
                          }
                        }
                        setShowCustomerDropdown(true);
                      }}
                      onBlur={() => setTimeout(() => {
                        setShowCustomerDropdown(false);
                        if (!customerSearchTerm || customerSearchTerm.trim() === '') {
                          setCustomer('walkin');
                          setCustomerSearchTerm('Walk-in Customer');
                        }
                      }, 200)}
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
                      className="bg-[#111827] border-gray-800 text-white h-10 transition-all duration-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
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

                {/* 2. Date Picker */}
                <div className="flex-1 min-w-[140px]">
                  <Label className="text-gray-400 text-xs mb-2 uppercase block">DATE</Label>
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
                    className="bg-[#111827] border-gray-800 text-white h-10 transition-all duration-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* 3. Bill No */}
                <div className="flex-1 min-w-[140px]">
                  <Label className="text-gray-400 text-xs mb-2 uppercase block">Bill No.</Label>
                  <Input
                    type="text"
                    value={refNumber}
                    onChange={(e) => setRefNumber(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Tab') {
                        e.preventDefault();
                        const invInput = document.querySelector('input[placeholder*="Auto-generated"]') as HTMLInputElement;
                        invInput?.focus();
                      }
                    }}
                    placeholder="Enter bill number"
                    className="bg-[#111827] border-gray-800 text-white h-10 transition-all duration-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* 4. Invoice No */}
                <div className="flex-1 min-w-[140px]">
                  <Label className="text-gray-400 text-xs mb-2 uppercase block">Inv No.</Label>
                  <Input
                    type="text"
                    value={invoiceNumber || ''}
                    disabled
                    readOnly
                    placeholder="Auto-generated"
                    className="bg-[#111827] border-gray-800 text-gray-500 h-10 cursor-not-allowed transition-all duration-300"
                    title="Auto-generated invoice number (read-only)"
                  />
                </div>

                {/* 5. Salesman Selection */}
                <div className="flex-1 min-w-[140px]">
                  <Label className="text-gray-400 text-xs mb-2 uppercase block">SALESMAN</Label>
                  <Select
                    value={salesman || undefined}
                    onValueChange={(value) => setSalesman(value === 'none' ? '' : value)}
                  >
                    <SelectTrigger className="w-full bg-[#111827] border-gray-800 text-white h-10 transition-all duration-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
                      <SelectValue placeholder="No Salesman" />
                    </SelectTrigger>
                    <SelectContent className="z-[9999] bg-gray-800 border-gray-700">
                      <SelectItem value="none">No Salesman</SelectItem>
                      {salesmen.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 6. Sale Type (UI-only dropdown) */}
                <div className="flex-1 min-w-[140px]">
                  <Label className="text-gray-400 text-xs mb-2 uppercase block">TYPE</Label>
                  <Select
                    value={saleType}
                    onValueChange={(value) => setSaleType(value as 'Regular' | 'Studio')}
                  >
                    <SelectTrigger 
                      className={cn(
                        "w-full h-10 transition-all duration-300",
                        saleType === 'Studio'
                          ? "bg-indigo-900/40 border-indigo-500/60 text-indigo-100 focus:ring-indigo-500/20"
                          : "bg-[#111827] border-gray-800 text-gray-200 focus:ring-indigo-500/20"
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[9999] bg-gray-800 border-gray-700">
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Studio">Studio</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-gray-500 mt-1">UI-only; does not alter sale logic.</p>
                </div>

                {/* 7. Branch (Option A Logic: Admin editable, Salesman read-only) */}
                <div className="flex-1 min-w-[140px]" data-branch-field>
                  <Label className="text-gray-400 text-xs mb-2 uppercase block">BRANCH</Label>
                  {isAdmin ? (
                    <Select
                      value={activeBranch?.id !== 'ALL' && activeBranch?.id ? String(activeBranch.id) : undefined}
                      onValueChange={(value) => {
                        const branchId = value ? Number(value) : null;
                        if (branchId && branches.find(b => b.id === branchId)) {
                          setBranchId(branchId);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full bg-[#111827] border-gray-800 text-white h-10 transition-all duration-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
                        <SelectValue placeholder="Select Branch" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999] bg-gray-800 border-gray-700">
                        {branches.filter(b => b.id !== 'ALL').map((branch) => (
                          <SelectItem key={branch.id} value={String(branch.id)}>
                            {branch.name}{branch.code ? ` (${branch.code})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2 bg-[#111827] border border-gray-800 rounded-lg px-4 py-2.5 h-10">
                      <span className="text-white text-sm font-medium">
                        {activeBranch && activeBranch.id !== 'ALL' 
                          ? `${activeBranch.name}${activeBranch.code ? ` (${activeBranch.code})` : ''}`
                          : 'No Branch Selected'}
                      </span>
                      <span className="text-gray-500 text-xs">🔒</span>
                    </div>
                  )}
                  {(!activeBranch || activeBranch.id === 'ALL') && (
                    <p className="text-xs text-red-400 mt-1">Please select a specific branch</p>
                  )}
                </div>
              </div>

              {/* ITEMS ENTRY Section - Full Width Matching Drawer (1024px) */}
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

              {/* STANDARDIZED Product Table - Optimized Compact Layout */}
              <div className="border border-gray-800 rounded-xl overflow-hidden w-full max-w-full">
                <table className="w-full" style={{ width: '100%', tableLayout: 'fixed' }} data-table="items">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-400 uppercase" style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}>#</th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-400 uppercase" style={{ width: '32%', minWidth: '180px' }}>Name & SKU</th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-400 uppercase" style={{ width: '16%', minWidth: '90px' }} data-column="variation">Variation</th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-400 uppercase" style={{ width: '100px', minWidth: '100px', maxWidth: '100px' }}>Packing</th>
                      <th className="px-2 py-3 text-right text-xs font-medium text-gray-400 uppercase" style={{ width: '100px', minWidth: '100px', maxWidth: '100px' }}>Qty</th>
                      <th className="px-2 py-3 text-right text-xs font-medium text-gray-400 uppercase" style={{ width: '110px', minWidth: '110px', maxWidth: '110px' }}>Unit Price</th>
                      <th className="px-2 py-3 text-right text-xs font-medium text-gray-400 uppercase" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>Total</th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-400 uppercase" style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                          No items added. Search and add products above.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, index) => (
                        <tr key={item.id} className="hover:bg-gray-800/30 group">
                          <td className="px-2 py-3 text-gray-400 text-center align-middle" style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}>{String(index + 1).padStart(2, '0')}</td>
                          <td className="px-2 py-3 align-middle" style={{ width: '32%', minWidth: '180px' }}>
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
                          <td className="px-2 py-3 align-middle" style={{ width: '16%', minWidth: '90px' }} data-column="variation">
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
                            style={{ width: '100px', minWidth: '100px', maxWidth: '100px' }}
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
                          <td className="px-2 py-3 align-middle text-right" style={{ width: '100px', minWidth: '100px', maxWidth: '100px' }}>
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
                                style={{ width: '100px', minWidth: '100px', maxWidth: '100px' }}
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
                          <td className="px-2 py-3 align-middle text-right" style={{ width: '110px', minWidth: '110px', maxWidth: '110px' }}>
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
                                style={{ width: '110px', minWidth: '110px', maxWidth: '110px' }}
                              />
                            </div>
                          </td>
                          <td className="px-2 py-3 text-white font-medium text-right align-middle" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Two Column Layout: EXTRA EXPENSES & INVOICE SUMMARY (Left) | PAYMENT (Right) */}
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* EXTRA EXPENSES Card */}
                  <div className="bg-[#111827] border border-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-400 uppercase">EXTRA EXPENSES</h3>
                      {servicesTotal > 0 && (
                        <div className="bg-purple-600/20 border border-purple-500/30 rounded px-3 py-1.5">
                          <span className="text-purple-400 font-semibold text-sm">{formatCurrency(servicesTotal)}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                      <Select
                        value={extraExpenseType}
                        onValueChange={setExtraExpenseType}
                      >
                        <SelectTrigger className="col-span-1 bg-[#0B0F1A] border border-gray-800 text-white text-sm h-9">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Stitching">Stitching</SelectItem>
                          <SelectItem value="Dying">Dying</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={extraExpenseAmount}
                        onChange={(e) => setExtraExpenseAmount(e.target.value)}
                        placeholder="Amount"
                          className="col-span-1 bg-[#0B0F1A] border-gray-800 text-white text-sm h-9"
                      />
                      <Input
                        type="text"
                        value={extraExpenseNotes}
                        onChange={(e) => setExtraExpenseNotes(e.target.value)}
                        placeholder="Notes (optional)"
                          className="col-span-1 bg-[#0B0F1A] border-gray-800 text-white text-sm h-9"
                      />
                      </div>
                      <Button
                        type="button"
                        onClick={addExtraExpense}
                        className="bg-purple-600 hover:bg-purple-500 text-white w-full h-9"
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                    {services.length > 0 && (
                      <div className="mt-4 space-y-2 pt-4 border-t border-gray-800">
                        {services.map((service) => (
                          <div key={service.id} className="flex items-center justify-between bg-[#0B0F1A] border border-gray-800 rounded p-2.5">
                            <div className="flex items-center gap-2">
                              <DollarSign size={14} className="text-purple-400" />
                            <div>
                                <div className="text-white text-sm font-medium">{service.name}</div>
                                {service.notes && (
                                  <div className="text-gray-500 text-xs mt-0.5">{service.notes}</div>
                                )}
                            </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-white text-sm font-medium">{formatCurrency(service.price)}</span>
                            <button
                              type="button"
                              onClick={() => removeService(service.id)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                              <X size={16} />
                            </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Extra Expenses</span>
                        <span className="text-purple-400 font-medium">+{formatCurrency(servicesTotal)}</span>
                      </div>
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
                        <span className="text-2xl font-bold text-blue-400">{formatCurrency(grandTotal)}</span>
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
                      <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 rounded-full px-3 py-1 text-xs">
                        Partial
                      </Badge>
                    )}
                  </div>
                  
                  <div className="bg-[#111827] border border-gray-800 rounded-lg p-4">
                    <div className="text-xs text-gray-500 uppercase mb-1">
                      {(customer === 'walkin' || customerSearchTerm === 'Walk-in Customer') ? 'POS RECEIPT AMOUNT' : 'INVOICE AMOUNT'}
                    </div>
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
                            setPaymentType('full');
                          }}
                          className="bg-green-600 hover:bg-green-500 text-white border-green-500 h-8 text-xs"
                        >
                          100%
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Select
                        value={paymentMethod}
                        onValueChange={(value) => {
                          if (value === 'Bank') {
                            setPaymentMethod('Bank Transfer');
                          } else {
                            setPaymentMethod(value as 'Cash' | 'Card' | 'Bank Transfer');
                          }
                        }}
                      >
                        <SelectTrigger className="w-full bg-[#0B0F1A] border border-gray-800 text-white text-sm h-9">
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent 
                          className="bg-slate-900 border-slate-700 z-[99999]" 
                          position="popper"
                          sideOffset={4}
                        >
                          <SelectItem value="Cash" className="text-white hover:bg-slate-800 focus:bg-slate-800">Cash</SelectItem>
                          <SelectItem value="Card" className="text-white hover:bg-slate-800 focus:bg-slate-800">Card</SelectItem>
                          <SelectItem value="Bank Transfer" className="text-white hover:bg-slate-800 focus:bg-slate-800">Bank</SelectItem>
                        </SelectContent>
                      </Select>
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
                            setPaymentType('full');
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

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-800">
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
                  className="bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
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
          
          {/* Dialog Content - z-[100] */}
          <div 
            ref={variationModalRef}
            data-variation-modal="true"
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
            style={{ 
              zIndex: 100,
              pointerEvents: 'none'
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="variation-modal-title"
            aria-describedby="variation-modal-description"
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
                    handleVariationSelect();
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
                const customerType = customer === 'walkin' ? 'retail' : 'wholesale';
                const price = customerType === 'wholesale' ? variation.wholesale_price : variation.retail_price;
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
                        handleVariationSelect();
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
                            <Package size={12} className="inline mr-1" />
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
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white border border-gray-700"
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
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                }}
                disabled={!selectedVariationId}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
              >
                Select Variation
              </Button>
            </div>
          </div>
        </div>
        </>
        , document.body
      )}


      {/* Quick Add Product Drawer */}
      <Sheet open={showAddProductDrawer} onOpenChange={setShowAddProductDrawer}>
        <SheetContent side="right" className="w-full sm:w-full md:max-w-[1024px] h-screen bg-[#0B0F1A] border-gray-800 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">Add New Product</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <AddProductForm
              isOpen={showAddProductDrawer}
              onClose={() => {
                setShowAddProductDrawer(false);
                setQuickAddProductName('');
                // Reload products after adding
                loadProducts();
              }}
              onSuccess={async (productId?: number, productName?: string) => {
                setShowAddProductDrawer(false);
                const savedProductName = productName || quickAddProductName;
                setQuickAddProductName('');
                
                // CRITICAL: Fetch the product directly by ID if available (most reliable)
                let newProduct: typeof products[0] | null = null;
                
                if (productId) {
                  try {
                    const { data: session } = await supabase.auth.getSession();
                    if (session?.session) {
                      const { data: profile } = await supabase
                        .from('user_profiles')
                        .select('business_id')
                        .eq('user_id', session.session.user.id)
                        .single();
                      
                      if (profile?.business_id) {
                        const { data: productData } = await supabase
                          .from('products')
                          .select('id, name, sku')
                          .eq('id', productId)
                          .eq('business_id', profile.business_id)
                          .single();
                        
                        if (productData) {
                          newProduct = { id: productData.id, name: productData.name, sku: productData.sku || '', stock: 0 };
                        }
                      }
                    }
                  } catch (err) {
                    console.error('Failed to fetch new product:', err);
                  }
                }
                
                // If direct fetch failed, reload products and search
                if (!newProduct) {
                  await loadProducts();
                  // Wait for state update
                  await new Promise(resolve => setTimeout(resolve, 300));
                  
                  // Find by name as fallback
                  if (savedProductName) {
                    newProduct = products.find(p => 
                      p.name.toLowerCase() === savedProductName.toLowerCase()
                    ) || null;
                  }
                }
                
                if (newProduct) {
                  // Update products state if needed (in case it's not there yet)
                  if (!products.find(p => p.id === newProduct!.id)) {
                    setProducts([...products, newProduct]);
                  }
                  
                  // IMMEDIATELY add the product to the sale (will check variations automatically)
                  // This will handle variation selection if needed, or add directly if no variations
                  await handleProductSelect(newProduct);
                  
                  // Focus will be handled by addProductToItems (quantity field)
                } else {
                  // Fallback: Let user manually search for the new product
                  if (savedProductName) {
                    toast.info('Product created. Please search for it in the product search bar.');
                  }
                }
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
              const subtotal = calculateRowTotal(currentPackingItem.unit_price, newQuantity);
              
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
