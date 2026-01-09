'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Building2, Users, Zap, ShoppingCart, Briefcase,
  Utensils, Home, Car, Work, Edit, Trash2, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabase/client';
import { getErrorMessage, isNetworkError, safeSupabaseOperation } from '@/utils/supabase/errorHandler';
import { cn } from '@/lib/utils';

interface ExpenseCategory {
  id: number;
  name: string;
  parent_id: number | null;
  color_code?: string;
  description?: string;
  is_active: boolean;
  expense_count?: number;
}

interface CategoryFormData {
  name: string;
  color: string;
  icon: string;
  description: string;
  parent_id: number | null;
}

interface CategoriesViewProps {
  onRefresh?: () => void;
}

const categoryIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  'Rent': Building2,
  'Salaries': Users,
  'Utilities': Zap,
  'Stitching': ShoppingCart,
  'Office Supplies': Briefcase,
  'Food & Meals': Utensils,
  'Misc': Tag,
};

const categoryColors = [
  { name: 'Blue', value: '#3B82F6', class: 'bg-blue-500' },
  { name: 'Purple', value: '#A855F7', class: 'bg-purple-500' },
  { name: 'Orange', value: '#F97316', class: 'bg-orange-500' },
  { name: 'Green', value: '#10B981', class: 'bg-green-500' },
  { name: 'Yellow', value: '#EAB308', class: 'bg-yellow-500' },
  { name: 'Red', value: '#EF4444', class: 'bg-red-500' },
];

