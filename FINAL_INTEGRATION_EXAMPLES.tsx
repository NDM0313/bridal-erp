/**
 * FINAL INTEGRATION EXAMPLES
 * Copy-paste ready code snippets for completing the remaining 2 tasks
 */

// ============================================
// TASK 1: Fix Salesman Dropdown in AddSaleModal
// ============================================

// Step 1: Update the fetch function (around line 150-170)
const fetchSalesmen = async () => {
  try {
    // NEW: Fetch only users with salesman role
    const { data, error } = await supabase
      .from('v_active_salesmen')
      .select('id, name, email')
      .order('name');

    if (error) {
      console.error('Error fetching salesmen:', error);
      return;
    }

    setSalesmen(data || []);
  } catch (err) {
    console.error('Failed to fetch salesmen:', err);
  }
};

// ============================================
// TASK 2: Integrate ContactSelect for Customer
// ============================================

// Step 1: Import the component (add to imports at top)
import { ContactSelect } from '@/components/ui/ContactSelect';

// Step 2: Add Quick-Add Customer modal state (around line 108)
const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
const [quickAddCustomerName, setQuickAddCustomerName] = useState('');

// Step 3: Replace the old customer dropdown with ContactSelect
// Find the customer selection section (around line 1600) and replace with:

<ContactSelect
  value={customer}
  onChange={(contactId, contactName) => {
    setCustomer(contactId);
    setCustomerSearchTerm(contactName);
  }}
  onAddNew={(searchTerm) => {
    setQuickAddCustomerName(searchTerm);
    setShowAddCustomerModal(true);
  }}
  contacts={customers}
  placeholder="Search customers..."
  label="Customer"
  type="customer"
  className="w-full"
/>

// Step 4: Add Quick-Add Customer Modal (at the end, before closing tags)
{showAddCustomerModal && (
  <Dialog open={showAddCustomerModal} onOpenChange={setShowAddCustomerModal}>
    <DialogContent className="bg-slate-900 max-w-md">
      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-4">Quick Add Customer</h3>
        <form onSubmit={async (e) => {
          e.preventDefault();
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data: profile } = await supabase
              .from('user_profiles')
              .select('business_id')
              .eq('user_id', session.user.id)
              .single();

            const { data: newCustomer, error } = await supabase
              .from('contacts')
              .insert({
                business_id: profile?.business_id,
                type: 'customer',
                name: quickAddCustomerName,
                customer_type: 'retail'
              })
              .select()
              .single();

            if (error) throw error;

            // Add to customers list
            setCustomers(prev => [...prev, { id: newCustomer.id, name: newCustomer.name }]);
            
            // Select the new customer
            setCustomer(newCustomer.id.toString());
            setCustomerSearchTerm(newCustomer.name);
            
            toast.success('Customer added successfully');
            setShowAddCustomerModal(false);
            setQuickAddCustomerName('');
          } catch (err) {
            console.error('Error adding customer:', err);
            toast.error('Failed to add customer');
          }
        }}>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300 mb-2 block">Customer Name</Label>
              <Input
                value={quickAddCustomerName}
                onChange={(e) => setQuickAddCustomerName(e.target.value)}
                placeholder="Enter customer name"
                className="bg-slate-800 border-slate-700 text-white"
                required
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddCustomerModal(false)}
                className="bg-slate-800 border-slate-700 text-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white"
              >
                Add Customer
              </Button>
            </div>
          </div>
        </form>
      </div>
    </DialogContent>
  </Dialog>
)}

// ============================================
// TASK 3: useCallback Optimizations
// ============================================

// Step 1: Add imports at top
import { useCallback, useMemo } from 'react';

// Step 2: Wrap calculateRowTotal (find existing function and wrap it)
const calculateRowTotal = useCallback((unitPrice: number, quantity: number): number => {
  return parseFloat((unitPrice * quantity).toFixed(2));
}, []);

// Step 3: Convert totals to useMemo (find the totals calculation section)
const totals = useMemo(() => {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount = (subtotal * parseFloat(discountPercent || '0')) / 100;
  const shipping = parseFloat(shippingAmount || '0');
  const extraExpense = parseFloat(extraExpenseAmount || '0');
  const finalTotal = subtotal - discountAmount + shipping + extraExpense;
  
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discountAmount: parseFloat(discountAmount.toFixed(2)),
    shipping: parseFloat(shipping.toFixed(2)),
    extraExpense: parseFloat(extraExpense.toFixed(2)),
    finalTotal: parseFloat(finalTotal.toFixed(2))
  };
}, [items, discountPercent, shippingAmount, extraExpenseAmount]);

