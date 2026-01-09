'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { 
  Settings, Building2, Upload, Save, HelpCircle,
  ShoppingCart, Package, Grid3x3, Tag, DollarSign,
  Image as ImageIcon, Key, Calendar, Clock, Globe, FileText,
  Calendar as CalendarIcon, Calculator, Settings as SettingsIcon, Check,
  Scissors, Truck, BarChart3, Archive, Bell, Shield, Database,
  Phone, Mail, MapPin, ExternalLink, PieChart, Receipt, Palette,
  RotateCcw, Layers, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';

export interface SettingsData {
  // General - Business Information
  business_name: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  business_website: string;
  tax_id: string;
  business_logo_url?: string;
  
  // General - Regional Settings
  currency: string;
  currency_placement: 'before' | 'after';
  timezone: string;
  language: string;
  date_format: string;
  time_format: '12' | '24';
  decimal_places: number;
  thousand_separator: ',' | '.' | ' ';

  // General - Financial Year
  fiscal_year_start: string; // MM-DD format
  fiscal_year_end: string; // MM-DD format
  financial_year_start_month: number; // Legacy support
  profit_calculation_method: 'fifo' | 'lifo' | 'weighted_average';

  // Tax
  enable_inline_tax: boolean;
  tax_1_name: string;
  tax_1_number: string;
  default_tax_rate: number;

  // POS & Sales
  pos_duplicate_item_action: 'combine' | 'new_line';
  pos_allow_price_edit: boolean;
  pos_allow_discount: boolean;
  max_discount_percent: number;
  enable_multiple_tax: boolean;
  require_customer_for_sale: boolean;
  enable_layaway: boolean;
  default_payment_method: string;
  print_receipt_automatically: boolean;
  auto_save_interval: number;
  enable_quick_sale: boolean;
  show_stock_in_sale: boolean;
  require_sale_approval: boolean;
  minimum_sale_amount: number;
  enable_customer_credit: boolean;
  credit_limit: number;
  enable_loyalty_points: boolean;
  points_per_currency: number;
  enable_sale_returns: boolean;
  return_days_limit: number;
  pos_keyboard_shortcuts: {
    quantity: string;
    search: string;
    checkout: string;
    cancel: string;
  };
  
  // Invoice Settings
  invoice_prefix: string;
  invoice_format: 'short' | 'long' | 'custom';
  invoice_custom_format?: string;
  invoice_start_number: number;
  invoice_template: 'modern' | 'classic' | 'minimal';
  invoice_logo_position: 'left' | 'center' | 'right';
  invoice_due_days: number;
  invoice_watermark: string;
  invoice_terms: string;
  invoice_footer: string;
  show_tax_on_invoice: boolean;
  show_discount_on_invoice: boolean;
  purchase_prefix: string;
  purchase_format: 'short' | 'long' | 'custom';
  purchase_custom_format?: string;
  rental_prefix: string;
  rental_format: 'short' | 'long' | 'custom';
  rental_custom_format?: string;
  project_prefix: string;
  project_format: 'short' | 'long' | 'custom';
  project_custom_format?: string;
  pos_receipt_prefix: string;
  pos_receipt_format: 'short' | 'long' | 'custom';
  pos_receipt_custom_format?: string;
  voucher_prefix: string;
  voucher_format: 'short' | 'long' | 'custom';
  voucher_custom_format?: string;

  // Inventory / Product Settings
  sku_format: string;
  sku_auto_generate: boolean;
  sku_prefix: string;
  product_code_prefix: string;
  low_stock_threshold: number;
  enable_product_expiry: boolean;
  allow_negative_stock: boolean;
  enable_barcode: boolean;
  barcode_format: 'CODE128' | 'EAN13' | 'QR';
  default_product_unit: string;
  enable_product_variants: boolean;
  enable_product_images: boolean;
  max_product_images: number;
  track_serial_numbers: boolean;
  enable_batch_tracking: boolean;

  // Rental Settings
  default_rental_duration: number; // days
  late_fee_per_day: number;
  security_deposit_percent: number;
  enable_rental_reminders: boolean;
  reminder_days_before: number;
  enable_damage_charges: boolean;
  damage_assessment_required: boolean;
  auto_calculate_late_fee: boolean;

  // Reports Settings
  report_date_format: string;
  report_currency: string;
  default_report_period: 'week' | 'month' | 'quarter' | 'year';
  enable_auto_reports: boolean;
  report_email_frequency: 'daily' | 'weekly' | 'monthly';
  include_graphs_in_reports: boolean;
  enable_export_pdf: boolean;
  enable_export_excel: boolean;
  enable_export_csv: boolean;

  // Notifications
  email_notifications: boolean;
  sms_notifications: boolean;
  low_stock_alert: boolean;
  payment_due_alert: boolean;
  rental_return_alert: boolean;
  product_expiry_alert: boolean;
  expiry_alert_days: number;
  order_status_notification: boolean;
  daily_sales_summary: boolean;

  // Security
  session_timeout: number; // minutes
  two_factor_auth: boolean;
  password_policy: 'weak' | 'medium' | 'strong';
  max_login_attempts: number;
  lockout_duration: number; // minutes
  require_email_verification: boolean;
  enable_role_based_access: boolean;
  enable_audit_log: boolean;
  ip_whitelist: string;

  // Advanced Settings
  enable_api: boolean;
  api_key: string;
  webhook_url: string;
  enable_backup: boolean;
  backup_frequency: 'daily' | 'weekly' | 'monthly';
  debug_mode: boolean;
  enable_multi_location: boolean;
  default_location: string;
  enable_multi_currency: boolean;
  auto_update_exchange_rate: boolean;
  enable_data_encryption: boolean;
  cache_duration: number; // minutes

  // Modules
  module_rental: boolean;
  module_pos: boolean;
  module_studio: boolean;
  module_vendors: boolean;
  module_reporting: boolean;
  module_accounting: boolean;

  // Purchase Settings (additional)
  default_purchase_tax: number;
  purchase_approval_amount: number;
  enable_grn: boolean;
  grn_prefix: string;
  enable_quality_check: boolean;
  enable_purchase_return: boolean;
  enable_vendor_rating: boolean;
  require_purchase_approval: boolean;
  
  // Theme & Appearance
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  dark_mode: boolean;
  compact_mode: boolean;
  sidebar_position: 'left' | 'right';
  show_breadcrumbs: boolean;
  animations_enabled: boolean;
  
  // Custom Labels
  custom_label_1: string;
  custom_label_2: string;
  custom_label_3: string;
}

const defaultSettings: SettingsData = {
  // General - Business Information
  business_name: 'Studio Rently POS',
  business_address: '',
  business_phone: '',
  business_email: '',
  business_website: '',
  tax_id: '',
  business_logo_url: undefined,

  // General - Regional Settings
  currency: 'PKR',
  currency_placement: 'before',
  timezone: 'Asia/Karachi',
  language: 'en',
  date_format: 'dd-mm-yyyy',
  time_format: '24',
  decimal_places: 2,
  thousand_separator: ',',

  // General - Financial Year
  fiscal_year_start: '01-01',
  fiscal_year_end: '12-31',
  financial_year_start_month: 1, // Legacy support
  profit_calculation_method: 'fifo',

  // Tax
  enable_inline_tax: false,
  tax_1_name: 'GST',
  tax_1_number: '',
  default_tax_rate: 17,

  // POS & Sales
  pos_duplicate_item_action: 'combine',
  pos_allow_price_edit: false,
  pos_allow_discount: true,
  max_discount_percent: 50,
  enable_multiple_tax: false,
  require_customer_for_sale: false,
  enable_layaway: false,
  default_payment_method: 'cash',
  print_receipt_automatically: false,
  auto_save_interval: 30,
  enable_quick_sale: true,
  show_stock_in_sale: true,
  require_sale_approval: false,
  minimum_sale_amount: 0,
  enable_customer_credit: true,
  credit_limit: 50000,
  enable_loyalty_points: false,
  points_per_currency: 1,
  enable_sale_returns: true,
  return_days_limit: 7,
  pos_keyboard_shortcuts: {
    quantity: 'F2',
    search: 'F4',
    checkout: 'F9',
    cancel: 'Escape',
  },
  
  // Invoice Settings
  invoice_prefix: 'INV',
  invoice_format: 'long',
  invoice_custom_format: '',
  invoice_start_number: 1,
  invoice_template: 'modern',
  invoice_logo_position: 'left',
  invoice_due_days: 30,
  invoice_watermark: '',
  invoice_terms: 'Payment due within 30 days',
  invoice_footer: 'Thank you for your business!',
  show_tax_on_invoice: true,
  show_discount_on_invoice: true,
  purchase_prefix: 'PUR',
  purchase_format: 'long',
  purchase_custom_format: '',
  rental_prefix: 'REN',
  rental_format: 'long',
  rental_custom_format: '',
  project_prefix: 'STU',
  project_format: 'long',
  project_custom_format: '',
  pos_receipt_prefix: 'POS',
  pos_receipt_format: 'long',
  pos_receipt_custom_format: '',
  voucher_prefix: 'VOU',
  voucher_format: 'long',
  voucher_custom_format: '',

  // Inventory / Product Settings
  sku_format: 'PRD-NNNN',
  sku_auto_generate: true,
  sku_prefix: 'SKU-',
  product_code_prefix: 'PRD',
  low_stock_threshold: 10,
  enable_product_expiry: false,
  allow_negative_stock: false,
  enable_barcode: true,
  barcode_format: 'CODE128',
  default_product_unit: 'piece',
  enable_product_variants: true,
  enable_product_images: true,
  max_product_images: 5,
  track_serial_numbers: false,
  enable_batch_tracking: false,

  // Rental Settings
  default_rental_duration: 3,
  late_fee_per_day: 500,
  security_deposit_percent: 20,
  enable_rental_reminders: true,
  reminder_days_before: 1,
  enable_damage_charges: true,
  damage_assessment_required: true,
  auto_calculate_late_fee: true,

  // Reports Settings
  report_date_format: 'dd-mm-yyyy',
  report_currency: 'PKR',
  default_report_period: 'month',
  enable_auto_reports: false,
  report_email_frequency: 'weekly',
  include_graphs_in_reports: true,
  enable_export_pdf: true,
  enable_export_excel: true,
  enable_export_csv: true,

  // Notifications
  email_notifications: true,
  sms_notifications: false,
  low_stock_alert: true,
  payment_due_alert: true,
  rental_return_alert: true,
  product_expiry_alert: true,
  expiry_alert_days: 30,
  order_status_notification: true,
  daily_sales_summary: false,

  // Security
  session_timeout: 30,
  two_factor_auth: false,
  password_policy: 'medium',
  max_login_attempts: 5,
  lockout_duration: 15,
  require_email_verification: false,
  enable_role_based_access: true,
  enable_audit_log: true,
  ip_whitelist: '',

  // Advanced Settings
  enable_api: false,
  api_key: '',
  webhook_url: '',
  enable_backup: true,
  backup_frequency: 'daily',
  debug_mode: false,
  enable_multi_location: false,
  default_location: 'Main Store',
  enable_multi_currency: false,
  auto_update_exchange_rate: false,
  enable_data_encryption: false,
  cache_duration: 60,

  // Purchase Settings (additional)
  default_purchase_tax: 17,
  purchase_approval_amount: 100000,
  enable_grn: false,
  grn_prefix: 'GRN',
  enable_quality_check: false,
  enable_purchase_return: true,
  enable_vendor_rating: true,
  require_purchase_approval: false,
  
  // Modules
  module_rental: true,
  module_pos: true,
  module_studio: true,
  module_vendors: true,
  module_reporting: true,
  module_accounting: true,

  // Theme & Appearance
  primary_color: '#9333EA',
  secondary_color: '#3B82F6',
  accent_color: '#10B981',
  dark_mode: true,
  compact_mode: false,
  sidebar_position: 'left',
  show_breadcrumbs: true,
  animations_enabled: true,
  
  // Custom Labels
  custom_label_1: '',
  custom_label_2: '',
  custom_label_3: '',
};

// Tooltip Component (Memoized)
const Tooltip = memo(({ children, content }: { children: React.ReactNode; content: string }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {show && (
        <div className="absolute z-50 px-3 py-2 text-xs text-white bg-slate-800 rounded-lg shadow-lg border border-slate-700 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
        </div>
      )}
    </div>
  );
});
Tooltip.displayName = 'Tooltip';

type SettingsTab = 'general' | 'modules' | 'theme' | 'invoice' | 'inventory' | 'pos' | 'purchase' | 'rental' | 'reports' | 'notifications' | 'security' | 'advanced' | 'customization';

const tabConfig: Array<{ id: SettingsTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
  { id: 'general', label: 'General', icon: Building2 },
  { id: 'modules', label: 'Module Management', icon: Layers },
  { id: 'theme', label: 'Theme & Appearance', icon: Palette },
  { id: 'invoice', label: 'Invoice Settings', icon: FileText },
  { id: 'inventory', label: 'Product Settings', icon: Package },
  { id: 'pos', label: 'Sales Settings', icon: ShoppingCart },
  { id: 'purchase', label: 'Purchase Settings', icon: Truck },
  { id: 'rental', label: 'Rental Settings', icon: Archive },
  { id: 'reports', label: 'Reports Settings', icon: PieChart },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'advanced', label: 'Advanced', icon: Database },
];

// Memoized Setting Field Component
const SettingField = memo(({ 
  label, 
  tooltip, 
  children 
}: { 
  label: string; 
  tooltip?: string; 
  children: React.ReactNode;
}) => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      <Label className="text-slate-300">{label}</Label>
      {tooltip && (
        <Tooltip content={tooltip}>
          <HelpCircle size={14} className="text-slate-500 cursor-help" />
        </Tooltip>
      )}
    </div>
    {children}
  </div>
));
SettingField.displayName = 'SettingField';

