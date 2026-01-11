/**
 * Production Setup Screen
 * Configure production workflow for a sale (DYNAMIC STEPS)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';

interface StepConfig {
  id: string; // temp ID for UI
  step_name: 'Dyeing' | 'Handwork' | 'Stitching';
  enabled: boolean;
  order: number;
  assigned_vendor_id?: number;
  expected_completion_date?: string;
  cost?: number;
  notes?: string;
}

interface Vendor {
  id: number;
  name: string;
  type?: string;
  is_worker?: boolean;
  role?: string;
}

interface ProductionSetupScreenProps {
  saleId: number;
  onComplete?: () => void;
}

export default function ProductionSetupScreen({
  saleId,
  onComplete,
}: ProductionSetupScreenProps) {
  const router = useRouter();
  const [saleInfo, setSaleInfo] = useState<any>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [workers, setWorkers] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [activeStepForVendor, setActiveStepForVendor] = useState<string | null>(null);
  const [newVendor, setNewVendor] = useState<{
    name: string;
    mobile: string;
    type: 'supplier' | 'worker' | 'both';
  }>({
    name: '',
    mobile: '',
    type: 'supplier',
  });

  // Step configuration
  const [steps, setSteps] = useState<StepConfig[]>([
    {
      id: 'dyeing',
      step_name: 'Dyeing',
      enabled: false,
      order: 1,
    },
    {
      id: 'handwork',
      step_name: 'Handwork',
      enabled: false,
      order: 2,
    },
    {
      id: 'stitching',
      step_name: 'Stitching',
      enabled: false,
      order: 3,
    },
  ]);

  useEffect(() => {
    fetchSetupData();
  }, [saleId]);

  // Debug: Log workers when they change
  useEffect(() => {
    console.log('Workers state updated:', workers);
    console.log('Workers count:', workers.length);
  }, [workers]);

  // Debug: Log vendors when they change
  useEffect(() => {
    console.log('Vendors state updated:', vendors);
    console.log('Vendors count:', vendors.length);
  }, [vendors]);

  const fetchSetupData = async () => {
    try {
      setLoading(true);

      // Fetch sale info
      const { data: sale } = await supabase
        .from('transactions')
        .select(`
          id,
          invoice_no,
          final_total,
          contact_id
        `)
        .eq('id', saleId)
        .eq('type', 'sell')
        .single();

      if (sale) {
        // Fetch customer name separately
        let customerName = 'Walk-in Customer';
        if (sale.contact_id) {
          const { data: contact } = await supabase
            .from('contacts')
            .select('name')
            .eq('id', sale.contact_id)
            .single();
          if (contact) {
            customerName = contact.name;
          }
        }

        setSaleInfo({
          ...sale,
          customer_name: customerName,
        });
      }

      // Fetch vendors/workers
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (profile) {
        // Fetch vendors (suppliers)
        const { data: vendorsData, error: vendorsError } = await supabase
          .from('contacts')
          .select('id, name, type, address_line_1')
          .eq('business_id', profile.business_id)
          .in('type', ['supplier', 'both']);

        if (vendorsError) {
          console.error('Error fetching vendors:', vendorsError);
        } else {
          console.log('Vendors query result:', vendorsData);
        }

        // Fetch workers (separate type)
        const { data: workersData, error: workersError } = await supabase
          .from('contacts')
          .select('id, name, type, address_line_1')
          .eq('business_id', profile.business_id)
          .eq('type', 'worker');

        if (workersError) {
          console.error('Error fetching workers:', workersError);
        } else {
          console.log('Workers query result:', workersData);
          console.log('Workers count:', workersData?.length || 0);
        }

        if (workersError) {
          console.error('Error fetching workers:', workersError);
        } else {
          console.log('Workers query result:', workersData);
        }

        if (vendorsData) {
          const vendorsList: Vendor[] = vendorsData.map((c: any) => {
            // Extract role from address_line_1 if present
            let role = undefined;
            if (c.address_line_1 && c.address_line_1.startsWith('Role:')) {
              role = c.address_line_1.replace('Role: ', '');
            }

            return {
              id: c.id,
              name: c.name,
              type: c.type,
              role,
              is_worker: false,
            };
          });
          setVendors(vendorsList);
        }

        if (workersData) {
          const workersList: Vendor[] = workersData.map((c: any) => {
            // Extract category from address_line_1
            // Format can be: "Tailor", "Dyer", "Category: Tailor", "Worker: Tailor", or "Role: Tailor"
            let role = undefined;
            if (c.address_line_1) {
              const category = c.address_line_1.trim();
              // Remove common prefixes if present
              if (category.startsWith('Category:')) {
                role = category.replace(/^Category:\s*/i, '').trim();
              } else if (category.startsWith('Worker:')) {
                role = category.replace(/^Worker:\s*/i, '').trim();
              } else if (category.startsWith('Role:')) {
                role = category.replace(/^Role:\s*/i, '').trim();
              } else {
                // Direct category value (Tailor, Dyer, etc.)
                role = category;
              }
            }

            return {
              id: c.id,
              name: c.name,
              type: c.type,
              role: role || undefined, // Show category as role
              is_worker: true,
            };
          });
          console.log('Loaded workers:', workersList);
          setWorkers(workersList);
        } else {
          console.log('No workers data returned from query');
        }
      }

    } catch (err) {
      console.error('Failed to load setup data:', err);
      toast.error('Failed to load setup data');
    } finally {
      setLoading(false);
    }
  };

  const toggleStep = (stepId: string) => {
    setSteps(prev => prev.map(s => 
      s.id === stepId ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const updateStep = (stepId: string, field: keyof StepConfig, value: any) => {
    setSteps(prev => prev.map(s => 
      s.id === stepId ? { ...s, [field]: value } : s
    ));
  };

  const moveStepUp = (stepId: string) => {
    const index = steps.findIndex(s => s.id === stepId);
    if (index === 0) return;

    const newSteps = [...steps];
    [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
    
    // Update order numbers
    newSteps.forEach((step, idx) => {
      step.order = idx + 1;
    });

    setSteps(newSteps);
  };

  const moveStepDown = (stepId: string) => {
    const index = steps.findIndex(s => s.id === stepId);
    if (index === steps.length - 1) return;

    const newSteps = [...steps];
    [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
    
    // Update order numbers
    newSteps.forEach((step, idx) => {
      step.order = idx + 1;
    });

    setSteps(newSteps);
  };

  const handleAddVendor = async () => {
    if (!newVendor.name.trim()) {
      toast.error('Please enter vendor name');
      return;
    }

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        toast.error('Authentication error: ' + sessionError.message);
        return;
      }
      if (!session) {
        toast.error('Not authenticated. Please log in.');
        return;
      }

      console.log('User authenticated:', session.user.id);

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        toast.error('Failed to fetch profile: ' + profileError.message);
        return;
      }

      if (!profile || !profile.business_id) {
        toast.error('Business profile not found');
        return;
      }

      console.log('Business ID:', profile.business_id);
      console.log('Creating contact with type:', newVendor.type);

      // Prepare contact data
      const contactData = {
        business_id: profile.business_id,
        name: newVendor.name.trim(),
        mobile: newVendor.mobile.trim() || null,
        type: newVendor.type,
        created_by: session.user.id,
      };

      console.log('Inserting contact:', contactData);

      // Add vendor to contacts
      const { data: vendor, error } = await supabase
        .from('contacts')
        .insert(contactData)
        .select()
        .single();

      if (error) {
        console.error('=== SUPABASE INSERT ERROR ===');
        console.error('Full error object:', JSON.stringify(error, null, 2));
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        console.error('=============================');
        throw error;
      }

      if (!vendor) {
        throw new Error('Contact created but no data returned');
      }

      console.log('Contact created successfully:', vendor);

      // Add to appropriate list based on type
      if (vendor.type === 'worker') {
        setWorkers([...workers, { id: vendor.id, name: vendor.name, type: 'worker', is_worker: true }]);
      } else {
        setVendors([...vendors, { id: vendor.id, name: vendor.name, type: vendor.type, is_worker: false }]);
      }

      // Auto-select for the step
      if (activeStepForVendor) {
        updateStep(activeStepForVendor, 'assigned_vendor_id', vendor.id);
      }

      // Reset form
      setNewVendor({ name: '', mobile: '', type: 'supplier' });
      setShowAddVendor(false);
      setActiveStepForVendor(null);

      toast.success(`${vendor.type === 'worker' ? 'Worker' : 'Supplier'} "${vendor.name}" added successfully`);
    } catch (err: any) {
      console.error('=== CATCH BLOCK ERROR ===');
      console.error('Full error:', err);
      console.error('Error type:', typeof err);
      console.error('Error keys:', err ? Object.keys(err) : 'null');
      console.error('Error.message:', err?.message);
      console.error('Error.code:', err?.code);
      console.error('Error.details:', err?.details);
      console.error('Error.hint:', err?.hint);
      console.error('JSON stringify:', JSON.stringify(err, null, 2));
      console.error('========================');
      
      let errorMessage = 'Failed to add contact';
      
      if (err?.message) {
        errorMessage = err.message;
        console.log('Using err.message:', errorMessage);
      } else if (err?.error?.message) {
        errorMessage = err.error.message;
        console.log('Using err.error.message:', errorMessage);
      } else if (typeof err === 'string') {
        errorMessage = err;
        console.log('Using string error:', errorMessage);
      }
      
      // Check for common issues
      if (err?.code === '42501' || err?.message?.includes('row-level security')) {
        errorMessage = 'Permission denied. Please check database RLS policies for contacts table.';
        console.log('RLS error detected');
      } else if (err?.code === '23505') {
        errorMessage = 'A contact with this information already exists.';
        console.log('Duplicate detected');
      } else if (err?.code === '23503') {
        errorMessage = 'Invalid business or user reference.';
        console.log('Foreign key error');
      } else if (err?.code === '23502') {
        errorMessage = 'Required field is missing (check business_id, name, or type).';
        console.log('Not null violation');
      } else if (err?.code === '23514') {
        errorMessage = 'Invalid contact type. Database constraint needs updating. Run: database/FIX_WORKER_TYPE_CONSTRAINT.sql';
        console.log('CHECK constraint violation - type not allowed');
      } else if (err?.code) {
        errorMessage = `Database error (code: ${err.code}): ${err.message || 'Unknown error'}`;
        console.log('Generic database error with code');
      }
      
      console.log('Final error message:', errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleSaveAndStart = async () => {
    const enabledSteps = steps.filter(s => s.enabled);

    if (enabledSteps.length === 0) {
      toast.error('Please select at least one production step');
      return;
    }

    // Validate each enabled step
    for (const step of enabledSteps) {
      if (!step.assigned_vendor_id) {
        toast.error(`Please assign a vendor for ${step.step_name}`);
        return;
      }
      if (!step.expected_completion_date) {
        toast.error(`Please set expected completion date for ${step.step_name}`);
        return;
      }
      if (!step.cost || step.cost <= 0) {
        toast.error(`Please enter cost for ${step.step_name}`);
        return;
      }
    }

    try {
      setSaving(true);

      // Get session for user info
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) {
        toast.error('Profile not found');
        return;
      }

      // Get location_id from sale
      const { data: saleData } = await supabase
        .from('transactions')
        .select('location_id, contact_id')
        .eq('id', saleId)
        .single();

      // Create production order
      const { data: order, error: orderError } = await supabase
        .from('production_orders')
        .insert({
          business_id: profile.business_id,
          customer_id: saleData?.contact_id || null,
          order_no: `PO-${saleInfo.invoice_no}`,
          transaction_id: saleId,
          status: 'new',
          deadline_date: enabledSteps[enabledSteps.length - 1].expected_completion_date,
          total_cost: enabledSteps.reduce((sum, step) => sum + (step.cost || 0), 0),
          final_price: saleInfo.final_total || 0,
          description: `Production order for sale ${saleInfo.invoice_no}`,
          location_id: saleData?.location_id || null,
          created_by: session.user.id,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create production steps
      const stepsToInsert = enabledSteps.map((step, index) => ({
        production_order_id: order.id,
        step_name: step.step_name,
        cost: step.cost || 0,
        status: 'pending',
        step_qty: null,
        completed_qty: 0,
        notes: step.notes || null,
      }));

      const { error: stepsError } = await supabase
        .from('production_steps')
        .insert(stepsToInsert);

      if (stepsError) throw stepsError;

      toast.success(`Production order ${order.order_no} created successfully!`);
      
      // Redirect to production flow page
      if (onComplete) {
        onComplete();
      } else {
        router.push(`/dashboard/production/${order.id}`);
      }

    } catch (err: any) {
      console.error('Failed to create production order:', err);
      toast.error(err.message || 'Failed to create production order');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Production Setup</h1>
          <p className="text-gray-400 mt-1">
            Configure production workflow for {saleInfo?.invoice_no}
          </p>
        </div>
      </div>

      {/* Sale Info */}
      {saleInfo && (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-400">Invoice</p>
                <p className="text-white font-medium">{saleInfo.invoice_no}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Customer</p>
                <p className="text-white font-medium">{saleInfo.customer_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Amount</p>
                <p className="text-white font-medium">
                  Rs. {Number(saleInfo.final_total || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step Selection & Configuration */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Select & Configure Production Steps
          </h2>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="border border-gray-700 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  {/* Order Controls */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveStepUp(step.id)}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                      title="Move up"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <GripVertical size={16} className="text-gray-600" />
                    <button
                      onClick={() => moveStepDown(step.id)}
                      disabled={index === steps.length - 1}
                      className="p-1 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                      title="Move down"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>

                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={step.enabled}
                    onChange={() => toggleStep(step.id)}
                    className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500"
                  />

                  {/* Step Config */}
                  <div className="flex-1">
                    <h3 className="text-white font-medium mb-3">
                      {step.order}. {step.step_name}
                    </h3>

                    {step.enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        {/* Vendor */}
                        <div>
                          <Label className="text-gray-400 text-xs mb-2">Assign Vendor/Worker</Label>
                          <div className="flex gap-2">
                            <Select
                              value={step.assigned_vendor_id?.toString()}
                              onValueChange={(value) => {
                                if (value === 'add_new') {
                                  setActiveStepForVendor(step.id);
                                  setShowAddVendor(true);
                                } else {
                                  updateStep(step.id, 'assigned_vendor_id', Number(value));
                                }
                              }}
                            >
                              <SelectTrigger className="bg-gray-800 border-gray-700 text-white flex-1">
                                <SelectValue placeholder="Select vendor" />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-800 border-gray-700">
                                <SelectItem 
                                  value="add_new"
                                  className="text-indigo-400 font-medium"
                                >
                                  <div className="flex items-center gap-2">
                                    <Plus size={14} />
                                    Add New Vendor/Worker
                                  </div>
                                </SelectItem>
                                
                                {/* Workers Section */}
                                {workers.length > 0 && (
                                  <>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-green-400 uppercase tracking-wider bg-green-500/10 border-t border-b border-green-500/20">
                                      Workers ({workers.length})
                                    </div>
                                    {workers.map(w => (
                                      <SelectItem 
                                        key={`worker-${w.id}`} 
                                        value={w.id.toString()}
                                        className="pl-6"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="text-green-400">👷</span>
                                          <span>{w.name}</span>
                                          {w.role && (
                                            <span className="text-xs text-gray-400 ml-1">({w.role})</span>
                                          )}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </>
                                )}

                                {/* Vendors Section */}
                                {vendors.length > 0 && (
                                  <>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-indigo-400 uppercase tracking-wider bg-indigo-500/10 border-t border-b border-indigo-500/20">
                                      Vendors (External)
                                    </div>
                                    {vendors.map(v => (
                                      <SelectItem 
                                        key={`vendor-${v.id}`} 
                                        value={v.id.toString()}
                                        className="pl-6"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="text-indigo-400">🏪</span>
                                          {v.name}
                                          {v.role && <span className="text-xs text-gray-500">({v.role})</span>}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </>
                                )}

                                {/* No data message */}
                                {vendors.length === 0 && workers.length === 0 && (
                                  <div className="px-4 py-6 text-center text-gray-500 text-sm">
                                    <p className="mb-2">No vendors or workers found.</p>
                                    <p className="text-xs text-gray-600">
                                      Click "Add New Vendor/Worker" above to create one.
                                    </p>
                                  </div>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Expected Date */}
                        <div>
                          <Label className="text-gray-400 text-xs mb-2">Expected Completion</Label>
                          <Input
                            type="date"
                            value={step.expected_completion_date || ''}
                            onChange={(e) => updateStep(step.id, 'expected_completion_date', e.target.value)}
                            className="bg-gray-800 border-gray-700 text-white"
                          />
                        </div>

                        {/* Cost */}
                        <div>
                          <Label className="text-gray-400 text-xs mb-2">Cost (Rs.)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={step.cost || ''}
                            onChange={(e) => updateStep(step.id, 'cost', parseFloat(e.target.value))}
                            placeholder="Enter cost"
                            className="bg-gray-800 border-gray-700 text-white"
                          />
                        </div>

                        {/* Notes */}
                        <div>
                          <Label className="text-gray-400 text-xs mb-2">Notes (Optional)</Label>
                          <Input
                            type="text"
                            value={step.notes || ''}
                            onChange={(e) => updateStep(step.id, 'notes', e.target.value)}
                            placeholder="Optional notes"
                            className="bg-gray-800 border-gray-700 text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSaveAndStart}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-500"
        >
          <Save size={16} className="mr-2" />
          {saving ? 'Creating...' : 'Save & Start Production'}
        </Button>
      </div>

      {/* Add Vendor Modal */}
      {showAddVendor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Add New {newVendor.type === 'worker' ? 'Worker' : 'Supplier'}
              </h3>
              
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <Label className="text-gray-400 text-xs mb-2">Name *</Label>
                  <Input
                    type="text"
                    value={newVendor.name}
                    onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                    placeholder="Enter vendor name"
                    className="bg-gray-800 border-gray-700 text-white"
                    autoFocus
                  />
                </div>

                {/* Mobile */}
                <div>
                  <Label className="text-gray-400 text-xs mb-2">Mobile (Optional)</Label>
                  <Input
                    type="text"
                    value={newVendor.mobile}
                    onChange={(e) => setNewVendor({ ...newVendor, mobile: e.target.value })}
                    placeholder="03XX-XXXXXXX"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                {/* Type */}
                <div>
                  <Label className="text-gray-400 text-xs mb-2">Type</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewVendor({ ...newVendor, type: 'supplier' })}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        newVendor.type === 'supplier'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      Supplier
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewVendor({ ...newVendor, type: 'worker' })}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        newVendor.type === 'worker'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      Worker
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowAddVendor(false);
                    setActiveStepForVendor(null);
                    setNewVendor({ name: '', mobile: '', type: 'supplier' });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddVendor}
                  className="bg-indigo-600 hover:bg-indigo-500"
                >
                  <Plus size={16} className="mr-2" />
                  Add {newVendor.type === 'worker' ? 'Worker' : 'Supplier'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
