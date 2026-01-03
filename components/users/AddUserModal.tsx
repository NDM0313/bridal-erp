'use client';

import { useState } from 'react';
import { X, User, Mail, Lock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddUserModal({ isOpen, onClose, onSuccess }: AddUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'cashier' as 'admin' | 'manager' | 'cashier' | 'inventory_clerk',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Note: Creating users requires admin privileges
      // This is a client-side attempt - in production, use a server action or API route
      const { data, error } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true,
        user_metadata: {
          full_name: formData.fullName,
        },
      });

      if (error) {
        // If admin API is not available, show helpful message
        if (error.message.includes('admin') || error.message.includes('permission')) {
          toast.error('User creation requires admin access. Please use the Supabase dashboard or contact your administrator.');
        } else {
          toast.error(`Failed to create user: ${error.message}`);
        }
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Create user profile
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Authentication required');
        }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('business_id')
          .eq('user_id', session.user.id)
          .single();

        if (profile?.business_id) {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: data.user.id,
              business_id: profile.business_id,
              role: formData.role,
            });

          if (profileError) {
            toast.error(`User created but profile failed: ${profileError.message}`);
          } else {
            toast.success('User created successfully!');
            setFormData({ email: '', password: '', fullName: '', role: 'cashier' });
            onSuccess?.();
            onClose();
          }
        }
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(`Failed to create user: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-[#111827] rounded-lg w-full max-w-md border border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <User className="text-blue-400" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Add New User</h2>
              <p className="text-sm text-gray-400">Create a new user account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label htmlFor="fullName" className="text-gray-300 mb-2 flex items-center gap-2">
              <User size={16} />
              Full Name
            </Label>
            <Input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="John Doe"
              className="bg-[#0B0F1A] border-gray-800 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-gray-300 mb-2 flex items-center gap-2">
              <Mail size={16} />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="user@example.com"
              className="bg-[#0B0F1A] border-gray-800 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-gray-300 mb-2 flex items-center gap-2">
              <Lock size={16} />
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              className="bg-[#0B0F1A] border-gray-800 text-white"
              required
              minLength={6}
            />
          </div>

          <div>
            <Label htmlFor="role" className="text-gray-300 mb-2 flex items-center gap-2">
              <Shield size={16} />
              Role
            </Label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="w-full bg-[#0B0F1A] border border-gray-800 rounded-lg px-4 py-2.5 text-white"
            >
              <option value="cashier">Cashier</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
              <option value="inventory_clerk">Inventory Clerk</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