// Memoized Toggle Row Component
const ToggleRow = memo(({
  label,
  tooltip,
  checked,
  onCheckedChange,
  description
}: {
  label: string;
  tooltip?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  description?: string;
}) => (
  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-950/50 border border-slate-800">
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Label className="text-slate-200 font-medium">{label}</Label>
        {tooltip && (
          <Tooltip content={tooltip}>
            <HelpCircle size={14} className="text-slate-500 cursor-help" />
          </Tooltip>
        )}
      </div>
      {description && <p className="text-sm text-slate-400">{description}</p>}
    </div>
    <Switch
      checked={checked}
      onCheckedChange={onCheckedChange}
    />
  </div>
));
ToggleRow.displayName = 'ToggleRow';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [initialSettings, setInitialSettings] = useState<SettingsData>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  // Force hydration sync for numbering settings and module fields - ensures all fields are present
  useEffect(() => {
    if (!loading && settings) {
      // Ensure all numbering fields exist, even if they're empty strings
      const requiredNumberingFields = [
        'rental_prefix', 'rental_format', 'rental_custom_format',
        'project_prefix', 'project_format', 'project_custom_format',
        'pos_receipt_prefix', 'pos_receipt_format', 'pos_receipt_custom_format',
        'voucher_prefix', 'voucher_format', 'voucher_custom_format',
      ];
      
      // Ensure all module fields exist
      const requiredModuleFields = [
        'module_rental', 'module_pos', 'module_studio', 'module_vendors', 'module_reporting', 'module_accounting',
      ];
      
      const hasMissingFields = [...requiredNumberingFields, ...requiredModuleFields].some(field => {
        const key = field as keyof SettingsData;
        return settings[key] === undefined || settings[key] === null;
      });

      if (hasMissingFields) {
        // Merge with defaults to ensure all fields are present
        setSettings(prev => ({
          ...defaultSettings,
          ...prev,
        }));
      }
    }
  }, [loading, settings]);

  const saveToDatabase = async (settingsToSave: SettingsData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (profile?.business_id) {
        await supabase
          .from('business_settings')
          .upsert({
            business_id: profile.business_id,
            settings: settingsToSave,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'business_id',
          });
      }
    } catch (error) {
      throw error;
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Start with defaultSettings to ensure all new fields are present
      let mergedSettings = { ...defaultSettings };
      
      // Load from localStorage first
      const stored = localStorage.getItem('studio_rently_settings');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Deep merge to ensure all nested objects and new fields are included
          mergedSettings = {
            ...defaultSettings,
            ...parsed,
            // Ensure nested objects are merged too
            pos_keyboard_shortcuts: {
              ...defaultSettings.pos_keyboard_shortcuts,
              ...(parsed.pos_keyboard_shortcuts || {}),
            },
            // Ensure all module fields are always booleans (never undefined)
            module_rental: parsed.module_rental ?? defaultSettings.module_rental,
            module_pos: parsed.module_pos ?? defaultSettings.module_pos,
            module_studio: parsed.module_studio ?? defaultSettings.module_studio,
            module_vendors: parsed.module_vendors ?? defaultSettings.module_vendors,
            module_reporting: parsed.module_reporting ?? defaultSettings.module_reporting,
            module_accounting: parsed.module_accounting ?? defaultSettings.module_accounting,
            // Ensure all new fields from .md documentation have defaults (same as database merge)
            business_address: parsed.business_address ?? defaultSettings.business_address,
            business_phone: parsed.business_phone ?? defaultSettings.business_phone,
            business_email: parsed.business_email ?? defaultSettings.business_email,
            business_website: parsed.business_website ?? defaultSettings.business_website,
            tax_id: parsed.tax_id ?? defaultSettings.tax_id,
            language: parsed.language ?? defaultSettings.language,
            decimal_places: parsed.decimal_places ?? defaultSettings.decimal_places,
            thousand_separator: parsed.thousand_separator ?? defaultSettings.thousand_separator,
            fiscal_year_start: parsed.fiscal_year_start ?? defaultSettings.fiscal_year_start,
            fiscal_year_end: parsed.fiscal_year_end ?? defaultSettings.fiscal_year_end,
            default_tax_rate: parsed.default_tax_rate ?? defaultSettings.default_tax_rate,
            max_discount_percent: parsed.max_discount_percent ?? defaultSettings.max_discount_percent,
            low_stock_threshold: parsed.low_stock_threshold ?? defaultSettings.low_stock_threshold,
            enable_barcode: parsed.enable_barcode ?? defaultSettings.enable_barcode,
            barcode_format: parsed.barcode_format ?? defaultSettings.barcode_format,
            default_product_unit: parsed.default_product_unit ?? defaultSettings.default_product_unit,
            // Rental, Reports, Notifications, Security, Advanced fields (using ?? for all)
            default_rental_duration: parsed.default_rental_duration ?? defaultSettings.default_rental_duration,
            late_fee_per_day: parsed.late_fee_per_day ?? defaultSettings.late_fee_per_day,
            security_deposit_percent: parsed.security_deposit_percent ?? defaultSettings.security_deposit_percent,
            enable_rental_reminders: parsed.enable_rental_reminders ?? defaultSettings.enable_rental_reminders,
            reminder_days_before: parsed.reminder_days_before ?? defaultSettings.reminder_days_before,
            enable_damage_charges: parsed.enable_damage_charges ?? defaultSettings.enable_damage_charges,
            auto_calculate_late_fee: parsed.auto_calculate_late_fee ?? defaultSettings.auto_calculate_late_fee,
            report_date_format: parsed.report_date_format ?? defaultSettings.report_date_format,
            report_currency: parsed.report_currency ?? defaultSettings.report_currency,
            default_report_period: parsed.default_report_period ?? defaultSettings.default_report_period,
            enable_auto_reports: parsed.enable_auto_reports ?? defaultSettings.enable_auto_reports,
            report_email_frequency: parsed.report_email_frequency ?? defaultSettings.report_email_frequency,
            include_graphs_in_reports: parsed.include_graphs_in_reports ?? defaultSettings.include_graphs_in_reports,
            enable_export_pdf: parsed.enable_export_pdf ?? defaultSettings.enable_export_pdf,
            enable_export_excel: parsed.enable_export_excel ?? defaultSettings.enable_export_excel,
            enable_export_csv: parsed.enable_export_csv ?? defaultSettings.enable_export_csv,
            email_notifications: parsed.email_notifications ?? defaultSettings.email_notifications,
            sms_notifications: parsed.sms_notifications ?? defaultSettings.sms_notifications,
            low_stock_alert: parsed.low_stock_alert ?? defaultSettings.low_stock_alert,
            payment_due_alert: parsed.payment_due_alert ?? defaultSettings.payment_due_alert,
            rental_return_alert: parsed.rental_return_alert ?? defaultSettings.rental_return_alert,
            product_expiry_alert: parsed.product_expiry_alert ?? defaultSettings.product_expiry_alert,
            expiry_alert_days: parsed.expiry_alert_days ?? defaultSettings.expiry_alert_days,
            order_status_notification: parsed.order_status_notification ?? defaultSettings.order_status_notification,
            daily_sales_summary: parsed.daily_sales_summary ?? defaultSettings.daily_sales_summary,
            session_timeout: parsed.session_timeout ?? defaultSettings.session_timeout,
            two_factor_auth: parsed.two_factor_auth ?? defaultSettings.two_factor_auth,
            password_policy: parsed.password_policy ?? defaultSettings.password_policy,
            max_login_attempts: parsed.max_login_attempts ?? defaultSettings.max_login_attempts,
            lockout_duration: parsed.lockout_duration ?? defaultSettings.lockout_duration,
            // Theme & Appearance fields
            primary_color: parsed.primary_color ?? defaultSettings.primary_color,
            secondary_color: parsed.secondary_color ?? defaultSettings.secondary_color,
            accent_color: parsed.accent_color ?? defaultSettings.accent_color,
            sidebar_position: parsed.sidebar_position ?? defaultSettings.sidebar_position,
            dark_mode: parsed.dark_mode ?? defaultSettings.dark_mode,
            compact_mode: parsed.compact_mode ?? defaultSettings.compact_mode,
            show_breadcrumbs: parsed.show_breadcrumbs ?? defaultSettings.show_breadcrumbs,
            animations_enabled: parsed.animations_enabled ?? defaultSettings.animations_enabled,
            require_email_verification: parsed.require_email_verification ?? defaultSettings.require_email_verification,
            enable_role_based_access: parsed.enable_role_based_access ?? defaultSettings.enable_role_based_access,
            enable_audit_log: parsed.enable_audit_log ?? defaultSettings.enable_audit_log,
            ip_whitelist: parsed.ip_whitelist ?? defaultSettings.ip_whitelist,
            enable_api: parsed.enable_api ?? defaultSettings.enable_api,
            api_key: parsed.api_key ?? defaultSettings.api_key,
            webhook_url: parsed.webhook_url ?? defaultSettings.webhook_url,
            enable_backup: parsed.enable_backup ?? defaultSettings.enable_backup,
            backup_frequency: parsed.backup_frequency ?? defaultSettings.backup_frequency,
            debug_mode: parsed.debug_mode ?? defaultSettings.debug_mode,
            enable_multi_location: parsed.enable_multi_location ?? defaultSettings.enable_multi_location,
            default_location: parsed.default_location ?? defaultSettings.default_location,
            enable_multi_currency: parsed.enable_multi_currency ?? defaultSettings.enable_multi_currency,
            auto_update_exchange_rate: parsed.auto_update_exchange_rate ?? defaultSettings.auto_update_exchange_rate,
            enable_data_encryption: parsed.enable_data_encryption ?? defaultSettings.enable_data_encryption,
            cache_duration: parsed.cache_duration ?? defaultSettings.cache_duration,
            // Invoice Settings
            invoice_start_number: parsed.invoice_start_number ?? defaultSettings.invoice_start_number,
            invoice_template: parsed.invoice_template ?? defaultSettings.invoice_template,
            invoice_logo_position: parsed.invoice_logo_position ?? defaultSettings.invoice_logo_position,
            invoice_due_days: parsed.invoice_due_days ?? defaultSettings.invoice_due_days,
            invoice_watermark: parsed.invoice_watermark ?? defaultSettings.invoice_watermark,
            invoice_terms: parsed.invoice_terms ?? defaultSettings.invoice_terms,
            invoice_footer: parsed.invoice_footer ?? defaultSettings.invoice_footer,
            show_tax_on_invoice: parsed.show_tax_on_invoice ?? defaultSettings.show_tax_on_invoice,
            show_discount_on_invoice: parsed.show_discount_on_invoice ?? defaultSettings.show_discount_on_invoice,
            // Product Settings
            sku_format: parsed.sku_format ?? defaultSettings.sku_format,
            sku_auto_generate: parsed.sku_auto_generate ?? defaultSettings.sku_auto_generate,
            product_code_prefix: parsed.product_code_prefix ?? defaultSettings.product_code_prefix,
            enable_product_variants: parsed.enable_product_variants ?? defaultSettings.enable_product_variants,
            enable_product_images: parsed.enable_product_images ?? defaultSettings.enable_product_images,
            max_product_images: parsed.max_product_images ?? defaultSettings.max_product_images,
            track_serial_numbers: parsed.track_serial_numbers ?? defaultSettings.track_serial_numbers,
            enable_batch_tracking: parsed.enable_batch_tracking ?? defaultSettings.enable_batch_tracking,
            // Sales Settings
            enable_multiple_tax: parsed.enable_multiple_tax ?? defaultSettings.enable_multiple_tax,
            require_customer_for_sale: parsed.require_customer_for_sale ?? defaultSettings.require_customer_for_sale,
            enable_layaway: parsed.enable_layaway ?? defaultSettings.enable_layaway,
            default_payment_method: parsed.default_payment_method ?? defaultSettings.default_payment_method,
            print_receipt_automatically: parsed.print_receipt_automatically ?? defaultSettings.print_receipt_automatically,
            auto_save_interval: parsed.auto_save_interval ?? defaultSettings.auto_save_interval,
            enable_quick_sale: parsed.enable_quick_sale ?? defaultSettings.enable_quick_sale,
            show_stock_in_sale: parsed.show_stock_in_sale ?? defaultSettings.show_stock_in_sale,
            require_sale_approval: parsed.require_sale_approval ?? defaultSettings.require_sale_approval,
            minimum_sale_amount: parsed.minimum_sale_amount ?? defaultSettings.minimum_sale_amount,
            enable_customer_credit: parsed.enable_customer_credit ?? defaultSettings.enable_customer_credit,
            credit_limit: parsed.credit_limit ?? defaultSettings.credit_limit,
            enable_loyalty_points: parsed.enable_loyalty_points ?? defaultSettings.enable_loyalty_points,
            points_per_currency: parsed.points_per_currency ?? defaultSettings.points_per_currency,
            enable_sale_returns: parsed.enable_sale_returns ?? defaultSettings.enable_sale_returns,
            return_days_limit: parsed.return_days_limit ?? defaultSettings.return_days_limit,
            // Purchase Settings
            default_purchase_tax: parsed.default_purchase_tax ?? defaultSettings.default_purchase_tax,
            purchase_approval_amount: parsed.purchase_approval_amount ?? defaultSettings.purchase_approval_amount,
            enable_grn: parsed.enable_grn ?? defaultSettings.enable_grn,
            enable_purchase_return: parsed.enable_purchase_return ?? defaultSettings.enable_purchase_return,
            enable_vendor_rating: parsed.enable_vendor_rating ?? defaultSettings.enable_vendor_rating,
            require_purchase_approval: parsed.require_purchase_approval ?? defaultSettings.require_purchase_approval,
            // Rental Settings
            damage_assessment_required: parsed.damage_assessment_required ?? defaultSettings.damage_assessment_required,
            // Theme & Appearance
            primary_color: parsed.primary_color ?? defaultSettings.primary_color,
            secondary_color: parsed.secondary_color ?? defaultSettings.secondary_color,
            accent_color: parsed.accent_color ?? defaultSettings.accent_color,
            dark_mode: parsed.dark_mode ?? defaultSettings.dark_mode,
            compact_mode: parsed.compact_mode ?? defaultSettings.compact_mode,
            sidebar_position: parsed.sidebar_position ?? defaultSettings.sidebar_position,
            show_breadcrumbs: parsed.show_breadcrumbs ?? defaultSettings.show_breadcrumbs,
            animations_enabled: parsed.animations_enabled ?? defaultSettings.animations_enabled,
          };
          if (parsed.business_logo_url) {
            setLogoPreview(parsed.business_logo_url);
          }
        } catch (parseError) {
          console.warn('Failed to parse localStorage settings:', parseError);
        }
      }

      // Try to load from database (database takes precedence)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('business_id')
            .eq('user_id', session.user.id)
            .single();

          if (profile?.business_id) {
      const { data: businessSettings } = await supabase
        .from('business_settings')
        .select('settings')
        .eq('business_id', profile.business_id)
        .maybeSingle();

      if (businessSettings?.settings) {
        const parsed = businessSettings.settings as Partial<SettingsData>;
              // Deep merge with database settings - ensure all new fields have defaults
              mergedSettings = {
                ...defaultSettings,
                ...parsed,
                pos_keyboard_shortcuts: {
                  ...defaultSettings.pos_keyboard_shortcuts,
                  ...(parsed.pos_keyboard_shortcuts || {}),
                },
                // Ensure all module fields are always booleans (never undefined)
                module_rental: parsed.module_rental ?? defaultSettings.module_rental,
                module_pos: parsed.module_pos ?? defaultSettings.module_pos,
                module_studio: parsed.module_studio ?? defaultSettings.module_studio,
                module_vendors: parsed.module_vendors ?? defaultSettings.module_vendors,
                module_reporting: parsed.module_reporting ?? defaultSettings.module_reporting,
                module_accounting: parsed.module_accounting ?? defaultSettings.module_accounting,
                // Ensure all new fields from .md documentation have defaults
                business_address: parsed.business_address ?? defaultSettings.business_address,
                business_phone: parsed.business_phone ?? defaultSettings.business_phone,
                business_email: parsed.business_email ?? defaultSettings.business_email,
                business_website: parsed.business_website ?? defaultSettings.business_website,
                tax_id: parsed.tax_id ?? defaultSettings.tax_id,
                language: parsed.language ?? defaultSettings.language,
                decimal_places: parsed.decimal_places ?? defaultSettings.decimal_places,
                thousand_separator: parsed.thousand_separator ?? defaultSettings.thousand_separator,
                fiscal_year_start: parsed.fiscal_year_start ?? defaultSettings.fiscal_year_start,
                fiscal_year_end: parsed.fiscal_year_end ?? defaultSettings.fiscal_year_end,
                default_tax_rate: parsed.default_tax_rate ?? defaultSettings.default_tax_rate,
                max_discount_percent: parsed.max_discount_percent ?? defaultSettings.max_discount_percent,
                low_stock_threshold: parsed.low_stock_threshold ?? defaultSettings.low_stock_threshold,
                enable_barcode: parsed.enable_barcode ?? defaultSettings.enable_barcode,
                barcode_format: parsed.barcode_format ?? defaultSettings.barcode_format,
                default_product_unit: parsed.default_product_unit ?? defaultSettings.default_product_unit,
                // Rental settings
                default_rental_duration: parsed.default_rental_duration ?? defaultSettings.default_rental_duration,
                late_fee_per_day: parsed.late_fee_per_day ?? defaultSettings.late_fee_per_day,
                security_deposit_percent: parsed.security_deposit_percent ?? defaultSettings.security_deposit_percent,
                enable_rental_reminders: parsed.enable_rental_reminders ?? defaultSettings.enable_rental_reminders,
                reminder_days_before: parsed.reminder_days_before ?? defaultSettings.reminder_days_before,
                enable_damage_charges: parsed.enable_damage_charges ?? defaultSettings.enable_damage_charges,
                auto_calculate_late_fee: parsed.auto_calculate_late_fee ?? defaultSettings.auto_calculate_late_fee,
                // Reports settings
                report_date_format: parsed.report_date_format ?? defaultSettings.report_date_format,
                report_currency: parsed.report_currency ?? defaultSettings.report_currency,
                default_report_period: parsed.default_report_period ?? defaultSettings.default_report_period,
                enable_auto_reports: parsed.enable_auto_reports ?? defaultSettings.enable_auto_reports,
                report_email_frequency: parsed.report_email_frequency ?? defaultSettings.report_email_frequency,
                include_graphs_in_reports: parsed.include_graphs_in_reports ?? defaultSettings.include_graphs_in_reports,
                enable_export_pdf: parsed.enable_export_pdf ?? defaultSettings.enable_export_pdf,
                enable_export_excel: parsed.enable_export_excel ?? defaultSettings.enable_export_excel,
                enable_export_csv: parsed.enable_export_csv ?? defaultSettings.enable_export_csv,
                // Notifications
                email_notifications: parsed.email_notifications ?? defaultSettings.email_notifications,
                sms_notifications: parsed.sms_notifications ?? defaultSettings.sms_notifications,
                low_stock_alert: parsed.low_stock_alert ?? defaultSettings.low_stock_alert,
                payment_due_alert: parsed.payment_due_alert ?? defaultSettings.payment_due_alert,
                rental_return_alert: parsed.rental_return_alert ?? defaultSettings.rental_return_alert,
                product_expiry_alert: parsed.product_expiry_alert ?? defaultSettings.product_expiry_alert,
                expiry_alert_days: parsed.expiry_alert_days ?? defaultSettings.expiry_alert_days,
                order_status_notification: parsed.order_status_notification ?? defaultSettings.order_status_notification,
                daily_sales_summary: parsed.daily_sales_summary ?? defaultSettings.daily_sales_summary,
                // Security
                session_timeout: parsed.session_timeout ?? defaultSettings.session_timeout,
                two_factor_auth: parsed.two_factor_auth ?? defaultSettings.two_factor_auth,
                password_policy: parsed.password_policy ?? defaultSettings.password_policy,
                max_login_attempts: parsed.max_login_attempts ?? defaultSettings.max_login_attempts,
                lockout_duration: parsed.lockout_duration ?? defaultSettings.lockout_duration,
                require_email_verification: parsed.require_email_verification ?? defaultSettings.require_email_verification,
                enable_role_based_access: parsed.enable_role_based_access ?? defaultSettings.enable_role_based_access,
                enable_audit_log: parsed.enable_audit_log ?? defaultSettings.enable_audit_log,
                ip_whitelist: parsed.ip_whitelist ?? defaultSettings.ip_whitelist,
                // Advanced
                enable_api: parsed.enable_api ?? defaultSettings.enable_api,
                api_key: parsed.api_key ?? defaultSettings.api_key,
                webhook_url: parsed.webhook_url ?? defaultSettings.webhook_url,
                enable_backup: parsed.enable_backup ?? defaultSettings.enable_backup,
                backup_frequency: parsed.backup_frequency ?? defaultSettings.backup_frequency,
                debug_mode: parsed.debug_mode ?? defaultSettings.debug_mode,
                enable_multi_location: parsed.enable_multi_location ?? defaultSettings.enable_multi_location,
                default_location: parsed.default_location ?? defaultSettings.default_location,
                enable_multi_currency: parsed.enable_multi_currency ?? defaultSettings.enable_multi_currency,
                auto_update_exchange_rate: parsed.auto_update_exchange_rate ?? defaultSettings.auto_update_exchange_rate,
                enable_data_encryption: parsed.enable_data_encryption ?? defaultSettings.enable_data_encryption,
                cache_duration: parsed.cache_duration ?? defaultSettings.cache_duration,
                // Invoice Settings
                invoice_start_number: parsed.invoice_start_number ?? defaultSettings.invoice_start_number,
                invoice_template: parsed.invoice_template ?? defaultSettings.invoice_template,
                invoice_logo_position: parsed.invoice_logo_position ?? defaultSettings.invoice_logo_position,
                invoice_due_days: parsed.invoice_due_days ?? defaultSettings.invoice_due_days,
                invoice_watermark: parsed.invoice_watermark ?? defaultSettings.invoice_watermark,
                invoice_terms: parsed.invoice_terms ?? defaultSettings.invoice_terms,
                invoice_footer: parsed.invoice_footer ?? defaultSettings.invoice_footer,
                show_tax_on_invoice: parsed.show_tax_on_invoice ?? defaultSettings.show_tax_on_invoice,
                show_discount_on_invoice: parsed.show_discount_on_invoice ?? defaultSettings.show_discount_on_invoice,
                // Product Settings
                sku_format: parsed.sku_format ?? defaultSettings.sku_format,
                sku_auto_generate: parsed.sku_auto_generate ?? defaultSettings.sku_auto_generate,
                product_code_prefix: parsed.product_code_prefix ?? defaultSettings.product_code_prefix,
                enable_product_variants: parsed.enable_product_variants ?? defaultSettings.enable_product_variants,
                enable_product_images: parsed.enable_product_images ?? defaultSettings.enable_product_images,
                max_product_images: parsed.max_product_images ?? defaultSettings.max_product_images,
                track_serial_numbers: parsed.track_serial_numbers ?? defaultSettings.track_serial_numbers,
                enable_batch_tracking: parsed.enable_batch_tracking ?? defaultSettings.enable_batch_tracking,
                // Sales Settings
                enable_multiple_tax: parsed.enable_multiple_tax ?? defaultSettings.enable_multiple_tax,
                require_customer_for_sale: parsed.require_customer_for_sale ?? defaultSettings.require_customer_for_sale,
                enable_layaway: parsed.enable_layaway ?? defaultSettings.enable_layaway,
                default_payment_method: parsed.default_payment_method ?? defaultSettings.default_payment_method,
                print_receipt_automatically: parsed.print_receipt_automatically ?? defaultSettings.print_receipt_automatically,
                auto_save_interval: parsed.auto_save_interval ?? defaultSettings.auto_save_interval,
                enable_quick_sale: parsed.enable_quick_sale ?? defaultSettings.enable_quick_sale,
                show_stock_in_sale: parsed.show_stock_in_sale ?? defaultSettings.show_stock_in_sale,
                require_sale_approval: parsed.require_sale_approval ?? defaultSettings.require_sale_approval,
                minimum_sale_amount: parsed.minimum_sale_amount ?? defaultSettings.minimum_sale_amount,
                enable_customer_credit: parsed.enable_customer_credit ?? defaultSettings.enable_customer_credit,
                credit_limit: parsed.credit_limit ?? defaultSettings.credit_limit,
                enable_loyalty_points: parsed.enable_loyalty_points ?? defaultSettings.enable_loyalty_points,
                points_per_currency: parsed.points_per_currency ?? defaultSettings.points_per_currency,
                enable_sale_returns: parsed.enable_sale_returns ?? defaultSettings.enable_sale_returns,
                return_days_limit: parsed.return_days_limit ?? defaultSettings.return_days_limit,
                // Purchase Settings
                default_purchase_tax: parsed.default_purchase_tax ?? defaultSettings.default_purchase_tax,
                purchase_approval_amount: parsed.purchase_approval_amount ?? defaultSettings.purchase_approval_amount,
                enable_grn: parsed.enable_grn ?? defaultSettings.enable_grn,
                enable_purchase_return: parsed.enable_purchase_return ?? defaultSettings.enable_purchase_return,
                enable_vendor_rating: parsed.enable_vendor_rating ?? defaultSettings.enable_vendor_rating,
                require_purchase_approval: parsed.require_purchase_approval ?? defaultSettings.require_purchase_approval,
                // Rental Settings
                damage_assessment_required: parsed.damage_assessment_required ?? defaultSettings.damage_assessment_required,
                // Theme & Appearance
                primary_color: parsed.primary_color ?? defaultSettings.primary_color,
                secondary_color: parsed.secondary_color ?? defaultSettings.secondary_color,
                accent_color: parsed.accent_color ?? defaultSettings.accent_color,
                dark_mode: parsed.dark_mode ?? defaultSettings.dark_mode,
                compact_mode: parsed.compact_mode ?? defaultSettings.compact_mode,
                sidebar_position: parsed.sidebar_position ?? defaultSettings.sidebar_position,
                show_breadcrumbs: parsed.show_breadcrumbs ?? defaultSettings.show_breadcrumbs,
                animations_enabled: parsed.animations_enabled ?? defaultSettings.animations_enabled,
              };
        if (parsed.business_logo_url) {
          setLogoPreview(parsed.business_logo_url);
        }
            }
          }
        }
      } catch (dbError) {
        console.warn('Could not load from database, using localStorage:', dbError);
      }
      
      // Set the merged settings (ensures all fields from defaultSettings are present)
      setSettings(mergedSettings);
      setInitialSettings(mergedSettings); // Store initial state for comparison
      
      // Sync back to localStorage to ensure new fields are saved
      localStorage.setItem('studio_rently_settings', JSON.stringify(mergedSettings));
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Fallback to defaults
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  // Track changes to detect unsaved modifications
  useEffect(() => {
    const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);
    setHasUnsavedChanges(hasChanges);
  }, [settings, initialSettings]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Optimistic update handler for modules - works in real-time
  const handleModuleToggle = useCallback((moduleKey: keyof Pick<SettingsData, 'module_rental' | 'module_pos' | 'module_studio' | 'module_vendors' | 'module_reporting' | 'module_accounting'>, checked: boolean) => {
    // Optimistic UI update - update immediately using functional update
    setSettings(prev => {
      const updatedSettings = { ...prev, [moduleKey]: checked };
      
      // Dispatch event immediately for sidebar update with latest state
      window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: updatedSettings }));
      localStorage.setItem('studio_rently_settings', JSON.stringify(updatedSettings));

      // Show immediate feedback
      toast.success(`${moduleKey.replace('module_', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} module ${checked ? 'enabled' : 'disabled'}. Changes applied globally.`, {
        duration: 3000,
      });

      // Save to database in background (non-blocking)
      saveToDatabase(updatedSettings).catch(err => {
        console.warn('Background save failed:', err);
        toast.error('Failed to save module change. Please save manually.');
      });
      
      return updatedSettings;
    });
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      
      // Always save to localStorage first
      localStorage.setItem('studio_rently_settings', JSON.stringify(settings));
      
      // Dispatch custom event to notify sidebar and other components
      // This triggers a global refresh across all components using useSettings hook
      window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: settings }));
      
      // Also trigger a storage event for cross-tab sync
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'studio_rently_settings',
        newValue: JSON.stringify(settings),
        storageArea: localStorage,
      }));

      // Try to save to database
      await saveToDatabase(settings);

      // Update initial settings to mark as saved
      setInitialSettings(settings);
      setHasUnsavedChanges(false);

      toast.success('Settings updated successfully! Changes applied globally.', {
        duration: 4000,
        description: 'All 127+ settings have been saved and synchronized.',
      });
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings', {
        description: error?.message || 'Please try again or check your connection.',
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to upload logo');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
      const filePath = `business-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(filePath, file, { upsert: true });

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

  // Memoized tab content to prevent re-renders
  const tabContent = useMemo(() => {
  if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent"></div>
        </div>
      );
    }

    switch (activeTab) {
      case 'general':
        return <GeneralTab settings={settings} setSettings={setSettings} logoPreview={logoPreview} handleLogoUpload={handleLogoUpload} />;
      case 'modules':
        return <ModulesTab settings={settings} onModuleToggle={handleModuleToggle} setActiveTab={setActiveTab} />;
      case 'theme':
        return <ThemeTab settings={settings} setSettings={setSettings} />;
      case 'invoice':
        return <InvoiceTab settings={settings} setSettings={setSettings} />;
      case 'inventory':
        return <InventoryTab settings={settings} setSettings={setSettings} />;
      case 'pos':
        return <POSTab settings={settings} setSettings={setSettings} />;
      case 'purchase':
        return <PurchaseTab settings={settings} setSettings={setSettings} />;
      case 'rental':
        return <RentalTab settings={settings} setSettings={setSettings} />;
      case 'reports':
        return <ReportsTab settings={settings} setSettings={setSettings} />;
      case 'notifications':
        return <NotificationsTab settings={settings} setSettings={setSettings} />;
      case 'security':
        return <SecurityTab settings={settings} setSettings={setSettings} />;
      case 'advanced':
        return <AdvancedTab settings={settings} setSettings={setSettings} />;
      case 'customization':
        return <CustomizationTab settings={settings} setSettings={setSettings} />;
      default:
        return null;
    }
  }, [activeTab, settings, loading, logoPreview, handleLogoUpload, handleModuleToggle]);

  if (loading && !tabContent) {
    return (
      <ModernDashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent"></div>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout>
      <div className="flex h-full" style={{ backgroundColor: '#0B0F1A' }}>
        {/* Vertical Left Sidebar */}
        <div className="w-64 border-r border-slate-800/50 bg-slate-900/30 flex-shrink-0">
          {/* Header */}
          <div className="px-4 py-6 border-b border-slate-800/50">
            <div className="flex items-center gap-3 mb-2">
              <Settings size={24} className="text-indigo-400" />
              <h1 className="text-xl font-bold text-slate-100">Settings</h1>
            </div>
            <p className="text-xs text-slate-400">System Configuration</p>
          </div>

          {/* Vertical Tabs */}
          <div className="py-4">
            {tabConfig.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 transition-standard text-sm font-medium",
                    isActive
                      ? "bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-500"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
                  )}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Content Header */}
          <div className="px-6 py-6 border-b border-slate-800/50 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-100">
                {tabConfig.find(t => t.id === activeTab)?.label || 'Settings'}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {activeTab === 'general' && 'Configure business information and regional settings'}
                {activeTab === 'modules' && 'Enable or disable core business modules'}
                {activeTab === 'theme' && 'Customize visual appearance and branding'}
                {activeTab === 'invoice' && 'Configure invoice generation and appearance'}
                {activeTab === 'inventory' && 'Product and stock management settings'}
                {activeTab === 'pos' && 'POS behavior, sales settings, and numbering systems'}
                {activeTab === 'purchase' && 'Purchase orders and vendor management'}
                {activeTab === 'rental' && 'Rental booking and return management'}
                {activeTab === 'reports' && 'Report generation and export settings'}
                {activeTab === 'notifications' && 'Email and SMS notification preferences'}
                {activeTab === 'security' && 'Authentication and access control'}
                {activeTab === 'advanced' && 'API, backup, and system integrations'}
                {activeTab === 'customization' && 'Custom field labels and branding'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (confirm('Are you sure you want to reset all settings to defaults?')) {
                    setSettings(defaultSettings);
                    toast.success('Settings reset to defaults');
                  }
                }}
                className="bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 transition-standard"
              >
                <RotateCcw size={18} className="mr-2" />
                Reset All
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-standard"
              >
                <Save size={18} className="mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          {/* Unsaved Changes Banner */}
          {hasUnsavedChanges && (
            <div className="mx-6 mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 flex items-center justify-between animate-entrance">
              <div className="flex items-center gap-3">
                <AlertCircle size={18} className="text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-amber-300">You have unsaved changes</p>
                  <p className="text-xs text-amber-400/70">Save your changes before leaving this page</p>
                </div>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                size="sm"
                className="bg-amber-600 hover:bg-amber-500 text-white"
              >
                <Save size={14} className="mr-2" />
                {saving ? 'Saving...' : 'Save Now'}
              </Button>
            </div>
          )}

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {tabContent}
          </div>

          {/* Sticky Save Button at Bottom */}
          <div className="sticky bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800/50 px-6 py-4 flex items-center justify-between z-10">
            <div className="text-sm text-slate-400">
              {hasUnsavedChanges ? (
                <span className="text-amber-400">⚠️ Unsaved changes detected</span>
              ) : (
                <span className="text-green-400">✓ All changes saved</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (hasUnsavedChanges && !confirm('Discard all unsaved changes?')) return;
                  setSettings(initialSettings);
                  setHasUnsavedChanges(false);
                  toast.info('Changes discarded');
                }}
                disabled={!hasUnsavedChanges || saving}
                className="bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 transition-standard"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !hasUnsavedChanges}
                className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-standard disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} className="mr-2" />
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ModernDashboardLayout>
  );
}

// Memoized Tab Components
const GeneralTab = memo(({ 
  settings, 
  setSettings, 
  logoPreview, 
  handleLogoUpload 
}: { 
  settings: SettingsData; 
  setSettings: React.Dispatch<React.SetStateAction<SettingsData>>;
  logoPreview: string | null;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <div className="space-y-6 max-w-5xl animate-entrance">
    {/* Business Information */}
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 space-y-6 hover-lift transition-standard">
      <div className="flex items-center gap-3 mb-4">
        <Building2 size={24} className="text-indigo-400" />
        <h2 className="text-xl font-semibold text-slate-100">Business Information</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SettingField label="Business Name *" tooltip="Your business name as it appears on invoices">
                    <Input
            value={settings.business_name}
            onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
            placeholder="Studio Rently"
          />
        </SettingField>

        <SettingField label="Business Email *" tooltip="Official business email for communications">
          <Input
            type="email"
            value={settings.business_email}
            onChange={(e) => setSettings({ ...settings, business_email: e.target.value })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
            placeholder="info@business.com"
          />
        </SettingField>

        <SettingField label="Business Phone" tooltip="Primary business contact number">
          <Input
            value={settings.business_phone}
            onChange={(e) => setSettings({ ...settings, business_phone: e.target.value })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
            placeholder="+92 300 1234567"
          />
        </SettingField>

        <SettingField label="Business Website" tooltip="Business website URL">
          <Input
            value={settings.business_website}
            onChange={(e) => setSettings({ ...settings, business_website: e.target.value })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
            placeholder="www.business.com"
          />
        </SettingField>

        <SettingField label="Tax ID / NTN" tooltip="National Tax Number or Business Registration ID">
          <Input
            value={settings.tax_id}
            onChange={(e) => setSettings({ ...settings, tax_id: e.target.value })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
            placeholder="TAX-123456"
          />
        </SettingField>
                  </div>

      <SettingField label="Business Address" tooltip="Complete business address">
        <Textarea
          value={settings.business_address}
          onChange={(e) => setSettings({ ...settings, business_address: e.target.value })}
          className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          placeholder="Shop #123, Main Boulevard, City, Country"
          rows={3}
        />
      </SettingField>

      {/* Regional Settings */}
      <div className="border-t border-slate-800 pt-6 mt-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Globe size={20} />
          Regional Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SettingField label="Currency" tooltip="Primary currency for all transactions">
                    <select
                      value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-standard"
            >
              <option value="PKR">PKR - Pakistani Rupee</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="AED">AED - UAE Dirham</option>
                    </select>
          </SettingField>

          <SettingField label="Currency Placement" tooltip="Position of currency symbol relative to amount">
            <select
              value={settings.currency_placement}
              onChange={(e) => setSettings({ ...settings, currency_placement: e.target.value as 'before' | 'after' })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-standard"
            >
              <option value="before">Before Amount (PKR 100)</option>
              <option value="after">After Amount (100 PKR)</option>
            </select>
          </SettingField>

          <SettingField label="Timezone" tooltip="Business timezone for date/time calculations">
            <select
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-standard"
            >
              <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
            </select>
          </SettingField>

          <SettingField label="Language" tooltip="System interface language">
            <select
              value={settings.language}
              onChange={(e) => setSettings({ ...settings, language: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-standard"
            >
              <option value="en">English</option>
              <option value="ur">Urdu</option>
              <option value="ar">Arabic</option>
            </select>
          </SettingField>

          <SettingField label="Date Format" tooltip="Date display format across the system">
            <select
              value={settings.date_format}
              onChange={(e) => setSettings({ ...settings, date_format: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-standard"
            >
              <option value="dd-mm-yyyy">DD-MM-YYYY</option>
              <option value="mm-dd-yyyy">MM-DD-YYYY</option>
              <option value="yyyy-mm-dd">YYYY-MM-DD</option>
            </select>
          </SettingField>

          <SettingField label="Time Format" tooltip="12-hour or 24-hour time display">
            <select
              value={settings.time_format}
              onChange={(e) => setSettings({ ...settings, time_format: e.target.value as '12' | '24' })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-standard"
            >
              <option value="24">24 Hour</option>
              <option value="12">12 Hour (AM/PM)</option>
            </select>
          </SettingField>

          <SettingField label="Decimal Places" tooltip="Number of decimal places for monetary amounts">
            <Input
              type="number"
              min="0"
              max="4"
              value={settings.decimal_places}
              onChange={(e) => setSettings({ ...settings, decimal_places: parseInt(e.target.value) || 2 })}
              className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
            />
          </SettingField>

          <SettingField label="Thousand Separator" tooltip="Character used to separate thousands">
            <select
              value={settings.thousand_separator}
              onChange={(e) => setSettings({ ...settings, thousand_separator: e.target.value as ',' | '.' | ' ' })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-standard"
            >
              <option value=",">Comma (1,000,000)</option>
              <option value=".">Period (1.000.000)</option>
              <option value=" ">Space (1 000 000)</option>
            </select>
          </SettingField>
        </div>
      </div>

      {/* Financial Year Configuration */}
      <div className="border-t border-slate-800 pt-6 mt-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Calendar size={20} />
          Financial Year Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SettingField label="Fiscal Year Start (MM-DD)" tooltip="Start date of financial year (e.g., 01-01 for January 1st)">
            <Input
              type="text"
              value={settings.fiscal_year_start}
              onChange={(e) => setSettings({ ...settings, fiscal_year_start: e.target.value })}
              className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
              placeholder="01-01"
            />
          </SettingField>

          <SettingField label="Fiscal Year End (MM-DD)" tooltip="End date of financial year (e.g., 12-31 for December 31st)">
            <Input
              type="text"
              value={settings.fiscal_year_end}
              onChange={(e) => setSettings({ ...settings, fiscal_year_end: e.target.value })}
              className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
              placeholder="12-31"
            />
          </SettingField>

          <SettingField label="Financial Year Start Month" tooltip="Month when your financial year begins (Legacy)">
            <select
              value={settings.financial_year_start_month}
              onChange={(e) => setSettings({ ...settings, financial_year_start_month: parseInt(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-standard"
            >
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, idx) => (
                <option key={idx} value={idx + 1}>{month}</option>
              ))}
            </select>
          </SettingField>

          <SettingField label="Profit Calculation Method" tooltip="Inventory valuation method: FIFO, LIFO, or Weighted Average">
            <select
              value={settings.profit_calculation_method}
              onChange={(e) => setSettings({ ...settings, profit_calculation_method: e.target.value as 'fifo' | 'lifo' | 'weighted_average' })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-standard"
            >
              <option value="fifo">FIFO (First In First Out)</option>
              <option value="lifo">LIFO (Last In First Out)</option>
              <option value="weighted_average">Weighted Average</option>
            </select>
          </SettingField>
        </div>
                  </div>

                  <div>
        <SettingField label="Business Logo" tooltip="Logo displayed on invoices and receipts (Recommended: 200x200px)">
                    <div className="flex items-center gap-4">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Business Logo"
                className="h-24 w-24 rounded-lg object-cover border border-slate-800"
                        />
                      ) : (
              <div className="h-24 w-24 rounded-lg bg-slate-950 flex items-center justify-center border border-slate-800">
                <ImageIcon size={32} className="text-slate-600" />
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
                {logoPreview ? 'Change Logo' : 'Upload Logo'}
                        </label>
              <p className="text-xs text-slate-500 mt-2">PNG or JPG, max 5MB</p>
                      </div>
                    </div>
        </SettingField>
                  </div>

      {/* Tax Section */}
      <div className="border-t border-slate-800 pt-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <DollarSign size={20} />
          Tax Configuration
        </h3>
        <div className="space-y-4">
          <ToggleRow
            label="Enable Inline Tax"
            tooltip="Show tax fields directly in purchase and sales forms"
            checked={settings.enable_inline_tax}
            onCheckedChange={(checked) => setSettings({ ...settings, enable_inline_tax: checked })}
            description="Display tax fields in transaction forms"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettingField label="Tax Name" tooltip="Primary tax name (e.g., GST, VAT)">
              <Input
                value={settings.tax_1_name}
                onChange={(e) => setSettings({ ...settings, tax_1_name: e.target.value })}
                className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
                placeholder="GST / VAT"
              />
            </SettingField>
            <SettingField label="Tax ID Number" tooltip="Your tax registration number">
              <Input
                value={settings.tax_1_number}
                onChange={(e) => setSettings({ ...settings, tax_1_number: e.target.value })}
                className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
                placeholder="Tax Registration Number"
              />
            </SettingField>
            <SettingField label="Default Tax Rate (%)" tooltip="Default tax percentage applied to sales">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={settings.default_tax_rate}
                onChange={(e) => setSettings({ ...settings, default_tax_rate: parseFloat(e.target.value) || 0 })}
                className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
                placeholder="17"
              />
            </SettingField>
          </div>
        </div>
      </div>
    </div>
  </div>
));
GeneralTab.displayName = 'GeneralTab';

// Modules Tab - Figma Style 3-Column Grid
const ModulesTab = memo(({ 
  settings, 
  onModuleToggle, 
  setActiveTab 
}: { 
  settings: SettingsData; 
  onModuleToggle: (moduleKey: keyof Pick<SettingsData, 'module_rental' | 'module_pos' | 'module_studio' | 'module_vendors' | 'module_reporting' | 'module_accounting'>, checked: boolean) => void;
  setActiveTab: (tab: SettingsTab) => void;
}) => {
  const modules = [
    {
      key: 'module_pos' as const,
      title: 'POS System',
      description: 'Point of Sale module for quick transactions',
      icon: ShoppingCart,
      color: 'purple',
      configureTab: 'pos' as SettingsTab,
    },
    {
      key: 'module_studio' as const,
      title: 'Studio Production',
      description: 'Full production workflow with departments',
      icon: Scissors,
      color: 'orange',
      configureTab: 'inventory' as SettingsTab,
    },
    {
      key: 'module_vendors' as const,
      title: 'Vendor Management',
      description: 'Track supplier ledgers and purchase history',
      icon: Truck,
      color: 'blue',
      configureTab: 'purchase' as SettingsTab,
    },
    {
      key: 'module_reporting' as const,
      title: 'Advanced Reporting',
      description: 'Real-time sales analytics and insights',
      icon: BarChart3,
      color: 'yellow',
      configureTab: 'reports' as SettingsTab,
    },
    {
      key: 'module_rental' as const,
      title: 'Rental & Leasing',
      description: 'Manage rental items and bookings',
      icon: Archive,
      color: 'teal',
      configureTab: 'rental' as SettingsTab,
    },
    {
      key: 'module_accounting' as const,
      title: 'Accounting',
      description: 'Financial accounts and ledgers',
      icon: DollarSign,
      color: 'green',
      configureTab: 'advanced' as SettingsTab,
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; icon: string }> = {
      purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', icon: 'text-purple-400' },
      orange: { bg: 'bg-orange-500/20', border: 'border-orange-500/50', icon: 'text-orange-400' },
      blue: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', icon: 'text-blue-400' },
      yellow: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', icon: 'text-yellow-400' },
      teal: { bg: 'bg-teal-500/20', border: 'border-teal-500/50', icon: 'text-teal-400' },
      green: { bg: 'bg-green-500/20', border: 'border-green-500/50', icon: 'text-green-400' },
    };
    return colors[color] || colors.purple;
  };

  return (
    <div className="space-y-6 max-w-6xl animate-entrance">
      {/* Info Banner */}
      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle size={20} className="text-indigo-400 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-indigo-300 mb-1">Module Control Center</h3>
          <p className="text-xs text-slate-400">
            Enable or disable modules to customize your ERP system. Disabled modules won't appear in the sidebar.
          </p>
        </div>
      </div>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module, idx) => {
          const Icon = module.icon;
          const isActive = settings[module.key];
          const colorClasses = getColorClasses(module.color);
          
          return (
            <div
              key={module.key}
              className={cn(
                "bg-slate-900/50 backdrop-blur-sm border rounded-xl p-6 space-y-4 hover-lift transition-standard animate-entrance",
                isActive 
                  ? `${colorClasses.border} border-2 shadow-lg shadow-${module.color}-500/10` 
                  : "border-slate-800/50 opacity-60"
              )}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {/* Header with Icon and Toggle */}
              <div className="flex items-start justify-between">
                <div className={cn("p-3 rounded-lg", colorClasses.bg)}>
                  <Icon size={24} className={colorClasses.icon} />
                </div>
                <div className="flex items-center gap-2">
                  {isActive && (
                    <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded-md border border-green-500/30">
                      Active
                    </span>
                  )}
                  <Switch
                    checked={isActive}
                    onCheckedChange={(checked) => onModuleToggle(module.key, checked)}
                  />
                </div>
              </div>

              {/* Title and Description */}
              <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">{module.title}</h3>
                <p className="text-sm text-slate-400">{module.description}</p>
              </div>

              {/* Configure Button */}
              {isActive && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveTab(module.configureTab)}
                  className="w-full text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 border border-indigo-500/20"
                >
                  <SettingsIcon size={16} className="mr-2" />
                  Configure
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
ModulesTab.displayName = 'ModulesTab';

const POSTab = memo(({ settings, setSettings }: { settings: SettingsData; setSettings: React.Dispatch<React.SetStateAction<SettingsData>> }) => (
  <div className="space-y-6 max-w-5xl animate-entrance">
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 space-y-6 hover-lift transition-standard">
      <div className="flex items-center gap-3 mb-4">
        <ShoppingCart size={24} className="text-indigo-400" />
        <h2 className="text-xl font-semibold text-slate-100">POS & Sales Behavior</h2>
                </div>

      <SettingField 
        label="Duplicate Product Action" 
        tooltip="What happens when the same product is added to a sale multiple times"
      >
        <select
          value={settings.pos_duplicate_item_action}
          onChange={(e) => setSettings({ ...settings, pos_duplicate_item_action: e.target.value as 'combine' | 'new_line' })}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="combine">Combine Quantity</option>
          <option value="new_line">Add as New Line</option>
        </select>
      </SettingField>

      <div className="space-y-4">
        <ToggleRow
          label="Enable Multiple Tax Rates"
          tooltip="Allow different tax rates for different products"
          checked={settings.enable_multiple_tax}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_multiple_tax: checked })}
          description="Support multiple tax rates per product"
        />
        <ToggleRow
          label="Require Customer for Sale"
          tooltip="Make customer selection mandatory for every sale"
          checked={settings.require_customer_for_sale}
          onCheckedChange={(checked) => setSettings({ ...settings, require_customer_for_sale: checked })}
          description="Customer must be selected before saving sale"
        />
        <ToggleRow
          label="Enable Layaway/Installment"
          tooltip="Allow sales on installment payment plans"
          checked={settings.enable_layaway}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_layaway: checked })}
          description="Enable installment payment plans"
        />
        <ToggleRow
          label="Allow Negative Stock"
          tooltip="Allow sales even when stock quantity is insufficient"
          checked={settings.allow_negative_stock}
          onCheckedChange={(checked) => setSettings({ ...settings, allow_negative_stock: checked })}
          description="Allow sales when stock is insufficient"
        />
        <ToggleRow
          label="Auto-Print Receipt"
          tooltip="Automatically print receipt after sale completion"
          checked={settings.print_receipt_automatically}
          onCheckedChange={(checked) => setSettings({ ...settings, print_receipt_automatically: checked })}
          description="Print receipt automatically after sale"
        />
        <ToggleRow
          label="Allow Price Editing"
          tooltip="Allow staff to modify product prices during sale entry"
          checked={settings.pos_allow_price_edit}
          onCheckedChange={(checked) => setSettings({ ...settings, pos_allow_price_edit: checked })}
          description="Staff can edit product price during sale"
        />
        <ToggleRow
          label="Allow Manual Discounts"
          tooltip="Enable discount functionality in point-of-sale"
          checked={settings.pos_allow_discount}
          onCheckedChange={(checked) => setSettings({ ...settings, pos_allow_discount: checked })}
          description="Enable discount options during checkout"
        />
        <ToggleRow
          label="Enable Quick Sale Mode"
          tooltip="Enable simplified POS interface for fast transactions"
          checked={settings.enable_quick_sale}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_quick_sale: checked })}
          description="Simplified interface for quick transactions"
        />
        <ToggleRow
          label="Show Stock in Sale"
          tooltip="Display available quantity during product selection"
          checked={settings.show_stock_in_sale}
          onCheckedChange={(checked) => setSettings({ ...settings, show_stock_in_sale: checked })}
          description="Display stock levels during sale entry"
        />
        <ToggleRow
          label="Require Sale Approval"
          tooltip="Sales require manager approval before finalization"
          checked={settings.require_sale_approval}
          onCheckedChange={(checked) => setSettings({ ...settings, require_sale_approval: checked })}
          description="Require manager approval for sales"
        />
        <ToggleRow
          label="Enable Customer Credit"
          tooltip="Allow sales on credit (pay later)"
          checked={settings.enable_customer_credit}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_customer_credit: checked })}
          description="Allow sales on credit terms"
        />
        <ToggleRow
          label="Enable Loyalty Points"
          tooltip="Reward customers with points on purchases"
          checked={settings.enable_loyalty_points}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_loyalty_points: checked })}
          description="Enable loyalty points system"
        />
        <ToggleRow
          label="Enable Sale Returns"
          tooltip="Allow customers to return purchased items"
          checked={settings.enable_sale_returns}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_sale_returns: checked })}
          description="Allow customers to return items"
        />
                    </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SettingField label="Default Payment Method" tooltip="Pre-selected payment method on POS/Sales form">
          <select
            value={settings.default_payment_method}
            onChange={(e) => setSettings({ ...settings, default_payment_method: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          >
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="online">Online Payment</option>
          </select>
        </SettingField>

        <SettingField label="Auto-Save Interval (seconds)" tooltip="Automatically save draft sales every N seconds">
          <Input
            type="number"
            min="10"
            max="300"
            value={settings.auto_save_interval}
            onChange={(e) => setSettings({ ...settings, auto_save_interval: parseInt(e.target.value) || 30 })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          />
        </SettingField>

        <SettingField label="Customer Credit Limit" tooltip="Maximum credit amount allowed per customer">
          <Input
            type="number"
            min="0"
            value={settings.credit_limit}
            onChange={(e) => setSettings({ ...settings, credit_limit: parseFloat(e.target.value) || 50000 })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          />
        </SettingField>

        <SettingField label="Minimum Sale Amount" tooltip="Minimum transaction value for a sale">
          <Input
            type="number"
            min="0"
            value={settings.minimum_sale_amount}
            onChange={(e) => setSettings({ ...settings, minimum_sale_amount: parseFloat(e.target.value) || 0 })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          />
        </SettingField>

        <SettingField label="Return Days Limit" tooltip="Number of days within which returns are accepted">
          <Input
            type="number"
            min="1"
            max="90"
            value={settings.return_days_limit}
            onChange={(e) => setSettings({ ...settings, return_days_limit: parseInt(e.target.value) || 7 })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          />
        </SettingField>

        <SettingField label="Loyalty Points Per Currency" tooltip="How many points earned per currency unit spent">
          <Input
            type="number"
            min="0"
            step="0.1"
            value={settings.points_per_currency}
            onChange={(e) => setSettings({ ...settings, points_per_currency: parseFloat(e.target.value) || 1 })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          />
        </SettingField>
      </div>

      <SettingField label="Max Discount Allowed (%)" tooltip="Maximum discount percentage allowed on sales">
        <Input
          type="number"
          min="0"
          max="100"
          value={settings.max_discount_percent}
          onChange={(e) => setSettings({ ...settings, max_discount_percent: parseFloat(e.target.value) || 50 })}
          className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
        />
      </SettingField>

      <div className="border-t border-slate-800 pt-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <FileText size={20} />
          Invoice Numbering
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <SettingField label="Invoice Prefix" tooltip="Prefix for all invoice numbers (e.g., INV, SAL, PO)">
            <Input
              value={settings.invoice_prefix}
              onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value.toUpperCase() })}
              className="bg-slate-950 border-slate-800 text-slate-200"
              placeholder="INV"
              maxLength={10}
            />
          </SettingField>
          <SettingField label="Invoice Format" tooltip="Format for invoice number generation">
            <select
              value={settings.invoice_format}
              onChange={(e) => setSettings({ ...settings, invoice_format: e.target.value as 'short' | 'long' | 'custom' })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="short">Short: {settings.invoice_prefix}-001</option>
              <option value="long">Long: {settings.invoice_prefix}-2026-001</option>
              <option value="custom">Custom Format</option>
            </select>
          </SettingField>
          {settings.invoice_format === 'custom' && (
            <SettingField label="Custom Format" tooltip="Use {PREFIX}, {YEAR}, {MONTH}, {DAY}, {SEQ} as placeholders (e.g., {PREFIX}-{YEAR}{MONTH}{DAY}-{SEQ})">
              <div className="space-y-2">
                <Input
                  value={settings.invoice_custom_format || ''}
                  onChange={(e) => setSettings({ ...settings, invoice_custom_format: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
                  placeholder="{PREFIX}-{YEAR}{MONTH}{DAY}-{SEQ}"
                />
                {settings.invoice_custom_format && (
                  <div className="text-xs text-slate-400 bg-slate-900/50 border border-slate-800 rounded px-3 py-2">
                    <span className="text-slate-500">Preview: </span>
                    <span className="text-indigo-400 font-mono">
                      {settings.invoice_custom_format
                        .replace(/{PREFIX}/g, settings.invoice_prefix || 'INV')
                        .replace(/{YEAR}/g, String(new Date().getFullYear()))
                        .replace(/{MONTH}/g, String(new Date().getMonth() + 1).padStart(2, '0'))
                        .replace(/{DAY}/g, String(new Date().getDate()).padStart(2, '0'))
                        .replace(/{SEQ}/g, '0001')}
                    </span>
                  </div>
                )}
              </div>
            </SettingField>
          )}
        </div>
                  </div>

      <div className="border-t border-slate-800 pt-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <FileText size={20} />
          Purchase Numbering
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <SettingField label="Purchase Prefix" tooltip="Prefix for all purchase order numbers (e.g., PUR, PO, PCH)">
            <Input
              value={settings.purchase_prefix}
              onChange={(e) => setSettings({ ...settings, purchase_prefix: e.target.value.toUpperCase() })}
              className="bg-slate-950 border-slate-800 text-slate-200"
              placeholder="PUR"
              maxLength={10}
            />
          </SettingField>
          <SettingField label="Purchase Format" tooltip="Format for purchase order number generation">
            <select
              value={settings.purchase_format}
              onChange={(e) => setSettings({ ...settings, purchase_format: e.target.value as 'short' | 'long' | 'custom' })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="short">Short: {settings.purchase_prefix}-001</option>
              <option value="long">Long: {settings.purchase_prefix}-2026-001</option>
              <option value="custom">Custom Format</option>
            </select>
          </SettingField>
          {settings.purchase_format === 'custom' && (
            <SettingField label="Custom Format" tooltip="Use {PREFIX}, {YEAR}, {MONTH}, {DAY}, {SEQ} as placeholders (e.g., {PREFIX}-{YEAR}{MONTH}{DAY}-{SEQ})">
              <div className="space-y-2">
                <Input
                  value={settings.purchase_custom_format || ''}
                  onChange={(e) => setSettings({ ...settings, purchase_custom_format: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
                  placeholder="{PREFIX}-{YEAR}{MONTH}{DAY}-{SEQ}"
                />
                {settings.purchase_custom_format && (
                  <div className="text-xs text-slate-400 bg-slate-900/50 border border-slate-800 rounded px-3 py-2">
                    <span className="text-slate-500">Preview: </span>
                    <span className="text-indigo-400 font-mono">
                      {settings.purchase_custom_format
                        .replace(/{PREFIX}/g, settings.purchase_prefix || 'PUR')
                        .replace(/{YEAR}/g, String(new Date().getFullYear()))
                        .replace(/{MONTH}/g, String(new Date().getMonth() + 1).padStart(2, '0'))
                        .replace(/{DAY}/g, String(new Date().getDate()).padStart(2, '0'))
                        .replace(/{SEQ}/g, '0001')}
                    </span>
                  </div>
                )}
              </div>
            </SettingField>
          )}
                    </div>
      </div>

      <div className="border-t border-slate-800 pt-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <FileText size={20} />
          Rental Numbering (Rently)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <SettingField label="Rental Prefix" tooltip="Prefix for all rental booking numbers (e.g., REN, RNT)">
            <Input
              value={settings.rental_prefix}
              onChange={(e) => setSettings({ ...settings, rental_prefix: e.target.value.toUpperCase() })}
              className="bg-slate-950 border-slate-800 text-slate-200"
              placeholder="REN"
              maxLength={10}
            />
          </SettingField>
          <SettingField label="Rental Format" tooltip="Format for rental number generation">
            <select
              value={settings.rental_format}
              onChange={(e) => setSettings({ ...settings, rental_format: e.target.value as 'short' | 'long' | 'custom' })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="short">Short: {settings.rental_prefix}-001</option>
              <option value="long">Long: {settings.rental_prefix}-2026-001</option>
              <option value="custom">Custom Format</option>
            </select>
          </SettingField>
          {settings.rental_format === 'custom' && (
            <SettingField label="Custom Format" tooltip="Use {PREFIX}, {YEAR}, {MONTH}, {DAY}, {SEQ} as placeholders (e.g., {PREFIX}-{YEAR}{MONTH}{DAY}-{SEQ})">
              <div className="space-y-2">
                <Input
                  value={settings.rental_custom_format || ''}
                  onChange={(e) => setSettings({ ...settings, rental_custom_format: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
                  placeholder="{PREFIX}-{YEAR}{MONTH}{DAY}-{SEQ}"
                />
                {settings.rental_custom_format && (
                  <div className="text-xs text-slate-400 bg-slate-900/50 border border-slate-800 rounded px-3 py-2">
                    <span className="text-slate-500">Preview: </span>
                    <span className="text-indigo-400 font-mono">
                      {settings.rental_custom_format
                        .replace(/{PREFIX}/g, settings.rental_prefix || 'REN')
                        .replace(/{YEAR}/g, String(new Date().getFullYear()))
                        .replace(/{MONTH}/g, String(new Date().getMonth() + 1).padStart(2, '0'))
                        .replace(/{DAY}/g, String(new Date().getDate()).padStart(2, '0'))
                        .replace(/{SEQ}/g, '0001')}
                    </span>
                  </div>
                )}
              </div>
            </SettingField>
          )}
        </div>
                  </div>

      <div className="border-t border-slate-800 pt-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <FileText size={20} />
          Project Numbering (Studio)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <SettingField label="Project Prefix" tooltip="Prefix for all production project numbers (e.g., STU, PRO)">
            <Input
              value={settings.project_prefix}
              onChange={(e) => setSettings({ ...settings, project_prefix: e.target.value.toUpperCase() })}
              className="bg-slate-950 border-slate-800 text-slate-200"
              placeholder="STU"
              maxLength={10}
            />
          </SettingField>
          <SettingField label="Project Format" tooltip="Format for project number generation">
            <select
              value={settings.project_format}
              onChange={(e) => setSettings({ ...settings, project_format: e.target.value as 'short' | 'long' | 'custom' })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="short">Short: {settings.project_prefix}-001</option>
              <option value="long">Long: {settings.project_prefix}-2026-001</option>
              <option value="custom">Custom Format</option>
            </select>
          </SettingField>
          {settings.project_format === 'custom' && (
            <SettingField label="Custom Format" tooltip="Use {PREFIX}, {YEAR}, {MONTH}, {DAY}, {SEQ} as placeholders (e.g., {PREFIX}-{YEAR}{MONTH}{DAY}-{SEQ})">
              <div className="space-y-2">
                <Input
                  value={settings.project_custom_format || ''}
                  onChange={(e) => setSettings({ ...settings, project_custom_format: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
                  placeholder="{PREFIX}-{YEAR}{MONTH}{DAY}-{SEQ}"
                />
                {settings.project_custom_format && (
                  <div className="text-xs text-slate-400 bg-slate-900/50 border border-slate-800 rounded px-3 py-2">
                    <span className="text-slate-500">Preview: </span>
                    <span className="text-indigo-400 font-mono">
                      {settings.project_custom_format
                        .replace(/{PREFIX}/g, settings.project_prefix || 'STU')
                        .replace(/{YEAR}/g, String(new Date().getFullYear()))
                        .replace(/{MONTH}/g, String(new Date().getMonth() + 1).padStart(2, '0'))
                        .replace(/{DAY}/g, String(new Date().getDate()).padStart(2, '0'))
                        .replace(/{SEQ}/g, '0001')}
                    </span>
                  </div>
                )}
              </div>
            </SettingField>
          )}
                    </div>
      </div>

      <div className="border-t border-slate-800 pt-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <FileText size={20} />
          POS Receipt Numbering
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <SettingField label="POS Receipt Prefix" tooltip="Prefix for all POS receipt numbers (e.g., POS, REC)">
            <Input
              value={settings.pos_receipt_prefix}
              onChange={(e) => setSettings({ ...settings, pos_receipt_prefix: e.target.value.toUpperCase() })}
              className="bg-slate-950 border-slate-800 text-slate-200"
              placeholder="POS"
              maxLength={10}
            />
          </SettingField>
          <SettingField label="POS Receipt Format" tooltip="Format for POS receipt number generation">
            <select
              value={settings.pos_receipt_format}
              onChange={(e) => setSettings({ ...settings, pos_receipt_format: e.target.value as 'short' | 'long' | 'custom' })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="short">Short: {settings.pos_receipt_prefix}-001</option>
              <option value="long">Long: {settings.pos_receipt_prefix}-2026-001</option>
              <option value="custom">Custom Format</option>
            </select>
          </SettingField>
          {settings.pos_receipt_format === 'custom' && (
            <SettingField label="Custom Format" tooltip="Use {PREFIX}, {YEAR}, {MONTH}, {DAY}, {SEQ} as placeholders (e.g., {PREFIX}-{YEAR}{MONTH}{DAY}-{SEQ})">
              <div className="space-y-2">
                <Input
                  value={settings.pos_receipt_custom_format || ''}
                  onChange={(e) => setSettings({ ...settings, pos_receipt_custom_format: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
                  placeholder="{PREFIX}-{YEAR}{MONTH}{DAY}-{SEQ}"
                />
                {settings.pos_receipt_custom_format && (
                  <div className="text-xs text-slate-400 bg-slate-900/50 border border-slate-800 rounded px-3 py-2">
                    <span className="text-slate-500">Preview: </span>
                    <span className="text-indigo-400 font-mono">
                      {settings.pos_receipt_custom_format
                        .replace(/{PREFIX}/g, settings.pos_receipt_prefix || 'POS')
                        .replace(/{YEAR}/g, String(new Date().getFullYear()))
                        .replace(/{MONTH}/g, String(new Date().getMonth() + 1).padStart(2, '0'))
                        .replace(/{DAY}/g, String(new Date().getDate()).padStart(2, '0'))
                        .replace(/{SEQ}/g, '0001')}
                    </span>
                  </div>
                )}
              </div>
            </SettingField>
          )}
        </div>
                  </div>

      <div className="border-t border-slate-800 pt-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <FileText size={20} />
          Accounting/Voucher Numbering
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <SettingField label="Voucher Prefix" tooltip="Prefix for all accounting voucher numbers (e.g., VOU, ACC)">
            <Input
              value={settings.voucher_prefix}
              onChange={(e) => setSettings({ ...settings, voucher_prefix: e.target.value.toUpperCase() })}
              className="bg-slate-950 border-slate-800 text-slate-200"
              placeholder="VOU"
              maxLength={10}
            />
          </SettingField>
          <SettingField label="Voucher Format" tooltip="Format for voucher number generation">
            <select
              value={settings.voucher_format}
              onChange={(e) => setSettings({ ...settings, voucher_format: e.target.value as 'short' | 'long' | 'custom' })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="short">Short: {settings.voucher_prefix}-001</option>
              <option value="long">Long: {settings.voucher_prefix}-2026-001</option>
              <option value="custom">Custom Format</option>
            </select>
          </SettingField>
          {settings.voucher_format === 'custom' && (
            <SettingField label="Custom Format" tooltip="Use {PREFIX}, {YEAR}, {MONTH}, {DAY}, {SEQ} as placeholders (e.g., {PREFIX}-{YEAR}{MONTH}{DAY}-{SEQ})">
              <div className="space-y-2">
                <Input
                  value={settings.voucher_custom_format || ''}
                  onChange={(e) => setSettings({ ...settings, voucher_custom_format: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
                  placeholder="{PREFIX}-{YEAR}{MONTH}{DAY}-{SEQ}"
                />
                {settings.voucher_custom_format && (
                  <div className="text-xs text-slate-400 bg-slate-900/50 border border-slate-800 rounded px-3 py-2">
                    <span className="text-slate-500">Preview: </span>
                    <span className="text-indigo-400 font-mono">
                      {settings.voucher_custom_format
                        .replace(/{PREFIX}/g, settings.voucher_prefix || 'VOU')
                        .replace(/{YEAR}/g, String(new Date().getFullYear()))
                        .replace(/{MONTH}/g, String(new Date().getMonth() + 1).padStart(2, '0'))
                        .replace(/{DAY}/g, String(new Date().getDate()).padStart(2, '0'))
                        .replace(/{SEQ}/g, '0001')}
                    </span>
                  </div>
                )}
              </div>
            </SettingField>
          )}
                    </div>
      </div>

      <div className="border-t border-slate-800 pt-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Key size={20} />
          Keyboard Shortcuts
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingField label="Quantity (F2)" tooltip="Shortcut key to focus on quantity field">
            <Input
              value={settings.pos_keyboard_shortcuts.quantity}
              onChange={(e) => setSettings({
                ...settings,
                pos_keyboard_shortcuts: { ...settings.pos_keyboard_shortcuts, quantity: e.target.value }
              })}
              className="bg-slate-950 border-slate-800 text-slate-200"
              placeholder="F2"
            />
          </SettingField>
          <SettingField label="Search Product (F4)" tooltip="Shortcut key to open product search">
            <Input
              value={settings.pos_keyboard_shortcuts.search}
              onChange={(e) => setSettings({
                ...settings,
                pos_keyboard_shortcuts: { ...settings.pos_keyboard_shortcuts, search: e.target.value }
              })}
              className="bg-slate-950 border-slate-800 text-slate-200"
              placeholder="F4"
            />
          </SettingField>
          <SettingField label="Checkout (F9)" tooltip="Shortcut key to proceed to checkout">
            <Input
              value={settings.pos_keyboard_shortcuts.checkout}
              onChange={(e) => setSettings({
                ...settings,
                pos_keyboard_shortcuts: { ...settings.pos_keyboard_shortcuts, checkout: e.target.value }
              })}
              className="bg-slate-950 border-slate-800 text-slate-200"
              placeholder="F9"
            />
          </SettingField>
          <SettingField label="Cancel (Escape)" tooltip="Shortcut key to cancel current operation">
            <Input
              value={settings.pos_keyboard_shortcuts.cancel}
              onChange={(e) => setSettings({
                ...settings,
                pos_keyboard_shortcuts: { ...settings.pos_keyboard_shortcuts, cancel: e.target.value }
              })}
              className="bg-slate-950 border-slate-800 text-slate-200"
              placeholder="Escape"
            />
          </SettingField>
                  </div>
                </div>
              </div>
  </div>
));
POSTab.displayName = 'POSTab';

// Theme & Appearance Tab
const ThemeTab = memo(({ settings, setSettings }: { settings: SettingsData; setSettings: React.Dispatch<React.SetStateAction<SettingsData>> }) => (
  <div className="space-y-6 max-w-5xl animate-entrance">
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 space-y-6 hover-lift transition-standard">
      <div className="flex items-center gap-3 mb-4">
        <Palette size={24} className="text-purple-400" />
        <h2 className="text-xl font-semibold text-slate-100">Theme & Appearance</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SettingField label="Primary Color" tooltip="Main accent color for primary actions">
          <Input
            type="color"
            value={settings.primary_color || '#9333EA'}
            onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
            className="h-10 w-full bg-slate-950 border-slate-800 cursor-pointer"
          />
        </SettingField>

        <SettingField label="Secondary Color" tooltip="Supporting color for secondary elements">
          <Input
            type="color"
            value={settings.secondary_color || '#3B82F6'}
            onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
            className="h-10 w-full bg-slate-950 border-slate-800 cursor-pointer"
          />
        </SettingField>

        <SettingField label="Accent Color" tooltip="Accent color for success states">
          <Input
            type="color"
            value={settings.accent_color || '#10B981'}
            onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
            className="h-10 w-full bg-slate-950 border-slate-800 cursor-pointer"
          />
        </SettingField>

        <SettingField label="Sidebar Position" tooltip="Position of main navigation sidebar">
          <select
            value={settings.sidebar_position || 'left'}
            onChange={(e) => setSettings({ ...settings, sidebar_position: e.target.value as 'left' | 'right' })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </SettingField>
      </div>

      <div className="space-y-4">
        <ToggleRow
          label="Dark Mode"
          tooltip="Enable dark color scheme"
          checked={settings.dark_mode}
          onCheckedChange={(checked) => setSettings({ ...settings, dark_mode: checked })}
          description="Recommended for reduced eye strain"
        />
        <ToggleRow
          label="Compact Mode"
          tooltip="Reduce spacing and padding"
          checked={settings.compact_mode}
          onCheckedChange={(checked) => setSettings({ ...settings, compact_mode: checked })}
          description="Show more content on screen"
        />
        <ToggleRow
          label="Show Breadcrumbs"
          tooltip="Display navigation breadcrumb trail"
          checked={settings.show_breadcrumbs}
          onCheckedChange={(checked) => setSettings({ ...settings, show_breadcrumbs: checked })}
          description="Show navigation path at top of pages"
        />
        <ToggleRow
          label="Enable Animations"
          tooltip="Enable smooth transitions and animations"
          checked={settings.animations_enabled}
          onCheckedChange={(checked) => setSettings({ ...settings, animations_enabled: checked })}
          description="Smooth transitions throughout the system"
        />
      </div>
    </div>
  </div>
));
ThemeTab.displayName = 'ThemeTab';

// Invoice Settings Tab
const InvoiceTab = memo(({ settings, setSettings }: { settings: SettingsData; setSettings: React.Dispatch<React.SetStateAction<SettingsData>> }) => (
  <div className="space-y-6 max-w-5xl animate-entrance">
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 space-y-6 hover-lift transition-standard">
      <div className="flex items-center gap-3 mb-4">
        <FileText size={24} className="text-green-400" />
        <h2 className="text-xl font-semibold text-slate-100">Invoice Configuration</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SettingField label="Invoice Prefix" tooltip="Prefix added before invoice number">
          <Input
            value={settings.invoice_prefix}
            onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value.toUpperCase() })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
            placeholder="INV"
            maxLength={10}
          />
          <p className="text-xs text-slate-500 mt-1">Example: {settings.invoice_prefix}-2026-0001</p>
        </SettingField>

        <SettingField label="Starting Number" tooltip="First invoice number to start sequence">
          <Input
            type="number"
            min="1"
            value={settings.invoice_start_number}
            onChange={(e) => setSettings({ ...settings, invoice_start_number: parseInt(e.target.value) || 1 })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          />
        </SettingField>

        <SettingField label="Number Format" tooltip="Structure of invoice number after prefix">
          <select
            value={settings.invoice_format}
            onChange={(e) => setSettings({ ...settings, invoice_format: e.target.value as 'short' | 'long' | 'custom' })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          >
            <option value="short">Short: {settings.invoice_prefix}-001</option>
            <option value="long">Long: {settings.invoice_prefix}-2026-001</option>
            <option value="custom">Custom Format</option>
          </select>
        </SettingField>

        <SettingField label="Template Style" tooltip="Invoice template design">
          <select
            value={settings.invoice_template}
            onChange={(e) => setSettings({ ...settings, invoice_template: e.target.value as 'modern' | 'classic' | 'minimal' })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          >
            <option value="modern">Modern</option>
            <option value="classic">Classic</option>
            <option value="minimal">Minimal</option>
          </select>
        </SettingField>

        <SettingField label="Logo Position" tooltip="Position of company logo on invoice">
          <select
            value={settings.invoice_logo_position}
            onChange={(e) => setSettings({ ...settings, invoice_logo_position: e.target.value as 'left' | 'center' | 'right' })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </SettingField>

        <SettingField label="Payment Due (Days)" tooltip="Default number of days for payment to be due">
          <Input
            type="number"
            min="0"
            max="365"
            value={settings.invoice_due_days}
            onChange={(e) => setSettings({ ...settings, invoice_due_days: parseInt(e.target.value) || 30 })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          />
        </SettingField>

        <SettingField label="Watermark Text (Optional)" tooltip="Text displayed as diagonal watermark">
          <Input
            value={settings.invoice_watermark}
            onChange={(e) => setSettings({ ...settings, invoice_watermark: e.target.value })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
            placeholder="PAID, DRAFT, etc."
            maxLength={50}
          />
        </SettingField>
      </div>

      <SettingField label="Invoice Terms & Conditions" tooltip="Terms displayed on invoice footer">
        <Textarea
          value={settings.invoice_terms}
          onChange={(e) => setSettings({ ...settings, invoice_terms: e.target.value })}
          className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          rows={4}
          maxLength={1000}
        />
      </SettingField>

      <SettingField label="Invoice Footer Text" tooltip="Footer message on invoice">
        <Input
          value={settings.invoice_footer}
          onChange={(e) => setSettings({ ...settings, invoice_footer: e.target.value })}
          className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          placeholder="Thank you for your business!"
          maxLength={200}
        />
      </SettingField>

      <div className="space-y-4">
        <ToggleRow
          label="Show Tax on Invoice"
          tooltip="Display tax breakdown on invoice"
          checked={settings.show_tax_on_invoice}
          onCheckedChange={(checked) => setSettings({ ...settings, show_tax_on_invoice: checked })}
          description="Display tax line on invoices"
        />
        <ToggleRow
          label="Show Discount on Invoice"
          tooltip="Display discount line on invoice"
          checked={settings.show_discount_on_invoice}
          onCheckedChange={(checked) => setSettings({ ...settings, show_discount_on_invoice: checked })}
          description="Display discount line on invoices"
        />
      </div>
    </div>
  </div>
));
InvoiceTab.displayName = 'InvoiceTab';

// Purchase Settings Tab
const PurchaseTab = memo(({ settings, setSettings }: { settings: SettingsData; setSettings: React.Dispatch<React.SetStateAction<SettingsData>> }) => (
  <div className="space-y-6 max-w-5xl animate-entrance">
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 space-y-6 hover-lift transition-standard">
      <div className="flex items-center gap-3 mb-4">
        <Truck size={24} className="text-indigo-400" />
        <h2 className="text-xl font-semibold text-slate-100">Purchase Configuration</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SettingField label="Purchase Order Prefix" tooltip="Prefix for purchase order numbers">
          <Input
            value={settings.purchase_prefix}
            onChange={(e) => setSettings({ ...settings, purchase_prefix: e.target.value.toUpperCase() })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
            placeholder="PO"
            maxLength={10}
          />
        </SettingField>

        <SettingField label="Default Purchase Tax (%)" tooltip="Default tax rate for purchases">
          <Input
            type="number"
            min="0"
            max="100"
            value={settings.default_purchase_tax}
            onChange={(e) => setSettings({ ...settings, default_purchase_tax: parseFloat(e.target.value) || 17 })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          />
        </SettingField>

        <SettingField label="Approval Required Amount" tooltip="Purchase amount threshold requiring approval">
          <Input
            type="number"
            min="0"
            value={settings.purchase_approval_amount}
            onChange={(e) => setSettings({ ...settings, purchase_approval_amount: parseFloat(e.target.value) || 100000 })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          />
          <p className="text-xs text-slate-500 mt-1">Purchases above this need approval</p>
        </SettingField>

        <SettingField label="GRN Prefix" tooltip="Prefix for Goods Received Note numbers">
          <Input
            value={settings.grn_prefix}
            onChange={(e) => setSettings({ ...settings, grn_prefix: e.target.value.toUpperCase() })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
            placeholder="GRN"
            maxLength={10}
          />
          <p className="text-xs text-slate-500 mt-1">Goods Received Note</p>
        </SettingField>
      </div>

      <div className="space-y-4">
        <ToggleRow
          label="Require Purchase Approval"
          tooltip="Purchase orders need approval before processing"
          checked={settings.require_purchase_approval}
          onCheckedChange={(checked) => setSettings({ ...settings, require_purchase_approval: checked })}
          description="Require manager approval for purchases"
        />
        <ToggleRow
          label="Enable Purchase Returns"
          tooltip="Allow returning items to vendor"
          checked={settings.enable_purchase_return}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_purchase_return: checked })}
          description="Allow returning purchased items"
        />
        <ToggleRow
          label="Enable Vendor Rating System"
          tooltip="Rate vendors based on performance"
          checked={settings.enable_vendor_rating}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_vendor_rating: checked })}
          description="Track vendor performance ratings"
        />
        <ToggleRow
          label="Enable GRN (Goods Received Note)"
          tooltip="Generate GRN on delivery"
          checked={settings.enable_grn}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_grn: checked })}
          description="Generate GRN automatically"
        />
        <ToggleRow
          label="Enable Quality Check"
          tooltip="Mandatory quality inspection on received goods"
          checked={settings.enable_quality_check}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_quality_check: checked })}
          description="Require quality inspection before acceptance"
        />
      </div>
    </div>
  </div>
));
PurchaseTab.displayName = 'PurchaseTab';

const InventoryTab = memo(({ settings, setSettings }: { settings: SettingsData; setSettings: React.Dispatch<React.SetStateAction<SettingsData>> }) => (
  <div className="space-y-6 max-w-5xl animate-entrance">
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 space-y-6 hover-lift transition-standard">
      <div className="flex items-center gap-3 mb-4">
        <Package size={24} className="text-yellow-400" />
        <h2 className="text-xl font-semibold text-slate-100">Inventory Settings</h2>
                </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SettingField label="SKU Format" tooltip="Template for automatic SKU generation (use NNNN for numbers)">
          <Input
            value={settings.sku_format}
            onChange={(e) => setSettings({ ...settings, sku_format: e.target.value })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
            placeholder="PRD-NNNN"
          />
          <p className="text-xs text-slate-500 mt-1">Use NNNN for numbers</p>
        </SettingField>

        <SettingField label="Product Code Prefix" tooltip="Default prefix for product codes">
          <Input
            value={settings.product_code_prefix}
            onChange={(e) => setSettings({ ...settings, product_code_prefix: e.target.value.toUpperCase() })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
            placeholder="PRD"
            maxLength={10}
          />
        </SettingField>

        <SettingField label="SKU Prefix" tooltip="Prefix for auto-generated SKU codes (e.g., SKU-001, PROD-001)">
          <Input
            value={settings.sku_prefix}
            onChange={(e) => setSettings({ ...settings, sku_prefix: e.target.value })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
            placeholder="SKU-"
          />
        </SettingField>

        <SettingField label="Low Stock Threshold" tooltip="Quantity level that triggers low stock alert">
          <Input
            type="number"
            min="0"
            max="1000"
            value={settings.low_stock_threshold}
            onChange={(e) => setSettings({ ...settings, low_stock_threshold: parseInt(e.target.value) || 10 })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          />
        </SettingField>

        <SettingField label="Default Product Unit" tooltip="Default unit of measurement for products">
          <select
            value={settings.default_product_unit}
            onChange={(e) => setSettings({ ...settings, default_product_unit: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          >
            <option value="piece">Piece</option>
            <option value="meter">Meter</option>
            <option value="kg">Kilogram</option>
            <option value="liter">Liter</option>
            <option value="box">Box</option>
            <option value="set">Set</option>
          </select>
        </SettingField>

        <SettingField label="Barcode Format" tooltip="Barcode format for product scanning">
          <select
            value={settings.barcode_format}
            onChange={(e) => setSettings({ ...settings, barcode_format: e.target.value as 'CODE128' | 'EAN13' | 'QR' })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          >
            <option value="CODE128">CODE128</option>
            <option value="EAN13">EAN13</option>
            <option value="QR">QR Code</option>
          </select>
        </SettingField>

        <SettingField label="Max Product Images" tooltip="Maximum number of images allowed per product">
          <Input
            type="number"
            min="1"
            max="10"
            value={settings.max_product_images}
            onChange={(e) => setSettings({ ...settings, max_product_images: parseInt(e.target.value) || 5 })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          />
        </SettingField>
                  </div>

      <div className="space-y-4">
        <ToggleRow
          label="Auto-Generate SKU"
          tooltip="Automatically generate SKU when creating new products"
          checked={settings.sku_auto_generate}
          onCheckedChange={(checked) => setSettings({ ...settings, sku_auto_generate: checked })}
          description="Auto-generate SKU codes for new products"
        />
        <ToggleRow
          label="Enable Barcode System"
          tooltip="Enable barcode scanning and generation"
          checked={settings.enable_barcode}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_barcode: checked })}
          description="Enable barcode functionality"
        />
        <ToggleRow
          label="Enable Product Variants"
          tooltip="Support for product variations (size, color, material)"
          checked={settings.enable_product_variants}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_product_variants: checked })}
          description="Enable product variations support"
        />
        <ToggleRow
          label="Enable Product Expiry Tracking"
          tooltip="Track expiration dates for products"
          checked={settings.enable_product_expiry}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_product_expiry: checked })}
          description="Enable expiry date tracking"
        />
        <ToggleRow
          label="Enable Product Images"
          tooltip="Allow multiple images per product"
          checked={settings.enable_product_images}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_product_images: checked })}
          description="Enable product image uploads"
        />
        <ToggleRow
          label="Allow Negative Stock"
          tooltip="Allow sales even when stock quantity is zero or negative"
          checked={settings.allow_negative_stock}
          onCheckedChange={(checked) => setSettings({ ...settings, allow_negative_stock: checked })}
          description="Allow sales even if stock is zero (Overselling)"
        />
        <ToggleRow
          label="Track Serial Numbers"
          tooltip="Track individual items by unique serial numbers"
          checked={settings.track_serial_numbers}
          onCheckedChange={(checked) => setSettings({ ...settings, track_serial_numbers: checked })}
          description="Track products by serial number"
        />
        <ToggleRow
          label="Enable Batch Tracking"
          tooltip="Track products by batch/lot numbers"
          checked={settings.enable_batch_tracking}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_batch_tracking: checked })}
          description="Track products by batch numbers"
        />
                  </div>
                </div>
              </div>
));
InventoryTab.displayName = 'InventoryTab';

const CustomizationTab = memo(({ settings, setSettings }: { settings: SettingsData; setSettings: React.Dispatch<React.SetStateAction<SettingsData>> }) => (
  <div className="space-y-6 max-w-5xl">
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Tag size={24} className="text-cyan-400" />
        <h2 className="text-xl font-semibold text-slate-100">Custom Field Mapping</h2>
      </div>
      <p className="text-sm text-slate-400 mb-6">Customize field labels to match your business needs (e.g., "Fabric Type" for Studio, "Size" for Retail)</p>

      <div className="space-y-4">
        <SettingField 
          label="Custom Field 1" 
          tooltip="First custom field label for products (e.g., Fabric Type, Material, Size)"
        >
          <Input
            value={settings.custom_label_1}
            onChange={(e) => setSettings({ ...settings, custom_label_1: e.target.value })}
            className="bg-slate-950 border-slate-800 text-slate-200"
            placeholder="e.g., Fabric Type, Material, Size"
          />
        </SettingField>

        <SettingField 
          label="Custom Field 2" 
          tooltip="Second custom field label for products (e.g., Stitching Details, Color, Pattern)"
        >
          <Input
            value={settings.custom_label_2}
            onChange={(e) => setSettings({ ...settings, custom_label_2: e.target.value })}
            className="bg-slate-950 border-slate-800 text-slate-200"
            placeholder="e.g., Stitching Details, Color, Pattern"
          />
        </SettingField>

        <SettingField 
          label="Custom Field 3" 
          tooltip="Third custom field label for products"
        >
          <Input
            value={settings.custom_label_3}
            onChange={(e) => setSettings({ ...settings, custom_label_3: e.target.value })}
            className="bg-slate-950 border-slate-800 text-slate-200"
            placeholder="e.g., Additional Notes, Special Instructions"
          />
        </SettingField>
                    </div>
                  </div>
  </div>
));
CustomizationTab.displayName = 'CustomizationTab';

// Rental Tab
const RentalTab = memo(({ settings, setSettings }: { settings: SettingsData; setSettings: React.Dispatch<React.SetStateAction<SettingsData>> }) => (
  <div className="space-y-6 max-w-5xl animate-entrance">
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 space-y-6 hover-lift transition-standard">
      <div className="flex items-center gap-3 mb-4">
        <Archive size={24} className="text-pink-400" />
        <h2 className="text-xl font-semibold text-slate-100">Rental Management Settings</h2>
                    </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SettingField label="Default Rental Duration (days)" tooltip="Default number of days for rental period">
          <Input
            type="number"
            min="1"
            max="365"
            value={settings.default_rental_duration}
            onChange={(e) => setSettings({ ...settings, default_rental_duration: parseInt(e.target.value) || 3 })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          />
        </SettingField>

        <SettingField label="Late Fee Per Day" tooltip="Daily charge for late returns">
          <Input
            type="number"
            min="0"
            value={settings.late_fee_per_day}
            onChange={(e) => setSettings({ ...settings, late_fee_per_day: parseFloat(e.target.value) || 0 })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          />
        </SettingField>

        <SettingField label="Security Deposit (%)" tooltip="Percentage of rental fee collected as security deposit">
          <Input
            type="number"
            min="0"
            max="100"
            value={settings.security_deposit_percent}
            onChange={(e) => setSettings({ ...settings, security_deposit_percent: parseFloat(e.target.value) || 0 })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          />
        </SettingField>

        <SettingField label="Reminder Days Before" tooltip="Send reminder N days before return date">
          <Input
            type="number"
            min="1"
            max="7"
            value={settings.reminder_days_before}
            onChange={(e) => setSettings({ ...settings, reminder_days_before: parseInt(e.target.value) || 1 })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          />
        </SettingField>
                  </div>

      <div className="space-y-4">
        <ToggleRow
          label="Enable Rental Reminders"
          tooltip="Send return reminders to customers"
          checked={settings.enable_rental_reminders}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_rental_reminders: checked })}
          description="Automatically remind customers about returns"
        />
        <ToggleRow
          label="Enable Damage Charges"
          tooltip="Charge customers for damaged items"
          checked={settings.enable_damage_charges}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_damage_charges: checked })}
          description="Allow charging for item damage"
        />
        <ToggleRow
          label="Damage Assessment Required"
          tooltip="Mandatory inspection on return to assess damage"
          checked={settings.damage_assessment_required}
          onCheckedChange={(checked) => setSettings({ ...settings, damage_assessment_required: checked })}
          description="Require damage inspection on return"
        />
        <ToggleRow
          label="Auto-Calculate Late Fee"
          tooltip="Automatically calculate and apply late fees"
          checked={settings.auto_calculate_late_fee}
          onCheckedChange={(checked) => setSettings({ ...settings, auto_calculate_late_fee: checked })}
          description="Automatically calculate late fees on returns"
        />
                </div>
              </div>
          </div>
));
RentalTab.displayName = 'RentalTab';

// Reports Tab
const ReportsTab = memo(({ settings, setSettings }: { settings: SettingsData; setSettings: React.Dispatch<React.SetStateAction<SettingsData>> }) => (
  <div className="space-y-6 max-w-5xl animate-entrance">
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 space-y-6 hover-lift transition-standard">
      <div className="flex items-center gap-3 mb-4">
        <PieChart size={24} className="text-yellow-400" />
        <h2 className="text-xl font-semibold text-slate-100">Reports & Analytics Settings</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SettingField label="Report Date Format" tooltip="Date format used in reports">
          <select
            value={settings.report_date_format}
            onChange={(e) => setSettings({ ...settings, report_date_format: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          >
            <option value="dd-mm-yyyy">DD-MM-YYYY</option>
            <option value="mm-dd-yyyy">MM-DD-YYYY</option>
            <option value="yyyy-mm-dd">YYYY-MM-DD</option>
          </select>
        </SettingField>

        <SettingField label="Report Currency" tooltip="Currency used in reports">
          <select
            value={settings.report_currency}
            onChange={(e) => setSettings({ ...settings, report_currency: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          >
            <option value="PKR">PKR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </SettingField>

        <SettingField label="Default Report Period" tooltip="Default time period for reports">
          <select
            value={settings.default_report_period}
            onChange={(e) => setSettings({ ...settings, default_report_period: e.target.value as 'week' | 'month' | 'quarter' | 'year' })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          >
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="quarter">Quarter</option>
            <option value="year">Year</option>
          </select>
        </SettingField>

        <SettingField label="Report Email Frequency" tooltip="How often auto-generated reports are sent">
          <select
            value={settings.report_email_frequency}
            onChange={(e) => setSettings({ ...settings, report_email_frequency: e.target.value as 'daily' | 'weekly' | 'monthly' })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </SettingField>
          </div>

      <div className="space-y-4">
        <ToggleRow
          label="Enable Auto Reports"
          tooltip="Automatically generate and email reports"
          checked={settings.enable_auto_reports}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_auto_reports: checked })}
          description="Automatically generate and send reports"
        />
        <ToggleRow
          label="Include Graphs in Reports"
          tooltip="Include charts and visualizations in reports"
          checked={settings.include_graphs_in_reports}
          onCheckedChange={(checked) => setSettings({ ...settings, include_graphs_in_reports: checked })}
          description="Add charts to reports"
        />
        <ToggleRow
          label="Enable Export to PDF"
          tooltip="Allow exporting reports as PDF"
          checked={settings.enable_export_pdf}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_export_pdf: checked })}
          description="PDF export enabled"
        />
        <ToggleRow
          label="Enable Export to Excel"
          tooltip="Allow exporting reports as Excel"
          checked={settings.enable_export_excel}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_export_excel: checked })}
          description="Excel export enabled"
        />
        <ToggleRow
          label="Enable Export to CSV"
          tooltip="Allow exporting reports as CSV"
          checked={settings.enable_export_csv}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_export_csv: checked })}
          description="CSV export enabled"
        />
      </div>
    </div>
  </div>
));
ReportsTab.displayName = 'ReportsTab';

// Notifications Tab
const NotificationsTab = memo(({ settings, setSettings }: { settings: SettingsData; setSettings: React.Dispatch<React.SetStateAction<SettingsData>> }) => (
  <div className="space-y-6 max-w-5xl animate-entrance">
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 space-y-6 hover-lift transition-standard">
      <div className="flex items-center gap-3 mb-4">
        <Bell size={24} className="text-red-400" />
        <h2 className="text-xl font-semibold text-slate-100">Notification Preferences</h2>
      </div>

      <div className="space-y-4">
        <ToggleRow
          label="Email Notifications"
          tooltip="Send notifications via email"
          checked={settings.email_notifications}
          onCheckedChange={(checked) => setSettings({ ...settings, email_notifications: checked })}
          description="Enable email notifications"
        />
        <ToggleRow
          label="SMS Notifications"
          tooltip="Send notifications via SMS"
          checked={settings.sms_notifications}
          onCheckedChange={(checked) => setSettings({ ...settings, sms_notifications: checked })}
          description="Enable SMS notifications"
        />
        <ToggleRow
          label="Low Stock Alert"
          tooltip="Notify when product stock is low"
          checked={settings.low_stock_alert}
          onCheckedChange={(checked) => setSettings({ ...settings, low_stock_alert: checked })}
          description="Alert on low stock"
        />
        <ToggleRow
          label="Payment Due Alert"
          tooltip="Notify when customer payment is due"
          checked={settings.payment_due_alert}
          onCheckedChange={(checked) => setSettings({ ...settings, payment_due_alert: checked })}
          description="Alert on payment due"
        />
        <ToggleRow
          label="Rental Return Alert"
          tooltip="Remind customers about rental returns"
          checked={settings.rental_return_alert}
          onCheckedChange={(checked) => setSettings({ ...settings, rental_return_alert: checked })}
          description="Alert on rental returns"
        />
        <ToggleRow
          label="Product Expiry Alert"
          tooltip="Notify before products expire"
          checked={settings.product_expiry_alert}
          onCheckedChange={(checked) => setSettings({ ...settings, product_expiry_alert: checked })}
          description="Alert on product expiry"
        />
        <ToggleRow
          label="Order Status Notification"
          tooltip="Notify on order status changes"
          checked={settings.order_status_notification}
          onCheckedChange={(checked) => setSettings({ ...settings, order_status_notification: checked })}
          description="Notify on order updates"
        />
        <ToggleRow
          label="Daily Sales Summary"
          tooltip="Daily email with sales summary"
          checked={settings.daily_sales_summary}
          onCheckedChange={(checked) => setSettings({ ...settings, daily_sales_summary: checked })}
          description="Daily sales report email"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-800 pt-6">
        <SettingField label="Expiry Alert Days" tooltip="Alert N days before product expires">
          <Input
            type="number"
            min="1"
            max="90"
            value={settings.expiry_alert_days}
            onChange={(e) => setSettings({ ...settings, expiry_alert_days: parseInt(e.target.value) || 30 })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          />
        </SettingField>
      </div>
    </div>
  </div>
));
NotificationsTab.displayName = 'NotificationsTab';

// Security Tab
const SecurityTab = memo(({ settings, setSettings }: { settings: SettingsData; setSettings: React.Dispatch<React.SetStateAction<SettingsData>> }) => (
  <div className="space-y-6 max-w-5xl animate-entrance">
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 space-y-6 hover-lift transition-standard">
      <div className="flex items-center gap-3 mb-4">
        <Shield size={24} className="text-cyan-400" />
        <h2 className="text-xl font-semibold text-slate-100">Security & Access Control</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SettingField label="Session Timeout (minutes)" tooltip="Auto-logout after N minutes of inactivity">
          <Input
            type="number"
            min="5"
            max="1440"
            value={settings.session_timeout}
            onChange={(e) => setSettings({ ...settings, session_timeout: parseInt(e.target.value) || 30 })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          />
        </SettingField>

        <SettingField label="Password Policy" tooltip="Password strength requirements">
          <select
            value={settings.password_policy}
            onChange={(e) => setSettings({ ...settings, password_policy: e.target.value as 'weak' | 'medium' | 'strong' })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          >
            <option value="weak">Weak (6+ characters)</option>
            <option value="medium">Medium (8+ chars, mixed case, number)</option>
            <option value="strong">Strong (12+ chars, special chars)</option>
          </select>
        </SettingField>

        <SettingField label="Max Login Attempts" tooltip="Lock account after N failed attempts">
          <Input
            type="number"
            min="3"
            max="10"
            value={settings.max_login_attempts}
            onChange={(e) => setSettings({ ...settings, max_login_attempts: parseInt(e.target.value) || 5 })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          />
        </SettingField>

        <SettingField label="Lockout Duration (minutes)" tooltip="How long account stays locked">
          <Input
            type="number"
            min="5"
            max="60"
            value={settings.lockout_duration}
            onChange={(e) => setSettings({ ...settings, lockout_duration: parseInt(e.target.value) || 15 })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          />
        </SettingField>
      </div>

      <div className="space-y-4">
        <ToggleRow
          label="Two-Factor Authentication"
          tooltip="Require 2FA for login"
          checked={settings.two_factor_auth}
          onCheckedChange={(checked) => setSettings({ ...settings, two_factor_auth: checked })}
          description="Enable 2FA"
        />
        <ToggleRow
          label="Require Email Verification"
          tooltip="Users must verify email to activate account"
          checked={settings.require_email_verification}
          onCheckedChange={(checked) => setSettings({ ...settings, require_email_verification: checked })}
          description="Email verification required"
        />
        <ToggleRow
          label="Enable Role-Based Access"
          tooltip="Restrict features based on user roles"
          checked={settings.enable_role_based_access}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_role_based_access: checked })}
          description="Role-based permissions"
        />
        <ToggleRow
          label="Enable Audit Log"
          tooltip="Track all user actions in system"
          checked={settings.enable_audit_log}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_audit_log: checked })}
          description="Log all user actions"
        />
      </div>

      <SettingField label="IP Whitelist" tooltip="Comma-separated IP addresses (optional)">
        <Textarea
          value={settings.ip_whitelist}
          onChange={(e) => setSettings({ ...settings, ip_whitelist: e.target.value })}
          className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          placeholder="192.168.1.1, 192.168.1.100"
          rows={3}
        />
      </SettingField>
    </div>
  </div>
));
SecurityTab.displayName = 'SecurityTab';

// Advanced Tab
const AdvancedTab = memo(({ settings, setSettings }: { settings: SettingsData; setSettings: React.Dispatch<React.SetStateAction<SettingsData>> }) => (
  <div className="space-y-6 max-w-5xl animate-entrance">
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 space-y-6 hover-lift transition-standard">
      <div className="flex items-center gap-3 mb-4">
        <Database size={24} className="text-purple-400" />
        <h2 className="text-xl font-semibold text-slate-100">Advanced System Settings</h2>
      </div>

      <div className="space-y-4">
        <ToggleRow
          label="Enable API Access"
          tooltip="Enable REST API for external integrations"
          checked={settings.enable_api}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_api: checked })}
          description="Enable API access"
        />
        <ToggleRow
          label="Enable Automatic Backup"
          tooltip="Automatically backup database"
          checked={settings.enable_backup}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_backup: checked })}
          description="Automatic backups enabled"
        />
        <ToggleRow
          label="Enable Multi-Location"
          tooltip="Support multiple branches/warehouses"
          checked={settings.enable_multi_location}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_multi_location: checked })}
          description="Multi-location support"
        />
        <ToggleRow
          label="Enable Multi-Currency"
          tooltip="Support transactions in multiple currencies"
          checked={settings.enable_multi_currency}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_multi_currency: checked })}
          description="Multi-currency support"
        />
        <ToggleRow
          label="Auto-Update Exchange Rate"
          tooltip="Fetch latest currency exchange rates"
          checked={settings.auto_update_exchange_rate}
          onCheckedChange={(checked) => setSettings({ ...settings, auto_update_exchange_rate: checked })}
          description="Auto-update exchange rates"
        />
        <ToggleRow
          label="Enable Data Encryption"
          tooltip="Encrypt sensitive data in database"
          checked={settings.enable_data_encryption}
          onCheckedChange={(checked) => setSettings({ ...settings, enable_data_encryption: checked })}
          description="Data encryption enabled"
        />
        <ToggleRow
          label="Debug Mode"
          tooltip="Show detailed error messages and logs (⚠️ Never enable in production)"
          checked={settings.debug_mode}
          onCheckedChange={(checked) => setSettings({ ...settings, debug_mode: checked })}
          description="⚠️ Debug mode (development only)"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-800 pt-6">
        <SettingField label="Backup Frequency" tooltip="How often backups are created">
          <select
            value={settings.backup_frequency}
            onChange={(e) => setSettings({ ...settings, backup_frequency: e.target.value as 'daily' | 'weekly' | 'monthly' })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </SettingField>

        <SettingField label="Default Location" tooltip="Default location for transactions">
          <Input
            value={settings.default_location}
            onChange={(e) => setSettings({ ...settings, default_location: e.target.value })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
            placeholder="Main Store"
          />
        </SettingField>

        <SettingField label="Cache Duration (minutes)" tooltip="How long to cache data">
          <Input
            type="number"
            min="0"
            max="1440"
            value={settings.cache_duration}
            onChange={(e) => setSettings({ ...settings, cache_duration: parseInt(e.target.value) || 60 })}
            className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
          />
        </SettingField>
      </div>

      {settings.enable_api && (
        <div className="border-t border-slate-800 pt-6 space-y-4">
          <SettingField label="API Key" tooltip="API authentication key">
            <Input
              type="password"
              value={settings.api_key}
              onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
              className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
              placeholder="sk_live_..."
            />
          </SettingField>
          <SettingField label="Webhook URL" tooltip="URL to receive webhook notifications">
            <Input
              type="url"
              value={settings.webhook_url}
              onChange={(e) => setSettings({ ...settings, webhook_url: e.target.value })}
              className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-standard"
              placeholder="https://api.example.com/webhooks"
            />
          </SettingField>
        </div>
      )}
    </div>
  </div>
));
AdvancedTab.displayName = 'AdvancedTab';
