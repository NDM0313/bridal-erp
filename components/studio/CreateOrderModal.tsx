'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Calendar, Ruler, User } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { CustomerSearch, Contact } from '@/components/rentals/CustomerSearch';
import { ProductionOrder } from '@/lib/types/modern-erp';
import apiClient, { getErrorMessage, ApiResponse } from '@/lib/api/apiClient';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Measurements {
  shirtLength?: string;
  chest?: string;
  waist?: string;
  hip?: string;
  shoulder?: string;
  sleeveLength?: string;
  trouserLength?: string;
  bottomPoncha?: string;
}

const MEASUREMENT_FIELDS: Array<{ key: keyof Measurements; label: string }> = [
  { key: 'shirtLength', label: 'Shirt Length' },
  { key: 'chest', label: 'Chest' },
  { key: 'waist', label: 'Waist' },
  { key: 'hip', label: 'Hip' },
  { key: 'shoulder', label: 'Shoulder' },
  { key: 'sleeveLength', label: 'Sleeve Length' },
  { key: 'trouserLength', label: 'Trouser Length' },
  { key: 'bottomPoncha', label: 'Bottom/Poncha' },
];

export const CreateOrderModal = ({ isOpen, onClose, onSuccess }: CreateOrderModalProps) => {
  const [selectedCustomer, setSelectedCustomer] = useState<Contact | null>(null);
  const [orderNo, setOrderNo] = useState<string>('');
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);
  const [measurements, setMeasurements] = useState<Measurements>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedCustomer(null);
      setOrderNo('');
      setDeadline(undefined);
      setMeasurements({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Update measurement value
  const updateMeasurement = (key: keyof Measurements, value: string) => {
    setMeasurements((prev) => ({
      ...prev,
      [key]: value.trim() || undefined,
    }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validation
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    if (!orderNo.trim()) {
      toast.error('Please enter an Order / Design No');
      return;
    }

    if (!deadline) {
      toast.error('Please select a deadline');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare measurements JSON (only include fields with values)
      const measurementsJson: Record<string, any> = {};
      Object.entries(measurements).forEach(([key, value]) => {
        if (value && value.trim()) {
          measurementsJson[key] = value.trim();
        }
      });

      // Prepare payload
      const payload = {
        customerId: selectedCustomer.id,
        orderNo: orderNo.trim(),
        deadlineDate: deadline.toISOString(),
        status: 'new',
        measurements: Object.keys(measurementsJson).length > 0 ? measurementsJson : undefined,
        steps: [], // Empty steps array for now
        materials: [], // Empty materials array for now
      };

      const response = await apiClient.post<ApiResponse<ProductionOrder>>('/production', payload);

      if (response.data?.success) {
        toast.success('Production order created successfully!');
        onSuccess?.();
        onClose();
      } else {
        throw new Error(response.data?.error?.message || 'Failed to create order');
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      toast.error(`Failed to create order: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 bg-gray-950 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-500">
              <Ruler size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Create Custom Order</h3>
              <p className="text-xs text-gray-400">Add a new production order to the studio</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-400 uppercase flex items-center gap-2">
              <User size={14} />
              Customer
            </Label>
            <CustomerSearch
              onSelect={setSelectedCustomer}
              selectedContact={selectedCustomer}
            />
            {selectedCustomer && (
              <p className="text-xs text-gray-500 mt-1">
                Selected: <span className="text-gray-300">{selectedCustomer.name}</span>
                {selectedCustomer.mobile && (
                  <span className="ml-2 text-gray-500">• {selectedCustomer.mobile}</span>
                )}
              </p>
            )}
          </div>

          {/* Order Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Order / Design No */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-400 uppercase">Order / Design No</Label>
              <Input
                type="text"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                placeholder="e.g., DS-2024-001"
                className="h-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-600"
              />
            </div>

            {/* Deadline */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-400 uppercase flex items-center gap-2">
                <Calendar size={14} />
                Deadline
              </Label>
              <Input
                type="date"
                value={deadline ? format(deadline, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : undefined;
                  setDeadline(date);
                }}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="h-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          {/* Measurements Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <Ruler size={16} className="text-blue-400" />
              <Label className="text-sm font-semibold text-white">Measurements</Label>
              <span className="text-xs text-gray-500">(Optional - Enter in inches or cm)</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {MEASUREMENT_FIELDS.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label className="text-xs text-gray-400">{field.label}</Label>
                  <Input
                    type="text"
                    value={measurements[field.key] || ''}
                    onChange={(e) => updateMeasurement(field.key, e.target.value)}
                    placeholder="--"
                    className="h-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 text-sm"
                  />
                </div>
              ))}
            </div>

            {Object.values(measurements).some((val) => val && val.trim()) && (
              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-900/50 rounded-lg">
                <p className="text-xs text-blue-400">
                  Measurements will be saved as JSON: {JSON.stringify(
                    Object.fromEntries(
                      Object.entries(measurements).filter(([_, val]) => val && val.trim())
                    )
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-800 flex gap-3 bg-gray-950 sticky bottom-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Ruler size={16} className="mr-2" />
                Create Order
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

