/**
 * User Management Page
 * Professional ERP-style user management with role-based displays
 * Features:
 * - Role-based filtering and display
 * - Salesman-specific stats (Commission %, Base Salary)
 * - Search with icon auto-hide
 * - Portal-based dropdowns
 * - Ledger view for salesmen
 * - 2-decimal formatting
 */

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { 
  Plus, 
  Users, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  DollarSign,
  UserCheck,
  UserX,
  TrendingUp
} from 'lucide-react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyState } from '@/components/placeholders/EmptyState';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { UserFormModal } from '@/components/users/UserFormModal';
import { formatDecimal, formatCurrency } from '@/lib/utils/formatters';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: number;
  user_id: string;
  business_id: number;
  role: 'admin' | 'manager' | 'sales_staff' | 'salesman';
  status?: 'active' | 'inactive';
  base_salary?: number;
  commission_percentage?: number;
  created_at: string;
  updated_at: string;
  // From auth.users
  email?: string;
  full_name?: string;
  last_login?: string;
  avatar_url?: string;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  totalSalesmen: number;
  inactiveUsers: number;
}

function UsersPageContent() {
  const router = useRouter();
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalSalesmen: 0,
    inactiveUsers: 0
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadUsers();
    }
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to view users');
        return;
      }

      // Get current user's business_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) {
        toast.error('Business profile not found');
        return;
      }

      // Fetch all user profiles for this business with user metadata
      // Note: We store user metadata in user_profiles to avoid admin API calls
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('business_id', profile.business_id)
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
        toast.error('Failed to load users');
        return;
      }

      // For each profile, fetch the email from auth.users (current user only)
      // We'll use a workaround: get current session user's email
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Enrich profiles with available data
      const enrichedProfiles: UserProfile[] = await Promise.all(
        (profiles || []).map(async (p) => {
          // If this is the current user, we have their email
          if (currentUser && p.user_id === currentUser.id) {
            return {
              ...p,
              email: currentUser.email || '',
              full_name: currentUser.user_metadata?.full_name || currentUser.email || '',
              avatar_url: currentUser.user_metadata?.avatar_url,
              last_login: currentUser.last_sign_in_at
            };
          }
          
          // For other users, try to get email from a custom function or use placeholder
          // In production, you should store email/name in user_profiles table
          return {
            ...p,
            email: `user-${p.id}@system.local`, // Placeholder
            full_name: `User ${p.id}`,
            avatar_url: undefined,
            last_login: undefined
          };
        })
      );

      setUserProfiles(enrichedProfiles);

      // Calculate stats
      const totalUsers = enrichedProfiles.length;
      const activeUsers = enrichedProfiles.filter(u => u.status === 'active' || !u.status).length;
      const totalSalesmen = enrichedProfiles.filter(u => u.role === 'salesman').length;
      const inactiveUsers = enrichedProfiles.filter(u => u.status === 'inactive').length;

      setStats({
        totalUsers,
        activeUsers,
        totalSalesmen,
        inactiveUsers
      });

    } catch (err) {
      console.error('Failed to load users:', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }

    try {
      // Note: Deleting auth.users requires admin API
      // For now, we'll just deactivate the profile
      const { error } = await supabase
        .from('user_profiles')
        .update({ status: 'inactive' })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('User deactivated successfully');
      loadUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Failed to delete user');
    }
  };

  const handleToggleStatus = async (profileId: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ status: newStatus })
        .eq('id', profileId);

      if (error) throw error;

      toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      loadUsers();
    } catch (err) {
      console.error('Error toggling user status:', err);
      toast.error('Failed to update user status');
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { color: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Admin' },
      manager: { color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', label: 'Manager' },
      sales_staff: { color: 'bg-green-500/20 text-green-300 border-green-500/30', label: 'Sales Staff' },
      salesman: { color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', label: 'Salesman' }
    };

    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.sales_staff;

    return (
      <Badge className={cn('border', config.color)}>
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (status?: string) => {
    const isActive = status === 'active' || !status;
    
    return (
      <Badge className={cn(
        'border',
        isActive 
          ? 'bg-green-500/20 text-green-300 border-green-500/30' 
          : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      )}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  const getInitials = (email?: string, name?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Filter users based on search term and role filter
  const filteredUsers = userProfiles.filter((user) => {
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        user.email?.toLowerCase().includes(term) ||
        user.full_name?.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term);
      
      if (!matchesSearch) return false;
    }

    // Role filter
    if (roleFilter !== 'all' && user.role !== roleFilter) {
      return false;
    }

    return true;
  });

  return (
    <ModernDashboardLayout>
      <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">User Management</h1>
              <p className="text-sm text-gray-400 mt-1">Manage system users, roles, and permissions</p>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setEditingUser(null);
                setIsFormOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
            >
              <Plus size={18} className="mr-2" />
              Add New User
            </Button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-white mt-1">{stats.totalUsers}</p>
                </div>
                <div className="bg-blue-500/20 p-3 rounded-lg">
                  <Users size={24} className="text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Users</p>
                  <p className="text-2xl font-bold text-green-400 mt-1">{stats.activeUsers}</p>
                </div>
                <div className="bg-green-500/20 p-3 rounded-lg">
                  <UserCheck size={24} className="text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Salesmen</p>
                  <p className="text-2xl font-bold text-indigo-400 mt-1">{stats.totalSalesmen}</p>
                </div>
                <div className="bg-indigo-500/20 p-3 rounded-lg">
                  <TrendingUp size={24} className="text-indigo-400" />
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Inactive Users</p>
                  <p className="text-2xl font-bold text-gray-400 mt-1">{stats.inactiveUsers}</p>
                </div>
                <div className="bg-gray-500/20 p-3 rounded-lg">
                  <UserX size={24} className="text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input with Icon Auto-Hide */}
            <div className="relative flex-1">
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
                placeholder="Search by name or email..."
                className={cn(
                  'bg-slate-800 border-slate-700 text-white',
                  'transition-all duration-300',
                  searchTerm.length > 0 ? 'pl-3' : 'pl-10'
                )}
              />
            </div>

            {/* Role Filter Dropdown */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full md:w-48 bg-slate-800 border-slate-700 text-white rounded-lg px-3 py-2"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="sales_staff">Sales Staff</option>
              <option value="salesman">Salesman</option>
            </select>
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No users found"
              description={searchTerm || roleFilter !== 'all' 
                ? "Try adjusting your search or filters" 
                : "Get started by adding your first user"}
              action={{
                label: 'Add First User',
                onClick: () => {
                  setEditingUser(null);
                  setIsFormOpen(true);
                }
              }}
            />
          ) : (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-800/50">
                    <TableHead className="text-gray-400">User</TableHead>
                    <TableHead className="text-gray-400">Role</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Salesman Stats</TableHead>
                    <TableHead className="text-gray-400">Last Login</TableHead>
                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow 
                      key={user.id} 
                      className="border-slate-700 hover:bg-slate-800/50 transition-colors"
                    >
                      {/* User Info */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-slate-700">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="bg-slate-700 text-slate-300">
                              {getInitials(user.email, user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-white">
                              {user.full_name || 'Unnamed User'}
                            </div>
                            <div className="text-sm text-gray-400">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Role */}
                      <TableCell>
                        {getRoleBadge(user.role)}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {getStatusBadge(user.status)}
                      </TableCell>

                      {/* Salesman Stats */}
                      <TableCell>
                        {user.role === 'salesman' ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <DollarSign size={14} className="text-green-400" />
                              <span className="text-gray-300">
                                Base: <span className="text-white font-medium">
                                  {formatCurrency(user.base_salary || 0)}
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <TrendingUp size={14} className="text-indigo-400" />
                              <span className="text-gray-300">
                                Commission: <span className="text-white font-medium">
                                  {formatDecimal(user.commission_percentage || 0)}%
                                </span>
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">N/A</span>
                        )}
                      </TableCell>

                      {/* Last Login */}
                      <TableCell>
                        <span className="text-sm text-gray-400">
                          {user.last_login 
                            ? format(new Date(user.last_login), 'MMM dd, yyyy')
                            : 'Never'}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {/* View Ledger (Salesman Only) */}
                          {user.role === 'salesman' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/dashboard/users/ledger/${user.id}`)}
                              className="bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20"
                              title="View Ledger"
                            >
                              <Eye size={16} className="mr-1" />
                              Ledger
                            </Button>
                          )}

                          {/* Edit */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingUser(user);
                              setIsFormOpen(true);
                            }}
                            className="bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20"
                            title="Edit User"
                          >
                            <Edit size={16} />
                          </Button>

                          {/* Toggle Status */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(user.id, user.status || 'active')}
                            className={cn(
                              'border',
                              user.status === 'active' || !user.status
                                ? 'bg-gray-500/10 border-gray-500/30 text-gray-300 hover:bg-gray-500/20'
                                : 'bg-green-500/10 border-green-500/30 text-green-300 hover:bg-green-500/20'
                            )}
                            title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            {user.status === 'active' || !user.status ? (
                              <UserX size={16} />
                            ) : (
                              <UserCheck size={16} />
                            )}
                          </Button>

                          {/* Delete */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user.user_id, user.full_name || user.email || 'User')}
                            className="bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
                            title="Delete User"
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

          {/* User Form Modal */}
          <UserFormModal
            isOpen={isFormOpen}
            onClose={() => {
              setIsFormOpen(false);
              setEditingUser(null);
            }}
            onSuccess={() => {
              setIsFormOpen(false);
              setEditingUser(null);
              loadUsers();
            }}
            user={editingUser}
          />
      </div>
    </ModernDashboardLayout>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={
      <ModernDashboardLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </ModernDashboardLayout>
    }>
      <UsersPageContent />
    </Suspense>
  );
}
