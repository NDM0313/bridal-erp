/**
 * User Form Modal
 * Professional ERP-style user creation/editing form
 * Includes: Full Name, Username, Email, Password, Role, Status, Profile Image, Permissions
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, User, Mail, Lock, Shield, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { isDemoMode, mockSave } from '@/lib/config/demoConfig';

interface UserFormData {
  full_name: string;
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'sales_staff' | 'salesman';
  status: 'active' | 'inactive';
  avatar_url?: string;
  permissions: {
    can_view_reports: boolean;
    can_delete_sales: boolean;
    can_adjust_stock: boolean;
  };
  // Salesman-specific fields
  base_salary?: number;
  commission_percentage?: number;
}

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  user?: any; // For editing existing user
}

export function UserFormModal({ isOpen, onClose, onSuccess, user }: UserFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form data - update when user prop changes
  const [formData, setFormData] = useState<UserFormData>({
    full_name: '',
    username: '',
    email: '',
    password: '',
    role: 'sales_staff',
    status: 'active',
    avatar_url: '',
    permissions: {
      can_view_reports: false,
      can_delete_sales: false,
      can_adjust_stock: false,
    },
    base_salary: 0,
    commission_percentage: 0,
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Load user data when user prop changes or modal opens
  useEffect(() => {
    if (user && isOpen) {
      // Fetch full user profile data including salesman fields
      const loadUserData = async () => {
        try {
          const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('Error loading user data:', error);
            return;
          }

          // Use data from user prop (already has email/name from parent)
          setFormData({
            full_name: user.full_name || '',
            username: user.username || '',
            email: user.email || '',
            password: '', // Never show password
            role: profile.role || 'sales_staff',
            status: profile.status || 'active',
            avatar_url: user.avatar_url || '',
            permissions: {
              can_view_reports: profile.permissions?.can_view_reports || false,
              can_delete_sales: profile.permissions?.can_delete_sales || false,
              can_adjust_stock: profile.permissions?.can_adjust_stock || false,
            },
            base_salary: profile.base_salary || 0,
            commission_percentage: profile.commission_percentage || 0,
          });

          setAvatarPreview(user.avatar_url || null);
        } catch (err) {
          console.error('Failed to load user data:', err);
        }
      };

      loadUserData();
    } else if (!user && isOpen) {
      // Reset form for new user
      setFormData({
        full_name: '',
        username: '',
        email: '',
        password: '',
        role: 'sales_staff',
        status: 'active',
        avatar_url: '',
        permissions: {
          can_view_reports: false,
          can_delete_sales: false,
          can_adjust_stock: false,
        },
        base_salary: 0,
        commission_percentage: 0,
      });
      setAvatarPreview(null);
    }
  }, [user, isOpen]);

  const handleInputChange = (field: keyof UserFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePermissionChange = (permission: keyof UserFormData['permissions'], checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: { ...prev.permissions, [permission]: checked },
    }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Authentication required');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
      const filePath = `user-avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        // Try alternative bucket name
        const { error: altError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, { upsert: true });
        
        // If both buckets fail, skip avatar upload gracefully
        if (altError) {
          if (altError.message.includes('Bucket') || altError.message.includes('not found')) {
            console.warn('Avatar storage buckets not found, skipping upload');
            toast.info('Avatar upload skipped (storage not configured). You can set it later.');
            return;
          }
          throw altError;
        }
      }

      const { data: { publicUrl } } = supabase.storage
        .from('user-assets')
        .getPublicUrl(filePath);

      // Fallback to alternative bucket
      const avatarUrl = publicUrl || supabase.storage
        .from('avatars')
        .getPublicUrl(filePath).data.publicUrl;

      setFormData(prev => ({ ...prev, avatar_url: avatarUrl }));
      setAvatarPreview(avatarUrl);
      toast.success('Avatar uploaded successfully');
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast.error('Failed to upload avatar. You can set it later.');
    } finally {
      setUploading(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    if (!email || !email.trim()) return false;
    
    // FINAL FIX: Super lenient validation - accepts asad@yahoo.com, AMIR@YAHOO.COM, etc.
    const trimmedEmail = email.trim().toLowerCase();
    
    // Simple regex: text@text.text
    const simpleEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    return simpleEmailRegex.test(trimmedEmail);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.full_name.trim()) {
      toast.error('Full Name is required');
      return;
    }
    
    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      toast.error('Email is required');
      return;
    }
    
    // Email format validation
    if (!validateEmail(trimmedEmail)) {
      toast.error('Please enter a valid email address (e.g., user@example.com)');
      return;
    }
    if (!user && !formData.password) {
      toast.error('Password is required for new users');
      return;
    }
    if (formData.password && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      
      // Demo mode: Mock save
      if (isDemoMode()) {
        await mockSave(null);
        
        if (user) {
          toast.success('User updated successfully (Demo Mode)');
        } else {
          toast.success('User created successfully (Demo Mode)');
        }
        
        // Reset form
        setFormData({
          full_name: '',
          username: '',
          email: '',
          password: '',
          role: 'sales_staff',
          status: 'active',
          avatar_url: '',
          permissions: {
            can_view_reports: false,
            can_delete_sales: false,
            can_adjust_stock: false,
          },
          base_salary: 0,
          commission_percentage: 0,
        });
        setAvatarPreview(null);
        onClose();
        setTimeout(() => {
          onSuccess?.();
        }, 100);
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Authentication required');
        return;
      }

      // Get business_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) {
        toast.error('Business profile not found');
        return;
      }

      if (user) {
        // Update existing user
        const updateData: any = {
          role: formData.role,
          updated_at: new Date().toISOString(),
        };
        
        // Add salesman fields if role is salesman
        if (formData.role === 'salesman') {
          updateData.base_salary = formData.base_salary || 0;
          updateData.commission_percentage = formData.commission_percentage || 0;
        }
        
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update(updateData)
          .eq('id', user.id);

        if (updateError) throw updateError;

        toast.success('User updated successfully');
      } else {
        // Create new user using signUp (client-side safe)
        try {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            options: {
              data: {
                full_name: formData.full_name,
                username: formData.username,
                avatar_url: formData.avatar_url,
              },
              emailRedirectTo: `${window.location.origin}/dashboard`,
            }
          });

          if (signUpError) {
            // Better error messages
            if (signUpError.message.includes('invalid') || signUpError.message.includes('Email')) {
              toast.error('Please enter a valid email address (e.g., user@example.com)');
            } else if (signUpError.message.includes('already registered')) {
              toast.error('This email is already registered. Please use a different email.');
            } else {
              toast.error(`Failed to create user: ${signUpError.message}`);
            }
            return;
          }

          if (signUpData?.user) {
            // Create user profile
            const profileInsertData: any = {
              user_id: signUpData.user.id,
              business_id: profile.business_id,
              role: formData.role,
            };
            
            // Add salesman fields if role is salesman (try to include them in insert)
            if (formData.role === 'salesman') {
              // Try to add these fields - will fail gracefully if columns don't exist
              profileInsertData.base_salary = formData.base_salary || 0;
              profileInsertData.commission_percentage = formData.commission_percentage || 0;
            }
            
            const { error: profileError, data: profileData } = await supabase
              .from('user_profiles')
              .insert(profileInsertData)
              .select()
              .single();
            
            // If insert failed due to missing columns, try without salesman fields
            if (profileError && profileError.message.includes('column')) {
              console.warn('Salesman columns not found, creating profile without them');
              
              // Retry without salesman fields
              const { error: retryError } = await supabase
                .from('user_profiles')
                .insert({
                  user_id: signUpData.user.id,
                  business_id: profile.business_id,
                  role: formData.role,
                });
              
              if (retryError) {
                throw retryError;
              }
              
              // Show warning that salesman fields weren't saved
              if (formData.role === 'salesman') {
                toast.warning('User created, but salesman fields could not be saved. Please run the migration to add base_salary and commission_percentage columns.');
              } else {
                toast.success('User created successfully! They will receive a confirmation email.');
              }
            } else if (profileError) {
              throw profileError;
            } else {
              // Success - salesman fields were saved if role is salesman
              if (formData.role === 'salesman' && profileData) {
                console.log('Salesman profile created with salary and commission:', {
                  base_salary: profileData.base_salary,
                  commission_percentage: profileData.commission_percentage
                });
              }
            }

            // Success handling - reset form and close modal
            if (!profileError || (profileError && profileError.message.includes('column'))) {
              // Reset form
              setFormData({
                full_name: '',
                username: '',
                email: '',
                password: '',
                role: 'sales_staff',
                status: 'active',
                avatar_url: '',
                permissions: {
                  can_view_reports: false,
                  can_delete_sales: false,
                  can_adjust_stock: false,
                },
                base_salary: 0,
                commission_percentage: 0,
              });
              setAvatarPreview(null);
              
              // Close modal first
              onClose();
              
              // Then trigger success callback to refresh table
              setTimeout(() => {
                onSuccess?.();
              }, 100);
            }
          }
        } catch (error: any) {
          console.error('User creation error:', error);
          console.error('Error type:', typeof error);
          console.error('Error keys:', error ? Object.keys(error) : 'no keys');
          
          // Better error message handling
          let errorMessage = 'Unknown error';
          
          if (error?.message) {
            errorMessage = error.message;
          } else if (error?.error?.message) {
            errorMessage = error.error.message;
          } else if (typeof error === 'string') {
            errorMessage = error;
          } else if (error?.toString && error.toString() !== '[object Object]') {
            errorMessage = error.toString();
          } else {
            // Try to extract meaningful info from error object
            const errorStr = JSON.stringify(error);
            if (errorStr && errorStr !== '{}') {
              errorMessage = errorStr;
            } else {
              errorMessage = 'Failed to create user. Please check console for details.';
            }
          }
          
          // Specific error messages
          if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
            toast.error('This email is already registered. Please use a different email.');
          } else if (errorMessage.includes('invalid') || errorMessage.includes('Email')) {
            toast.error('Please enter a valid email address.');
          } else if (errorMessage.includes('password')) {
            toast.error('Password must be at least 6 characters long.');
          } else {
            toast.error(`Failed to create user: ${errorMessage}`);
          }
        }
      }
    } catch (error: any) {
      console.error('Form submission error:', error);
      
      // Better error message handling
      let errorMessage = 'Unknown error';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.toString && error.toString() !== '[object Object]') {
        errorMessage = error.toString();
      } else {
        errorMessage = JSON.stringify(error) || 'Unknown error occurred';
      }
      
      toast.error(`Failed to ${user ? 'update' : 'create'} user: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-0">
        {/* Header with DialogTitle */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <DialogTitle className="text-xl font-bold text-white">
            {user ? 'Edit User' : 'Create New User'}
          </DialogTitle>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Profile Image Section */}
          <div className="flex items-center gap-6 pb-6 border-b border-slate-800">
            <div className="relative">
              <Avatar className="h-24 w-24 border-2 border-slate-700">
                <AvatarImage src={avatarPreview || undefined} />
                <AvatarFallback className="bg-slate-800 text-slate-400 text-2xl">
                  {formData.full_name
                    ? formData.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
                    : <ImageIcon size={32} />}
                </AvatarFallback>
              </Avatar>
              {uploading && (
                <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center rounded-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              )}
            </div>
            <div className="flex-1">
              <Label className="text-slate-300 mb-2 block">Profile Image</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
              >
                <Upload size={16} className="mr-2" />
                {avatarPreview ? 'Change Image' : 'Upload Image'}
              </Button>
              <p className="text-xs text-slate-500 mt-2">Recommended: 200x200px, PNG or JPG (max 5MB)</p>
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <User size={20} />
              Basic Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name" className="text-slate-300 mb-2 block">
                  Full Name *
                </Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  placeholder="John Doe"
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>

              <div>
                <Label htmlFor="username" className="text-slate-300 mb-2 block">
                  Username
                </Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="johndoe"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-slate-300 mb-2 block">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="john@example.com"
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>

              {!user && (
                <div>
                  <Label htmlFor="password" className="text-slate-300 mb-2 block">
                    Password *
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="••••••••"
                    className="bg-slate-800 border-slate-700 text-white"
                    required={!user}
                    minLength={6}
                  />
                  <p className="text-xs text-slate-500 mt-1">Minimum 6 characters</p>
                </div>
              )}
            </div>
          </div>

          {/* Role and Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <Shield size={20} />
              Role & Status
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role" className="text-slate-300 mb-2 block">
                  Role *
                </Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="sales_staff">Sales Staff</option>
                  <option value="salesman">Salesman</option>
                </select>
              </div>

              <div>
                <Label className="text-slate-300 mb-2 block">Status</Label>
                <div className="flex items-center gap-3 pt-2">
                  <Switch
                    checked={formData.status === 'active'}
                    onCheckedChange={(checked) => handleInputChange('status', checked ? 'active' : 'inactive')}
                    label={formData.status === 'active' ? 'Active' : 'Inactive'}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Salesman-Specific Fields */}
          {formData.role === 'salesman' && (
            <div className="space-y-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-indigo-300 flex items-center gap-2">
                <Shield size={20} />
                Salesman Compensation
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="base_salary" className="text-slate-300 mb-2 block">
                    Base Monthly Salary
                  </Label>
                  <Input
                    id="base_salary"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.base_salary || ''}
                    onChange={(e) => handleInputChange('base_salary', parseFloat(e.target.value) || 0)}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      e.target.value = val.toFixed(2);
                      handleInputChange('base_salary', val);
                    }}
                    placeholder="0.00"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">Fixed monthly salary amount</p>
                </div>

                <div>
                  <Label htmlFor="commission_percentage" className="text-slate-300 mb-2 block">
                    Sales Commission %
                  </Label>
                  <Input
                    id="commission_percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.commission_percentage || ''}
                    onChange={(e) => handleInputChange('commission_percentage', parseFloat(e.target.value) || 0)}
                    onBlur={(e) => {
                      const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                      e.target.value = val.toFixed(2);
                      handleInputChange('commission_percentage', val);
                    }}
                    placeholder="0.00"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">Percentage of sales value (0-100)</p>
                </div>
              </div>
            </div>
          )}

          {/* Permissions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <CheckCircle2 size={20} />
              Permissions
            </h3>

            <div className="space-y-3 bg-slate-800/50 rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.permissions.can_view_reports}
                  onChange={(e) => handlePermissionChange('can_view_reports', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-slate-300 group-hover:text-white transition-colors">
                  Can view reports
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.permissions.can_delete_sales}
                  onChange={(e) => handlePermissionChange('can_delete_sales', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-slate-300 group-hover:text-white transition-colors">
                  Can delete sales
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.permissions.can_adjust_stock}
                  onChange={(e) => handlePermissionChange('can_adjust_stock', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-slate-300 group-hover:text-white transition-colors">
                  Can adjust stock
                </span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {loading ? 'Saving...' : user ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

