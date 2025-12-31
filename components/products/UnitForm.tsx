'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

interface UnitFormProps {
  unitName: string;
  setUnitName: (name: string) => void;
  unitShortName: string;
  setUnitShortName: (name: string) => void;
  allowDecimal: boolean;
  setAllowDecimal: (allow: boolean) => void;
  onSave: () => Promise<void>;
  onClose: () => void;
}

export function UnitForm({ 
  unitName, 
  setUnitName, 
  unitShortName, 
  setUnitShortName, 
  allowDecimal, 
  setAllowDecimal, 
  onSave,
  onClose
}: UnitFormProps) {
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const trimmedUnitName = unitName.trim();
    const trimmedUnitShortName = unitShortName.trim();
    if (!trimmedUnitName || !trimmedUnitShortName) {
      toast.error('Unit name and short name are required');
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

      const { data: existingUnits, error: queryError } = await supabase
        .from('units')
        .select('id, actual_name, short_name')
        .eq('business_id', profile.business_id);

      if (queryError) throw queryError;

      const existingUnit = existingUnits?.find(
        unit => (unit.actual_name.toLowerCase() === trimmedUnitName.toLowerCase() ||
                 unit.short_name.toLowerCase() === trimmedUnitShortName.toLowerCase())
      );

      if (existingUnit) {
        toast.info('A unit with this name or short name already exists. Please use different names.');
        return;
      }

      const { error: insertError } = await supabase
        .from('units')
        .insert({
          business_id: profile.business_id,
          actual_name: trimmedUnitName,
          short_name: trimmedUnitShortName,
          allow_decimal: allowDecimal,
          created_by: session.user.id,
        });

      if (insertError) {
        const errorMessage = insertError.message || insertError.details || insertError.hint || 'Failed to create unit';
        throw new Error(errorMessage);
      }
      
      toast.success('Unit created successfully');
      await onSave();
    } catch (err: any) {
      console.error('Failed to save unit:', {
        error: err,
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        errorString: String(err),
        errorJSON: JSON.stringify(err)
      });
      const errorMessage = err?.message || err?.details || err?.hint || 'Failed to save unit';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Unit Name <span className="text-red-400">*</span>
        </label>
        <Input
          placeholder="Unit name (e.g., Pieces)"
          value={unitName}
          onChange={(e) => setUnitName(e.target.value)}
          className="bg-gray-800 border-gray-700 text-white focus:ring-2 focus:ring-green-500"
          autoFocus
          disabled={loading}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Short Name <span className="text-red-400">*</span>
        </label>
        <Input
          placeholder="Short name (e.g., Pcs)"
          value={unitShortName}
          onChange={(e) => setUnitShortName(e.target.value)}
          className="bg-gray-800 border-gray-700 text-white focus:ring-2 focus:ring-green-500"
          disabled={loading}
        />
      </div>
      <label className="flex items-center gap-2 text-white">
        <input
          type="checkbox"
          checked={allowDecimal}
          onChange={(e) => setAllowDecimal(e.target.checked)}
          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-green-600 focus:ring-green-500 focus:ring-2"
          disabled={loading}
        />
        <span>Allow decimal values</span>
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button
          variant="ghost"
          onClick={() => {
            setUnitName('');
            setUnitShortName('');
            setAllowDecimal(false);
            onClose();
          }}
          className="text-gray-400 hover:text-white"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          className="bg-green-600 hover:bg-green-500 text-white"
          disabled={(!unitName.trim() || !unitShortName.trim()) || loading}
        >
          Create Unit
        </Button>
      </div>
    </div>
  );
}

