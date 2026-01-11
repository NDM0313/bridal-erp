'use client';

import React, { useState, useEffect } from 'react';
import { User, Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
// Contact interface (shared with CustomerSearch)
export interface Contact {
  id: number;
  name: string;
  mobile?: string;
  email?: string;
  type?: 'customer' | 'supplier' | 'worker' | 'both';
  created_at?: string;
  updated_at?: string;
}
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';

interface QuickAddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: Contact) => void;
  initialName?: string;
  contactType?: 'customer' | 'supplier';
  defaultType?: 'customer' | 'vendor';
  isWorker?: boolean; // Flag to differentiate workers from vendors
}

export const QuickAddContactModal = ({
  isOpen,
  onClose,
  onSave,
  initialName = '',
  contactType,
  defaultType = 'customer',
  isWorker = false,
}: QuickAddContactModalProps) => {
  const [name, setName] = useState(initialName);
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(''); // For vendor/worker role/tag (Dyer, Tailor, Master)
  const [isLoading, setIsLoading] = useState(false);

  // Determine the actual contact type to use
  const actualContactType = contactType || (defaultType === 'vendor' || isWorker ? 'supplier' : 'customer');
  const isVendor = defaultType === 'vendor' || actualContactType === 'supplier' || isWorker;
  const entityType = isWorker ? 'Worker' : (defaultType === 'vendor' ? 'Vendor' : 'Customer');

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setMobile('');
      setEmail('');
      setRole('');
      setIsLoading(false);
    }
  }, [isOpen, initialName]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsLoading(true);

    try {
      // Get current user's business ID
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Get business_id from user_profiles or organization_users
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) {
        throw new Error('Business not found');
      }

      // Prepare contact data
      const contactData: any = {
        business_id: profile.business_id,
        type: actualContactType,
        name: name.trim(),
        mobile: mobile.trim() || null,
        email: email.trim() || null,
        created_by: session.user.id,
      };

      // Store role/specialization in address_line_1
      // Use "Worker:" prefix for workers, "Role:" prefix for vendors
      if (isVendor && role.trim()) {
        contactData.address_line_1 = isWorker ? `Worker: ${role.trim()}` : `Role: ${role.trim()}`;
      }

      // Create contact in Supabase
      const { data: newContact, error } = await supabase
        .from('contacts')
        .insert(contactData)
        .select()
        .single();

      if (error) throw error;

      if (newContact) {
        const contact: Contact = {
          id: newContact.id,
          name: newContact.name,
          mobile: newContact.mobile || undefined,
          email: newContact.email || undefined,
          type: newContact.type as 'customer' | 'supplier' | 'both',
        };

        onSave(contact);
        toast.success(`${entityType} created successfully!`);
        onClose();
      }
    } catch (error) {
      console.error('Failed to create contact:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create customer');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 bg-gray-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus size={18} className="text-blue-400" />
            <h3 className="text-lg font-bold text-white">
              Quick Add {entityType}
            </h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-400 text-sm">Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Customer name"
              className="bg-gray-800 border-gray-700 text-white"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-400 text-sm">Mobile</Label>
            <Input
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="Phone number"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-400 text-sm">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          {/* Role/Specialization field for vendors/workers */}
          {isVendor && (
            <div className="space-y-2">
              <Label className="text-gray-400 text-sm">{isWorker ? 'Specialization' : 'Role / Tag'}</Label>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder={isWorker ? 'e.g., Dyeing, Stitching, Handwork' : 'e.g., Dyer, Tailor, Master'}
                className="bg-gray-800 border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500">
                Optional: Specify {isWorker ? 'worker specialization' : 'vendor role'} (Dyer, Tailor, Handwork, etc.)
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-800 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isLoading || !name.trim()} className="flex-1">
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Plus size={16} className="mr-2" />
                Create {entityType}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

