/**
 * Add Contact Modal Component
 * Matches Figma design with Customer/Supplier toggle and collapsible sections
 */

'use client';

import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, HelpCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Contact } from '@/components/rentals/QuickAddContactModal';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: Contact) => void;
}

export function AddContactModal({ isOpen, onClose, onSave }: AddContactModalProps) {
  const [contactType, setContactType] = useState<'customer' | 'supplier'>('customer');
  const [loading, setLoading] = useState(false);
  
  // Collapsible sections state
  const [basicInfoExpanded, setBasicInfoExpanded] = useState(true);
  const [financialExpanded, setFinancialExpanded] = useState(false);
  const [taxExpanded, setTaxExpanded] = useState(false);
  const [billingExpanded, setBillingExpanded] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    business_name: '',
    mobile: '',
    email: '',
    // Financial Details
    opening_balance: 0,
    credit_limit: 0,
    payment_terms: '',
    // Tax Information
    tax_id: '',
    tax_number: '',
    tax_type: '',
    // Billing Address
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
  });

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        business_name: '',
        mobile: '',
        email: '',
        opening_balance: 0,
        credit_limit: 0,
        payment_terms: '',
        tax_id: '',
        tax_number: '',
        tax_type: '',
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        zip_code: '',
        country: '',
      });
      setContactType('customer');
      setBasicInfoExpanded(true);
      setFinancialExpanded(false);
      setTaxExpanded(false);
      setBillingExpanded(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.business_name.trim() || !formData.mobile.trim()) {
      toast.error('Business Name and Mobile Number are required');
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) throw new Error('Business not found');

      const contactData: any = {
        business_id: profile.business_id,
        type: contactType,
        name: formData.business_name.trim(),
        mobile: formData.mobile.trim(),
        email: formData.email.trim() || null,
        address_line_1: formData.address_line_1.trim() || null,
        address_line_2: formData.address_line_2.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        zip_code: formData.zip_code.trim() || null,
        country: formData.country.trim() || null,
        created_by: session.user.id,
      };

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
        toast.success('Contact created successfully!');
        onClose();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create contact');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-white">Add New Contact</h2>
            <p className="text-sm text-gray-400 mt-1">Create a customer or supplier profile</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Contact Type Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setContactType('customer')}
              className={cn(
                'flex-1 px-4 py-3 rounded-lg font-medium transition-colors',
                contactType === 'customer'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              Customer
            </button>
            <button
              type="button"
              onClick={() => setContactType('supplier')}
              className={cn(
                'flex-1 px-4 py-3 rounded-lg font-medium transition-colors',
                contactType === 'supplier'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              Supplier
            </button>
          </div>

          {/* BASIC INFORMATION (Expanded by default) */}
          <div className="border border-gray-800 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setBasicInfoExpanded(!basicInfoExpanded)}
              className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800 transition-colors"
            >
              <h3 className="text-lg font-semibold text-white">BASIC INFORMATION</h3>
              {basicInfoExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
            </button>
            {basicInfoExpanded && (
              <div className="p-4 space-y-4 border-t border-gray-800">
                <div>
                  <Label className="text-white mb-2 block">
                    Business Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="text"
                    required
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    placeholder="e.g. Ahmed Retailers"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <Label className="text-white mb-2 block">
                    Mobile Number <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="tel"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="+92 300 1234567"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <Label className="text-white mb-2 block">Email Address</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@business.com"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Financial Details (Collapsed) */}
          <div className="border border-gray-800 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setFinancialExpanded(!financialExpanded)}
              className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800 transition-colors"
            >
              <h3 className="text-lg font-semibold text-white">Financial Details</h3>
              {financialExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
            </button>
            {financialExpanded && (
              <div className="p-4 space-y-4 border-t border-gray-800">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white mb-2 block">Opening Balance</Label>
                    <Input
                      type="number"
                      value={formData.opening_balance}
                      onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white mb-2 block">Credit Limit</Label>
                    <Input
                      type="number"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-white mb-2 block">Payment Terms</Label>
                  <Input
                    type="text"
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    placeholder="e.g. Net 30"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tax Information (Collapsed) */}
          <div className="border border-gray-800 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setTaxExpanded(!taxExpanded)}
              className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800 transition-colors"
            >
              <h3 className="text-lg font-semibold text-white">Tax Information</h3>
              {taxExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
            </button>
            {taxExpanded && (
              <div className="p-4 space-y-4 border-t border-gray-800">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white mb-2 block">Tax ID</Label>
                    <Input
                      type="text"
                      value={formData.tax_id}
                      onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white mb-2 block">Tax Number</Label>
                    <Input
                      type="text"
                      value={formData.tax_number}
                      onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-white mb-2 block">Tax Type</Label>
                  <select
                    value={formData.tax_type}
                    onChange={(e) => setFormData({ ...formData, tax_type: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="">Select Tax Type</option>
                    <option value="standard">Standard</option>
                    <option value="exempt">Exempt</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Billing Address (Collapsed) */}
          <div className="border border-gray-800 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setBillingExpanded(!billingExpanded)}
              className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800 transition-colors"
            >
              <h3 className="text-lg font-semibold text-white">Billing Address</h3>
              {billingExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
            </button>
            {billingExpanded && (
              <div className="p-4 space-y-4 border-t border-gray-800">
                <div>
                  <Label className="text-white mb-2 block">Address Line 1</Label>
                  <Input
                    type="text"
                    value={formData.address_line_1}
                    onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white mb-2 block">Address Line 2</Label>
                  <Input
                    type="text"
                    value={formData.address_line_2}
                    onChange={(e) => setFormData({ ...formData, address_line_2: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white mb-2 block">City</Label>
                    <Input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white mb-2 block">State</Label>
                    <Input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white mb-2 block">ZIP Code</Label>
                    <Input
                      type="text"
                      value={formData.zip_code}
                      onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white mb-2 block">Country</Label>
                    <Input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-800">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading} className="bg-blue-600 hover:bg-blue-500 text-white">
              Save Contact
            </Button>
          </div>
        </form>

        {/* Help Icon */}
        <button className="fixed bottom-6 right-6 p-3 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors">
          <HelpCircle size={20} />
        </button>
      </div>
    </div>
  );
}

