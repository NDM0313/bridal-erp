/**
 * Contact Detail Page
 * Shows detailed information about a contact
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, Wallet, Mail, Phone, MapPin, Building2, User, Calendar } from 'lucide-react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyState } from '@/components/placeholders/EmptyState';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AddContactModal } from '@/components/contacts/AddContactModal';
import type { Contact } from '@/components/rentals/QuickAddContactModal';

interface ContactWithDetails extends Contact {
  receivables?: number;
  payables?: number;
  balance?: number;
  category?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
  created_at?: string;
  updated_at?: string;
}

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.id ? parseInt(params.id as string) : null;

  const [contact, setContact] = useState<ContactWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (contactId) {
      loadContact();
    }
  }, [contactId]);

  const loadContact = async () => {
    if (!contactId) return;

    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) {
        throw new Error('Business not found');
      }

      // Load contact
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .eq('business_id', profile.business_id)
        .single();

      if (contactError) {
        if (contactError.code === 'PGRST116') {
          throw new Error('Contact not found');
        }
        throw contactError;
      }

      if (contactData) {
        // Calculate balances
        let receivables = 0;
        let payables = 0;

        try {
          // Get receivables (from sales transactions)
          const { data: salesData } = await supabase
            .from('transactions')
            .select('final_total, payment_status')
            .eq('contact_id', contactId)
            .eq('type', 'sell')
            .eq('status', 'final');

          if (salesData) {
            receivables = salesData.reduce((sum, t) => {
              if (t.payment_status === 'due' || t.payment_status === 'partial') {
                return sum + (parseFloat(t.final_total?.toString() || '0') || 0);
              }
              return sum;
            }, 0);
          }

          // Get payables (from purchase transactions)
          const { data: purchaseData } = await supabase
            .from('transactions')
            .select('final_total, payment_status')
            .eq('contact_id', contactId)
            .eq('type', 'purchase')
            .eq('status', 'final');

          if (purchaseData) {
            payables = purchaseData.reduce((sum, t) => {
              if (t.payment_status === 'due' || t.payment_status === 'partial') {
                return sum + (parseFloat(t.final_total?.toString() || '0') || 0);
              }
              return sum;
            }, 0);
          }
        } catch (err) {
          console.warn('Error calculating balances:', err);
        }

        // Extract category for workers
        let category: string | undefined = undefined;
        if (contactData.type === 'worker' && contactData.address_line_1) {
          category = contactData.address_line_1.trim();
        }

        setContact({
          id: contactData.id,
          name: contactData.name,
          mobile: contactData.mobile || undefined,
          email: contactData.email || undefined,
          type: contactData.type as 'customer' | 'supplier' | 'worker' | 'both',
          receivables,
          payables,
          balance: receivables - payables,
          category,
          address_line_1: contactData.type === 'worker' ? undefined : (contactData.address_line_1 || undefined),
          address_line_2: contactData.address_line_2 || undefined,
          city: contactData.city || undefined,
          state: contactData.state || undefined,
          country: contactData.country || undefined,
          created_at: contactData.created_at,
          updated_at: contactData.updated_at,
        });
      }
    } catch (err: any) {
      console.error('Failed to load contact:', err);
      const errorMessage = err.message || 'Failed to load contact details';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!contactId || !contact) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      toast.success('Contact deleted successfully');
      router.push('/dashboard/contacts');
    } catch (err: any) {
      console.error('Failed to delete contact:', err);
      toast.error(err.message || 'Failed to delete contact');
    }
  };

  const getTypeBadge = (type: Contact['type']) => {
    if (type === 'supplier') {
      return (
        <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
          Supplier
        </Badge>
      );
    } else if (type === 'customer') {
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
          Customer
        </Badge>
      );
    } else if (type === 'worker') {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
          Worker
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/20">
          Both
        </Badge>
      );
    }
  };

  if (!contactId) {
    return (
      <ModernDashboardLayout>
        <div className="p-6">
          <p className="text-red-400">Invalid contact ID</p>
        </div>
      </ModernDashboardLayout>
    );
  }

  if (loading) {
    return (
      <ModernDashboardLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </ModernDashboardLayout>
    );
  }

  if (error || !contact) {
    return (
      <ModernDashboardLayout>
        <div className="p-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12">
            <div className="text-center">
              <p className="text-red-400 mb-4">{error || 'Contact not found'}</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => router.back()}>
                  Go Back
                </Button>
                <Button variant="outline" onClick={loadContact}>
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ModernDashboardLayout>
    );
  }

  const initials = contact.name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  return (
    <ModernDashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-blue-600 text-white text-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-white">{contact.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  {getTypeBadge(contact.type)}
                  {contact.category && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
                      {contact.category}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/contacts/${contactId}/ledger`)}
              className="flex items-center gap-2"
            >
              <Wallet size={18} />
              View Ledger
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Edit size={18} />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-900/20"
            >
              <Trash2 size={18} />
              Delete
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400">
                  <Wallet size={20} />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Receivables</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {formatCurrency(contact.receivables || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                  <Wallet size={20} />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Payables</p>
                  <p className="text-2xl font-bold text-red-400">
                    {formatCurrency(contact.payables || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={cn(
                  "p-2 rounded-lg",
                  (contact.balance || 0) >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                )}>
                  <Wallet size={20} />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Balance</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    (contact.balance || 0) >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {formatCurrency(contact.balance || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Information */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Phone className="text-gray-400 mt-1" size={18} />
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Mobile</p>
                    <p className="text-white">{contact.mobile || '—'}</p>
                  </div>
                </div>

                {contact.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="text-gray-400 mt-1" size={18} />
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Email</p>
                      <p className="text-white">{contact.email}</p>
                    </div>
                  </div>
                )}

                {contact.category && (
                  <div className="flex items-start gap-3">
                    <User className="text-gray-400 mt-1" size={18} />
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Category</p>
                      <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
                        {contact.category}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {(contact.address_line_1 || contact.city || contact.state) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="text-gray-400 mt-1" size={18} />
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Address</p>
                      <p className="text-white">
                        {[
                          contact.address_line_1,
                          contact.address_line_2,
                          contact.city,
                          contact.state,
                          contact.country
                        ].filter(Boolean).join(', ') || '—'}
                      </p>
                    </div>
                  </div>
                )}

                {contact.created_at && (
                  <div className="flex items-start gap-3">
                    <Calendar className="text-gray-400 mt-1" size={18} />
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Created</p>
                      <p className="text-white">
                        {format(new Date(contact.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/contacts/${contactId}/ledger`)}
                className="flex items-center gap-2"
              >
                <Wallet size={18} />
                View Transaction History
              </Button>
              {contact.mobile && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const phoneNumber = contact.mobile!.replace(/\D/g, '');
                    window.open(`https://wa.me/${phoneNumber}`, '_blank');
                  }}
                  className="flex items-center gap-2"
                >
                  <Phone size={18} />
                  WhatsApp
                </Button>
              )}
              {contact.email && (
                <Button
                  variant="outline"
                  onClick={() => {
                    window.open(`mailto:${contact.email}`, '_self');
                  }}
                  className="flex items-center gap-2"
                >
                  <Mail size={18} />
                  Send Email
                </Button>
              )}
              {(contact.type === 'customer' || contact.type === 'both') && (
                <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard/sales?customer=${contactId}`)}
                  className="flex items-center gap-2"
                >
                  <Building2 size={18} />
                  View Sales
                </Button>
              )}
              {(contact.type === 'supplier' || contact.type === 'both') && (
                <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard/purchases?supplier=${contactId}`)}
                  className="flex items-center gap-2"
                >
                  <Building2 size={18} />
                  View Purchases
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Modal */}
        <AddContactModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            loadContact(); // Reload contact after edit
          }}
          onSave={(updatedContact) => {
            toast.success('Contact updated successfully');
            setIsEditModalOpen(false);
            loadContact();
          }}
          editContact={contact}
        />

        {/* Delete Confirmation */}
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-white mb-2">Delete Contact</h3>
              <p className="text-gray-400 mb-6">
                Are you sure you want to delete "{contact.name}"? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteConfirmOpen(false);
                    handleDelete();
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModernDashboardLayout>
  );
}
