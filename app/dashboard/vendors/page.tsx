'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MoreVertical, Phone, Mail, User, Edit, Trash2, Loader2, Search, MapPin, Filter, Building2, Users as UsersIcon } from 'lucide-react';
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

type TabType = 'vendors' | 'workers';

interface Vendor extends Contact {
  address_line_1?: string; // Used to store role/tag
  is_worker?: boolean; // Flag to differentiate workers from vendors
}

export default function VendorsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('vendors');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [workers, setWorkers] = useState<Vendor[]>([]);
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

      // Fetch all contacts (suppliers)
      const { data, error: fetchError } = await supabase
        .from('contacts')
        .select('id, name, mobile, email, type, address_line_1, created_at, updated_at')
        .eq('business_id', profile.business_id)
        .or('type.eq.supplier,type.eq.both')
        .order('name')
        .limit(100);

      if (fetchError) throw fetchError;

      if (data) {
        // Separate vendors and workers based on address_line_1
        const vendorsList: Vendor[] = [];
        const workersList: Vendor[] = [];

        data.forEach((v) => {
          const contact: Vendor = {
            id: v.id,
            name: v.name,
            mobile: v.mobile || undefined,
            email: v.email || undefined,
            type: v.type as 'customer' | 'supplier' | 'both',
            address_line_1: v.address_line_1 || undefined,
            created_at: v.created_at,
            updated_at: v.updated_at,
          };

          // Check if it's a worker (starts with "Worker:")
          if (v.address_line_1 && v.address_line_1.startsWith('Worker:')) {
            contact.is_worker = true;
            workersList.push(contact);
          } else {
            vendorsList.push(contact);
          }
        });

        setVendors(vendorsList);
        setWorkers(workersList);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      toast.error(`Failed to load data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Extract role from address_line_1
  const getRole = (item: Vendor): string => {
    if (item.address_line_1) {
      if (item.address_line_1.startsWith('Worker:')) {
        return item.address_line_1.replace('Worker: ', '');
      }
      if (item.address_line_1.startsWith('Role:')) {
        return item.address_line_1.replace('Role: ', '');
      }
    }
    return item.is_worker ? 'Worker' : 'Vendor';
  };

  // Handle add contact
  const handleAddContact = (newContact: Contact) => {
    fetchVendors(); // Refresh to get full data
    toast.success(`${activeTab === 'vendors' ? 'Vendor' : 'Worker'} added successfully`);
  };

  // Handle delete (placeholder)
  const handleDelete = (id: number) => {
    toast.info('Delete functionality will be implemented next');
  };

  // Handle sorting
  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        if (prev.direction === null) return { key, direction: 'asc' };
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        return { key: '', direction: null };
      }
      return { key, direction: 'asc' };
    });
  };

  // Get current data based on active tab
  const currentData = activeTab === 'vendors' ? vendors : workers;

  // Filter and sort
  const filteredData = useMemo(() => {
    let result = [...currentData];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          getRole(item).toLowerCase().includes(term) ||
          item.mobile?.toLowerCase().includes(term) ||
          item.email?.toLowerCase().includes(term)
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
  }, [currentData, searchTerm, sortConfig]);

  return (
    <ModernDashboardLayout>
      <div className="space-y-6 p-6 standard-page-container">
        {/* Header - Standardized */}
        <div className="flex items-center justify-between mb-8 animate-entrance">
          <div>
            <h1 className="text-2xl font-semibold text-indigo-400 mb-1 flex items-center gap-2">
              {activeTab === 'vendors' ? (
                <>
                  <Building2 size={28} />
                  Vendors
                </>
              ) : (
                <>
                  <UsersIcon size={28} />
                  Workers
                </>
              )}
            </h1>
            <p className="text-sm text-slate-400">
              {activeTab === 'vendors'
                ? 'Manage your external suppliers and vendors'
                : 'Manage your production workers'}
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white transition-standard"
          >
            <Plus size={18} />
            Add {activeTab === 'vendors' ? 'Vendor' : 'Worker'}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-800">
          <button
            onClick={() => {
              setActiveTab('vendors');
              setSearchTerm('');
            }}
            className={cn(
              'px-6 py-3 font-medium transition-all duration-300 relative',
              activeTab === 'vendors' ? 'text-indigo-400' : 'text-gray-400 hover:text-gray-300'
            )}
          >
            <div className="flex items-center gap-2">
              <Building2 size={18} />
              Vendors
              <Badge className="bg-gray-700 text-gray-300 ml-1">{vendors.length}</Badge>
            </div>
            {activeTab === 'vendors' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-400 transition-standard" />
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('workers');
              setSearchTerm('');
            }}
            className={cn(
              'px-6 py-3 font-medium transition-all duration-300 relative',
              activeTab === 'workers' ? 'text-indigo-400' : 'text-gray-400 hover:text-gray-300'
            )}
          >
            <div className="flex items-center gap-2">
              <UsersIcon size={18} />
              Workers
              <Badge className="bg-gray-700 text-gray-300 ml-1">{workers.length}</Badge>
            </div>
            {activeTab === 'workers' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-400 transition-standard" />
            )}
          </button>
        </div>

        {/* Search and Filter */}
        <div className="h-14 flex items-center gap-3">
          <div className="search-bar-container flex-1">
            <Search className="search-icon" size={18} />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${activeTab}...`}
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
        ) : currentData.length === 0 ? (
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl p-12">
            <EmptyState
              icon={activeTab === 'vendors' ? Building2 : UsersIcon}
              title={`No ${activeTab} found`}
              description={
                activeTab === 'vendors'
                  ? 'Get started by adding your first vendor (Dyer, Tailor, etc.)'
                  : 'Get started by adding your first production worker'
              }
              action={{
                label: `Add ${activeTab === 'vendors' ? 'Vendor' : 'Worker'}`,
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
                    sortKey="name"
                    label="Name"
                    currentSort={sortConfig}
                    onSort={handleSort}
                  />
                  <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {activeTab === 'vendors' ? 'Service Type' : 'Specialization'}
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Location</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Orders</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => {
                  // Mock active orders count (should come from API)
                  const activeOrders = Math.floor(Math.random() * 15);
                  const isBusy = activeOrders > 10;
                  const location = item.address_line_1?.includes('Location:')
                    ? item.address_line_1.replace('Location: ', '')
                    : 'Lahore'; // Default location

                  return (
                    <TableRow
                      key={item.id}
                      className="hover:bg-gray-800/30 transition-standard cursor-pointer"
                      onClick={() => router.push(`/dashboard/vendors/${item.id}`)}
                    >
                      {/* Name */}
                      <TableCell>
                        <p className="text-white font-medium">{item.name}</p>
                      </TableCell>

                      {/* Role/Type */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'border-gray-700',
                            activeTab === 'workers'
                              ? 'bg-purple-500/10 text-purple-400'
                              : 'bg-gray-800 text-gray-400'
                          )}
                        >
                          {getRole(item)}
                        </Badge>
                      </TableCell>

                      {/* Contact */}
                      <TableCell>
                        {item.mobile ? (
                          <div className="flex items-center gap-2">
                            <Phone size={14} className="text-gray-500" />
                            <span className="text-gray-300 text-sm">{item.mobile}</span>
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-standard"
                        >
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

        {/* Add Contact Modal */}
        <QuickAddContactModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleAddContact}
          defaultType="vendor"
          isWorker={activeTab === 'workers'}
        />
      </div>
    </ModernDashboardLayout>
  );
}