export function CategoriesView({ onRefresh }: CategoriesViewProps) {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    color: categoryColors[0].value,
    icon: 'Building',
    description: '',
    parent_id: null,
  });
  const [parentCategories, setParentCategories] = useState<ExpenseCategory[]>([]);
  const [showSubCategoryOption, setShowSubCategoryOption] = useState(false);

  useEffect(() => {
    loadCategories();
    loadParentCategories();
  }, []);

  // Reload parent categories when sub-category option is checked
  useEffect(() => {
    if (showSubCategoryOption && isAddModalOpen) {
      loadParentCategories();
    }
  }, [showSubCategoryOption, isAddModalOpen]);

  const loadParentCategories = async () => {
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
      let parentCats;
      try {
        const { data, error } = await supabase
          .from('expense_categories')
          .select('*')
          .eq('business_id', profile.business_id)
          .eq('is_active', true)
          .is('parent_id', null)
          .order('name');
        
        if (error && error.code === '42703') {
          // Column doesn't exist, load all categories as parents
          console.log('parent_id column not found, loading all categories as parents');
          const { data: allCategories } = await supabase
            .from('expense_categories')
            .select('*')
            .eq('business_id', profile.business_id)
            .eq('is_active', true)
            .order('name');
          parentCats = allCategories;
        } else {
          parentCats = data;
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
        parentCats = allCategories;
      }

      console.log('Loaded parent categories:', parentCats?.length || 0, parentCats);
      setParentCategories(parentCats || []);
    } catch (error) {
      console.error('Failed to load parent categories:', error);
      setParentCategories([]);
    }
  };

  const loadCategories = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) return;

      // Load categories - try to load only parent categories, but handle if parent_id column doesn't exist
      let expenseCategories;
      try {
        const { data, error } = await supabase
          .from('expense_categories')
          .select('*')
          .eq('business_id', profile.business_id)
          .eq('is_active', true)
          .is('parent_id', null)
          .order('name');
        
        if (error && error.code === '42703') {
          // Column doesn't exist, load all categories
          console.log('parent_id column not found, loading all categories');
          const { data: allCategories } = await supabase
            .from('expense_categories')
            .select('*')
            .eq('business_id', profile.business_id)
            .eq('is_active', true)
            .order('name');
          expenseCategories = allCategories;
        } else {
          expenseCategories = data;
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
        expenseCategories = allCategories;
      }

      // Get expense counts for each category
      const { data: transactions } = await supabase
        .from('transactions')
        .select('expense_category_id')
        .eq('business_id', profile.business_id)
        .eq('type', 'expense');

      const categoryCounts: Record<number, number> = {};
      transactions?.forEach((tx) => {
        if (tx.expense_category_id) {
          categoryCounts[tx.expense_category_id] = (categoryCounts[tx.expense_category_id] || 0) + 1;
        }
      });

      const enriched = (expenseCategories || []).map((cat) => ({
        ...cat,
        expense_count: categoryCounts[cat.id] || 0,
      }));

      console.log('Loaded categories:', enriched.length, enriched);
      setCategories(enriched);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async () => {
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
        toast.error('Please log in to save categories');
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

      if (!formData.name.trim()) {
        toast.error('Please enter a category name');
        return;
      }

      // Check for duplicate name
      const { data: existing } = await supabase
        .from('expense_categories')
        .select('id')
        .eq('business_id', profile.business_id)
        .eq('name', formData.name.trim())
        .eq('is_active', true)
        .neq('id', editingCategory?.id || 0)
        .maybeSingle();

      if (existing) {
        toast.error('Category with this name already exists');
        return;
      }

      if (editingCategory) {
        // Update
        const { error } = await supabase
          .from('expense_categories')
          .update({
            name: formData.name.trim(),
            color_code: formData.color,
            description: formData.description?.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCategory.id);

        if (error) {
          console.error('Update error:', error);
          throw new Error(error.message || error.details || 'Failed to update category');
        }
        toast.success('Category updated successfully');
      } else {
        // Create - Standard method
        const insertData: {
          business_id: number;
          name: string;
          created_by: string;
          color_code?: string;
          description?: string | null;
          parent_id?: number;
          is_active: boolean;
        } = {
          business_id: profile.business_id,
          name: formData.name.trim(),
          created_by: session.user.id,
          is_active: true,
        };

        // Add optional fields
        if (formData.color) {
          insertData.color_code = formData.color;
        }
        if (formData.description?.trim()) {
          insertData.description = formData.description.trim();
        }
        // Only include parent_id if it has a valid value (don't include null)
        if (showSubCategoryOption && formData.parent_id) {
          insertData.parent_id = formData.parent_id;
        }

        console.log('Inserting category:', insertData);

        // Try to insert with parent_id first, if it fails due to column not existing, retry without it
        let { data: newCategory, error } = await supabase
          .from('expense_categories')
          .insert(insertData)
          .select()
          .single();

        // If error is about parent_id column not existing, retry without it
        if (error && (error.code === '42703' || error.code === 'PGRST204' || 
            (error.message && error.message.includes('parent_id')))) {
          console.log('parent_id column not found, retrying insert without parent_id');
          
          // Remove parent_id from insertData and retry
          const { parent_id, ...insertDataWithoutParent } = insertData;
          const retryResult = await supabase
            .from('expense_categories')
            .insert(insertDataWithoutParent)
            .select()
            .single();
          
          newCategory = retryResult.data;
          error = retryResult.error;
          
          if (error) {
            console.error('Retry insert error:', error);
          } else {
            console.log('Category created successfully without parent_id');
            toast.info('Category created (sub-category feature not available - parent_id column missing)');
          }
        }

        if (error) {
          console.error('Insert error:', error);
          let errorMessage = 'Failed to create category';
          
          // Handle specific error codes
          if (error.code === '23505') {
            errorMessage = 'Category already exists';
          } else if (error.message) {
            errorMessage = error.message;
          } else if (error.details) {
            errorMessage = error.details;
          } else if (error.hint) {
            errorMessage = error.hint;
          }
          
          // Log full error for debugging
          console.error('Full error object:', JSON.stringify(error, null, 2));
          throw new Error(errorMessage);
        }

        if (!newCategory) {
          throw new Error('Category was not created');
        }

        toast.success('Category created successfully');
        console.log('Category created:', newCategory);
      }

      setIsAddModalOpen(false);
      setEditingCategory(null);
      setFormData({ name: '', color: categoryColors[0].value, icon: 'Building', description: '', parent_id: null });
      setShowSubCategoryOption(false);
      
      // Reload categories to show the new one
      console.log('Reloading categories...');
      await loadCategories();
      await loadParentCategories();
      onRefresh?.();
      console.log('Categories reloaded');
    } catch (error: any) {
      console.error('Failed to save category:', error);
      const errorMessage = error?.message || error?.toString() || 'Failed to save category. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const { error } = await supabase
        .from('expense_categories')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      toast.success('Category deleted');
      await loadCategories();
      onRefresh?.();
    } catch (error: any) {
      console.error('Failed to delete category:', error);
      toast.error(error.message || 'Failed to delete category');
    }
  };

  const getCategoryIcon = (categoryName: string) => {
    const Icon = categoryIcons[categoryName] || Tag;
    return Icon;
  };

  const getCategoryColor = (colorCode?: string) => {
    if (!colorCode) return categoryColors[0].class;
    const color = categoryColors.find((c) => c.value === colorCode);
    return color?.class || categoryColors[0].class;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Expense Categories</h2>
          <p className="text-sm text-slate-400 mt-1">Manage your expense categories</p>
        </div>
        <Button
          onClick={async () => {
            setEditingCategory(null);
            setFormData({ name: '', color: categoryColors[0].value, icon: 'Building', description: '', parent_id: null });
            setShowSubCategoryOption(false);
            await loadParentCategories(); // Reload parent categories before opening dialog
            setIsAddModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-500 text-white"
        >
          <Plus size={18} className="mr-2" />
          Add New Category
        </Button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-6">
              <div className="animate-pulse">
                <div className="h-12 w-12 bg-slate-800 rounded-lg mb-4" />
                <div className="h-4 bg-slate-800 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-800 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : (
          <>
            {categories.map((category) => {
              const Icon = getCategoryIcon(category.name);
              const colorClass = getCategoryColor(category.color_code);
              return (
                <div
                  key={category.id}
                  className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 relative group hover:border-slate-700 transition-all"
                >
                  <div className={cn("absolute top-4 right-4 w-3 h-3 rounded-full", colorClass)} />
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-slate-800/50">
                      <Icon size={24} className="text-slate-300" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-1">{category.name}</h3>
                  <p className="text-sm text-slate-400">
                    {category.expense_count || 0} {category.expense_count === 1 ? 'Expense' : 'Expenses'}
                  </p>
                  <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
        setEditingCategory(category);
        setFormData({
          name: category.name,
          color: category.color_code || categoryColors[0].value,
          icon: 'Building',
          description: category.description || '',
          parent_id: category.parent_id || null,
        });
        setShowSubCategoryOption(!!category.parent_id);
        await loadParentCategories(); // Reload parent categories before opening dialog
        setIsAddModalOpen(true);
                      }}
                      className="flex-1 bg-slate-900 border-slate-800 text-slate-200"
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCategory(category.id)}
                      className="flex-1 bg-slate-900 border-slate-800 text-red-400 hover:bg-red-900/20"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              );
            })}
            {/* Add New Category Card */}
            <div
              onClick={async () => {
                setEditingCategory(null);
                setFormData({ name: '', color: categoryColors[0].value, icon: 'Building', description: '', parent_id: null });
                setShowSubCategoryOption(false);
                await loadParentCategories(); // Reload parent categories before opening dialog
                setIsAddModalOpen(true);
              }}
              className="bg-slate-900/50 backdrop-blur-sm border-2 border-dashed border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-slate-600 transition-all"
            >
              <Plus size={48} className="text-slate-500 mb-3" />
              <p className="text-slate-400 font-medium">Add New Category</p>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Category Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-[550px] p-4 bg-slate-950 border-slate-800 backdrop-blur-xl">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-lg font-semibold text-slate-100">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-slate-300 mb-1.5 uppercase text-[12px] font-medium">Category Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Office Supplies"
                className="bg-slate-900 border-slate-800 text-slate-200 h-9 text-sm"
              />
            </div>

            {/* Sub-Category Option */}
            {!editingCategory && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="isSubCategory"
                    checked={showSubCategoryOption}
                    onChange={(e) => {
                      setShowSubCategoryOption(e.target.checked);
                      if (!e.target.checked) {
                        setFormData(prev => ({ ...prev, parent_id: null }));
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="isSubCategory" className="text-slate-300 text-sm font-normal cursor-pointer">
                    Add as Sub-Category
                  </Label>
                </div>
                {showSubCategoryOption && (
                  <div>
                    <select
                      value={formData.parent_id || ''}
                      onChange={(e) => setFormData({ ...formData, parent_id: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full h-9 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Parent Category</option>
                      {parentCategories.length > 0 ? (
                        parentCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No parent categories available</option>
                      )}
                    </select>
                    {parentCategories.length === 0 && (
                      <p className="text-xs text-slate-400 mt-1">Please create a parent category first</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <Label className="text-slate-300 mb-1.5 uppercase text-[12px] font-medium">Color Code</Label>
              <div className="flex gap-2">
                {categoryColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      color.class,
                      formData.color === color.value
                        ? "border-white ring-2 ring-blue-500 ring-offset-1 ring-offset-slate-950 scale-110"
                        : "border-slate-700 hover:scale-105"
                    )}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label className="text-slate-300 mb-1.5 uppercase text-[12px] font-medium">Icon</Label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(categoryIcons).slice(0, 8).map(([name, Icon]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: name })}
                    className={cn(
                      "p-2 rounded-lg border transition-all text-center hover:scale-105",
                      formData.icon === name
                        ? "bg-blue-600 border-blue-500 text-white shadow-lg"
                        : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                    )}
                  >
                    <Icon size={16} className="mx-auto mb-0.5" />
                    <span className="text-[10px]">{name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-slate-300 mb-1.5 uppercase text-[12px] font-medium">Description (Optional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Short description..."
                className="bg-slate-900 border-slate-800 text-slate-200 min-h-[60px] text-sm"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-800">
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 h-9 text-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveCategory}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white h-9 text-sm"
              >
                {editingCategory ? 'Update Category' : 'Create Category'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

