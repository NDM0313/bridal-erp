'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

interface BrandFormProps {
  brandName: string;
  setBrandName: (name: string) => void;
  onSave: () => Promise<void>;
  onClose: () => void;
}

export function BrandForm({ brandName, setBrandName, onSave, onClose }: BrandFormProps) {
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const trimmedBrandName = brandName.trim();
    if (!trimmedBrandName) {
      toast.error('Brand name is required');
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

      const { data: existingBrands, error: queryError } = await supabase
        .from('brands')
        .select('id, name')
        .eq('business_id', profile.business_id)
        .ilike('name', trimmedBrandName);

      if (queryError) throw queryError;

      const existingBrand = existingBrands?.find(
        brand => brand.name.toLowerCase() === trimmedBrandName.toLowerCase()
      );

      if (existingBrand) {
        toast.info('Brand already exists. Please use a different name.');
        return;
      }

      const { error: insertError } = await supabase
        .from('brands')
        .insert({
          business_id: profile.business_id,
          name: trimmedBrandName,
          created_by: session.user.id,
        });

      if (insertError) {
        const errorMessage = insertError.message || insertError.details || insertError.hint || 'Failed to create brand';
        throw new Error(errorMessage);
      }
      
      toast.success('Brand created successfully');
      await onSave();
    } catch (err: any) {
      console.error('Failed to save brand:', {
        error: err,
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        errorString: String(err),
        errorJSON: JSON.stringify(err)
      });
      const errorMessage = err?.message || err?.details || err?.hint || 'Failed to save brand';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Brand Name <span className="text-red-400">*</span>
        </label>
        <Input
          placeholder="Enter brand name"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          className="bg-gray-800 border-gray-700 text-white focus:ring-2 focus:ring-purple-500"
          autoFocus
          disabled={loading}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button
          variant="ghost"
          onClick={() => {
            setBrandName('');
            onClose();
          }}
          className="text-gray-400 hover:text-white"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          className="bg-purple-600 hover:bg-purple-500 text-white"
          disabled={!brandName.trim() || loading}
        >
          Create Brand
        </Button>
      </div>
    </div>
  );
}

