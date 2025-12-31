/**
 * Contacts (CRM) Management Page
 * Central database for both Suppliers and Customers
 * Follows docs/modules/Contacts.md specifications
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, ArrowUpRight, ArrowDownRight, MoreVertical, Eye, Edit, Trash2, Wallet, Users } from 'lucide-react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { Skeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyState } from '@/components/placeholders/EmptyState';
import { QuickAddContactModal, Contact } from '@/components/rentals/QuickAddContactModal';
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
      const { data, error: fetchError } = await supabase
        .from('contacts')
        .select('id, name, mobile, email, type, address_line_1, created_at, updated_at')
        .eq('business_id', profile.business_id)
        .order('name')
        .limit(200);

      if (fetchError) throw fetchError;

      if (data) {
        // Calculate balances from transactions
        const contactsWithBalances: ContactWithBalance[] = await Promise.all(
          data.map(async (c) => {
            // Get receivables (from sales transactions)
            const { data: salesData } = await supabase
              .from('transactions')
              .select('final_total, payment_status')
              .eq('contact_id', c.id)
              .eq('type', 'sell')
              .eq('status', 'final');

            // Get payables (from purchase transactions)
            const { data: purchaseData } = await supabase
              .from('transactions')
              .select('final_total, payment_status')
              .eq('contact_id', c.id)
              .eq('type', 'purchase')
              .eq('status', 'final');

            // Calculate receivables (money customer owes us)
            const receivables = salesData?.reduce((sum, t) => {
              if (t.payment_status === 'due' || t.payment_status === 'partial') {
                // TODO: Get actual paid_amount from payments table
                return sum + (t.final_total || 0);
              }
              return sum;
            }, 0) || 0;

            // Calculate payables (money we owe supplier)
            const payables = purchaseData?.reduce((sum, t) => {
              if (t.payment_status === 'due' || t.payment_status === 'partial') {
                // TODO: Get actual paid_amount from payments table
                return sum + (t.final_total || 0);
              }
              return sum;
            }, 0) || 0;

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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load contacts';
      setError(errorMessage);
      toast.error(`Failed to load contacts: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (contact: ContactWithBalance) => {
    if (!confirm(`Are you sure you want to delete "${contact.name}"?`)) return;

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

  // Filter contacts
  const filteredContacts = contacts.filter((contact) => {
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
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Contact Management</h1>
            <p className="text-sm text-gray-400 mt-1">Central database for Suppliers and Customers</p>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            Add Contact
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Receivables Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden">
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
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden">
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
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
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
                    <TableRow key={contact.id} className="hover:bg-gray-800/30 transition-colors">
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
                          <DropdownMenuItem>
                            <Wallet size={14} className="inline mr-2" />
                            View Ledger
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit size={14} className="inline mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(contact)}
                            className="text-red-400 hover:bg-red-900/20"
                          >
                            <Trash2 size={14} className="inline mr-2" />
                            Delete
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

        {/* Quick Add Modal */}
        <QuickAddContactModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSave={(contact) => {
            toast.success(`Contact "${contact.name}" added successfully`);
            setIsAddModalOpen(false);
            loadContacts();
          }}
        />
      </div>
    </ModernDashboardLayout>
  );
}

