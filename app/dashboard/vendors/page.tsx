'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MoreVertical, Phone, Mail, User, Edit, Trash2, Loader2, Search, MapPin, Filter } from 'lucide-react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { Skeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyState } from '@/components/placeholders/EmptyState';
import { QuickAddContactModal, Contact } from '@/components/rentals/QuickAddContactModal';
import { SortableTableHeader, SortDirection } from '@/components/ui/SortableTableHeader';
import { FilterDropdown, FilterOptions } from '@/components/ui/FilterDropdown';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection }>({ key: '', direction: null });
  const [filters, setFilters] = useState<FilterOptions>({});

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

  // Handle sorting
  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        // Toggle direction: null -> asc -> desc -> null
        if (prev.direction === null) return { key, direction: 'asc' };
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        return { key: '', direction: null };
      }
      return { key, direction: 'asc' };
    });
  };

  // Filter and sort vendors
  const filteredVendors = useMemo(() => {
    let result = [...vendors];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (vendor) =>
          vendor.name.toLowerCase().includes(term) ||
          getVendorRole(vendor).toLowerCase().includes(term) ||
          vendor.mobile?.toLowerCase().includes(term) ||
          vendor.email?.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    if (sortConfig.key && sortConfig.direction) {
      result.sort((a, b) => {
        let aVal: any = a[sortConfig.key as keyof Vendor];
        let bVal: any = b[sortConfig.key as keyof Vendor];

        if (sortConfig.key === 'name') {
          aVal = (aVal || '').toLowerCase();
          bVal = (bVal || '').toLowerCase();
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [vendors, searchTerm, sortConfig]);

  return (
    <ModernDashboardLayout>
      <div className="space-y-6 p-6 standard-page-container">
        {/* Header - Standardized */}
        <div className="flex items-center justify-between mb-8 animate-entrance">
          <div>
            <h1 className="text-2xl font-semibold text-indigo-400 mb-1">Vendors</h1>
            <p className="text-sm text-slate-400">Manage your dyers, tailors, and material suppliers</p>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white transition-standard"
          >
            <Plus size={18} />
            Add Vendor
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="h-14 flex items-center gap-3">
          <div className="search-bar-container flex-1">
            <Search className="search-icon" size={18} />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search vendors..."
              className="search-input w-full bg-[#111827] border-slate-800 text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 transition-standard rounded-xl"
            />
          </div>
          <FilterDropdown
            onFilterChange={(f) => setFilters(f)}
            activeFilters={filters}
            showDateRange={false}
            showStatus={false}
            showCategory={false}
          />
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
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-xl overflow-hidden transition-standard animate-entrance-delay-2">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-800/50">
                  <SortableTableHeader
                    columnKey="name"
                    label="Vendor Name"
                    currentSort={sortConfig}
                    onSort={handleSort}
                  />
                  <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Service Type</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Location</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Orders</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.map((vendor) => {
                    // Mock active orders count (should come from API)
                    const activeOrders = Math.floor(Math.random() * 15);
                    const isBusy = activeOrders > 10;
                    const location = vendor.address_line_1?.includes('Location:')
                      ? vendor.address_line_1.replace('Location: ', '')
                      : 'Lahore'; // Default location

                    return (
                      <TableRow
                        key={vendor.id}
                        className="hover:bg-gray-800/30 transition-standard"
                      >
                        {/* Vendor Name */}
                        <TableCell>
                          <p className="text-white font-medium">{vendor.name}</p>
                        </TableCell>

                        {/* Service Type */}
                        <TableCell>
                          <Badge variant="outline" className="bg-gray-800 text-gray-400 border-gray-700">
                            {getVendorRole(vendor)}
                          </Badge>
                        </TableCell>

                        {/* Contact */}
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

                        {/* Location */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-gray-500" />
                            <span className="text-gray-300 text-sm">{location}</span>
                          </div>
                        </TableCell>

                        {/* Active Orders */}
                        <TableCell>
                          <span className="text-white font-medium">{activeOrders}</span>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              isBusy
                                ? 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                : 'bg-green-500/10 text-green-500 border-green-500/20'
                            )}
                          >
                            {isBusy ? 'Busy' : 'Active'}
                          </Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <button className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-standard">
                            <MoreVertical size={18} />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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

