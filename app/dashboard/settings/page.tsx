/**
 * Settings Module Page
 * Central hub for toggling business modules and configuring settings
 * Follows docs/modules/Settings.md specifications
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Hammer,
  ShoppingBag,
  Users,
  FileText,
  Calculator,
  Settings as SettingsIcon,
  CheckCircle2,
  X,
} from 'lucide-react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Skeleton } from '@/components/placeholders/SkeletonLoader';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AdminOnly } from '@/components/auth/AdminOnly';

type ModuleId = 'rentals' | 'manufacturing' | 'pos' | 'products' | 'sales' | 'purchases' | 'contacts' | 'accounting' | 'reports';

interface ModuleConfig {
  pricing_model?: 'per_event' | 'per_day' | 'per_hour';
  require_id?: boolean;
  require_deposit?: boolean;
  turnaround_buffer?: number;
  [key: string]: any;
}

interface ModuleState {
  isEnabled: boolean;
  config: ModuleConfig;
}

interface ModulesState {
  [key: string]: ModuleState;
}

interface ModuleDefinition {
  id: ModuleId;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  bgColor: string;
  color: string;
}

const moduleDefinitions: ModuleDefinition[] = [
  {
    id: 'rentals',
    title: 'Rentals',
    description: 'Manage dress rentals, bookings, and returns with calendar integration.',
    icon: Calendar,
    bgColor: 'bg-pink-500/10',
    color: 'text-pink-400',
  },
  {
    id: 'manufacturing',
    title: 'Custom Studio',
    description: 'Track production orders, measurements, and vendor assignments.',
    icon: Hammer,
    bgColor: 'bg-orange-500/10',
    color: 'text-orange-400',
  },
  {
    id: 'pos',
    title: 'Point of Sale',
    description: 'In-store sales with product grid, cart, and payment processing.',
    icon: ShoppingBag,
    bgColor: 'bg-green-500/10',
    color: 'text-green-400',
  },
  {
    id: 'products',
    title: 'Products & Inventory',
    description: 'Manage product catalog, stock levels, and variations.',
    icon: FileText,
    bgColor: 'bg-blue-500/10',
    color: 'text-blue-400',
  },
  {
    id: 'sales',
    title: 'Sales Management',
    description: 'Track sales invoices, payments, and customer transactions.',
    icon: ShoppingBag,
    bgColor: 'bg-blue-500/10',
    color: 'text-blue-400',
  },
  {
    id: 'purchases',
    title: 'Purchases',
    description: 'Manage purchase orders, supplier bills, and inventory restocking.',
    icon: ShoppingBag,
    bgColor: 'bg-orange-500/10',
    color: 'text-orange-400',
  },
  {
    id: 'contacts',
    title: 'Contacts (CRM)',
    description: 'Central database for suppliers and customers with ledger tracking.',
    icon: Users,
    bgColor: 'bg-purple-500/10',
    color: 'text-purple-400',
  },
  {
    id: 'accounting',
    title: 'Accounting',
    description: 'Financial accounts, transactions, and ledger management.',
    icon: Calculator,
    bgColor: 'bg-yellow-500/10',
    color: 'text-yellow-400',
  },
  {
    id: 'reports',
    title: 'Reports & Analytics',
    description: 'Business insights, sales reports, and financial analytics.',
    icon: FileText,
    bgColor: 'bg-gray-500/10',
    color: 'text-gray-400',
  },
];

export default function SettingsPage() {
  const [modules, setModules] = useState<ModulesState>({});
  const [loading, setLoading] = useState(true);
  const [configuringModule, setConfiguringModule] = useState<ModuleId | null>(null);
  const [rentalConfig, setRentalConfig] = useState<ModuleConfig>({
    pricing_model: 'per_event',
    require_id: false,
    require_deposit: true,
    turnaround_buffer: 1,
  });

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      setLoading(true);

      // Load from Supabase or localStorage
      const stored = localStorage.getItem('modules_config');
      if (stored) {
        setModules(JSON.parse(stored));
      } else {
        // Default: Enable core modules
        const defaultModules: ModulesState = {
          pos: { isEnabled: true, config: {} },
          products: { isEnabled: true, config: {} },
          sales: { isEnabled: true, config: {} },
          purchases: { isEnabled: true, config: {} },
          contacts: { isEnabled: true, config: {} },
          rentals: { isEnabled: false, config: { pricing_model: 'per_event', require_id: false, require_deposit: true, turnaround_buffer: 1 } },
          manufacturing: { isEnabled: false, config: {} },
          accounting: { isEnabled: true, config: {} },
          reports: { isEnabled: true, config: {} },
        };
        setModules(defaultModules);
        localStorage.setItem('modules_config', JSON.stringify(defaultModules));
      }
    } catch (err) {
      toast.error('Failed to load module settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (moduleId: ModuleId, enabled: boolean) => {
    const updated = {
      ...modules,
      [moduleId]: {
        ...modules[moduleId],
        isEnabled: enabled,
      },
    };
    setModules(updated);
    localStorage.setItem('modules_config', JSON.stringify(updated));
    toast.success(`${moduleDefinitions.find((m) => m.id === moduleId)?.title} ${enabled ? 'enabled' : 'disabled'}`);
  };

  const handleSaveRentalConfig = () => {
    const updated = {
      ...modules,
      rentals: {
        ...modules.rentals,
        config: rentalConfig,
      },
    };
    setModules(updated);
    localStorage.setItem('modules_config', JSON.stringify(updated));
    toast.success('Rental configuration saved');
    setConfiguringModule(null);
  };

  return (
    <AdminOnly>
      <ModernDashboardLayout>
        <div className="space-y-6 p-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-white">Modules & Features</h1>
            <p className="text-sm text-gray-400 mt-1">
              Enable or disable core business modules. Changes reflect immediately in the sidebar.
            </p>
          </div>

          {/* Module Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {moduleDefinitions.map((module) => {
                const moduleState = modules[module.id] || { isEnabled: false, config: {} };
                const isEnabled = moduleState.isEnabled;
                const Icon = module.icon;

                return (
                  <div
                    key={module.id}
                    className={cn(
                      'flex flex-col p-6 rounded-xl border transition-all duration-200',
                      isEnabled
                        ? 'bg-gray-900 border-gray-700 shadow-lg'
                        : 'bg-gray-900/50 border-gray-800 opacity-80 hover:opacity-100'
                    )}
                  >
                    {/* Header with Icon and Switch */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={cn('p-3 rounded-lg', module.bgColor, module.color)}>
                        <Icon size={24} />
                      </div>
                      <div className="flex items-center gap-3">
                        {isEnabled && (
                          <Badge className="bg-green-900/20 text-green-400 border-green-900/50">
                            Active
                          </Badge>
                        )}
                        <Switch
                          checked={isEnabled}
                          onChange={(e) => handleToggle(module.id, e.target.checked)}
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 mb-6">
                      <h3 className="text-lg font-semibold text-white mb-2">{module.title}</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">{module.description}</p>
                    </div>

                    {/* Footer with Configure Button */}
                    <div className="mt-auto pt-4 border-t border-gray-800 flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'text-xs px-0 hover:bg-transparent',
                          isEnabled ? 'text-blue-400 hover:text-blue-300' : 'text-gray-600 cursor-not-allowed'
                        )}
                        disabled={!isEnabled}
                        onClick={() => {
                          if (module.id === 'rentals') {
                            setRentalConfig(moduleState.config as ModuleConfig);
                            setConfiguringModule('rentals');
                          } else {
                            toast.info('Configuration coming soon');
                          }
                        }}
                      >
                        <SettingsIcon size={14} className="mr-2" />
                        Configure
                      </Button>

                      {isEnabled && (
                        <span className="flex items-center text-xs text-gray-500">
                          <CheckCircle2 size={12} className="mr-1 text-green-500" />
                          Installed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rental Configuration Modal */}
          {configuringModule === 'rentals' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-[600px] max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Rental Configuration</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfiguringModule(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X size={20} />
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Pricing Model */}
                  <div>
                    <Label className="text-white mb-2 block">Pricing Model</Label>
                    <select
                      value={rentalConfig.pricing_model || 'per_event'}
                      onChange={(e) =>
                        setRentalConfig({
                          ...rentalConfig,
                          pricing_model: e.target.value as 'per_event' | 'per_day' | 'per_hour',
                        })
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="per_event">Per Event</option>
                      <option value="per_day">Per Day</option>
                      <option value="per_hour">Per Hour</option>
                    </select>
                  </div>

                  {/* Require ID */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Require ID Card</Label>
                      <p className="text-xs text-gray-500 mt-1">
                        Customers must provide ID card for rental bookings
                      </p>
                    </div>
                    <Switch
                      checked={rentalConfig.require_id || false}
                      onChange={(e) =>
                        setRentalConfig({ ...rentalConfig, require_id: e.target.checked })
                      }
                    />
                  </div>

                  {/* Require Deposit */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Require Security Deposit</Label>
                      <p className="text-xs text-gray-500 mt-1">
                        Collect security deposit for all rental bookings
                      </p>
                    </div>
                    <Switch
                      checked={rentalConfig.require_deposit || false}
                      onChange={(e) =>
                        setRentalConfig({ ...rentalConfig, require_deposit: e.target.checked })
                      }
                    />
                  </div>

                  {/* Turnaround Buffer */}
                  <div>
                    <Label className="text-white mb-2 block">Turnaround Buffer (Days)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={rentalConfig.turnaround_buffer || 1}
                      onChange={(e) =>
                        setRentalConfig({
                          ...rentalConfig,
                          turnaround_buffer: parseInt(e.target.value) || 1,
                        })
                      }
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Days to block calendar after return date for cleaning/preparation
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-800">
                  <Button variant="outline" onClick={() => setConfiguringModule(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveRentalConfig}>Save Configuration</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </ModernDashboardLayout>
    </AdminOnly>
  );
}