// Step 4: Wrap handleProductSelect
const handleProductSelect = useCallback(async (product: any) => {
  // ... existing logic (keep as is, just wrap with useCallback)
}, [products, items, setItems, setShowVariationModal]); // Add all dependencies

// Step 5: Wrap handleAddNewProduct
const handleAddNewProduct = useCallback((name: string) => {
  setQuickAddProductName(name);
  setShowAddProductDrawer(true);
}, []);

// Step 6: Wrap addProductToItems
const addProductToItems = useCallback((
  product: any,
  variation: any,
  quantity: number,
  price: number
) => {
  // ... existing logic (keep as is, just wrap with useCallback)
}, [items, setItems, calculateRowTotal]); // Add dependencies

// ============================================
// TASK 4: Apply 2-Decimal Formatting Globally
// ============================================

// Import the formatter
import { formatDecimal, formatCurrency, formatQuantity } from '@/lib/utils/formatters';

// Example 1: Format price displays
<span className="text-white font-medium">
  {formatCurrency(item.unit_price, '$')}
</span>

// Example 2: Format quantity displays
<span className="text-gray-300">
  {formatQuantity(item.quantity, 'M')}
</span>

// Example 3: Format totals
<div className="text-2xl font-bold text-green-400">
  ${formatDecimal(totals.finalTotal)}
</div>

// Example 4: Format on input blur
<Input
  type="number"
  step="0.01"
  value={productSalePrice}
  onChange={(e) => setProductSalePrice(e.target.value)}
  onBlur={(e) => {
    const val = parseFloat(e.target.value) || 0;
    e.target.value = formatDecimal(val);
    setProductSalePrice(formatDecimal(val));
  }}
  className="bg-slate-800 border-slate-700 text-white"
/>

// ============================================
// COMPLETE EXAMPLE: Customer Section with ContactSelect
// ============================================

// Replace the entire customer selection section with this:
<div className="space-y-4">
  <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
    <User size={20} />
    Customer Information
  </h3>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Customer Select with Quick-Add */}
    <ContactSelect
      value={customer}
      onChange={(contactId, contactName) => {
        setCustomer(contactId);
        setCustomerSearchTerm(contactName);
      }}
      onAddNew={(searchTerm) => {
        setQuickAddCustomerName(searchTerm);
        setShowAddCustomerModal(true);
      }}
      contacts={customers}
      placeholder="Search or add customer..."
      label="Customer *"
      type="customer"
    />

    {/* Salesman Select - Now filtered to only salesmen */}
    <div>
      <Label className="text-slate-300 mb-2 block">Salesman</Label>
      <select
        value={salesman}
        onChange={(e) => setSalesman(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">Select Salesman (Optional)</option>
        {salesmen.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  </div>
</div>

// ============================================
// INTEGRATION CHECKLIST
// ============================================

/**
 * [ ] 1. Run SALESMAN_VIEW.sql in Supabase SQL Editor
 * [ ] 2. Update fetchSalesmen() to use v_active_salesmen view
 * [ ] 3. Import ContactSelect component
 * [ ] 4. Add Quick-Add Customer modal state
 * [ ] 5. Replace customer dropdown with ContactSelect
 * [ ] 6. Add Quick-Add Customer modal JSX
 * [ ] 7. Import useCallback and useMemo
 * [ ] 8. Wrap calculateRowTotal with useCallback
 * [ ] 9. Convert totals to useMemo
 * [ ] 10. Wrap handleProductSelect with useCallback
 * [ ] 11. Wrap handleAddNewProduct with useCallback
 * [ ] 12. Import formatters and apply to all displays
 * [ ] 13. Test all functionality
 * [ ] 14. Repeat for AddPurchaseModal.tsx
 */

// ============================================
// NOTES
// ============================================

/**
 * - All code uses 2-decimal formatting with .toFixed(2)
 * - ContactSelect uses Portal rendering for z-index safety
 * - Salesman dropdown now only shows users with role='salesman'
 * - useCallback prevents unnecessary re-renders
 * - useMemo optimizes expensive calculations
 * - Quick-Add modals don't close the main transaction modal
 * - All components follow Dark Navy theme (#0f172a)
 */

