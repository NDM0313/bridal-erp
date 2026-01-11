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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Contact } from '@/components/rentals/QuickAddContactModal';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: Contact) => void;
  editContact?: Contact | null;
}

interface DuplicateContact {
  id: number;
  name: string;
  mobile: string;
  type: string;
  email?: string;
}

export function AddContactModal({ isOpen, onClose, onSave, editContact }: AddContactModalProps) {
  const isEditMode = !!editContact;
  const [contactType, setContactType] = useState<'customer' | 'supplier' | 'worker'>('customer');
  const [loading, setLoading] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [duplicateContact, setDuplicateContact] = useState<DuplicateContact | null>(null);
  
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
    worker_category: '', // Dyer, Tailor, Embroiderer, Handwork, etc.
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
      if (editContact) {
        // Load full contact data for editing
        const loadContactData = async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data: fullContact, error } = await supabase
              .from('contacts')
              .select('*')
              .eq('id', editContact.id)
              .single();

            if (error) {
              console.error('Error loading contact:', error);
              return;
            }

            if (fullContact) {
              // Extract worker category from address_line_1 if it's a worker
              let workerCategory = '';
              if (fullContact.type === 'worker' && fullContact.address_line_1) {
                // Check if address_line_1 contains category (format: "Category: Dyer" or just "Dyer")
                const categoryMatch = fullContact.address_line_1.match(/^(?:Category:\s*)?(.+)$/i);
                if (categoryMatch) {
                  workerCategory = categoryMatch[1].trim();
                }
              }
              
              setFormData({
                business_name: fullContact.name || '',
                mobile: fullContact.mobile || '',
                email: fullContact.email || '',
                worker_category: workerCategory,
                opening_balance: 0,
                credit_limit: 0, // Note: credit_limit column doesn't exist in contacts table
                payment_terms: fullContact.pay_term_number && fullContact.pay_term_type
                  ? `Net ${fullContact.pay_term_number} ${fullContact.pay_term_type}`
                  : '',
                tax_id: '',
                tax_number: fullContact.tax_number || '',
                tax_type: '',
                address_line_1: fullContact.type === 'worker' ? '' : (fullContact.address_line_1 || ''),
                address_line_2: fullContact.address_line_2 || '',
                city: fullContact.city || '',
                state: fullContact.state || '',
                zip_code: fullContact.zip_code || '',
                country: fullContact.country || '',
              });
              setContactType(
                fullContact.type === 'supplier' ? 'supplier' : 
                fullContact.type === 'worker' ? 'worker' : 
                'customer'
              );
            }
          } catch (err) {
            console.error('Error loading contact data:', err);
          }
        };

        loadContactData();
      } else {
        // Reset form when modal opens for new contact
        setFormData({
          business_name: '',
          mobile: '',
          email: '',
          worker_category: '',
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
      }
      
      // Reset duplicate state when modal opens/closes
      setDuplicateContact(null);
      
      setBasicInfoExpanded(true);
      setFinancialExpanded(false);
      setTaxExpanded(false);
      setBillingExpanded(false);
    }
  }, [isOpen, editContact]);

  // Audit log function for duplicate attempts
  const logDuplicateAttempt = async (attemptedMobile: string, existingContactId: number, userId: string) => {
    try {
      // Log to console (can be extended to log to database/analytics)
      console.warn('Duplicate contact attempt logged:', {
        attempted_mobile: attemptedMobile,
        existing_contact_id: existingContactId,
        user_id: userId,
        timestamp: new Date().toISOString(),
        action: 'duplicate_detected',
      });

      // Optional: Log to Supabase audit table if exists
      // await supabase.from('audit_logs').insert({
      //   action: 'duplicate_contact_attempt',
      //   user_id: userId,
      //   metadata: { attempted_mobile, existing_contact_id: existingContactId },
      //   created_at: new Date().toISOString(),
      // });
    } catch (err) {
      console.error('Error logging duplicate attempt:', err);
    }
  };

  // Check for duplicate contact by mobile number (client-side pre-check)
  const checkDuplicate = async (mobile: string) => {
    if (!mobile.trim() || isEditMode) {
      setDuplicateContact(null);
      return;
    }

    try {
      setCheckingDuplicate(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) return;

      // Normalize mobile number (remove spaces, dashes, etc.)
      const normalizedMobile = mobile.replace(/\D/g, '');

      // Minimum length check (at least 10 digits)
      if (normalizedMobile.length < 10) {
        setDuplicateContact(null);
        return;
      }

      // Check for existing contact with same mobile
      const { data: existingContact, error } = await supabase
        .from('contacts')
        .select('id, name, mobile, type, email')
        .eq('business_id', profile.business_id)
        .eq('mobile', normalizedMobile)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned (expected when no duplicate)
        console.error('Error checking duplicate:', error);
        return;
      }

      if (existingContact) {
        // Log duplicate attempt for audit
        await logDuplicateAttempt(normalizedMobile, existingContact.id, session.user.id);

        setDuplicateContact({
          id: existingContact.id,
          name: existingContact.name,
          mobile: existingContact.mobile,
          type: existingContact.type,
          email: existingContact.email,
        });

        // Show toast notification
        toast.warning(`Contact with mobile ${normalizedMobile} already exists`, {
          description: `Existing contact: ${existingContact.name}`,
          duration: 5000,
        });
      } else {
        setDuplicateContact(null);
      }
    } catch (err) {
      console.error('Error in duplicate check:', err);
    } finally {
      setCheckingDuplicate(false);
    }
  };

  // Debounced duplicate check on mobile input change
  useEffect(() => {
    if (!formData.mobile.trim() || isEditMode) {
      setDuplicateContact(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      checkDuplicate(formData.mobile);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [formData.mobile, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.business_name.trim()) {
      toast.error('Name is required');
      return;
    }
    
    if (!formData.mobile.trim()) {
      toast.error('Mobile Number is required');
      return;
    }

    // Worker category validation
    if (contactType === 'worker' && !formData.worker_category.trim()) {
      toast.error('Worker category is required');
      return;
    }

    // Prevent submission if duplicate detected
    if (duplicateContact && !isEditMode) {
      toast.error('Please resolve the duplicate contact issue before saving');
      return;
    }

    setLoading(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Authentication error: ' + sessionError.message);
      }
      if (!session) {
        throw new Error('Not authenticated - please log in');
      }

      console.log('User ID:', session.user.id);
      console.log('User email:', session.user.email);

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw new Error('Failed to fetch business profile: ' + profileError.message);
      }
      if (!profile || !profile.business_id) {
        throw new Error('Business not found - please contact support');
      }

      console.log('Business ID:', profile.business_id);

      // Ensure mobile is not empty (required field)
      const mobileValue = formData.mobile.trim();
      if (!mobileValue) {
        throw new Error('Mobile number is required');
      }

      const contactData: any = {
        business_id: profile.business_id,
        type: contactType,
        name: formData.business_name.trim(),
        mobile: mobileValue,
        email: formData.email.trim() || null,
        // For workers, save category in address_line_1; for others, save address
        address_line_1: contactType === 'worker' && formData.worker_category
          ? formData.worker_category.trim()
          : (formData.address_line_1.trim() || null),
        address_line_2: formData.address_line_2.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        zip_code: formData.zip_code.trim() || null,
        country: formData.country.trim() || null,
        created_by: session.user.id,
      };

      // Add optional fields if provided
      // Note: credit_limit column doesn't exist in contacts table, so we skip it
      // if (formData.credit_limit > 0) {
      //   contactData.credit_limit = formData.credit_limit.toString();
      // }
      if (formData.tax_number) {
        contactData.tax_number = formData.tax_number.trim();
      }
      if (formData.payment_terms) {
        // Parse payment terms (e.g., "Net 30" -> pay_term_number: 30, pay_term_type: 'days')
        const termsMatch = formData.payment_terms.match(/(\d+)\s*(day|days|month|months)/i);
        if (termsMatch) {
          contactData.pay_term_number = parseInt(termsMatch[1]);
          contactData.pay_term_type = termsMatch[2].toLowerCase().includes('month') ? 'months' : 'days';
        }
      }

      console.log('Inserting contact:', contactData);
      console.log('Business ID:', profile.business_id);
      console.log('User ID:', session.user.id);
      console.log('Contact Type:', contactType);

      // Verify business_id is valid
      if (!profile.business_id || isNaN(profile.business_id)) {
        throw new Error('Invalid business ID. Please contact support.');
      }

      // Ensure business_id is an integer
      contactData.business_id = parseInt(profile.business_id.toString(), 10);

      // Server-side duplicate check (before insert)
      if (!isEditMode) {
        const normalizedMobile = mobileValue.replace(/\D/g, '');
        const { data: existingContact, error: duplicateError } = await supabase
          .from('contacts')
          .select('id, name, mobile, type, email')
          .eq('business_id', profile.business_id)
          .eq('mobile', normalizedMobile)
          .limit(1)
          .single();

        if (duplicateError && duplicateError.code !== 'PGRST116') {
          console.error('Error checking duplicate:', duplicateError);
        }

        if (existingContact) {
          // Log duplicate attempt for audit
          console.warn('Duplicate contact attempt:', {
            attempted_mobile: normalizedMobile,
            existing_contact_id: existingContact.id,
            existing_contact_name: existingContact.name,
            user_id: session.user.id,
            timestamp: new Date().toISOString(),
          });

          // Show duplicate contact info
          setDuplicateContact({
            id: existingContact.id,
            name: existingContact.name,
            mobile: existingContact.mobile,
            type: existingContact.type,
            email: existingContact.email,
          });

          toast.error(`Contact with mobile ${normalizedMobile} already exists`);
          setLoading(false);
          return;
        }
      }

      let newContact;
      let error;

      if (isEditMode && editContact) {
        // Update existing contact
        const { data, error: updateError } = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', editContact.id)
          .select()
          .single();
        newContact = data;
        error = updateError;
      } else {
        // Insert new contact
        const { data, error: insertError } = await supabase
          .from('contacts')
          .insert(contactData)
          .select()
          .single();
        newContact = data;
        error = insertError;
      }

      if (error) {
        console.error('Contact insertion error object:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        console.error('Full error JSON:', JSON.stringify(error, null, 2));
        
        // Extract error message from various possible locations
        let errorMsg = 'Failed to create contact';
        if (error.message) {
          errorMsg = error.message;
        } else if (error.details) {
          errorMsg = error.details;
        } else if (error.hint) {
          errorMsg = error.hint;
        } else if (error.code) {
          errorMsg = `Error code: ${error.code}`;
        }
        
        // If duplicate error (unique constraint violation)
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
          // Extract mobile from error or check again
          const normalizedMobile = mobileValue.replace(/\D/g, '');
          const { data: existingContact } = await supabase
            .from('contacts')
            .select('id, name, mobile, type, email')
            .eq('business_id', profile.business_id)
            .eq('mobile', normalizedMobile)
            .limit(1)
            .single();

          if (existingContact) {
            setDuplicateContact({
              id: existingContact.id,
              name: existingContact.name,
              mobile: existingContact.mobile,
              type: existingContact.type,
              email: existingContact.email,
            });
          }

          errorMsg = `Contact with mobile number ${normalizedMobile} already exists.`;
          toast.error(errorMsg);
          setLoading(false);
          return;
        }
        
        // If RLS error, provide helpful message
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          errorMsg = 'Permission denied: Row-level security policy is blocking this operation. Please run the SQL script in database/FIX_CONTACTS_RLS.sql to fix the RLS policy, or contact your administrator.';
        }
        
        throw new Error(errorMsg);
      }

      if (newContact) {
        const contact: Contact = {
          id: newContact.id,
          name: newContact.name,
          mobile: newContact.mobile || undefined,
          email: newContact.email || undefined,
          type: newContact.type as 'customer' | 'supplier' | 'worker' | 'both',
        };

        onSave(contact);
        toast.success(isEditMode ? 'Contact updated successfully!' : 'Contact created successfully!');
        onClose();
      }
    } catch (err: any) {
      console.error('Contact creation error:', err);
      console.error('Error type:', typeof err);
      console.error('Error keys:', err ? Object.keys(err) : 'no error object');
      console.error('Full error:', JSON.stringify(err, null, 2));
      
      let errorMessage = 'Failed to create contact';
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.error?.message) {
        errorMessage = err.error.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.details) {
        errorMessage = err.details;
      }
      
      toast.error(errorMessage);
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
            <h2 className="text-2xl font-bold text-white">{isEditMode ? 'Edit Contact' : 'Add New Contact'}</h2>
            <p className="text-sm text-gray-400 mt-1">{isEditMode ? 'Update contact information' : 'Create a customer, supplier, or worker profile'}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Duplicate Detection Banner */}
        {duplicateContact && !isEditMode && (
          <div className="mx-6 mt-4 mb-0 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <HelpCircle className="text-yellow-400" size={20} />
              </div>
              <div className="flex-1">
                <h4 className="text-yellow-400 font-semibold mb-1">Duplicate Contact Detected</h4>
                <p className="text-yellow-300/80 text-sm mb-3">
                  A contact with mobile number <strong>{duplicateContact.mobile}</strong> already exists:
                </p>
                <div className="bg-gray-800/50 rounded p-3 mb-3">
                  <p className="text-white font-medium">{duplicateContact.name}</p>
                  <p className="text-gray-400 text-sm">
                    Type: <span className="capitalize">{duplicateContact.type}</span>
                    {duplicateContact.email && ` • ${duplicateContact.email}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      // Navigate to contact detail page
                      window.location.href = `/dashboard/contacts/${duplicateContact.id}`;
                    }}
                    className="bg-yellow-500/20 border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/30"
                  >
                    View Existing
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      // Close current modal
                      onClose();
                      
                      // Fetch full contact data and trigger edit
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) return;

                        const { data: fullContact } = await supabase
                          .from('contacts')
                          .select('*')
                          .eq('id', duplicateContact.id)
                          .single();

                        if (fullContact) {
                          const existingContact: Contact = {
                            id: fullContact.id,
                            name: fullContact.name,
                            mobile: fullContact.mobile,
                            email: fullContact.email,
                            type: fullContact.type as 'customer' | 'supplier' | 'worker' | 'both',
                          };
                          
                          // Notify parent to open edit modal
                          onSave(existingContact);
                          
                          // Dispatch custom event for parent to handle edit
                          window.dispatchEvent(new CustomEvent('edit-contact', {
                            detail: { contactId: duplicateContact.id }
                          }));
                        }
                      } catch (err) {
                        console.error('Error loading contact for edit:', err);
                        toast.error('Failed to load contact for editing');
                      }
                    }}
                    className="bg-blue-500/20 border-blue-500/50 text-blue-300 hover:bg-blue-500/30"
                  >
                    Edit Existing
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDuplicateContact(null);
                      setFormData({ ...formData, mobile: '' });
                    }}
                    className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              Supplier
            </button>
            <button
              type="button"
              onClick={() => setContactType('worker')}
              className={cn(
                'flex-1 px-4 py-3 rounded-lg font-medium transition-colors',
                contactType === 'worker'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              Worker
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
                    {checkingDuplicate && (
                      <span className="text-xs text-gray-400 ml-2">(Checking...)</span>
                    )}
                  </Label>
                  <Input
                    type="tel"
                    required
                    value={formData.mobile}
                    onChange={(e) => {
                      setFormData({ ...formData, mobile: e.target.value });
                      setDuplicateContact(null); // Clear duplicate when typing
                    }}
                    placeholder="+92 300 1234567"
                    className={cn(
                      "bg-gray-800 border-gray-700 text-white",
                      duplicateContact && "border-yellow-500/50 focus:border-yellow-500"
                    )}
                  />
                  {duplicateContact && (
                    <p className="text-xs text-yellow-400 mt-1">
                      ⚠️ This mobile number is already in use
                    </p>
                  )}
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

                {/* Worker Category - Only show for workers */}
                {contactType === 'worker' && (
                  <div>
                    <Label className="text-white mb-2 block">
                      Category <span className="text-red-400">*</span>
                    </Label>
                    <Select
                      value={formData.worker_category}
                      onValueChange={(value) => setFormData({ ...formData, worker_category: value })}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Select worker category" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="Dyer">Dyer (Rangrezi)</SelectItem>
                        <SelectItem value="Tailor">Tailor (Darzi)</SelectItem>
                        <SelectItem value="Embroiderer">Embroiderer (Kari)</SelectItem>
                        <SelectItem value="Handwork">Handwork (Dastkari)</SelectItem>
                        <SelectItem value="Designer">Designer</SelectItem>
                        <SelectItem value="Master">Master</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
              {isEditMode ? 'Update Contact' : 'Save Contact'}
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

