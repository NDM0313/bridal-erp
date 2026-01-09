/**
 * Branch Management Page
 * Professional branch management with demo mode support
 * Features:
 * - Branch Name, Code, Location, Phone
 * - Portal-based dropdowns (no clipping)
 * - Auto-hide Icons (Red Mark Fix)
 * - 2-decimal formatting (Yellow Mark Fix)
 * - Demo mode support
 */

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { 
  Plus, 
  Building2, 
  Search, 
  Edit, 
  Trash2,
  MapPin,
  Phone,
  Hash
} from 'lucide-react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Skeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyState } from '@/components/placeholders/EmptyState';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog';
import { X } from 'lucide-react';
import { isDemoMode, mockSave } from '@/lib/config/demoConfig';

interface Branch {
  id: number;
  business_id: number;
  name: string;
  code?: string; // Custom field or stored in name
  location?: string; // Maps to landmark
  address?: string; // Combined from city, state, country
  phone?: string; // Maps to mobile
  is_active: boolean; // Based on deleted_at
  created_at: string;
  updated_at: string;
}

function BranchesPageContent() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: '',
    address: '',
    phone: '',
  });

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      setLoading(true);
      
      // Demo mode: Inject dummy branches
      if (isDemoMode() && branches.length === 0) {
        const dummyBranches: Branch[] = [
          {
            id: 1,
            business_id: 1,
            name: 'Main Branch',
            code: 'MB-01',
            location: 'Din Bridal Outlet',
            address: 'Shop #123, Main Boulevard, City, Country',
            phone: '+92 300 1234567',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 2,
            business_id: 1,
            name: 'Downtown Branch',
            code: 'DT-02',
            location: 'City Center',
            address: 'Shop #456, Downtown Plaza',
            phone: '+92 300 7654321',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
        setBranches(dummyBranches);
        setLoading(false);
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (isDemoMode()) {
          // Demo mode: Use dummy data
          const dummyBranches: Branch[] = [
            {
              id: 1,
              business_id: 1,
              name: 'Main Branch',
              code: 'MB-01',
              location: 'Din Bridal Outlet',
              address: 'Shop #123, Main Boulevard, City, Country',
              phone: '+92 300 1234567',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ];
          setBranches(dummyBranches);
          setLoading(false);
          return;
        }
        toast.error('Please log in to view branches');
        return;
      }

      // Get business_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) {
        if (isDemoMode()) {
          // Demo mode: Use dummy data
          const dummyBranches: Branch[] = [
            {
              id: 1,
              business_id: 1,
              name: 'Main Branch',
              code: 'MB-01',
              location: 'Din Bridal Outlet',
              address: 'Shop #123, Main Boulevard, City, Country',
              phone: '+92 300 1234567',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ];
          setBranches(dummyBranches);
          setLoading(false);
          return;
        }
        toast.error('Business profile not found');
        return;
      }

      // Fetch branches (include deleted_at check)
      const { data, error } = await supabase
        .from('business_locations')
        .select('*')
        .eq('business_id', profile.business_id)
        .is('deleted_at', null) // Only active branches
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching branches:', error);
        if (isDemoMode()) {
          // Demo mode: Use dummy data on error
          const dummyBranches: Branch[] = [
            {
              id: 1,
              business_id: profile.business_id,
              name: 'Main Branch',
              code: 'MB-01',
              location: 'Din Bridal Outlet',
              address: 'Shop #123, Main Boulevard, City, Country',
              phone: '+92 300 1234567',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ];
          setBranches(dummyBranches);
          setLoading(false);
          return;
        }
        toast.error('Failed to load branches');
        return;
      }

      // Transform to Branch format (map to actual schema columns)
      const branchesData: Branch[] = (data || []).map((loc: any) => {
        // Build address from available fields
        const addressParts = [
          loc.landmark,
          loc.city,
          loc.state,
          loc.country,
          loc.zip_code
        ].filter(Boolean);
        const fullAddress = addressParts.join(', ');
        
        return {
          id: loc.id,
          business_id: loc.business_id,
          name: loc.name || 'Unnamed Branch',
          code: loc.code || loc.custom_field1 || `BR-${loc.id}`, // Use custom_field1 for code if available
          location: loc.landmark || '',
          address: fullAddress || '',
          phone: loc.mobile || loc.alternate_number || '',
          is_active: !loc.deleted_at, // Active if deleted_at is null
          created_at: loc.created_at,
          updated_at: loc.updated_at,
        };
      });

      setBranches(branchesData);
    } catch (err) {
      console.error('Failed to load branches:', err);
      if (isDemoMode()) {
        // Demo mode: Use dummy data on error
        const dummyBranches: Branch[] = [
          {
            id: 1,
            business_id: 1,
            name: 'Main Branch',
            code: 'MB-01',
            location: 'Din Bridal Outlet',
            address: 'Shop #123, Main Boulevard, City, Country',
            phone: '+92 300 1234567',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
        setBranches(dummyBranches);
      } else {
        toast.error('Failed to load branches');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error('Branch Name is required');
        return;
      }

      // Auto-generate code if not set (safety check)
      let finalCode = formData.code.trim();
      if (!finalCode) {
        finalCode = generateBranchCode(formData.name, branches);
        setFormData({ ...formData, code: finalCode });
      }
      
      // Ensure code is uppercase and valid
      finalCode = finalCode.toUpperCase().replace(/[^A-Z0-9-]/g, '');
      
      if (!finalCode) {
        toast.error('Failed to generate branch code. Please try again.');
        return;
      }

      // Demo mode: Mock save
      if (isDemoMode()) {
        const newBranch: Branch = {
          id: editingBranch ? editingBranch.id : Date.now(),
          business_id: 1,
          name: formData.name,
          code: finalCode, // Use auto-generated code
          location: formData.location,
          address: formData.address,
          phone: formData.phone,
          is_active: true,
          created_at: editingBranch ? editingBranch.created_at : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await mockSave(newBranch);
        
        if (editingBranch) {
          setBranches(branches.map(b => b.id === editingBranch.id ? newBranch : b));
          toast.success('Branch updated successfully (Demo Mode)');
        } else {
          setBranches([...branches, newBranch]);
          toast.success('Branch created successfully (Demo Mode)');
        }

        setFormData({ name: '', code: '', location: '', address: '', phone: '' });
        setEditingBranch(null);
        setIsModalOpen(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) {
        toast.error('Business profile not found');
        return;
      }

      // Parse address into components (city, state, country)
      const addressParts = formData.address.split(',').map(s => s.trim());
      const city = addressParts[0] || '';
      const state = addressParts[1] || '';
      const country = addressParts[2] || '';

      if (editingBranch) {
        // Update existing branch (map to actual schema columns)
        const updateData: any = {
          name: formData.name,
          landmark: formData.location || null,
          mobile: formData.phone || null,
          city: city || null,
          state: state || null,
          country: country || null,
          updated_at: new Date().toISOString(),
        };
        
        // CRITICAL: Store code in custom_field1 (database column for branch code)
        updateData.custom_field1 = finalCode;

        const { error } = await supabase
          .from('business_locations')
          .update(updateData)
          .eq('id', editingBranch.id);

        if (error) throw error;

        toast.success('Branch updated successfully');
      } else {
        // Create new branch (map to actual schema columns)
        const insertData: any = {
          business_id: profile.business_id,
          name: formData.name,
          landmark: formData.location || null,
          mobile: formData.phone || null,
          city: city || null,
          state: state || null,
          country: country || null,
        };
        
        // CRITICAL: Store code in custom_field1 (database column for branch code)
        insertData.custom_field1 = finalCode;

        const { error } = await supabase
          .from('business_locations')
          .insert(insertData);

        if (error) throw error;

        toast.success('Branch created successfully');
      }

      // Reset and close
      setFormData({ name: '', code: '', location: '', address: '', phone: '' });
      setEditingBranch(null);
      setIsModalOpen(false);
      loadBranches();
    } catch (err: any) {
      console.error('Error saving branch:', err);
      console.error('Error type:', typeof err);
      console.error('Error keys:', err ? Object.keys(err) : 'no keys');
      
      // Better error message extraction
      let errorMessage = 'Unknown error';
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.error?.message) {
        errorMessage = err.error.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.toString && err.toString() !== '[object Object]') {
        errorMessage = err.toString();
      } else {
        // Try to extract meaningful info from error object
        const errorStr = JSON.stringify(err);
        if (errorStr && errorStr !== '{}') {
          errorMessage = errorStr;
        } else {
          // Check for common Supabase errors
          if (err?.code === 'PGRST116' || err?.message?.includes('relation') || err?.message?.includes('does not exist')) {
            errorMessage = 'The branches table does not exist. Please run the database migration to create it.';
          } else if (err?.code === '23505' || err?.message?.includes('duplicate')) {
            errorMessage = 'A branch with this code already exists. Please use a different code.';
          } else {
            errorMessage = 'Failed to save branch. Please check console for details.';
          }
        }
      }
      
      toast.error(`Failed to save branch: ${errorMessage}`);
    }
  };

  const handleDelete = async (branchId: number, branchName: string) => {
    if (!confirm(`Are you sure you want to delete "${branchName}"?`)) {
      return;
    }

    try {
      // Demo mode: Mock delete
      if (isDemoMode()) {
        await mockSave(null);
        setBranches(branches.filter(b => b.id !== branchId));
        toast.success('Branch deleted successfully (Demo Mode)');
        return;
      }

      const { error } = await supabase
        .from('business_locations')
        .update({ is_active: false })
        .eq('id', branchId);

      if (error) throw error;

      toast.success('Branch deactivated successfully');
      loadBranches();
    } catch (err: any) {
      console.error('Error deleting branch:', err);
      toast.error('Failed to delete branch');
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      code: branch.code || '', // Keep existing code (locked in edit mode)
      location: branch.location || '',
      address: branch.address || '',
      phone: branch.phone || '',
    });
    setIsModalOpen(true);
  };

  // Auto-generate branch code from name
  const generateBranchCode = (name: string, existingBranches: Branch[]): string => {
    if (!name.trim()) return '';
    
    // Extract first letters of each word and make uppercase
    const words = name.trim().split(/\s+/);
    let code = '';
    
    if (words.length === 1) {
      // Single word: Take first 2-3 letters
      code = words[0].substring(0, 3).toUpperCase();
    } else {
      // Multiple words: Take first letter of each word
      code = words.map(w => w[0]).join('').toUpperCase();
    }
    
    // Add number suffix if code already exists
    let finalCode = code;
    let counter = 1;
    while (existingBranches.some(b => b.code === finalCode)) {
      finalCode = `${code}-${String(counter).padStart(2, '0')}`;
      counter++;
    }
    
    return finalCode;
  };

  const handleAddNew = () => {
    setEditingBranch(null);
    const autoCode = generateBranchCode('', branches);
    setFormData({ name: '', code: autoCode, location: '', address: '', phone: '' });
    setIsModalOpen(true);
  };

  // Filter branches
  const filteredBranches = branches.filter((branch) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      branch.name.toLowerCase().includes(term) ||
      branch.code.toLowerCase().includes(term) ||
      (branch.location && branch.location.toLowerCase().includes(term)) ||
      (branch.phone && branch.phone.includes(term))
    );
  });

  return (
    <ModernDashboardLayout>
      <div className="space-y-6 p-6">
        {/* Demo Mode Badge */}
        {isDemoMode() && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2">
            <span className="text-yellow-400 font-semibold">DEMO MODE</span>
            <span className="text-yellow-300 text-sm">All changes are simulated</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Branch Management</h1>
            <p className="text-sm text-gray-400 mt-1">Manage business branches and locations</p>
          </div>
          <Button
            variant="primary"
            onClick={handleAddNew}
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
          >
            <Plus size={18} className="mr-2" />
            Add Branch
          </Button>
        </div>

        {/* Search Bar with Icon Auto-Hide */}
        <div className="relative">
          <Search
            size={18}
            className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none',
              'transition-opacity duration-300',
              searchTerm.length > 0 ? 'opacity-0' : 'opacity-100'
            )}
          />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search branches..."
            className={cn(
              'bg-slate-800 border-slate-700 text-white',
              'transition-all duration-300',
              searchTerm.length > 0 ? 'pl-3' : 'pl-10'
            )}
          />
        </div>

        {/* Branches Table */}
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredBranches.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No branches found"
            description={searchTerm 
              ? "Try adjusting your search" 
              : "Get started by adding your first branch"}
            action={
              <Button
                variant="primary"
                onClick={handleAddNew}
                className="bg-indigo-600 hover:bg-indigo-500"
              >
                <Plus size={18} className="mr-2" />
                Add First Branch
              </Button>
            }
          />
        ) : (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-slate-800/50">
                  <TableHead className="text-gray-400">Branch Name</TableHead>
                  <TableHead className="text-gray-400">Branch Code</TableHead>
                  <TableHead className="text-gray-400">Location</TableHead>
                  <TableHead className="text-gray-400">Phone</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBranches.map((branch) => (
                  <TableRow 
                    key={branch.id} 
                    className="border-slate-700 hover:bg-slate-800/50 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-indigo-400" />
                        <span className="font-medium text-white">{branch.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                        {branch.code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <MapPin size={14} />
                        <span>{branch.location || branch.address || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Phone size={14} />
                        <span>{branch.phone || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        'border',
                        branch.is_active
                          ? 'bg-green-500/20 text-green-300 border-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      )}>
                        {branch.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(branch)}
                          className="bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20"
                          title="Edit Branch"
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(branch.id, branch.name)}
                          className="bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
                          title="Delete Branch"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Add/Edit Branch Modal */}
        {isModalOpen && (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-0 z-[9999]">
              <div className="flex items-center justify-between p-6 border-b border-slate-800">
                <DialogTitle className="text-xl font-bold text-white">
                  {editingBranch ? 'Edit Branch' : 'Add New Branch'}
                </DialogTitle>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Branch Name */}
                  <div>
                    <Label htmlFor="name" className="text-slate-300 mb-2 block">
                      Branch Name *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => {
                        const newName = e.target.value;
                        // Auto-generate code when name changes (only for new branches)
                        if (!editingBranch) {
                          const autoCode = generateBranchCode(newName, branches);
                          setFormData({ ...formData, name: newName, code: autoCode });
                        } else {
                          setFormData({ ...formData, name: newName });
                        }
                      }}
                      placeholder="e.g., Main Branch"
                      className="bg-slate-800 border-slate-700 text-white"
                      required
                    />
                  </div>

                  {/* Branch Code with Icon Auto-Hide - AUTO-GENERATED & LOCKED */}
                  <div>
                    <Label htmlFor="code" className="text-slate-300 mb-2 block">
                      Branch Code * <span className="text-xs text-gray-500">
                        {editingBranch ? '(Cannot be changed)' : '(Auto-generated)'}
                      </span>
                    </Label>
                    <div className="relative">
                      <Hash
                        size={18}
                        className={cn(
                          'absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none',
                          'transition-opacity duration-300',
                          formData.code.length > 0 ? 'opacity-0' : 'opacity-100'
                        )}
                      />
                      <Input
                        id="code"
                        value={formData.code}
                        readOnly
                        disabled
                        placeholder={editingBranch ? "Existing code (locked)" : "Auto-generated from name"}
                        className={cn(
                          'bg-slate-800/50 border-slate-700 text-white cursor-not-allowed',
                          'transition-all duration-300',
                          formData.code.length > 0 ? 'pl-3' : 'pl-10',
                          'opacity-75'
                        )}
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {editingBranch 
                        ? 'Branch code cannot be changed after creation'
                        : 'Code is automatically generated from branch name and saved to database (custom_field1)'
                      }
                    </p>
                  </div>

                  {/* Location with Icon Auto-Hide */}
                  <div>
                    <Label htmlFor="location" className="text-slate-300 mb-2 block">
                      Location
                    </Label>
                    <div className="relative">
                      <MapPin
                        size={18}
                        className={cn(
                          'absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none',
                          'transition-opacity duration-300',
                          formData.location.length > 0 ? 'opacity-0' : 'opacity-100'
                        )}
                      />
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="e.g., Din Bridal Outlet"
                        className={cn(
                          'bg-slate-800 border-slate-700 text-white',
                          'transition-all duration-300',
                          formData.location.length > 0 ? 'pl-3' : 'pl-10'
                        )}
                      />
                    </div>
                  </div>

                  {/* Phone with Icon Auto-Hide */}
                  <div>
                    <Label htmlFor="phone" className="text-slate-300 mb-2 block">
                      Phone Number
                    </Label>
                    <div className="relative">
                      <Phone
                        size={18}
                        className={cn(
                          'absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none',
                          'transition-opacity duration-300',
                          formData.phone.length > 0 ? 'opacity-0' : 'opacity-100'
                        )}
                      />
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="e.g., +92 300 1234567"
                        className={cn(
                          'bg-slate-800 border-slate-700 text-white',
                          'transition-all duration-300',
                          formData.phone.length > 0 ? 'pl-3' : 'pl-10'
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <Label htmlFor="address" className="text-slate-300 mb-2 block">
                    Address
                  </Label>
                  <textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Full address..."
                    rows={3}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    {editingBranch ? 'Update Branch' : 'Create Branch'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </ModernDashboardLayout>
  );
}

export default function BranchesPage() {
  return (
    <Suspense fallback={
      <ModernDashboardLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96" />
        </div>
      </ModernDashboardLayout>
    }>
      <BranchesPageContent />
    </Suspense>
  );
}
