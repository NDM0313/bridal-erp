'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  X, Save, Upload, Calendar, DollarSign, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/Sheet';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabase/client';
import { getErrorMessage, isNetworkError, safeSupabaseOperation } from '@/utils/supabase/errorHandler';
import { cn } from '@/lib/utils';
import { useBranchV2 } from '@/lib/context/BranchContextV2';

interface ExpenseCategory {
  id: number;
  name: string;
  parent_id: number | null;
}

interface PaymentAccount {
  id: number;
  name: string;
  account_type: string;
}

interface AddExpenseDrawerProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface ExpenseFormData {
  date: string;
  category_id: string;
  sub_category_id: string;
  paid_from_account_id: string;
  amount: string;
  description: string;
  receipt: File | null;
}

const defaultFormData: ExpenseFormData = {
  date: new Date().toISOString().split('T')[0],
  category_id: '',
  sub_category_id: '',
  paid_from_account_id: '',
  amount: '',
  description: '',
  receipt: null,
};

export function AddExpenseDrawer({ open, onClose, onSave }: AddExpenseDrawerProps) {
  const [formData, setFormData] = useState<ExpenseFormData>(defaultFormData);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [subCategories, setSubCategories] = useState<ExpenseCategory[]>([]);
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const { activeBranch } = useBranchV2();

  useEffect(() => {
    if (open) {
      loadCategories();
      loadAccounts();
      const today = new Date();
      const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      setFormData({ ...defaultFormData, date: formattedDate });
      setErrors({});
      setReceiptPreview(null);
    }
  }, [open]);

  useEffect(() => {
    if (formData.category_id) {
      loadSubCategories(parseInt(formData.category_id));
    } else {
      setSubCategories([]);
      setFormData(prev => ({ ...prev, sub_category_id: '' }));
    }
  }, [formData.category_id]);

  const loadCategories = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) return;

      // Try to load parent categories (categories without parent_id)
      // Handle case where parent_id column might not exist
      let categoriesData;
      try {
        const { data, error } = await supabase
          .from('expense_categories')
          .select('*')
          .eq('business_id', profile.business_id)
          .eq('is_active', true)
          .is('parent_id', null)
          .order('name');
        
        if (error && (error.code === '42703' || error.code === 'PGRST204' || 
            (error.message && error.message.includes('parent_id')))) {
          // Column doesn't exist, load all categories as parents
          console.log('parent_id column not found, loading all categories');
          const { data: allCategories } = await supabase
            .from('expense_categories')
            .select('*')
            .eq('business_id', profile.business_id)
            .eq('is_active', true)
            .order('name');
          categoriesData = allCategories;
        } else {
          categoriesData = data;
        }
      } catch (err) {
        // Fallback: load all categories if parent_id filter fails
        console.log('Error loading with parent_id filter, loading all categories');
        const { data: allCategories } = await supabase
          .from('expense_categories')
          .select('*')
          .eq('business_id', profile.business_id)
          .eq('is_active', true)
          .order('name');
        categoriesData = allCategories;
      }

      console.log('Loaded categories:', categoriesData?.length || 0, categoriesData);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    }
  };

  const loadSubCategories = async (parentId: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) return;

      // Try to load sub-categories, handle if parent_id column doesn't exist
      let subCategoriesData;
      try {
        const { data, error } = await supabase
          .from('expense_categories')
          .select('*')
          .eq('business_id', profile.business_id)
          .eq('is_active', true)
          .eq('parent_id', parentId)
          .order('name');
        
        if (error && (error.code === '42703' || error.code === 'PGRST204' || 
            (error.message && error.message.includes('parent_id')))) {
          // Column doesn't exist, no sub-categories available
          console.log('parent_id column not found, no sub-categories available');
          subCategoriesData = [];
        } else {
          subCategoriesData = data;
        }
      } catch (err) {
        // Fallback: no sub-categories if parent_id filter fails
        console.log('Error loading sub-categories, setting to empty');
        subCategoriesData = [];
      }

      console.log('Loaded sub-categories:', subCategoriesData?.length || 0, subCategoriesData);
      setSubCategories(subCategoriesData || []);
    } catch (error) {
      console.error('Failed to load sub-categories:', error);
      setSubCategories([]);
    }
  };

  const loadAccounts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) return;

      const { data: accountsData } = await supabase
        .from('payment_accounts')
        .select('id, name, account_type')
        .eq('business_id', profile.business_id)
        .eq('is_active', true)
        .order('name');

      if (accountsData && accountsData.length > 0) {
        setAccounts(accountsData);
      } else {
        setAccounts([
          { id: 1, name: 'Cash Drawer', account_type: 'cash' },
          { id: 2, name: 'Meezan Bank', account_type: 'bank' },
          { id: 3, name: 'JazzCash', account_type: 'bank' },
        ]);
      }
    } catch (error) {
      setAccounts([
        { id: 1, name: 'Cash Drawer', account_type: 'cash' },
        { id: 2, name: 'Meezan Bank', account_type: 'bank' },
        { id: 3, name: 'JazzCash', account_type: 'bank' },
      ]);
    }
  };

  const handleQuickAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    try {
      let session;
      try {
        const sessionResult = await supabase.auth.getSession();
        if (sessionResult.error) {
          const errorMsg = getErrorMessage(sessionResult.error);
          toast.error(errorMsg);
          return;
        }
        session = sessionResult.data?.session;
      } catch (error: any) {
        if (isNetworkError(error)) {
          toast.error('Network connection failed. Please check your internet connection.');
        } else {
          toast.error(getErrorMessage(error));
        }
        return;
      }
      
      if (!session) {
        toast.error('Please log in to add categories');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) {
        toast.error('Business profile not found');
        return;
      }

      // Check if category already exists
      const { data: existing } = await supabase
        .from('expense_categories')
        .select('id, name')
        .eq('business_id', profile.business_id)
        .eq('name', newCategoryName.trim())
        .eq('is_active', true)
        .maybeSingle();

      if (existing) {
        toast.error('Category already exists');
        setFormData(prev => ({ ...prev, category_id: String(existing.id) }));
        setNewCategoryName('');
        setShowAddCategory(false);
        await loadCategories();
        return;
      }

      let newCategory;
      let error;
      
      try {
        // Try to insert with parent_id first, if it fails due to column not existing, retry without it
        const insertData: {
          business_id: number;
          name: string;
          created_by: string;
          is_active: boolean;
          parent_id?: null;
        } = {
          business_id: profile.business_id,
          name: newCategoryName.trim(),
          created_by: session.user.id,
          is_active: true,
        };

        // Only include parent_id if column exists (will be handled by retry logic)
        insertData.parent_id = null;

        let result = await supabase
          .from('expense_categories')
          .insert(insertData)
          .select()
          .single();
        
        newCategory = result.data;
        error = result.error;

        // If error is about parent_id column not existing, retry without it
        if (error && (error.code === '42703' || error.code === 'PGRST204' || 
            (error.message && error.message.includes('parent_id')))) {
          console.log('parent_id column not found, retrying insert without parent_id');
          
          // Remove parent_id from insertData and retry
          const { parent_id, ...insertDataWithoutParent } = insertData;
          result = await supabase
            .from('expense_categories')
            .insert(insertDataWithoutParent)
            .select()
            .single();
          
          newCategory = result.data;
          error = result.error;
          
          if (!error && newCategory) {
            console.log('Category created successfully without parent_id');
          }
        }
      } catch (networkError: any) {
        if (isNetworkError(networkError)) {
          toast.error('Network connection failed. Please check your internet connection and try again.');
          return;
        }
        error = networkError;
      }

      if (error) {
        console.error('Supabase error:', error);
        const errorMessage = getErrorMessage(error);
        toast.error(errorMessage);
        return;
      }

      if (!newCategory) {
        toast.error('Category was not created. Please try again.');
        return;
      }

      toast.success('Category added successfully');
      setNewCategoryName('');
      setShowAddCategory(false);
      await loadCategories();
      setFormData(prev => ({ ...prev, category_id: String(newCategory.id) }));
    } catch (error: any) {
      console.error('Failed to add category:', error);
      const errorMessage = error?.message || error?.toString() || 'Failed to add category. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, receipt: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.category_id) newErrors.category_id = 'Category is required';
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id, location_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) {
        toast.error('Business profile not found');
        return;
      }

      // CRITICAL: Use activeBranch from context (ERP standard - selected branch)
      if (!activeBranch || activeBranch.id === 'ALL') {
        toast.error('Please select a specific branch to create an expense', {
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

      let receiptUrl = '';
      if (formData.receipt) {
        const fileExt = formData.receipt.name.split('.').pop();
        const fileName = `expense-${Date.now()}.${fileExt}`;
        const filePath = `expense-receipts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('business-assets')
          .upload(filePath, formData.receipt);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('business-assets')
            .getPublicUrl(filePath);
          receiptUrl = publicUrl;
        }
      }

      const amount = parseFloat(formData.amount);
      const categoryId = formData.sub_category_id ? parseInt(formData.sub_category_id) : parseInt(formData.category_id);

      console.log('Saving expense with data:', {
        business_id: profile.business_id,
        location_id: locationId,
        categoryId,
        amount,
        date: formData.date,
      });

      const { data: newTransaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          business_id: profile.business_id,
          location_id: locationId,
          type: 'expense',
          status: 'final',
          payment_status: 'paid',
          transaction_date: new Date(formData.date).toISOString(),
          ref_no: null,
          additional_notes: formData.description || null,
          total_before_tax: amount,
          tax_amount: 0,
          final_total: amount,
          expense_category_id: categoryId,
          created_by: session.user.id,
        })
        .select()
        .single();

      if (txError) {
        console.error('Transaction insert error:', txError);
        let errorMessage = 'Failed to save expense';
        if (txError.message) {
          errorMessage = txError.message;
        } else if (txError.details) {
          errorMessage = txError.details;
        } else if (txError.hint) {
          errorMessage = txError.hint;
        }
        throw new Error(errorMessage);
      }

      if (!newTransaction) {
        throw new Error('Expense was not created');
      }

      console.log('Expense saved successfully:', newTransaction);
      toast.success('Expense saved successfully');
      onClose();
      setFormData(defaultFormData);
      setReceiptPreview(null);
      onSave();
    } catch (error: any) {
      console.error('Failed to save expense:', error);
      const errorMessage = error?.message || error?.toString() || 'Failed to save expense. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
    return `${month} ${day}${suffix}, ${year}`;
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="bg-[#0B0F1A] border-l border-gray-800 p-0 overflow-hidden [&>button]:hidden w-full sm:w-full md:max-w-[600px] h-screen"
      >
        <div className="flex flex-col h-full w-full">
          <SheetHeader className="border-b border-gray-800 p-6 bg-[#0B0F1A]">
            <SheetTitle className="text-lg font-semibold text-slate-100">Record Expense</SheetTitle>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto p-6">

        <div className="space-y-4">
          {/* Date */}
          <div>
            <Label className="text-slate-300 mb-1.5 text-[12px] font-medium">Date</Label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className={cn(
                  "pl-9 h-9 bg-slate-900 border-slate-800 text-slate-200 text-sm",
                  errors.date && "border-red-500"
                )}
              />
            </div>
            {formData.date && (
              <p className="text-xs text-slate-400 mt-1">{formatDateForDisplay(formData.date)}</p>
            )}
            {errors.date && <p className="text-xs text-red-400 mt-1">{errors.date}</p>}
          </div>

          {/* Category */}
          <div>
            <Label className="text-slate-300 mb-1.5 text-[12px] font-medium">Category</Label>
            <div className="flex gap-1.5">
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value, sub_category_id: '' })}
                className={cn(
                  "flex-1 h-9 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
                  errors.category_id && "border-red-500"
                )}
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddCategory(!showAddCategory)}
                className="h-9 px-2 bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800"
              >
                <Plus size={14} />
              </Button>
            </div>
            {showAddCategory && (
              <div className="mt-2 flex gap-1.5">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name"
                  className="h-9 bg-slate-900 border-slate-800 text-slate-200 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickAddCategory()}
                />
                <Button
                  onClick={handleQuickAddCategory}
                  className="h-9 px-3 bg-blue-600 hover:bg-blue-500 text-white text-sm"
                >
                  Add
                </Button>
              </div>
            )}
            {errors.category_id && <p className="text-xs text-red-400 mt-1">{errors.category_id}</p>}
          </div>

          {/* Sub-Category */}
          {subCategories.length > 0 && (
            <div>
              <Label className="text-slate-300 mb-1.5 text-[12px] font-medium">Sub-Category</Label>
              <select
                value={formData.sub_category_id}
                onChange={(e) => setFormData({ ...formData, sub_category_id: e.target.value })}
                className="w-full h-9 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Sub-Category</option>
                {subCategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Paid From */}
          <div>
            <Label className="text-slate-300 mb-1.5 text-[12px] font-medium">Paid From</Label>
            <select
              value={formData.paid_from_account_id}
              onChange={(e) => setFormData({ ...formData, paid_from_account_id: e.target.value })}
              className="w-full h-9 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <Label className="text-slate-300 mb-1.5 text-[12px] font-medium">Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className={cn(
                  "pl-9 h-9 bg-slate-900 border-slate-800 text-slate-200 text-sm",
                  errors.amount && "border-red-500"
                )}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>
            {errors.amount && <p className="text-xs text-red-400 mt-1">{errors.amount}</p>}
          </div>

          {/* Description */}
          <div>
            <Label className="text-slate-300 mb-1.5 text-[12px] font-medium">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter expense details..."
              className="bg-slate-900 border-slate-800 text-slate-200 min-h-[80px] text-sm"
            />
          </div>

          {/* Upload Receipt */}
          <div>
            <Label className="text-slate-300 mb-1.5 text-[12px] font-medium">Upload Receipt</Label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                receiptPreview
                  ? "border-slate-700 bg-slate-900"
                  : "border-slate-700 bg-slate-900/50 hover:border-slate-600"
              )}
            >
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleReceiptChange}
                className="hidden"
                id="receipt-upload"
              />
              {receiptPreview ? (
                <div className="space-y-2">
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="max-h-32 mx-auto rounded-lg"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({ ...formData, receipt: null });
                      setReceiptPreview(null);
                    }}
                    className="bg-slate-800 border-slate-700 text-slate-200 text-xs h-7"
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <label htmlFor="receipt-upload" className="cursor-pointer">
                  <Upload size={24} className="mx-auto mb-2 text-slate-500" />
                  <p className="text-slate-300 font-medium mb-1 text-xs">Click to upload bill</p>
                  <p className="text-xs text-slate-500">PNG, JPG up to 5MB</p>
                </label>
              )}
            </div>
          </div>
        </div>

          </div>
          
          <SheetFooter className="border-t border-gray-800 p-6 bg-[#0B0F1A]">
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSave();
              }}
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white h-9 text-sm font-medium"
            >
              <Save size={14} className="mr-2" />
              {loading ? 'Saving...' : 'Save Expense'}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
