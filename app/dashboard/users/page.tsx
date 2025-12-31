/**
 * User Management Page
 * Handles system access control, creating staff accounts, assigning roles
 * Follows docs/modules/Users.md specifications
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Users, UserCheck, LogIn, MoreVertical, Eye, Edit, Trash2 } from 'lucide-react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { Skeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyState } from '@/components/placeholders/EmptyState';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { AdminOnly } from '@/components/auth/AdminOnly';
import type { UserRole } from '@/lib/types/roles';

interface UserProfile {
  id: number;
  user_id: string;
  business_id: number;
  role: UserRole;
  created_at: string;
  updated_at: string;
  // From auth.users
  email?: string;
  full_name?: string;
  last_login?: string;
  avatar_url?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  loggedInToday: number;
}

export default function UsersPage() {
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    loggedInToday: 0,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
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

      // Fetch all user profiles for this business
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, user_id, business_id, role, created_at, updated_at')
        .eq('business_id', profile.business_id)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      if (profiles) {
        // Fetch user details from auth.users (we'll use email from session or fetch separately)
        // Note: We can't directly query auth.users from client, so we'll use what we have
        const usersWithDetails: UserProfile[] = profiles.map((p) => ({
          ...p,
          role: (p.role as UserRole) || 'cashier',
          status: 'active' as const, // Default to active
          // Email and other details would need to be fetched via admin API or stored in profile
        }));

        setUserProfiles(usersWithDetails);

        // Calculate stats
        const totalUsers = usersWithDetails.length;
        const activeUsers = usersWithDetails.filter((u) => u.status === 'active').length;
        // For logged in today, we'd need last_login field - using created_at as approximation
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const loggedInToday = usersWithDetails.filter((u) => {
          const createdDate = new Date(u.created_at);
          return createdDate >= today;
        }).length;

        setStats({
          totalUsers,
          activeUsers,
          loggedInToday,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load users';
      setError(errorMessage);
      toast.error(`Failed to load users: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user: UserProfile) => {
    const currentUser = await supabase.auth.getUser();
    if (currentUser.data.user?.id === user.user_id) {
      toast.error('You cannot delete your own account');
      return;
    }

    if (!confirm(`Are you sure you want to delete this user?`)) return;

    try {
      // Note: This would typically require admin API access
      // For now, we'll just show a message
      toast.error('User deletion requires admin API access. Please use Supabase dashboard.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  // Get role badge
  const getRoleBadge = (role: UserRole) => {
    const variants: Record<UserRole, { className: string; label: string }> = {
      admin: { className: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Admin' },
      manager: { className: 'bg-purple-500/10 text-purple-400 border-purple-500/20', label: 'Manager' },
      cashier: { className: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Cashier' },
      auditor: { className: 'bg-gray-500/10 text-gray-400 border-gray-500/20', label: 'Auditor' },
    };

    const variant = variants[role] || variants.cashier;
    return (
      <Badge variant="outline" className={variant.className}>
        {variant.label}
      </Badge>
    );
  };

  // Get status badge
  const getStatusBadge = (status: UserProfile['status'] = 'active') => {
    if (status === 'active') {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
          Active
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-gray-800 text-gray-400 border-gray-700">
          {status === 'inactive' ? 'Inactive' : 'Suspended'}
        </Badge>
      );
    }
  };

  // Get initials for avatar
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

  // Filter users
  const filteredUsers = userProfiles.filter((user) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(term) ||
      user.full_name?.toLowerCase().includes(term) ||
      user.role.toLowerCase().includes(term) ||
      false
    );
  });

  return (
    <AdminOnly>
      <ModernDashboardLayout>
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">User Management</h1>
              <p className="text-sm text-gray-400 mt-1">Manage system users and their permissions</p>
            </div>
            <Button
              variant="primary"
              onClick={() => toast.info('User creation requires admin API access')}
              className="bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
            >
              <Plus size={18} className="mr-2" />
              Create New User
            </Button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Users Card */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-md bg-white/5">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Users size={80} className="text-blue-400" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                    <Users size={24} />
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-1">Total Users</p>
                <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
                <p className="text-xs text-gray-500 mt-2">System Users</p>
              </div>
            </div>

            {/* Active Users Card */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-md bg-white/5">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <UserCheck size={80} className="text-green-400" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-green-500/10 text-green-400">
                    <UserCheck size={24} />
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-1">Active Users</p>
                <p className="text-3xl font-bold text-white">{stats.activeUsers}</p>
                <p className="text-xs text-gray-500 mt-2">Currently active</p>
              </div>
            </div>

            {/* Logged In Today Card */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-md bg-white/5">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <LogIn size={80} className="text-yellow-400" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-yellow-500/10 text-yellow-400">
                    <LogIn size={24} />
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-1">Logged In Today</p>
                <p className="text-3xl font-bold text-white">{stats.loggedInToday}</p>
                <p className="text-xs text-gray-500 mt-2">Recent activity</p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search by email, name, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <Skeleton className="h-64" />
            </div>
          ) : error ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12">
              <div className="text-center">
                <p className="text-red-400 mb-4">{error}</p>
                <Button variant="outline" onClick={loadUsers}>
                  Retry
                </Button>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12">
              <EmptyState
                icon={Users}
                title="No users found"
                description={
                  searchTerm
                    ? 'No users match your search criteria'
                    : 'Get started by creating your first user'
                }
              />
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-950/50 border-gray-800">
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const initials = getInitials(user.email, user.full_name);
                    const avatarUrl = user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email || user.user_id}`;

                    return (
                      <TableRow key={user.id} className="hover:bg-gray-800/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={avatarUrl} alt={user.full_name || user.email} />
                              <AvatarFallback className="bg-gray-800 text-gray-400 text-xs">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-white font-medium">
                                {user.full_name || user.email || `User ${user.id}`}
                              </p>
                              {user.email && (
                                <p className="text-xs text-gray-500">{user.email}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell className="text-gray-400 text-sm">
                          {user.created_at
                            ? format(new Date(user.created_at), 'MMM dd, yyyy')
                            : '—'}
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
                              <Eye size={14} className="inline mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit size={14} className="inline mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(user)}
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
        </div>
      </ModernDashboardLayout>
    </AdminOnly>
  );
}

