'use client';

/**
 * @deprecated Use SettingsContext instead for better performance
 * This hook is kept for backward compatibility but now uses Context API
 */
import { useSettings as useSettingsContext, useSetting as useSettingContext } from '@/context/SettingsContext';
import type { SettingsData } from '@/app/dashboard/settings/page';

// Re-export from context for backward compatibility
export { useSettingsContext as useSettings, useSettingContext as useSetting };

// Keep defaultSettings export for components that need it
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
  date_format: 'DD/MM/YYYY',
  time_format: '12',
  decimal_places: 2,
  thousand_separator: ',',
  
  // General - Financial Year
  fiscal_year_start: '01-01',
  fiscal_year_end: '12-31',
  financial_year_start_month: 1,
  profit_calculation_method: 'fifo',
  
  // Tax
  enable_inline_tax: false,
  tax_1_name: 'GST',
  tax_1_number: '',
  default_tax_rate: 17,
  
  // POS & Sales
  pos_duplicate_item_action: 'combine',
  pos_allow_price_edit: true,
  pos_allow_discount: true,
  max_discount_percent: 50,
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
  default_location: '',
  enable_multi_currency: false,
  auto_update_exchange_rate: false,
  enable_data_encryption: false,
  cache_duration: 60,
  
  // Modules
  module_rental: true,
  module_pos: true,
  module_studio: true,
  module_vendors: true,
  module_reporting: true,
  module_accounting: true,
  
  // Custom Labels
  custom_label_1: '',
  custom_label_2: '',
  custom_label_3: '',
  
  // Sales Settings
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
  
  // Purchase Settings
  default_purchase_tax: 17,
  purchase_approval_amount: 100000,
  enable_grn: false,
  enable_purchase_return: true,
  enable_vendor_rating: true,
  require_purchase_approval: false,
  
  // Theme & Appearance
  primary_color: '#9333EA',
  secondary_color: '#3B82F6',
  accent_color: '#10B981',
  dark_mode: true,
  compact_mode: false,
  sidebar_position: 'left',
  show_breadcrumbs: true,
  animations_enabled: true,
};

// Export defaultSettings for components that need it
export { defaultSettings };

