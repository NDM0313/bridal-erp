'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Category {
  id: number;
  name: string;
  parent_id?: number | null;
}

interface CategoryFormProps {
  categoryName: string;
  setCategoryName: (name: string) => void;
  parentCategoryId: number | null;
  setParentCategoryId: (id: number | null) => void;
  categories: Category[];
  onSave: (newCategoryId?: number) => Promise<void>; // Updated to return new category ID
  onClose: () => void;
}

export function CategoryForm({ 
  categoryName, 
  setCategoryName, 
  parentCategoryId, 
  setParentCategoryId, 
  categories, 
  onSave,
  onClose
}: CategoryFormProps) {
  const [loading, setLoading] = useState(false);
  const [mainCategoryInput, setMainCategoryInput] = useState(''); // For typing new main category
  const [selectedMainCategoryId, setSelectedMainCategoryId] = useState<number | null>(parentCategoryId);
  const [subCategoryName, setSubCategoryName] = useState(''); // Box 2 input

  // Filter to show only main categories (parent_id is null/empty)
  const mainCategories = categories.filter(cat => !cat.parent_id || cat.parent_id === null);

  // Initialize from props if editing
  useEffect(() => {
    if (parentCategoryId) {
      setSelectedMainCategoryId(parentCategoryId);
    }
  }, [parentCategoryId]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated.');
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();
      
      if (!profile?.business_id) throw new Error('Business not found.');

      let finalName = '';
      let finalParentId: number | null = null;
      let newCategoryId: number | undefined;

      // Determine workflow: Main Category or Sub-Category
      if (selectedMainCategoryId && subCategoryName.trim()) {
        // Sub-Category Experience: Main category selected + sub-category name entered
        finalName = subCategoryName.trim();
        finalParentId = selectedMainCategoryId;
      } else if (mainCategoryInput.trim()) {
        // Main Category Experience: New main category name entered in Box 1, Box 2 empty
        finalName = mainCategoryInput.trim();
        finalParentId = null;
      } else if (selectedMainCategoryId && !subCategoryName.trim()) {
        // Edge case: Main category selected but no sub-category name - treat as main category selection only
        toast.error('Please enter a sub-category name or create a new main category');
        return;
      } else {
        toast.error('Please enter a category name');
        return;
      }

      if (!finalName) {
        toast.error('Category name is required');
        return;
      }

      // Check for duplicates
      const normalizedInputName = finalName.toLowerCase();
      const { data: existingCategories, error: queryError } = await supabase
        .from('categories')
        .select('id, name, parent_id')
        .eq('business_id', profile.business_id)
        .ilike('name', finalName);

      if (queryError) throw queryError;

      const existingCategory = existingCategories?.find(
        cat => {
          const nameMatch = cat.name.toLowerCase() === normalizedInputName;
          const catParentId = cat.parent_id ?? null;
          const parentMatch = catParentId === finalParentId;
          return nameMatch && parentMatch;
        }
      );

      if (existingCategory) {
        toast.info('Category already exists. Please use a different name.');
        return;
      }

      // Insert category
      const { data: newCategory, error: insertError } = await supabase
        .from('categories')
        .insert({
          business_id: profile.business_id,
          name: finalName,
          created_by: session.user.id,
          parent_id: finalParentId,
        })
        .select()
        .single();

      if (insertError) {
        const errorMessage = insertError.message || insertError.details || insertError.hint || 'Failed to create category';
        throw new Error(errorMessage);
      }

      newCategoryId = newCategory?.id;
      
      toast.success(finalParentId ? 'Sub-category created successfully' : 'Category created successfully');
      
      // Reset logic: 
      // - If sub-category was created: Reset only Box 2, keep Box 1 (main category) selected
      // - If main category was created: Reset both boxes
      if (finalParentId) {
        // Sub-category created: Reset only Box 2, keep main category selected
        setSubCategoryName('');
        // Keep selectedMainCategoryId as is for adding more sub-categories
      } else {
        // Main category created: Reset both boxes
        setMainCategoryInput('');
        setSelectedMainCategoryId(null);
        setSubCategoryName('');
      }
      
      // Call onSave with the new category ID for auto-selection
      await onSave(newCategoryId);
    } catch (err: any) {
      console.error('Failed to save category:', {
        error: err,
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        errorString: String(err),
        errorJSON: JSON.stringify(err)
      });
      const errorMessage = err?.message || err?.details || err?.hint || 'Failed to save category';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleMainCategoryChange = (value: string) => {
    if (value === 'add-new') {
      // User wants to add new main category - clear selection and enable input
      setSelectedMainCategoryId(null);
      setMainCategoryInput('');
      setSubCategoryName(''); // Clear sub-category when switching to new main
    } else if (value === '') {
      setSelectedMainCategoryId(null);
      setMainCategoryInput('');
      setSubCategoryName('');
    } else {
      // User selected existing main category
      const categoryId = parseInt(value);
      setSelectedMainCategoryId(categoryId);
      setMainCategoryInput(''); // Clear input when selecting existing
      setSubCategoryName(''); // Clear sub-category to start fresh
    }
  };


  return (
    <div className="space-y-4 animate-entrance">
      {/* Box 1: Main Category Selection */}
      <div>
        <label className="block text-sm font-medium text-indigo-300 mb-2">
          Main Category <span className="text-gray-500 text-xs">(Select or create new)</span>
        </label>
        <div className="space-y-2">
          <select
            value={selectedMainCategoryId?.toString() || (mainCategoryInput ? 'add-new' : '')}
            onChange={(e) => handleMainCategoryChange(e.target.value)}
            disabled={loading}
            className={cn(
              "w-full px-3 py-2 bg-[#111827] border border-indigo-500/30 rounded-lg text-white text-sm",
              "focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500",
              "transition-all duration-300 ease-in-out",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <option value="">Select Main Category</option>
            {mainCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
            <option value="add-new" className="bg-indigo-600 text-white font-semibold">
              + Add New Category
            </option>
          </select>
          
          {/* Input for new main category name (shown when "Add New" is selected) */}
          {(!selectedMainCategoryId || mainCategoryInput) && (
            <Input
              placeholder="Enter new main category name"
              value={mainCategoryInput}
              onChange={(e) => {
                setMainCategoryInput(e.target.value);
                setSelectedMainCategoryId(null); // Clear selection when typing
                setSubCategoryName(''); // Clear sub-category
              }}
              className={cn(
                "bg-[#111827] border-indigo-500/30 text-white",
                "focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500",
                "transition-all duration-300 ease-in-out"
              )}
              autoFocus={!selectedMainCategoryId}
              disabled={loading}
            />
          )}
        </div>
      </div>

      {/* Box 2: Sub-Category Input (only enabled when main category is selected) */}
      {selectedMainCategoryId && (
        <div className="animate-entrance-delay-1">
          <label className="block text-sm font-medium text-indigo-300 mb-2">
            Sub-Category Name <span className="text-gray-500 text-xs">(Optional)</span>
          </label>
          <Input
            placeholder="Enter sub-category name"
            value={subCategoryName}
            onChange={(e) => setSubCategoryName(e.target.value)}
            className={cn(
              "bg-[#111827] border-indigo-500/30 text-white",
              "focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500",
              "transition-all duration-300 ease-in-out"
            )}
            autoFocus={selectedMainCategoryId !== null}
            disabled={loading}
          />
          {selectedMainCategoryId && (
            <div className="mt-2 p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-md">
              <p className="text-xs text-indigo-400">
                ✓ This will be a sub-category of: <span className="font-semibold">{mainCategories.find(c => c.id === selectedMainCategoryId)?.name}</span>
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          variant="ghost"
          onClick={() => {
            setCategoryName('');
            setMainCategoryInput('');
            setSubCategoryName('');
            setSelectedMainCategoryId(null);
            setParentCategoryId(null);
            onClose();
          }}
          className="text-gray-400 hover:text-white transition-colors"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          className={cn(
            "bg-indigo-600 hover:bg-indigo-500 text-white",
            "transition-all duration-300 ease-in-out",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          disabled={
            (selectedMainCategoryId && !subCategoryName.trim()) || 
            (!selectedMainCategoryId && !mainCategoryInput.trim()) || 
            loading
          }
        >
          {selectedMainCategoryId && subCategoryName.trim() ? 'Create Sub-Category' : 'Create Category'}
        </Button>
      </div>
    </div>
  );
}

