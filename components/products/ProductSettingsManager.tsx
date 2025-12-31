/**
 * Product Settings Manager Component
 * Manages Categories, Units, and Brands
 * Modern dark theme with collapsible sections
 */

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/Dialog';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Package, Ruler, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Category {
  id: number;
  name: string;
  category_type?: string;
  parent_id?: number | null;
  product_count?: number;
}

interface Unit {
  id: number;
  actual_name: string;
  short_name: string;
  allow_decimal: boolean;
}

interface Brand {
  id: number;
  name: string;
}

interface ProductSettingsManagerProps {
  initialTab?: 'categories' | 'brands' | 'units';
  onCategoryAdded?: () => void;
  onBrandAdded?: () => void;
  onUnitAdded?: () => void;
  prefillParentCategoryId?: number | null;
  hideFullUI?: boolean; // If true, only show the modal forms, not the full page UI
}

export function ProductSettingsManager({ 
  initialTab = 'categories',
  onCategoryAdded,
  onBrandAdded,
  onUnitAdded,
  prefillParentCategoryId,
  hideFullUI = false
}: ProductSettingsManagerProps = {}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Category state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState<number | null>(null);
  
  // Unit state
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitName, setUnitName] = useState('');
  const [unitShortName, setUnitShortName] = useState('');
  const [allowDecimal, setAllowDecimal] = useState(false);
  
  // Brand state
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandName, setBrandName] = useState('');
  
  // Tab navigation (Figma style)
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'brands' | 'units'>(initialTab || 'categories');

  useEffect(() => {
    loadAll();
  }, []);

  // Auto-open modals when component is used in modal context
  useEffect(() => {
    if (initialTab === 'categories') {
      // Auto-open category modal when used in modal
      setCategoryModalOpen(true);
      if (prefillParentCategoryId) {
        setParentCategoryId(prefillParentCategoryId);
      }
    } else if (initialTab === 'brands') {
      setBrandModalOpen(true);
    } else if (initialTab === 'units') {
      setUnitModalOpen(true);
    }
  }, [initialTab, prefillParentCategoryId]);

  // Debug: Log categories state changes
  useEffect(() => {
    console.log('📊 Categories state changed:', {
      count: categories.length,
      categories: categories,
      loading: loading,
    });
  }, [categories, loading]);

  const loadAll = async () => {
    setLoading(true);
    try {
      console.log('=== Starting loadAll ===');
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        toast.error('Authentication error. Please log in again.');
        return;
      }
      
      if (!session) {
        console.warn('No session found');
        toast.error('Not authenticated. Please log in.');
        return;
      }

      console.log('Session found, user ID:', session.user.id);

      // Get business_id from user_profiles
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        toast.error(`Failed to load profile: ${profileError.message}`);
        return;
      }

      if (!profile?.business_id) {
        console.warn('No business_id found for user');
        toast.error('Business not found. Please contact support.');
        return;
      }

      const businessId = profile.business_id;
      console.log('Business ID:', businessId);
      console.log('User ID:', session.user.id);

      // Load categories - try simplest approach first
      console.log('Loading categories (RLS will auto-filter by business_id)...');
      
      let cats: any[] | null = null;

      // Try 1: With parent_id column
      const { data: data1, error: error1 } = await supabase
        .from('categories')
        .select('id, name, category_type, parent_id')
        .order('name');
      
      if (error1) {
        // Check if it's a column error by trying to stringify
        const errorStr = String(error1?.message || error1?.code || JSON.stringify(error1) || '');
        const isColumnError = errorStr.includes('column') || 
                             errorStr.includes('parent_id') || 
                             errorStr.includes('42703') ||
                             errorStr.includes('does not exist');
        
        if (isColumnError) {
          console.warn('parent_id column not found, trying without it...');
          
          // Try 2: Without parent_id column
          const { data: data2, error: error2 } = await supabase
            .from('categories')
            .select('id, name, category_type')
            .order('name');
          
          if (error2) {
            console.warn('Error without parent_id, trying minimal query...');
            
            // Try 3: Minimal query
            const { data: data3, error: error3 } = await supabase
              .from('categories')
              .select('id, name')
              .order('name');
            
            if (error3) {
              console.error('All queries failed. Error3:', error3);
              cats = [];
            } else {
              cats = data3 || [];
              console.log('✅ Loaded categories (minimal):', cats.length);
            }
          } else {
            cats = data2 || [];
            console.log('✅ Loaded categories without parent_id:', cats.length);
          }
        } else {
          console.error('Non-column error:', error1);
          cats = [];
        }
      } else {
        cats = data1 || [];
        console.log('✅ Loaded categories with parent_id:', cats.length);
      }

      // Get product counts for each category
      if (cats && cats.length > 0) {
        const categoryIds = cats.map(c => c.id);
        
        // Get product counts for each category
        const { data: productCounts } = await supabase
          .from('products')
          .select('category_id')
          .in('category_id', categoryIds);
        
        // Count products per category
        const countMap = new Map<number, number>();
        productCounts?.forEach(p => {
          if (p.category_id) {
            countMap.set(p.category_id, (countMap.get(p.category_id) || 0) + 1);
          }
        });
        
        // Add product_count to each category
        const catsWithCounts = cats.map(cat => ({
          ...cat,
          product_count: countMap.get(cat.id) || 0
        }));
        
        console.log('✅ Categories loaded successfully:', catsWithCounts.length);
        console.log('Sample categories:', catsWithCounts.slice(0, 3));
        setCategories(catsWithCounts);
      } else {
        console.warn('⚠️ No categories found');
        console.warn('Business ID:', businessId);
        console.warn('This could mean:');
        console.warn('1. No categories exist in the database for this business');
        console.warn('2. RLS policy is blocking access');
        console.warn('3. business_id mismatch');
        setCategories([]);
      }

      // Load units
      const { data: unts, error: untsError } = await supabase
        .from('units')
        .select('id, actual_name, short_name, allow_decimal')
        .eq('business_id', businessId)
        .order('actual_name');

      if (untsError) {
        console.error('Error loading units:', {
          error: untsError,
          code: untsError.code,
          message: untsError.message,
          details: untsError.details,
          hint: untsError.hint,
        });
        setUnits([]); // Set empty array on error
      } else {
        setUnits(unts || []);
      }

      // Load brands
      const { data: brds, error: brdsError } = await supabase
        .from('brands')
        .select('id, name')
        .eq('business_id', businessId)
        .order('name');

      if (brdsError) {
        console.error('Error loading brands:', {
          error: brdsError,
          code: brdsError.code,
          message: brdsError.message,
          details: brdsError.details,
          hint: brdsError.hint,
        });
        setBrands([]); // Set empty array on error
      } else {
        setBrands(brds || []);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async () => {
    // Smart Cleanup: Trim whitespace and validate
    const trimmedName = categoryName.trim();
    
    if (!trimmedName) {
      toast.error('Category name is required');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated. Please log in again.');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) {
        toast.error('Business not found. Please contact support.');
        return;
      }

      // Case-Insensitive Check: Use .ilike() for case-insensitive database query
      // Get all categories with same name (case-insensitive) and same parent_id
      const { data: existingCategories, error: queryError } = await supabase
        .from('categories')
        .select('id, name, parent_id')
        .eq('business_id', profile.business_id)
        .ilike('name', trimmedName);

      if (queryError) {
        console.error('Failed to query categories:', queryError);
        toast.error('Failed to verify category. Please try again.');
        return;
      }

      // Normalize names for comparison (case-insensitive)
      // Also check parent_id match - same name with different parent is allowed
      const normalizedInputName = trimmedName.toLowerCase();
      const targetParentId = parentCategoryId ?? null;
      
      const existingCategory = existingCategories?.find(
        cat => {
          const nameMatch = cat.name.toLowerCase() === normalizedInputName;
          const catParentId = cat.parent_id ?? null;
          const parentMatch = catParentId === targetParentId;
          return nameMatch && parentMatch;
        }
      );
      
      console.log('Duplicate check:', {
        trimmedName,
        targetParentId,
        existingCategories,
        existingCategory,
      });

      if (editingCategory) {
        // Update mode: Check if name conflicts with another category (not the one being edited)
        if (existingCategory && existingCategory.id !== editingCategory.id) {
          toast.info('Category already exists. Please use a different name.');
          // Just close modal, don't set editing state
          setCategoryModalOpen(false);
          setCategoryName('');
          setEditingCategory(null);
          setParentCategoryId(null);
          loadAll();
          return;
        }

        // Update the category
        const updateData: { name: string; parent_id: number | null } = { 
          name: trimmedName,
          parent_id: parentCategoryId ?? null
        };

        console.log('Updating category with data:', updateData, 'for category ID:', editingCategory.id);

        const { error: updateError } = await supabase
          .from('categories')
          .update(updateData)
          .eq('id', editingCategory.id);

        if (updateError) {
          console.error('Category update error details:', {
            error: updateError,
            code: updateError.code,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
          });
          
          // Handle specific error types
          if (updateError.message?.includes('row-level security') || updateError.message?.includes('policy')) {
            toast.error('Permission denied. Please ensure you have proper access to update categories.');
            return;
          }
          if (updateError.message?.includes('unique constraint') || updateError.message?.includes('uq_categories_business_name')) {
            toast.info('Category already exists. Please use a different name.');
            setCategoryModalOpen(false);
            setCategoryName('');
            setEditingCategory(null);
            setParentCategoryId(null);
            loadAll();
            return;
          }
          if (updateError.message?.includes('foreign key') || updateError.message?.includes('parent_id')) {
            toast.error('Invalid parent category selected. Please select a valid parent category.');
            return;
          }
          console.error('Failed to update category:', updateError);
          toast.error(updateError.message || `Failed to update category: ${updateError.code || 'Unknown error'}`);
          return;
        }

        console.log('Category updated successfully');
        toast.success('Category updated successfully');
        setCategoryModalOpen(false);
        setCategoryName('');
        setEditingCategory(null);
        setParentCategoryId(null);
        // Use setTimeout to ensure state is reset before reload
        setTimeout(async () => {
          await loadAll();
        }, 100);
        if (onCategoryAdded) {
          onCategoryAdded();
        }
      } else {
        // Create mode: Prevent Duplicate Creation
        if (existingCategory) {
          toast.info('Category already exists. Please use a different name.');
          // Just close modal, don't set editing state
          setCategoryModalOpen(false);
          setCategoryName('');
          setParentCategoryId(null);
          loadAll();
          return;
        }

        // Create new category
        const insertData: {
          business_id: number;
          name: string;
          created_by: string;
          parent_id?: number | null;
        } = {
          business_id: profile.business_id,
          name: trimmedName,
          created_by: session.user.id,
        };
        
        // Always include parent_id, even if null
        insertData.parent_id = parentCategoryId ?? null;

        console.log('Inserting category with data:', insertData);
        console.log('Parent Category ID being set:', insertData.parent_id);
        console.log('Is sub-category?', insertData.parent_id !== null);

        const { data: newCategory, error: insertError } = await supabase
          .from('categories')
          .insert(insertData)
          .select()
          .single();
        
        console.log('Insert result:', { newCategory, insertError });

        if (insertError) {
          console.error('Category insert error details:', {
            error: insertError,
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
          });
          
          // Handle specific error types
          if (insertError.message?.includes('row-level security') || insertError.message?.includes('policy')) {
            toast.error('Permission denied. Please ensure you have proper access to create categories.');
            return;
          }
          if (insertError.message?.includes('unique constraint') || insertError.message?.includes('uq_categories_business_name')) {
            // Category was created between our check and insert (race condition)
            toast.info('Category already exists. Please use a different name.');
            setCategoryModalOpen(false);
            setCategoryName('');
            setParentCategoryId(null);
            loadAll();
            return;
          }
          if (insertError.message?.includes('foreign key') || insertError.message?.includes('parent_id')) {
            toast.error('Invalid parent category selected. Please select a valid parent category.');
            return;
          }
          console.error('Failed to create category:', insertError);
          toast.error(insertError.message || `Failed to create category: ${insertError.code || 'Unknown error'}`);
          return;
        }

        if (newCategory) {
          console.log('Category created successfully:', newCategory);
          const isSubCategory = newCategory.parent_id !== null && newCategory.parent_id !== undefined;
          toast.success(isSubCategory ? 'Sub-category created successfully!' : 'Category created successfully');
          // Reset form state first
          setCategoryModalOpen(false);
          setCategoryName('');
          setEditingCategory(null);
          setParentCategoryId(null);
          // Force reload to show new category - use setTimeout to ensure state is reset first
          setTimeout(async () => {
            await loadAll();
          }, 100);
          if (onCategoryAdded) {
            onCategoryAdded();
          }
        } else {
          console.error('Category insert returned no data, but insertError was null');
          // Even if select() didn't return data, the insert might have succeeded
          // Try to reload anyway
          setCategoryModalOpen(false);
          setCategoryName('');
          setEditingCategory(null);
          setParentCategoryId(null);
          setTimeout(async () => {
            await loadAll();
          }, 100);
          toast.success('Category may have been created. Please check the list.');
        }
      }
    } catch (err) {
      // Safe UI Feedback: Catch any unexpected errors
      console.error('Unexpected error in handleSaveCategory:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      toast.error(`Failed to save category: ${errorMessage}`);
      // Don't let UI hang - ensure modal can still be closed
      // Modal state is managed separately, so it won't hang
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Category deleted');
      loadAll();
    } catch (err) {
      console.error('Failed to delete category:', err);
      toast.error('Failed to delete category');
    }
  };

  const handleSaveUnit = async () => {
    if (!unitName.trim() || !unitShortName.trim()) {
      toast.error('Unit name and short name are required');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) throw new Error('Business not found');

      // Check for duplicate unit name (case-insensitive)
      const trimmedUnitName = unitName.trim();
      const trimmedUnitShortName = unitShortName.trim();
      
      if (editingUnit) {
        // Update - only check if name has changed
        const nameChanged = trimmedUnitName.toLowerCase() !== editingUnit.actual_name.toLowerCase() ||
                           trimmedUnitShortName.toLowerCase() !== editingUnit.short_name.toLowerCase();
        
        if (nameChanged) {
          // Check if new name conflicts with another unit
          const { data: existingUnits } = await supabase
            .from('units')
            .select('id, actual_name, short_name')
            .eq('business_id', profile.business_id);

          const conflictingUnit = existingUnits?.find(
            unit => unit.id !== editingUnit.id && 
            (unit.actual_name.toLowerCase() === trimmedUnitName.toLowerCase() || 
             unit.short_name.toLowerCase() === trimmedUnitShortName.toLowerCase())
          );
          
          if (conflictingUnit) {
            throw new Error(`A unit with the name "${trimmedUnitName}" or short name "${trimmedUnitShortName}" already exists. Please choose different names.`);
          }
        }

        const { error } = await supabase
          .from('units')
          .update({
            actual_name: trimmedUnitName,
            short_name: trimmedUnitShortName,
            allow_decimal: allowDecimal,
          })
          .eq('id', editingUnit.id);

        if (error) {
          if (error.message?.includes('unique constraint')) {
            throw new Error(`A unit with the name "${trimmedUnitName}" or short name "${trimmedUnitShortName}" already exists. Please choose different names.`);
          }
          throw new Error(error.message || 'Failed to update unit');
        }
        toast.success('Unit updated');
      } else {
        // Create - check if name already exists
        const { data: existingUnits } = await supabase
          .from('units')
          .select('id, actual_name, short_name')
          .eq('business_id', profile.business_id);

        const duplicateUnit = existingUnits?.find(
          unit => unit.actual_name.toLowerCase() === trimmedUnitName.toLowerCase() || 
                  unit.short_name.toLowerCase() === trimmedUnitShortName.toLowerCase()
        );
        
        if (duplicateUnit) {
          throw new Error(`A unit with the name "${trimmedUnitName}" or short name "${trimmedUnitShortName}" already exists. Please choose different names.`);
        }

        const { error } = await supabase
          .from('units')
          .insert({
            business_id: profile.business_id,
            actual_name: trimmedUnitName,
            short_name: trimmedUnitShortName,
            allow_decimal: allowDecimal,
            created_by: session.user.id,
          });

        if (error) {
          if (error.message?.includes('unique constraint')) {
            throw new Error(`A unit with the name "${trimmedUnitName}" or short name "${trimmedUnitShortName}" already exists. Please choose different names.`);
          }
          throw new Error(error.message || 'Failed to create unit');
        }
        toast.success('Unit created');
        if (onUnitAdded) {
          onUnitAdded();
        }
      }

      setUnitModalOpen(false);
      setUnitName('');
      setUnitShortName('');
      setAllowDecimal(false);
      setEditingUnit(null);
      loadAll();
    } catch (err) {
      console.error('Failed to save unit:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save unit');
    }
  };

  const handleDeleteUnit = async (id: number) => {
    if (!confirm('Are you sure you want to delete this unit?')) return;

    try {
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Unit deleted');
      loadAll();
    } catch (err) {
      console.error('Failed to delete unit:', err);
      toast.error('Failed to delete unit');
    }
  };

  const handleSaveBrand = async () => {
    if (!brandName.trim()) {
      toast.error('Brand name is required');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) throw new Error('Business not found');

      // Check for duplicate name (case-insensitive)
      const trimmedBrandName = brandName.trim();
      
      if (editingBrand) {
        // Update - only check if name has changed
        const nameChanged = trimmedBrandName.toLowerCase() !== editingBrand.name.toLowerCase();
        
        if (nameChanged) {
          // Check if new name conflicts with another brand
          const { data: existingBrands } = await supabase
            .from('brands')
            .select('id, name')
            .eq('business_id', profile.business_id)
            .ilike('name', trimmedBrandName);

          const conflictingBrand = existingBrands?.find(
            brand => brand.id !== editingBrand.id && brand.name.toLowerCase() === trimmedBrandName.toLowerCase()
          );
          
          if (conflictingBrand) {
            throw new Error(`A brand with the name "${trimmedBrandName}" already exists. Please choose a different name.`);
          }
        }

        const { error } = await supabase
          .from('brands')
          .update({ name: trimmedBrandName })
          .eq('id', editingBrand.id);

        if (error) {
          if (error.message?.includes('unique constraint') || error.message?.includes('uq_brands_business_name')) {
            throw new Error(`A brand with the name "${trimmedBrandName}" already exists. Please choose a different name.`);
          }
          throw new Error(error.message || 'Failed to update brand');
        }
        toast.success('Brand updated');
      } else {
        // Create - check if name already exists
        const { data: existingBrands } = await supabase
          .from('brands')
          .select('id, name')
          .eq('business_id', profile.business_id)
          .ilike('name', trimmedBrandName);

        if (existingBrands && existingBrands.length > 0) {
          throw new Error(`A brand with the name "${trimmedBrandName}" already exists. Please choose a different name.`);
        }

        const insertData: any = {
          business_id: profile.business_id,
          name: trimmedBrandName,
          created_by: session.user.id,
        };

        const { error } = await supabase
          .from('brands')
          .insert(insertData);

        if (error) {
          // If RLS error, provide more helpful message
          if (error.message?.includes('row-level security') || error.message?.includes('policy')) {
            throw new Error('Permission denied. Please ensure you have proper access to create brands. This might be a Row-Level Security (RLS) policy issue.');
          }
          // If unique constraint error, provide helpful message
          if (error.message?.includes('unique constraint') || error.message?.includes('uq_brands_business_name')) {
            throw new Error(`A brand with the name "${trimmedBrandName}" already exists. Please choose a different name.`);
          }
          throw new Error(error.message || 'Failed to create brand');
        }
        toast.success('Brand created');
        if (onBrandAdded) {
          onBrandAdded();
        }
      }

      setBrandModalOpen(false);
      setBrandName('');
      setEditingBrand(null);
      loadAll();
    } catch (err) {
      console.error('Failed to save brand:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save brand');
    }
  };

  const handleDeleteBrand = async (id: number) => {
    if (!confirm('Are you sure you want to delete this brand?')) return;

    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Brand deleted');
      loadAll();
    } catch (err) {
      console.error('Failed to delete brand:', err);
      toast.error('Failed to delete brand');
    }
  };

  return (
    <div className="bg-[#111827] min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Package className="w-6 h-6 text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold text-white">Inventory Management</h1>
            </div>
            <p className="text-gray-400 text-sm ml-14">Manage products, stocks, categories, and attributes across all stores.</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              <span className="mr-2">🔍</span>
              Filters
            </Button>
            <Button
              onClick={() => {
                if (activeTab === 'categories') {
                  setEditingCategory(null);
                  setCategoryName('');
                  setParentCategoryId(null);
                  setCategoryModalOpen(true);
                } else if (activeTab === 'brands') {
                  setEditingBrand(null);
                  setBrandName('');
                  setBrandModalOpen(true);
                } else if (activeTab === 'units') {
                  setEditingUnit(null);
                  setUnitName('');
                  setUnitShortName('');
                  setAllowDecimal(false);
                  setUnitModalOpen(true);
                }
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              {activeTab === 'categories' ? 'Add Category' : activeTab === 'brands' ? 'Add Brand' : activeTab === 'units' ? 'Add Unit' : 'Add'}
            </Button>
          </div>
        </div>

        {/* Tab Navigation (Figma Style) */}
        <div className="flex items-center gap-1 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('products')}
            className={cn(
              "px-6 py-3 flex items-center gap-2 text-sm font-medium transition-colors border-b-2",
              activeTab === 'products'
                ? "text-white border-blue-500 bg-gray-900/50"
                : "text-gray-400 border-transparent hover:text-gray-300"
            )}
          >
            <Package className="w-4 h-4" />
            Products
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs",
              activeTab === 'products' ? "bg-blue-500/20 text-blue-400" : "bg-gray-800 text-gray-500"
            )}>
              0
            </span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={cn(
              "px-6 py-3 flex items-center gap-2 text-sm font-medium transition-colors border-b-2",
              activeTab === 'categories'
                ? "text-white border-blue-500 bg-gray-900/50"
                : "text-gray-400 border-transparent hover:text-gray-300"
            )}
          >
            <Package className="w-4 h-4" />
            Categories
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs",
              activeTab === 'categories' ? "bg-blue-500/20 text-blue-400" : "bg-gray-800 text-gray-500"
            )}>
              {categories.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('brands')}
            className={cn(
              "px-6 py-3 flex items-center gap-2 text-sm font-medium transition-colors border-b-2",
              activeTab === 'brands'
                ? "text-white border-blue-500 bg-gray-900/50"
                : "text-gray-400 border-transparent hover:text-gray-300"
            )}
          >
            <Tag className="w-4 h-4" />
            Brands
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs",
              activeTab === 'brands' ? "bg-blue-500/20 text-blue-400" : "bg-gray-800 text-gray-500"
            )}>
              {brands.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('units')}
            className={cn(
              "px-6 py-3 flex items-center gap-2 text-sm font-medium transition-colors border-b-2",
              activeTab === 'units'
                ? "text-white border-blue-500 bg-gray-900/50"
                : "text-gray-400 border-transparent hover:text-gray-300"
            )}
          >
            <Ruler className="w-4 h-4" />
            Units
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs",
              activeTab === 'units' ? "bg-blue-500/20 text-blue-400" : "bg-gray-800 text-gray-500"
            )}>
              {units.length}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'categories' && (
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-400">Manage your product categories</h3>
              <Button
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryName('');
                  setParentCategoryId(null);
                  setCategoryModalOpen(true);
                }}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-500/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </div>

            {/* Card-based Grid Layout (Figma Style) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {categories.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Package className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg mb-2">No categories yet</p>
                  <p className="text-gray-500 text-sm">Create your first category to get started</p>
                </div>
              ) : (
                (() => {
                  // Separate parent and child categories
                  const parentCategories = categories.filter(cat => !cat.parent_id || cat.parent_id === null);
                  const childCategories = categories.filter(cat => cat.parent_id && cat.parent_id !== null);
                  
                  return (
                    <>
                      {/* Main Category Cards */}
                      {parentCategories.map((cat) => {
                        const children = childCategories.filter(child => child.parent_id === cat.id);
                        
                        return (
                          <div
                            key={cat.id}
                            className="group relative bg-gray-800/50 border border-gray-700 rounded-xl p-5 hover:border-blue-500/50 hover:bg-gray-800/70 transition-all shadow-lg hover:shadow-xl"
                          >
                            {/* 3-dots menu */}
                            <div className="absolute top-4 right-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // TODO: Add dropdown menu
                                }}
                              >
                                <span className="text-xl leading-none">⋯</span>
                              </Button>
                            </div>
                            
                            {/* Category Icon */}
                            <div className="mb-4">
                              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                                <Package className="w-6 h-6 text-blue-400" />
                              </div>
                            </div>
                            
                            {/* Category Name */}
                            <h3 className="text-white font-semibold text-lg mb-1">{cat.name}</h3>
                            
                            {/* Product Count */}
                            <p className="text-gray-400 text-sm mb-4">
                              {cat.product_count || 0} Product{(cat.product_count || 0) !== 1 ? 's' : ''}
                            </p>
                            
                            {/* Sub-Categories as Tags */}
                            {children.length > 0 && (
                              <div className="mb-4">
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-medium">SUB-CATEGORIES</p>
                                <div className="flex flex-wrap gap-2">
                                  {children.slice(0, 4).map((child) => (
                                    <span
                                      key={child.id}
                                      className="px-2.5 py-1 bg-gray-700/50 text-gray-300 text-xs rounded-md border border-gray-600/50"
                                    >
                                      {child.name}
                                    </span>
                                  ))}
                                  {children.length > 4 && (
                                    <button
                                      onClick={() => {
                                        setEditingCategory(null);
                                        setCategoryName('');
                                        setParentCategoryId(cat.id);
                                        setCategoryModalOpen(true);
                                      }}
                                      className="px-2.5 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-md border border-blue-500/30 hover:bg-blue-500/20 transition-colors"
                                    >
                                      +{children.length - 4} more
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setEditingCategory(null);
                                      setCategoryName('');
                                      setParentCategoryId(cat.id);
                                      setCategoryModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 bg-gray-700/30 text-gray-400 text-xs rounded-md border border-gray-600/30 hover:bg-gray-700/50 transition-colors"
                                    title="Add Sub-Category"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            {/* Add Sub-Category Button (if no sub-categories) */}
                            {children.length === 0 && (
                              <button
                                onClick={() => {
                                  setEditingCategory(null);
                                  setCategoryName('');
                                  setParentCategoryId(cat.id);
                                  setCategoryModalOpen(true);
                                }}
                                className="w-full mt-4 px-3 py-2 bg-gray-700/30 hover:bg-gray-700/50 text-gray-400 text-sm rounded-lg border border-gray-600/30 transition-colors"
                              >
                                + Add Sub-Category
                              </button>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-700/50">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingCategory(cat);
                                  setCategoryName(cat.name);
                                  setParentCategoryId(cat.parent_id || null);
                                  setCategoryModalOpen(true);
                                }}
                                className="flex-1 h-8 text-xs hover:bg-blue-500/10 text-blue-400"
                              >
                                <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="flex-1 h-8 text-xs hover:bg-red-500/10 text-red-400"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Add New Category Card */}
                      <button
                        onClick={() => {
                          setEditingCategory(null);
                          setCategoryName('');
                          setParentCategoryId(null);
                          setCategoryModalOpen(true);
                        }}
                        className="group relative bg-gray-800/30 border-2 border-dashed border-gray-700 rounded-xl p-5 hover:border-blue-500/50 hover:bg-gray-800/50 transition-all min-h-[200px] flex flex-col items-center justify-center"
                      >
                        <div className="w-12 h-12 bg-gray-700/50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-500/10 transition-colors">
                          <Plus className="w-6 h-6 text-gray-500 group-hover:text-blue-400 transition-colors" />
                        </div>
                        <p className="text-gray-400 font-medium group-hover:text-white transition-colors">Add New Category</p>
                      </button>
                    </>
                  );
                })()
              )}
            </div>
          </div>
        )}

        {activeTab === 'units' && (
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-400">Manage measurement units</h3>
              <Button
                onClick={() => {
                  setEditingUnit(null);
                  setUnitName('');
                  setUnitShortName('');
                  setAllowDecimal(false);
                  setUnitModalOpen(true);
                }}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-lg shadow-green-500/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Unit
              </Button>
            </div>

            <div className="space-y-2">
              {units.length === 0 ? (
                <div className="text-center py-8">
                  <Ruler className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No units yet</p>
                  <p className="text-gray-500 text-xs mt-1">Add your first unit to get started</p>
                </div>
              ) : (
                units.map((unit) => (
                  <div
                    key={unit.id}
                    className="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-800/50 to-gray-800/30 rounded-xl border border-gray-700 hover:border-green-500/50 hover:bg-gray-800/60 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                        <Ruler className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <span className="text-white font-semibold block">{unit.actual_name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-gray-400 text-sm">({unit.short_name})</span>
                          {unit.allow_decimal && (
                            <span className="text-xs text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">Decimal</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingUnit(unit);
                          setUnitName(unit.actual_name);
                          setUnitShortName(unit.short_name);
                          setAllowDecimal(unit.allow_decimal);
                          setUnitModalOpen(true);
                        }}
                        className="h-9 w-9 p-0 hover:bg-green-500/10"
                      >
                        <Edit2 className="w-4 h-4 text-green-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUnit(unit.id)}
                        className="h-9 w-9 p-0 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'brands' && (
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-400">Manage product brands</h3>
              <Button
                onClick={() => {
                  setEditingBrand(null);
                  setBrandName('');
                  setBrandModalOpen(true);
                }}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white shadow-lg shadow-purple-500/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Brand
              </Button>
            </div>

            <div className="space-y-2">
              {brands.length === 0 ? (
                <div className="text-center py-8">
                  <Tag className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No brands yet</p>
                  <p className="text-gray-500 text-xs mt-1">Add your first brand to get started</p>
                </div>
              ) : (
                brands.map((brand) => (
                  <div
                    key={brand.id}
                    className="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-800/50 to-gray-800/30 rounded-xl border border-gray-700 hover:border-purple-500/50 hover:bg-gray-800/60 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                        <Tag className="w-4 h-4 text-purple-400" />
                      </div>
                      <span className="text-white font-semibold">{brand.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingBrand(brand);
                          setBrandName(brand.name);
                          setBrandModalOpen(true);
                        }}
                        className="h-9 w-9 p-0 hover:bg-purple-500/10"
                      >
                        <Edit2 className="w-4 h-4 text-purple-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBrand(brand.id)}
                        className="h-9 w-9 p-0 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <Dialog open={categoryModalOpen} onOpenChange={(open) => {
        setCategoryModalOpen(open);
        if (!open) {
          // Reset form when modal closes
          setCategoryName('');
          setEditingCategory(null);
          setParentCategoryId(null);
        }
      }}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
          <DialogClose onClose={() => {
            setCategoryModalOpen(false);
            setCategoryName('');
            setEditingCategory(null);
            setParentCategoryId(null);
          }} />
          <DialogHeader>
            <DialogTitle className="text-white">
              {parentCategoryId && !editingCategory 
                ? `Add Sub-Category to "${categories.find(c => c.id === parentCategoryId)?.name || 'Category'}"`
                : editingCategory 
                  ? 'Edit Category' 
                  : 'Add Category'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category Name <span className="text-red-400">*</span>
              </label>
              <Input
                placeholder="Enter category name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Parent Category <span className="text-gray-500 text-xs">(Optional - for sub-categories)</span>
              </label>
              <select
                value={parentCategoryId || ''}
                onChange={(e) => {
                  const newParentId = e.target.value ? parseInt(e.target.value) : null;
                  setParentCategoryId(newParentId);
                  console.log('Parent category changed to:', newParentId);
                }}
                disabled={!!editingCategory && !!editingCategory.parent_id}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">None (Main Category)</option>
                {categories
                  .filter(cat => {
                    // Only show parent categories (no parent_id)
                    const isParent = !cat.parent_id || cat.parent_id === null;
                    // Don't show the category being edited as a parent option
                    const notEditing = !editingCategory || cat.id !== editingCategory.id;
                    return isParent && notEditing;
                  })
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
              {parentCategoryId && (
                <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-md">
                  <p className="text-xs text-blue-400">
                    ✓ This will be a sub-category of: <span className="font-semibold">{categories.find(c => c.id === parentCategoryId)?.name}</span>
                  </p>
                </div>
              )}
              {editingCategory && editingCategory.parent_id && (
                <div className="mt-2 p-2 bg-gray-800/50 border border-gray-700 rounded-md">
                  <p className="text-xs text-gray-400">
                    Current parent: <span className="text-gray-300">{categories.find(c => c.id === editingCategory.parent_id)?.name || 'Unknown'}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Note: Parent category cannot be changed when editing.</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setCategoryModalOpen(false);
                  setCategoryName('');
                  setEditingCategory(null);
                  setParentCategoryId(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveCategory} 
                className="bg-blue-600 hover:bg-blue-500 text-white"
                disabled={!categoryName.trim()}
              >
                {editingCategory ? 'Update' : parentCategoryId ? 'Create Sub-Category' : 'Create Category'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unit Modal */}
      <Dialog open={unitModalOpen} onOpenChange={setUnitModalOpen}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogClose onClose={() => setUnitModalOpen(false)} />
          <DialogHeader>
            <DialogTitle>
              {editingUnit ? 'Edit Unit' : 'Add Unit'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Unit name (e.g., Pieces)"
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
            <Input
              placeholder="Short name (e.g., Pcs)"
              value={unitShortName}
              onChange={(e) => setUnitShortName(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
            <label className="flex items-center gap-2 text-white">
              <input
                type="checkbox"
                checked={allowDecimal}
                onChange={(e) => setAllowDecimal(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Allow decimal values</span>
            </label>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setUnitModalOpen(false);
                  setUnitName('');
                  setUnitShortName('');
                  setAllowDecimal(false);
                  setEditingUnit(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveUnit} className="bg-green-600 hover:bg-green-500">
                {editingUnit ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Brand Modal */}
      <Dialog open={brandModalOpen} onOpenChange={setBrandModalOpen}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogClose onClose={() => setBrandModalOpen(false)} />
          <DialogHeader>
            <DialogTitle>
              {editingBrand ? 'Edit Brand' : 'Add Brand'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Brand name"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setBrandModalOpen(false);
                  setBrandName('');
                  setEditingBrand(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveBrand} className="bg-purple-600 hover:bg-purple-500">
                {editingBrand ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

