/**
 * Production Flow Screen - NEW
 * Track single production order with dynamic steps
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, PlayCircle, CheckCircle, Edit } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ProductionStep {
  id: number;
  step_name: string;
  status: string;
  cost: number;
  vendor_name?: string;
  started_at?: string;
  completed_at?: string;
}

interface ProductionFlowScreenProps {
  orderId: number;
}

export default function ProductionFlowScreen({ orderId }: ProductionFlowScreenProps) {
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [steps, setSteps] = useState<ProductionStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCost, setEditingCost] = useState<number | null>(null);
  const [costValue, setCostValue] = useState('');

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('production_orders')
        .select(`
          *,
          customer:contacts(name)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      const { data: stepsData, error: stepsError } = await supabase
        .from('production_steps')
        .select(`
          *,
          vendor:contacts(name)
        `)
        .eq('production_order_id', orderId)
        .order('id', { ascending: true });

      if (stepsError) throw stepsError;

      setOrder({
        ...orderData,
        customer_name: Array.isArray(orderData.customer) ? orderData.customer[0]?.name : orderData.customer?.name,
      });

      setSteps((stepsData || []).map(s => ({
        ...s,
        vendor_name: Array.isArray(s.vendor) ? s.vendor[0]?.name : s.vendor?.name,
      })));

    } catch (err) {
      console.error('Failed to load order:', err);
      toast.error('Failed to load production order');
    } finally {
      setLoading(false);
    }
  };

  const handleStartStep = async (stepId: number) => {
    try {
      const { error } = await supabase
        .from('production_steps')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', stepId);

      if (error) throw error;

      toast.success('Step started');
      fetchOrder();
    } catch (err: any) {
      toast.error(err.message || 'Failed to start step');
    }
  };

  const handleCompleteStep = async (stepId: number) => {
    try {
      const { error } = await supabase
        .from('production_steps')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', stepId);

      if (error) throw error;

      toast.success('Step completed');
      fetchOrder();
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete step');
    }
  };

  const handleUpdateCost = async (stepId: number) => {
    try {
      const { error } = await supabase
        .from('production_steps')
        .update({ cost: parseFloat(costValue) })
        .eq('id', stepId);

      if (error) throw error;

      toast.success('Cost updated');
      setEditingCost(null);
      fetchOrder();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update cost');
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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/production')}
        >
          <ArrowLeft size={16} className="mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {order?.order_no}
          </h1>
          <p className="text-gray-400">{order?.customer_name}</p>
        </div>
      </div>

      <Card className="bg-gray-900/50 border-gray-800">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Production Steps</h2>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="border border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-white font-medium">
                        {index + 1}. {step.step_name}
                      </span>
                      <Badge className={
                        step.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        step.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }>
                        {step.status}
                      </Badge>
                    </div>

                    {step.vendor_name && (
                      <p className="text-sm text-gray-400 mb-2">
                        Assigned: {step.vendor_name}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-3">
                      <div>
                        <span className="text-xs text-gray-400">Cost: </span>
                        {editingCost === step.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={costValue}
                              onChange={(e) => setCostValue(e.target.value)}
                              className="w-32 h-8 bg-gray-800 border-gray-700 text-white"
                            />
                            <Button size="sm" onClick={() => handleUpdateCost(step.id)}>
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingCost(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <span className="text-white font-medium">
                            Rs. {Number(step.cost || 0).toFixed(2)}
                            {step.status !== 'completed' && (
                              <button
                                onClick={() => {
                                  setEditingCost(step.id);
                                  setCostValue(String(step.cost || 0));
                                }}
                                className="ml-2 text-xs text-indigo-400 hover:text-indigo-300"
                              >
                                <Edit size={12} className="inline" />
                              </button>
                            )}
                          </span>
                        )}
                      </div>

                      {step.completed_at && (
                        <div>
                          <span className="text-xs text-gray-400">Completed: </span>
                          <span className="text-xs text-green-400">
                            {format(new Date(step.completed_at), 'dd MMM, HH:mm')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    {step.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleStartStep(step.id)}
                        className="bg-blue-600 hover:bg-blue-500"
                      >
                        <PlayCircle size={14} className="mr-1" />
                        Start
                      </Button>
                    )}
                    {step.status === 'in_progress' && (
                      <Button
                        size="sm"
                        onClick={() => handleCompleteStep(step.id)}
                        className="bg-green-600 hover:bg-green-500"
                      >
                        <CheckCircle size={14} className="mr-1" />
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
