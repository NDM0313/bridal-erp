'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

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
  onSave: () => Promise<void>;
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

  const handleSave = async () => {
    const trimmedName = categoryName.trim();
    if (!trimmedName) {
      toast.error('Category name is required');
      return;
    }

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

      const normalizedInputName = trimmedName.toLowerCase();
      const targetParentId = parentCategoryId ?? null;

      const { data: existingCategories, error: queryError } = await supabase
        .from('categories')
        .select('id, name, parent_id')
        .eq('business_id', profile.business_id)
        .ilike('name', trimmedName);

      if (queryError) throw queryError;

      const existingCategory = existingCategories?.find(
        cat => {
          const nameMatch = cat.name.toLowerCase() === normalizedInputName;
          const catParentId = cat.parent_id ?? null;
          const parentMatch = catParentId === targetParentId;
          return nameMatch && parentMatch;
        }
      );

      if (existingCategory) {
        toast.info('Category already exists. Please use a different name.');
        return;
      }

      const { error: insertError } = await supabase
        .from('categories')
        .insert({
          business_id: profile.business_id,
          name: trimmedName,
          created_by: session.user.id,
          parent_id: targetParentId,
        });

      if (insertError) {
        const errorMessage = insertError.message || insertError.details || insertError.hint || 'Failed to create category';
        throw new Error(errorMessage);
      }
      
      toast.success('Category created successfully');
      await onSave();
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

  return (
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
          disabled={loading}
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
          }}
          disabled={loading}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">None (Main Category)</option>
          {categories
            .filter(cat => !cat.parent_id || cat.parent_id === null)
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
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          variant="ghost"
          onClick={() => {
            setCategoryName('');
            setParentCategoryId(null);
            onClose();
          }}
          className="text-gray-400 hover:text-white"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-500 text-white"
          disabled={!categoryName.trim() || loading}
        >
          {parentCategoryId ? 'Create Sub-Category' : 'Create Category'}
        </Button>
      </div>
    </div>
  );
}

