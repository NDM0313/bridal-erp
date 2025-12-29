'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MoreVertical, Phone, Mail, User, Edit, Trash2, Loader2 } from 'lucide-react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { Skeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyState } from '@/components/placeholders/EmptyState';
import { QuickAddContactModal, Contact } from '@/components/rentals/QuickAddContactModal';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users } from 'lucide-react';

interface Vendor extends Contact {
  address_line_1?: string; // Used to store role/tag
}

export default function VendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch vendors from Supabase
  const fetchVendors = async () => {
    setLoading(true);
    setError(null);

    try {
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

      // Fetch vendors (suppliers)
      const { data, error: fetchError } = await supabase
        .from('contacts')
        .select('id, name, mobile, email, type, address_line_1, created_at, updated_at')
        .eq('business_id', profile.business_id)
        .or('type.eq.supplier,type.eq.both')
        .order('name')
        .limit(100);

      if (fetchError) throw fetchError;

      if (data) {
        setVendors(
          data.map((v) => ({
            id: v.id,
            name: v.name,
            mobile: v.mobile || undefined,
            email: v.email || undefined,
            type: v.type as 'customer' | 'supplier' | 'both',
            address_line_1: v.address_line_1 || undefined,
            created_at: v.created_at,
            updated_at: v.updated_at,
          }))
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load vendors';
      setError(errorMessage);
      toast.error(`Failed to load vendors: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Extract role from address_line_1 (format: "Role: Dyer")
  const getVendorRole = (vendor: Vendor): string => {
    if (vendor.address_line_1 && vendor.address_line_1.startsWith('Role: ')) {
      return vendor.address_line_1.replace('Role: ', '');
    }
    return 'Vendor';
  };

  // Handle add vendor
  const handleAddVendor = (newVendor: Contact) => {
    setVendors((prev) => [...prev, newVendor as Vendor]);
    fetchVendors(); // Refresh to get full data
  };

  // Handle delete vendor (placeholder)
  const handleDelete = (vendorId: number) => {
    // console.log('Delete vendor:', vendorId);
    toast.info('Delete functionality will be implemented next');
    // TODO: Implement delete with confirmation
  };

  // Handle edit vendor (placeholder)
  const handleEdit = (vendor: Vendor) => {
    // console.log('Edit vendor:', vendor);
    toast.info('Edit functionality will be implemented next');
    // TODO: Open edit modal
  };

  return (
    <ModernDashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Vendor Management</h1>
            <p className="text-sm text-gray-400 mt-1">Manage your Dyers, Tailors, and production vendors</p>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            Add Vendor
          </Button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl p-6">
            <Skeleton className="h-64" />
          </div>
        ) : error ? (
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl p-12">
            <div className="text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <Button variant="outline" onClick={fetchVendors}>
                Retry
              </Button>
            </div>
          </div>
        ) : vendors.length === 0 ? (
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl p-12">
            <EmptyState
              icon={Users}
              title="No vendors found"
              description="Get started by adding your first vendor (Dyer, Tailor, Master, etc.)"
              action={{
                label: 'Add Vendor',
                onClick: () => setIsAddModalOpen(true),
              }}
            />
          </div>
        ) : (
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-900/50">
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((vendor) => (
                  <TableRow
                    key={vendor.id}
                    className="cursor-pointer hover:bg-gray-800/50 transition-colors"
                    onClick={() => router.push(`/dashboard/vendors/${vendor.id}`)}
                  >
                    {/* Name with Avatar */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gray-800 text-gray-400 text-xs">
                            {vendor.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-white font-medium text-sm">{vendor.name}</p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Role */}
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-900/20 text-blue-400 border-blue-900/50">
                        {getVendorRole(vendor)}
                      </Badge>
                    </TableCell>

                    {/* Phone */}
                    <TableCell>
                      {vendor.mobile ? (
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-gray-500" />
                          <span className="text-gray-300 text-sm">{vendor.mobile}</span>
                        </div>
                      ) : (
                        <span className="text-gray-600 text-sm">—</span>
                      )}
                    </TableCell>

                    {/* Email */}
                    <TableCell>
                      {vendor.email ? (
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-gray-500" />
                          <span className="text-gray-300 text-sm">{vendor.email}</span>
                        </div>
                      ) : (
                        <span className="text-gray-600 text-sm">—</span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-900/50">
                        Active
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu
                        trigger={
                          <button className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
                            <MoreVertical size={18} />
                          </button>
                        }
                      >
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/vendors/${vendor.id}`)}>
                          <User size={14} className="inline mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(vendor)}>
                          <Edit size={14} className="inline mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(vendor.id)}
                          className="text-red-400"
                        >
                          <Trash2 size={14} className="inline mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Add Vendor Modal */}
        <QuickAddContactModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleAddVendor}
          defaultType="vendor"
        />
      </div>
    </ModernDashboardLayout>
  );
}

