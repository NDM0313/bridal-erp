/**
 * Contacts (CRM) Management Page
 * Central database for both Suppliers and Customers
 * Follows docs/modules/Contacts.md specifications
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, ArrowUpRight, ArrowDownRight, MoreVertical, Eye, Edit, Trash2, Wallet, Users, FileText, Mail, Share2, MessageCircle } from 'lucide-react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { Skeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyState } from '@/components/placeholders/EmptyState';
import { AddContactModal } from '@/components/contacts/AddContactModal';
import { ViewContactModal } from '@/components/contacts/ViewContactModal';
import { PaymentModal } from '@/components/contacts/PaymentModal';
import type { Contact } from '@/components/rentals/QuickAddContactModal';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatCurrency } from '@/lib/utils';

interface ContactWithBalance extends Contact {
  receivables?: number;
  payables?: number;
  balance?: number;
  status?: 'active' | 'inactive';
}

interface ContactStats {
  totalReceivables: number;
  totalPayables: number;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactWithBalance | null>(null);
  const [activeTab, setActiveTab] = useState<'customer' | 'supplier' | 'all'>('all');
  const [stats, setStats] = useState<ContactStats>({
    totalReceivables: 0,
    totalPayables: 0,
  });

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Get business_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) {
        throw new Error('Business not found');
      }

      // Fetch all contacts (suppliers and customers)
      // Note: RLS policy should handle business_id filtering, but we also filter explicitly
      const { data, error: fetchError } = await supabase
        .from('contacts')
        .select('id, name, mobile, email, type, customer_type, address_line_1, created_at, updated_at')
        .eq('business_id', profile.business_id)
        .order('name')
        .limit(200);

      if (fetchError) {
        console.error('Contacts fetch error:', fetchError);
        // If RLS error, provide helpful message
        if (fetchError.code === '42501' || fetchError.message?.includes('row-level security')) {
          throw new Error('Permission denied: Row-level security policy is blocking access. Please ensure RLS policies are properly configured.');
        }
        throw fetchError;
      }

      if (data) {
        // Calculate balances from transactions (with error handling)
        const contactsWithBalances: ContactWithBalance[] = await Promise.all(
          data.map(async (c) => {
            let receivables = 0;
            let payables = 0;

            try {
              // Get receivables (from sales transactions)
              const { data: salesData, error: salesError } = await supabase
                .from('transactions')
                .select('final_total, payment_status')
                .eq('contact_id', c.id)
                .eq('type', 'sell')
                .eq('status', 'final');

              if (salesError) {
                console.warn(`Error fetching sales for contact ${c.id}:`, salesError);
              } else if (salesData) {
                receivables = salesData.reduce((sum, t) => {
                  if (t.payment_status === 'due' || t.payment_status === 'partial') {
                    return sum + (parseFloat(t.final_total?.toString() || '0') || 0);
                  }
                  return sum;
                }, 0);
              }
            } catch (err) {
              console.warn(`Error calculating receivables for contact ${c.id}:`, err);
            }

            try {
              // Get payables (from purchase transactions)
              const { data: purchaseData, error: purchaseError } = await supabase
                .from('transactions')
                .select('final_total, payment_status')
                .eq('contact_id', c.id)
                .eq('type', 'purchase')
                .eq('status', 'final');

              if (purchaseError) {
                console.warn(`Error fetching purchases for contact ${c.id}:`, purchaseError);
              } else if (purchaseData) {
                payables = purchaseData.reduce((sum, t) => {
                  if (t.payment_status === 'due' || t.payment_status === 'partial') {
                    return sum + (parseFloat(t.final_total?.toString() || '0') || 0);
                  }
                  return sum;
                }, 0);
              }
            } catch (err) {
              console.warn(`Error calculating payables for contact ${c.id}:`, err);
            }

            return {
              id: c.id,
              name: c.name,
              mobile: c.mobile || undefined,
              email: c.email || undefined,
              type: c.type as 'customer' | 'supplier' | 'both',
              receivables,
              payables,
              balance: receivables - payables,
              status: 'active' as const,
            };
          })
        );

        setContacts(contactsWithBalances);

        // Calculate stats
        const totalReceivables = contactsWithBalances.reduce((sum, c) => sum + (c.receivables || 0), 0);
        const totalPayables = contactsWithBalances.reduce((sum, c) => sum + (c.payables || 0), 0);

        setStats({
          totalReceivables,
          totalPayables,
        });
      }
    } catch (err: any) {
      console.error('Load contacts error:', err);
      let errorMessage = 'Failed to load contacts';
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.code === '42501') {
        errorMessage = 'Permission denied: Row-level security policy is blocking access. Please run the SQL script in database/FIX_CONTACTS_RLS.sql to fix the RLS policy.';
      } else if (err?.code) {
        errorMessage = `Error code ${err.code}: ${err.message || 'Unknown error'}`;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (contact: ContactWithBalance) => {
    setSelectedContact(contact);
    setIsViewModalOpen(true);
  };

  const handleEdit = async (contact: ContactWithBalance) => {
    try {
      // Fetch full contact details from database
      const { data: fullContact, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contact.id)
        .single();

      if (error) {
        toast.error('Failed to load contact details');
        return;
      }

      if (fullContact) {
        const contactData: Contact = {
          id: fullContact.id,
          name: fullContact.name,
          mobile: fullContact.mobile || undefined,
          email: fullContact.email || undefined,
          type: fullContact.type as 'customer' | 'supplier' | 'both',
        };
        setSelectedContact({ ...contact, ...contactData });
        setIsEditModalOpen(true);
      }
    } catch (err) {
      toast.error('Failed to load contact details');
    }
  };

  const handleViewLedger = async (contact: ContactWithBalance) => {
    try {
      // Fetch transactions for this contact
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) {
        toast.error('Business not found');
        return;
      }

      // Fetch sales transactions
      const { data: salesTransactions } = await supabase
        .from('transactions')
        .select('id, invoice_no, transaction_date, final_total, payment_status, type')
        .eq('business_id', profile.business_id)
        .eq('contact_id', contact.id)
        .eq('type', 'sell')
        .order('transaction_date', { ascending: false })
        .limit(50);

      // Fetch purchase transactions
      const { data: purchaseTransactions } = await supabase
        .from('transactions')
        .select('id, invoice_no, transaction_date, final_total, payment_status, type')
        .eq('business_id', profile.business_id)
        .eq('contact_id', contact.id)
        .eq('type', 'purchase')
        .order('transaction_date', { ascending: false })
        .limit(50);

      const allTransactions = [
        ...(salesTransactions || []),
        ...(purchaseTransactions || [])
      ].sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

      if (allTransactions.length === 0) {
        toast.info(`No transactions found for ${contact.name}`);
        return;
      }

      // Open ledger in new window or navigate
      const ledgerUrl = `/dashboard/contacts/${contact.id}/ledger`;
      window.open(ledgerUrl, '_blank');
    } catch (err) {
      console.error('Error loading ledger:', err);
      toast.error('Failed to load ledger');
    }
  };

  const handleWhatsApp = (contact: ContactWithBalance) => {
    if (!contact.mobile) {
      toast.error('Mobile number not available');
      return;
    }
    // Remove any non-digit characters and format for WhatsApp
    const phoneNumber = contact.mobile.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${phoneNumber}`;
    window.open(whatsappUrl, '_blank');
  };

  const handlePayment = (contact: ContactWithBalance) => {
    setSelectedContact(contact);
    setIsPaymentModalOpen(true);
  };

  const handleShare = async (contact: ContactWithBalance) => {
    const shareData = {
      title: `Contact: ${contact.name}`,
      text: `Contact Details:\nName: ${contact.name}\nMobile: ${contact.mobile || 'N/A'}\nEmail: ${contact.email || 'N/A'}\nType: ${contact.type}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success('Contact shared successfully');
      } catch (err) {
        // User cancelled or error
        if ((err as Error).name !== 'AbortError') {
          // Fallback to clipboard
          const text = `${shareData.title}\n${shareData.text}`;
          await navigator.clipboard.writeText(text);
          toast.success('Contact details copied to clipboard');
        }
      }
    } else {
      // Fallback to clipboard
      const text = `${shareData.title}\n${shareData.text}`;
      await navigator.clipboard.writeText(text);
      toast.success('Contact details copied to clipboard');
    }
  };

  const handleExport = (contact: ContactWithBalance) => {
    // Export contact data as CSV or PDF
    const data = {
      Name: contact.name,
      Type: contact.type,
      Mobile: contact.mobile || '',
      Email: contact.email || '',
      Receivables: contact.receivables || 0,
      Payables: contact.payables || 0,
      Balance: contact.balance || 0,
    };
    
    const csv = Object.keys(data).map(key => `${key},${data[key as keyof typeof data]}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${contact.name.replace(/\s+/g, '_')}_contact.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Contact exported successfully');
  };

  const handleDelete = async (contact: ContactWithBalance) => {
    if (!confirm(`Are you sure you want to delete "${contact.name}"? This action cannot be undone.`)) return;

    try {
      const { error } = await supabase.from('contacts').delete().eq('id', contact.id);

      if (error) throw error;

      toast.success('Contact deleted successfully');
      loadContacts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete contact');
    }
  };

  // Get type badge
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
    } else {
      return (
        <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/20">
          Both
        </Badge>
      );
    }
  };

  // Filter contacts by tab and search
  const filteredContacts = contacts.filter((contact) => {
    // Tab filter
    if (activeTab === 'customer' && contact.type !== 'customer' && contact.type !== 'both') {
      return false;
    }
    if (activeTab === 'supplier' && contact.type !== 'supplier' && contact.type !== 'both') {
      return false;
    }
    
    // Search filter
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      contact.name.toLowerCase().includes(term) ||
      contact.mobile?.toLowerCase().includes(term) ||
      contact.email?.toLowerCase().includes(term) ||
      false
    );
  });

  return (
    <ModernDashboardLayout>
      <div className="space-y-6 p-6 standard-page-container">
        {/* Header */}
        <div className="flex items-center justify-between animate-entrance">
          <div>
            <h1 className="text-2xl font-bold text-white">Contact Management</h1>
            <p className="text-sm text-gray-400 mt-1">Central database for Suppliers and Customers</p>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 transition-standard"
          >
            <Plus size={18} />
            Add Contact
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Receivables Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden transition-standard hover-lift animate-entrance-delay-1">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ArrowUpRight size={80} className="text-yellow-300" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-yellow-500/10 text-yellow-300">
                  <ArrowUpRight size={24} />
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-1">Total Receivables</p>
              <p className="text-2xl font-bold text-yellow-300">{formatCurrency(stats.totalReceivables)}</p>
              <p className="text-xs text-gray-500 mt-2">Money coming in</p>
            </div>
          </div>

          {/* Payables Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden transition-standard hover-lift animate-entrance-delay-2">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ArrowDownRight size={80} className="text-white" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-red-500/10 text-white">
                  <ArrowDownRight size={24} />
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-1">Total Payables</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalPayables)}</p>
              <p className="text-xs text-gray-500 mt-2">Money going out</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-1 flex gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'flex-1 px-4 py-2.5 rounded-lg font-medium transition-standard',
              activeTab === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            )}
          >
            All Contacts
          </button>
          <button
            onClick={() => setActiveTab('customer')}
            className={cn(
              'flex-1 px-4 py-2.5 rounded-lg font-medium transition-standard',
              activeTab === 'customer'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            )}
          >
            Customers
          </button>
          <button
            onClick={() => setActiveTab('supplier')}
            className={cn(
              'flex-1 px-4 py-2.5 rounded-lg font-medium transition-standard',
              activeTab === 'supplier'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            )}
          >
            Suppliers
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <Input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Contacts Table */}
        {loading ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <Skeleton className="h-64" />
          </div>
        ) : error ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12">
            <div className="text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <Button variant="outline" onClick={loadContacts}>
                Retry
              </Button>
            </div>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12">
            <EmptyState
              icon={Users}
              title="No contacts found"
              description={
                searchTerm
                  ? 'No contacts match your search criteria'
                  : 'Get started by adding your first contact'
              }
              action={
                !searchTerm
                  ? {
                      label: 'Add Contact',
                      onClick: () => setIsAddModalOpen(true),
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden transition-standard animate-entrance-delay-3">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-950/50 border-gray-800">
                  <TableHead>Contact</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Receivables</TableHead>
                  <TableHead>Payables</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => {
                  const receivables = contact.receivables || 0;
                  const payables = contact.payables || 0;
                  const initials = contact.name
                    .split(' ')
                    .map((word) => word[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2);

                  return (
                    <TableRow key={contact.id} className="hover:bg-gray-800/30 transition-standard">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gray-800 text-gray-400 text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-white font-medium">{contact.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(contact.type)}</TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {contact.mobile || '—'}
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {contact.email || '—'}
                      </TableCell>
                      <TableCell className={cn('font-medium', receivables > 0 ? 'text-yellow-400' : 'text-gray-500')}>
                        {receivables > 0 ? formatCurrency(receivables) : '—'}
                      </TableCell>
                      <TableCell className={cn('font-medium', payables > 0 ? 'text-red-400' : 'text-gray-500')}>
                        {payables > 0 ? formatCurrency(payables) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
                            >
                              <MoreVertical size={18} />
                            </Button>
                          }
                        >
                          <DropdownMenuItem onClick={() => handleViewDetails(contact)}>
                            <Eye size={14} className="inline mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(contact)}>
                            <Edit size={14} className="inline mr-2" />
                            Edit Contact
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewLedger(contact)}>
                            <Wallet size={14} className="inline mr-2" />
                            View Ledger
                          </DropdownMenuItem>
                          {(() => {
                            const hasReceivables = contact.receivables && contact.receivables > 0;
                            const hasPayables = contact.payables && contact.payables > 0;
                            const shouldShowPayment = hasReceivables || hasPayables;
                            
                            if (!shouldShowPayment) return null;
                            
                            return (
                              <DropdownMenuItem onClick={() => handlePayment(contact)}>
                                <Wallet size={14} className="inline mr-2" />
                                {contact.type === 'customer' || contact.type === 'both' 
                                  ? `Receive Payment (${formatCurrency(contact.receivables || 0)})`
                                  : `Make Payment (${formatCurrency(contact.payables || 0)})`}
                              </DropdownMenuItem>
                            );
                          })()}
                          <div className="border-t border-gray-700 my-1" />
                          <DropdownMenuItem onClick={() => handleExport(contact)}>
                            <FileText size={14} className="inline mr-2" />
                            Export Contact
                          </DropdownMenuItem>
                          {contact.mobile && (
                            <DropdownMenuItem onClick={() => handleWhatsApp(contact)}>
                              <MessageCircle size={14} className="inline mr-2" />
                              WhatsApp {contact.mobile}
                            </DropdownMenuItem>
                          )}
                          {contact.email && (
                            <DropdownMenuItem onClick={() => {
                              window.open(`mailto:${contact.email}`, '_self');
                            }}>
                              <Mail size={14} className="inline mr-2" />
                              Email {contact.email}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleShare(contact)}>
                            <Share2 size={14} className="inline mr-2" />
                            Share Contact
                          </DropdownMenuItem>
                          <div className="border-t border-gray-700 my-1" />
                          <DropdownMenuItem
                            onClick={() => handleDelete(contact)}
                            className="text-red-400 hover:bg-red-900/20 hover:text-red-300"
                          >
                            <Trash2 size={14} className="inline mr-2" />
                            Delete Contact
                          </DropdownMenuItem>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Add Contact Modal */}
        <AddContactModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setSelectedContact(null);
          }}
          onSave={(contact) => {
            toast.success(`Contact "${contact.name}" ${selectedContact ? 'updated' : 'added'} successfully`);
            setIsAddModalOpen(false);
            setSelectedContact(null);
            loadContacts();
          }}
          editContact={null}
        />

        {/* Edit Contact Modal */}
        <AddContactModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedContact(null);
          }}
          onSave={(contact) => {
            toast.success(`Contact "${contact.name}" updated successfully`);
            setIsEditModalOpen(false);
            setSelectedContact(null);
            loadContacts();
          }}
          editContact={selectedContact}
        />

        {/* View Contact Modal */}
        <ViewContactModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedContact(null);
          }}
          contact={selectedContact}
        />

        {/* Payment Modal */}
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedContact(null);
          }}
          onSuccess={() => {
            loadContacts();
          }}
          contact={selectedContact && selectedContact.type ? {
            id: selectedContact.id,
            name: selectedContact.name,
            type: selectedContact.type as 'customer' | 'supplier' | 'both',
            receivables: selectedContact.receivables,
            payables: selectedContact.payables,
          } : null}
        />
      </div>
    </ModernDashboardLayout>
  );
}

