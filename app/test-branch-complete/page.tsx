/**
 * Complete Branch Test Page
 * Tests:
 * 1. Branch List Loading
 * 2. Branch Creation
 * 3. Email Validation
 * 4. Database Connection
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Plus, CheckCircle2, XCircle, Loader2, RefreshCw, Mail, UserPlus, Users, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { useBranchV2 } from '@/lib/context/BranchContextV2';
import { cn } from '@/lib/utils';

interface Branch {
  id: number;
  business_id: number;
  name: string;
  code?: string;
  location?: string;
  is_active: boolean;
}

interface Salesman {
  id: number;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  base_salary?: number;
  commission_percentage?: number;
  business_id: number;
}

export default function TestBranchCompletePage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { status: 'pass' | 'fail' | 'pending'; message: string }>>({});
  
  // Branch form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: '',
    email: '', // For email validation test
  });

  // Salesman form state
  const [salesmanForm, setSalesmanForm] = useState({
    full_name: '',
    email: '',
    password: '',
    base_salary: '',
    commission_percentage: '',
  });

  const { activeBranch, branches: contextBranches, switchBranch } = useBranchV2();

  // Test 1: Load Branches
  const testLoadBranches = async () => {
    setTestResults(prev => ({ ...prev, loadBranches: { status: 'pending', message: 'Testing...' } }));
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setTestResults(prev => ({ ...prev, loadBranches: { status: 'fail', message: 'No session - please login' } }));
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) {
        setTestResults(prev => ({ ...prev, loadBranches: { status: 'fail', message: 'No business_id found' } }));
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('business_locations')
        .select('*')
        .eq('business_id', profile.business_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        setTestResults(prev => ({ ...prev, loadBranches: { status: 'fail', message: `Error: ${error.message}` } }));
        setLoading(false);
        return;
      }

      const branchesData: Branch[] = (data || []).map((loc: any) => ({
        id: loc.id,
        business_id: loc.business_id,
        name: loc.name || 'Unnamed Branch',
        code: loc.custom_field1 || `BR-${loc.id}`,
        location: loc.landmark || '',
        is_active: !loc.deleted_at,
      }));

      setBranches(branchesData);
      setTestResults(prev => ({ ...prev, loadBranches: { status: 'pass', message: `✅ Loaded ${branchesData.length} branches` } }));
      
      toast.success(`Loaded ${branchesData.length} branches`);
    } catch (err: any) {
      setTestResults(prev => ({ ...prev, loadBranches: { status: 'fail', message: `Exception: ${err.message}` } }));
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  // Test 2: Create Branch
  const testCreateBranch = async () => {
    if (!formData.name.trim()) {
      toast.error('Branch name is required');
      return;
    }

    setTestResults(prev => ({ ...prev, createBranch: { status: 'pending', message: 'Testing...' } }));
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setTestResults(prev => ({ ...prev, createBranch: { status: 'fail', message: 'No session' } }));
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) {
        setTestResults(prev => ({ ...prev, createBranch: { status: 'fail', message: 'No business_id' } }));
        setLoading(false);
        return;
      }

      // Auto-generate code if not provided
      let finalCode = formData.code.trim().toUpperCase();
      if (!finalCode) {
        const words = formData.name.trim().split(/\s+/);
        if (words.length === 1) {
          finalCode = words[0].substring(0, 3).toUpperCase();
        } else {
          finalCode = words.map(w => w[0]).join('').toUpperCase();
        }
      }

      const insertData: any = {
        business_id: profile.business_id,
        name: formData.name,
        landmark: formData.location || null,
        custom_field1: finalCode, // Store code here
      };

      const { data, error } = await supabase
        .from('business_locations')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        setTestResults(prev => ({ ...prev, createBranch: { status: 'fail', message: `Error: ${error.message}` } }));
        toast.error(`Failed: ${error.message}`);
        setLoading(false);
        return;
      }

      setTestResults(prev => ({ ...prev, createBranch: { status: 'pass', message: `✅ Branch created: ${data.name}` } }));
      toast.success('Branch created successfully!');
      
      // Reset form
      setFormData({ name: '', code: '', location: '', email: '' });
      
      // Reload branches
      await testLoadBranches();
    } catch (err: any) {
      setTestResults(prev => ({ ...prev, createBranch: { status: 'fail', message: `Exception: ${err.message}` } }));
      toast.error('Failed to create branch');
    } finally {
      setLoading(false);
    }
  };

  // Test 3: Email Validation
  const testEmailValidation = () => {
    const email = formData.email.trim();
    
    if (!email) {
      setTestResults(prev => ({ ...prev, emailValidation: { status: 'fail', message: 'Email is empty' } }));
      return;
    }

    // Simple email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email.toLowerCase());

    if (isValid) {
      setTestResults(prev => ({ ...prev, emailValidation: { status: 'pass', message: `✅ Valid email: ${email}` } }));
      toast.success('Email is valid');
    } else {
      setTestResults(prev => ({ ...prev, emailValidation: { status: 'fail', message: `❌ Invalid email format: ${email}` } }));
      toast.error('Invalid email format');
    }
  };

  // Test 4: Context Branches
  const testContextBranches = () => {
    if (contextBranches.length === 0) {
      setTestResults(prev => ({ ...prev, contextBranches: { status: 'fail', message: 'No branches in context' } }));
      return;
    }

    setTestResults(prev => ({ ...prev, contextBranches: { status: 'pass', message: `✅ ${contextBranches.length} branches in context` } }));
    toast.success(`Context has ${contextBranches.length} branches`);
  };

  // Test 5: Load Salesmen
  const testLoadSalesmen = async () => {
    setTestResults(prev => ({ ...prev, loadSalesmen: { status: 'pending', message: 'Testing...' } }));
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setTestResults(prev => ({ ...prev, loadSalesmen: { status: 'fail', message: 'No session - please login' } }));
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) {
        setTestResults(prev => ({ ...prev, loadSalesmen: { status: 'fail', message: 'No business_id found' } }));
        setLoading(false);
        return;
      }

      // Fetch salesmen (users with role = 'salesman')
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, user_id, role, base_salary, commission_percentage, business_id')
        .eq('business_id', profile.business_id)
        .eq('role', 'salesman');

      if (profilesError) {
        setTestResults(prev => ({ ...prev, loadSalesmen: { status: 'fail', message: `Error: ${profilesError.message}` } }));
        setLoading(false);
        return;
      }

      if (!profiles || profiles.length === 0) {
        setSalesmen([]);
        setTestResults(prev => ({ ...prev, loadSalesmen: { status: 'pass', message: '✅ No salesmen found (0 salesmen)' } }));
        setLoading(false);
        return;
      }

      // Map profiles to salesmen (email will be fetched separately if needed)
      const salesmenData: Salesman[] = profiles.map((prof: any) => {
        // Try to get email from user metadata or use placeholder
        // Note: Frontend can't directly query auth.users, so email might be N/A
        return {
          id: prof.id,
          user_id: prof.user_id,
          email: 'Check in Supabase Dashboard', // Frontend can't access auth.users directly
          full_name: 'N/A', // Will be fetched from auth.users via backend if needed
          role: prof.role,
          base_salary: prof.base_salary || 0,
          commission_percentage: prof.commission_percentage || 0,
          business_id: prof.business_id,
        };
      });

      setSalesmen(salesmenData);
      setTestResults(prev => ({ ...prev, loadSalesmen: { status: 'pass', message: `✅ Loaded ${salesmenData.length} salesmen` } }));
      toast.success(`Loaded ${salesmenData.length} salesmen`);
    } catch (err: any) {
      setTestResults(prev => ({ ...prev, loadSalesmen: { status: 'fail', message: `Exception: ${err.message}` } }));
      toast.error('Failed to load salesmen');
    } finally {
      setLoading(false);
    }
  };

  // Test 6: Create Salesman
  const testCreateSalesman = async () => {
    // Validation
    if (!salesmanForm.full_name.trim()) {
      toast.error('Full name is required');
      return;
    }
    if (!salesmanForm.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!salesmanForm.password.trim()) {
      toast.error('Password is required');
      return;
    }
    if (salesmanForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(salesmanForm.email.toLowerCase())) {
      toast.error('Invalid email format');
      return;
    }

    setTestResults(prev => ({ ...prev, createSalesman: { status: 'pending', message: 'Testing...' } }));
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setTestResults(prev => ({ ...prev, createSalesman: { status: 'fail', message: 'No session' } }));
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) {
        setTestResults(prev => ({ ...prev, createSalesman: { status: 'fail', message: 'No business_id' } }));
        setLoading(false);
        return;
      }

      // Step 1: Create auth user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: salesmanForm.email.trim().toLowerCase(),
        password: salesmanForm.password,
        options: {
          data: {
            full_name: salesmanForm.full_name,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        }
      });

      if (signUpError) {
        setTestResults(prev => ({ ...prev, createSalesman: { status: 'fail', message: `SignUp Error: ${signUpError.message}` } }));
        toast.error(`Failed to create user: ${signUpError.message}`);
        setLoading(false);
        return;
      }

      if (!signUpData?.user) {
        setTestResults(prev => ({ ...prev, createSalesman: { status: 'fail', message: 'User creation failed - no user returned' } }));
        setLoading(false);
        return;
      }

      // Step 2: Create user profile with salesman fields
      const profileData: any = {
        user_id: signUpData.user.id,
        business_id: profile.business_id,
        role: 'salesman',
      };

      // Add salesman fields if provided
      if (salesmanForm.base_salary) {
        profileData.base_salary = parseFloat(salesmanForm.base_salary) || 0;
      }
      if (salesmanForm.commission_percentage) {
        profileData.commission_percentage = parseFloat(salesmanForm.commission_percentage) || 0;
      }

      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert(profileData);

      if (profileError) {
        // If salesman columns don't exist, try without them
        if (profileError.message.includes('column') || profileError.code === '42703') {
          const { error: retryError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: signUpData.user.id,
              business_id: profile.business_id,
              role: 'salesman',
            });

          if (retryError) {
            setTestResults(prev => ({ ...prev, createSalesman: { status: 'fail', message: `Profile Error: ${retryError.message}` } }));
            setLoading(false);
            return;
          }
        } else {
          setTestResults(prev => ({ ...prev, createSalesman: { status: 'fail', message: `Profile Error: ${profileError.message}` } }));
          setLoading(false);
          return;
        }
      }

      setTestResults(prev => ({ ...prev, createSalesman: { status: 'pass', message: `✅ Salesman created: ${salesmanForm.full_name}` } }));
      toast.success('Salesman created successfully!');
      
      // Reset form
      setSalesmanForm({ full_name: '', email: '', password: '', base_salary: '', commission_percentage: '' });
      
      // Reload salesmen
      await testLoadSalesmen();
    } catch (err: any) {
      setTestResults(prev => ({ ...prev, createSalesman: { status: 'fail', message: `Exception: ${err.message}` } }));
      toast.error('Failed to create salesman');
    } finally {
      setLoading(false);
    }
  };

  // Auto-load on mount
  useEffect(() => {
    testLoadBranches();
    testLoadSalesmen();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Building2 className="text-indigo-400" size={32} />
            Complete Test Page (Branches + Salesmen)
          </h1>
          <p className="text-slate-400">Test branch loading, creation, email validation, and salesman management</p>
        </div>

        {/* Test Results */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Test Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(testResults).map(([test, result]) => (
              <div
                key={test}
                className={cn(
                  'p-4 rounded-lg border',
                  result.status === 'pass' && 'bg-green-500/10 border-green-500/50',
                  result.status === 'fail' && 'bg-red-500/10 border-red-500/50',
                  result.status === 'pending' && 'bg-yellow-500/10 border-yellow-500/50'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  {result.status === 'pass' && <CheckCircle2 className="text-green-400" size={20} />}
                  {result.status === 'fail' && <XCircle className="text-red-400" size={20} />}
                  {result.status === 'pending' && <Loader2 className="text-yellow-400 animate-spin" size={20} />}
                  <span className="font-medium text-white capitalize">{test.replace(/([A-Z])/g, ' $1').trim()}</span>
                </div>
                <p className="text-sm text-slate-300">{result.message}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Test Actions */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Test Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              onClick={testLoadBranches}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500"
            >
              <RefreshCw className={cn("mr-2", loading && "animate-spin")} size={18} />
              Test Load Branches
            </Button>
            <Button
              onClick={testContextBranches}
              className="bg-purple-600 hover:bg-purple-500"
            >
              <Building2 className="mr-2" size={18} />
              Test Context Branches
            </Button>
            <Button
              onClick={testEmailValidation}
              className="bg-blue-600 hover:bg-blue-500"
            >
              <Mail className="mr-2" size={18} />
              Test Email Validation
            </Button>
            <Button
              onClick={testCreateBranch}
              disabled={loading}
              className="bg-green-600 hover:bg-green-500"
            >
              <Plus className="mr-2" size={18} />
              Test Create Branch
            </Button>
            <Button
              onClick={testLoadSalesmen}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-500"
            >
              <Users className={cn("mr-2", loading && "animate-spin")} size={18} />
              Test Load Salesmen
            </Button>
            <Button
              onClick={testCreateSalesman}
              disabled={loading}
              className="bg-teal-600 hover:bg-teal-500"
            >
              <UserPlus className="mr-2" size={18} />
              Test Create Salesman
            </Button>
          </div>
        </div>

        {/* Create Branch Form */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Create Test Branch</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-slate-300">Branch Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Test Branch"
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <Label htmlFor="code" className="text-slate-300">Branch Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="Auto-generated if empty"
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <Label htmlFor="location" className="text-slate-300">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Main Street"
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-slate-300">Email (For Validation Test)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="test@example.com"
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>
          </div>
        </div>

        {/* Branches List */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Loaded Branches ({branches.length})</h2>
            <div className="text-sm text-slate-400">
              Active Branch: <span className="text-indigo-400 font-medium">{activeBranch?.name || 'None'}</span>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="animate-spin text-indigo-400 mx-auto mb-2" size={32} />
              <p className="text-slate-400">Loading branches...</p>
            </div>
          ) : branches.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="text-slate-600 mx-auto mb-2" size={48} />
              <p className="text-slate-400">No branches found</p>
              <p className="text-slate-500 text-sm mt-2">Click "Test Load Branches" to fetch from database</p>
            </div>
          ) : (
            <div className="space-y-2">
              {branches.map((branch) => (
                <div
                  key={branch.id}
                  className={cn(
                    'p-4 rounded-lg border flex items-center justify-between',
                    activeBranch?.id === branch.id
                      ? 'bg-indigo-500/10 border-indigo-500/50'
                      : 'bg-slate-800/50 border-slate-700'
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{branch.name}</span>
                      {branch.code && (
                        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                          {branch.code}
                        </span>
                      )}
                      {activeBranch?.id === branch.id && (
                        <span className="text-xs bg-indigo-500 text-white px-2 py-1 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    {branch.location && (
                      <p className="text-sm text-slate-400 mt-1">{branch.location}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => switchBranch(branch.id)}
                    className="bg-indigo-600 hover:bg-indigo-500"
                  >
                    Select
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Salesman Form */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <UserPlus className="text-teal-400" size={24} />
            Add Salesman
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="salesman_name" className="text-slate-300">Full Name *</Label>
              <Input
                id="salesman_name"
                value={salesmanForm.full_name}
                onChange={(e) => setSalesmanForm({ ...salesmanForm, full_name: e.target.value })}
                placeholder="e.g., Mohsin"
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <Label htmlFor="salesman_email" className="text-slate-300">Email *</Label>
              <Input
                id="salesman_email"
                type="email"
                value={salesmanForm.email}
                onChange={(e) => setSalesmanForm({ ...salesmanForm, email: e.target.value })}
                placeholder="e.g., mhm313@yahoo.com"
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <Label htmlFor="salesman_password" className="text-slate-300">Password *</Label>
              <Input
                id="salesman_password"
                type="password"
                value={salesmanForm.password}
                onChange={(e) => setSalesmanForm({ ...salesmanForm, password: e.target.value })}
                placeholder="Min 6 characters"
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <Label htmlFor="salesman_salary" className="text-slate-300">Base Salary (Rs.)</Label>
              <Input
                id="salesman_salary"
                type="number"
                value={salesmanForm.base_salary}
                onChange={(e) => setSalesmanForm({ ...salesmanForm, base_salary: e.target.value })}
                placeholder="e.g., 40000"
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <Label htmlFor="salesman_commission" className="text-slate-300">Commission (%)</Label>
              <Input
                id="salesman_commission"
                type="number"
                step="0.1"
                value={salesmanForm.commission_percentage}
                onChange={(e) => setSalesmanForm({ ...salesmanForm, commission_percentage: e.target.value })}
                placeholder="e.g., 1.0"
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>
          </div>
        </div>

        {/* Salesmen List */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Users className="text-orange-400" size={24} />
              Loaded Salesmen ({salesmen.length})
            </h2>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="animate-spin text-orange-400 mx-auto mb-2" size={32} />
              <p className="text-slate-400">Loading salesmen...</p>
            </div>
          ) : salesmen.length === 0 ? (
            <div className="text-center py-8">
              <Users className="text-slate-600 mx-auto mb-2" size={48} />
              <p className="text-slate-400">No salesmen found</p>
              <p className="text-slate-500 text-sm mt-2">Click "Test Load Salesmen" to fetch from database</p>
            </div>
          ) : (
            <div className="space-y-2">
              {salesmen.map((salesman) => (
                <div
                  key={salesman.id}
                  className="p-4 rounded-lg border bg-slate-800/50 border-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{salesman.full_name}</span>
                        <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded">
                          Salesman
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">{salesman.email}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        {salesman.base_salary !== null && salesman.base_salary !== undefined && (
                          <div className="flex items-center gap-1 text-slate-300">
                            <DollarSign size={14} />
                            <span>Salary: Rs. {salesman.base_salary.toLocaleString()}</span>
                          </div>
                        )}
                        {salesman.commission_percentage !== null && salesman.commission_percentage !== undefined && (
                          <div className="text-slate-300">
                            <span>Commission: {salesman.commission_percentage}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Context Branches Info */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Context Branches Info</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Context Branches Count:</span>
              <span className="text-white font-medium">{contextBranches.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Active Branch:</span>
              <span className="text-white font-medium">{activeBranch?.name || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Active Branch ID:</span>
              <span className="text-white font-medium">{activeBranch?.id || 'None'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
