'use client';

import { useState, useEffect, useCallback } from 'react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { 
  Settings, Building2, DollarSign, Upload, ToggleLeft, ToggleRight,
  FileText, AlertCircle, Moon, Sun, ChevronRight, Save, Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';

interface SettingsData {
  // General Settings
  company_name: string;
  currency: 'PKR' | 'USD';
  business_logo_url?: string;
  
  // Feature Toggles
  enable_tax: boolean;
  enable_shipping: boolean;
  enable_auto_sku: boolean;
  enable_stock_alerts: boolean;
  
  // System Configuration
  invoice_prefix: string;
  low_stock_threshold: number;
  default_terms_conditions: string;
  
  // UI Settings
  theme: 'dark' | 'light';
  sidebar_collapsed: boolean;
}

const defaultSettings: SettingsData = {
  company_name: 'Studio Rently POS',
  currency: 'PKR',
  enable_tax: true,
  enable_shipping: true,
  enable_auto_sku: true,
  enable_stock_alerts: true,
  invoice_prefix: 'INV-',
  low_stock_threshold: 5,
  default_terms_conditions: 'Thank you for your business. Please note that all sales are final.',
  theme: 'dark',
  sidebar_collapsed: false,
};

type SettingsSection = 'general' | 'features' | 'system' | 'ui';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) return;

      // Try to load from business_settings table first
      const { data: businessSettings } = await supabase
        .from('business_settings')
        .select('settings')
        .eq('business_id', profile.business_id)
        .maybeSingle();

      if (businessSettings?.settings) {
        const parsed = businessSettings.settings as Partial<SettingsData>;
        setSettings({ ...defaultSettings, ...parsed });
        if (parsed.business_logo_url) {
          setLogoPreview(parsed.business_logo_url);
        }
      } else {
        // Fallback: Load from businesses table
        const { data: business } = await supabase
          .from('businesses')
          .select('name, logo, sku_prefix')
          .eq('id', profile.business_id)
          .maybeSingle();

        // Also check localStorage
        const stored = localStorage.getItem('app_settings');
        if (stored) {
          const parsed = JSON.parse(stored);
          setSettings({ ...defaultSettings, ...parsed });
          if (parsed.business_logo_url) {
            setLogoPreview(parsed.business_logo_url);
          }
        } else if (business) {
          // Use business data as initial settings
          setSettings({
            ...defaultSettings,
            company_name: business.name || defaultSettings.company_name,
            invoice_prefix: business.sku_prefix || defaultSettings.invoice_prefix,
            business_logo_url: business.logo || undefined,
          });
          if (business.logo) {
            setLogoPreview(business.logo);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to save settings');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) {
        toast.error('Business profile not found');
        return;
      }

      // Save to business_settings table (JSONB)
      const { error: settingsError } = await supabase
        .from('business_settings')
        .upsert({
          business_id: profile.business_id,
          settings: settings,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'business_id',
        });

      // Also update businesses table for name, logo, and sku_prefix
      const { error: businessError } = await supabase
        .from('businesses')
        .update({
          name: settings.company_name,
          logo: settings.business_logo_url || null,
          sku_prefix: settings.invoice_prefix,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.business_id);

      if (settingsError) throw settingsError;
      if (businessError) throw businessError;

      // Also save to localStorage as backup
      localStorage.setItem('app_settings', JSON.stringify(settings));

      // Apply theme if changed
      if (settings.theme !== theme) {
        setTheme(settings.theme);
      }

      toast.success('Settings saved successfully');
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [settings, theme, setTheme]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
      const filePath = `business-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('business-assets')
        .getPublicUrl(filePath);

      setSettings({ ...settings, business_logo_url: publicUrl });
      setLogoPreview(publicUrl);
      toast.success('Logo uploaded successfully');
    } catch (error: any) {
      console.error('Failed to upload logo:', error);
      toast.error('Failed to upload logo');
    }
  };

  const sections: Array<{ id: SettingsSection; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
    { id: 'general', label: 'General Settings', icon: Building2 },
    { id: 'features', label: 'Feature Toggles', icon: ToggleRight },
    { id: 'system', label: 'System Configuration', icon: FileText },
    { id: 'ui', label: 'UI Settings', icon: Moon },
  ];

  if (loading) {
    return (
      <ModernDashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout>
      <div className="flex w-full -mx-4 lg:-mx-8" style={{ minHeight: 'calc(100vh - 8rem)' }}>
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900/95 backdrop-blur-md p-4 flex-shrink-0 overflow-y-auto sticky top-0 z-10" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 px-2 border-b border-slate-800 pb-3">Settings Menu</h3>
          <div className="space-y-2">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left",
                    activeSection === section.id
                      ? "bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-sm"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
                  )}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  <span className="font-medium text-sm">{section.label}</span>
                  {activeSection === section.id && (
                    <ChevronRight size={16} className="ml-auto flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-100">Settings</h1>
                <p className="mt-1 text-sm text-slate-400">Manage your Studio Rently POS configuration</p>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-500 text-white"
              >
                <Save size={18} className="mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>

            {/* General Settings */}
            {activeSection === 'general' && (
              <div className="space-y-6 p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
                <div className="flex items-center gap-3 mb-6">
                  <Building2 size={24} className="text-blue-400" />
                  <h2 className="text-xl font-semibold text-slate-100">General Settings</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-300 mb-2">Company Name</Label>
                    <Input
                      value={settings.company_name}
                      onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                      className="bg-[#111827] border-slate-800 text-slate-200"
                      placeholder="Studio Rently POS"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300 mb-2">Currency</Label>
                    <select
                      value={settings.currency}
                      onChange={(e) => setSettings({ ...settings, currency: e.target.value as 'PKR' | 'USD' })}
                      className="w-full bg-[#111827] border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="PKR">PKR (Pakistani Rupee)</option>
                      <option value="USD">USD (US Dollar)</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-slate-300 mb-2">Business Logo</Label>
                    <div className="flex items-center gap-4">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Business Logo"
                          className="h-20 w-20 rounded-lg object-cover border border-slate-800"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
                          <ImageIcon size={24} className="text-slate-500" />
                        </div>
                      )}
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          id="logo-upload"
                        />
                        <label
                          htmlFor="logo-upload"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer transition-colors"
                        >
                          <Upload size={18} />
                          Upload Logo
                        </label>
                        <p className="text-xs text-slate-500 mt-2">Recommended: 200x200px, PNG or JPG</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Feature Toggles */}
            {activeSection === 'features' && (
              <div className="space-y-6 p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
                <div className="flex items-center gap-3 mb-6">
                  <ToggleRight size={24} className="text-green-400" />
                  <h2 className="text-xl font-semibold text-slate-100">Feature Toggles</h2>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div>
                      <Label className="text-slate-200 font-medium">Enable Tax (GST)</Label>
                      <p className="text-sm text-slate-400 mt-1">Apply tax calculations to invoices</p>
                    </div>
                    <Switch
                      checked={settings.enable_tax}
                      onCheckedChange={(checked) => setSettings({ ...settings, enable_tax: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div>
                      <Label className="text-slate-200 font-medium">Enable Shipping Charges</Label>
                      <p className="text-sm text-slate-400 mt-1">Add shipping costs to invoices</p>
                    </div>
                    <Switch
                      checked={settings.enable_shipping}
                      onCheckedChange={(checked) => setSettings({ ...settings, enable_shipping: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div>
                      <Label className="text-slate-200 font-medium">Automatic SKU Generation</Label>
                      <p className="text-sm text-slate-400 mt-1">Auto-generate SKU codes for new products</p>
                    </div>
                    <Switch
                      checked={settings.enable_auto_sku}
                      onCheckedChange={(checked) => setSettings({ ...settings, enable_auto_sku: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div>
                      <Label className="text-slate-200 font-medium">Stock Alerts</Label>
                      <p className="text-sm text-slate-400 mt-1">Send notifications when stock is low</p>
                    </div>
                    <Switch
                      checked={settings.enable_stock_alerts}
                      onCheckedChange={(checked) => setSettings({ ...settings, enable_stock_alerts: checked })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* System Configuration */}
            {activeSection === 'system' && (
              <div className="space-y-6 p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
                <div className="flex items-center gap-3 mb-6">
                  <FileText size={24} className="text-purple-400" />
                  <h2 className="text-xl font-semibold text-slate-100">System Configuration</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-300 mb-2">Invoice Prefix</Label>
                    <Input
                      value={settings.invoice_prefix}
                      onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })}
                      className="bg-[#111827] border-slate-800 text-slate-200"
                      placeholder="INV-"
                    />
                    <p className="text-xs text-slate-500 mt-1">Prefix for auto-generated invoice numbers</p>
                  </div>

                  <div>
                    <Label className="text-slate-300 mb-2">Low Stock Alert Threshold</Label>
                    <Input
                      type="number"
                      min="0"
                      value={settings.low_stock_threshold}
                      onChange={(e) => setSettings({ ...settings, low_stock_threshold: parseInt(e.target.value) || 0 })}
                      className="bg-[#111827] border-slate-800 text-slate-200"
                    />
                    <p className="text-xs text-slate-500 mt-1">Alert when stock falls below this quantity</p>
                  </div>

                  <div>
                    <Label className="text-slate-300 mb-2">Default Terms & Conditions</Label>
                    <Textarea
                      value={settings.default_terms_conditions}
                      onChange={(e) => setSettings({ ...settings, default_terms_conditions: e.target.value })}
                      className="bg-[#111827] border-slate-800 text-slate-200 min-h-[120px]"
                      placeholder="Enter default terms and conditions for invoices..."
                    />
                    <p className="text-xs text-slate-500 mt-1">This text will appear on all invoices by default</p>
                  </div>
                </div>
              </div>
            )}

            {/* UI Settings */}
            {activeSection === 'ui' && (
              <div className="space-y-6 p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
                <div className="flex items-center gap-3 mb-6">
                  <Moon size={24} className="text-indigo-400" />
                  <h2 className="text-xl font-semibold text-slate-100">UI Settings</h2>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center gap-3">
                      {theme === 'dark' ? <Moon size={20} className="text-slate-400" /> : <Sun size={20} className="text-slate-400" />}
                      <div>
                        <Label className="text-slate-200 font-medium">Theme</Label>
                        <p className="text-sm text-slate-400 mt-1">Switch between dark and light mode</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const newTheme = theme === 'dark' ? 'light' : 'dark';
                          setTheme(newTheme);
                          setSettings({ ...settings, theme: newTheme });
                        }}
                        className={cn(
                          "px-4 py-2 rounded-lg transition-colors",
                          theme === 'dark' 
                            ? "bg-slate-700 text-slate-200" 
                            : "bg-slate-800 text-slate-400"
                        )}
                      >
                        <Moon size={18} />
                      </button>
                      <button
                        onClick={() => {
                          const newTheme = theme === 'light' ? 'dark' : 'light';
                          setTheme(newTheme);
                          setSettings({ ...settings, theme: newTheme });
                        }}
                        className={cn(
                          "px-4 py-2 rounded-lg transition-colors",
                          theme === 'light' 
                            ? "bg-slate-700 text-slate-200" 
                            : "bg-slate-800 text-slate-400"
                        )}
                      >
                        <Sun size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div>
                      <Label className="text-slate-200 font-medium">Sidebar Collapsed by Default</Label>
                      <p className="text-sm text-slate-400 mt-1">Start with sidebar collapsed on page load</p>
                    </div>
                    <Switch
                      checked={settings.sidebar_collapsed}
                      onCheckedChange={(checked) => setSettings({ ...settings, sidebar_collapsed: checked })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ModernDashboardLayout>
  );
}
