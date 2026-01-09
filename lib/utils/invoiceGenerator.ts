/**
 * Invoice & Purchase Number Generator Utility
 * Generates invoice and purchase numbers based on business settings
 */

interface InvoiceSettings {
  invoice_prefix: string;
  invoice_format: 'short' | 'long' | 'custom';
  invoice_custom_format?: string;
}

interface PurchaseSettings {
  purchase_prefix: string;
  purchase_format: 'short' | 'long' | 'custom';
  purchase_custom_format?: string;
}

interface RentalSettings {
  rental_prefix: string;
  rental_format: 'short' | 'long' | 'custom';
  rental_custom_format?: string;
}

interface ProjectSettings {
  project_prefix: string;
  project_format: 'short' | 'long' | 'custom';
  project_custom_format?: string;
}

interface POSReceiptSettings {
  pos_receipt_prefix: string;
  pos_receipt_format: 'short' | 'long' | 'custom';
  pos_receipt_custom_format?: string;
}

interface VoucherSettings {
  voucher_prefix: string;
  voucher_format: 'short' | 'long' | 'custom';
  voucher_custom_format?: string;
}

/**
 * Generate invoice number based on settings
 * @param settings - Invoice settings from business configuration
 * @param sequence - Sequence number for the invoice
 * @param date - Date for the invoice (defaults to today)
 * @returns Generated invoice number string
 */
export function generateInvoiceNumber(
  settings: InvoiceSettings,
  sequence: number,
  date: Date = new Date()
): string {
  const prefix = settings.invoice_prefix || 'INV';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');

  switch (settings.invoice_format) {
    case 'short':
      // Format: INV-001
      return `${prefix}-${seq}`;
    
    case 'long':
      // Format: INV-2026-001
      return `${prefix}-${year}-${seq}`;
    
    case 'custom':
      // Format: Custom with placeholders
      if (settings.invoice_custom_format) {
        return settings.invoice_custom_format
          .replace(/{PREFIX}/g, prefix)
          .replace(/{YEAR}/g, String(year))
          .replace(/{MONTH}/g, month)
          .replace(/{DAY}/g, day)
          .replace(/{SEQ}/g, seq);
      }
      // Fallback to long format if custom format is empty
      return `${prefix}-${year}-${seq}`;
    
    default:
      // Default to long format
      return `${prefix}-${year}-${seq}`;
  }
}

/**
 * Get the next sequence number for invoice generation
 * @param businessId - Business ID
 * @param date - Date for the invoice
 * @param prefix - Invoice prefix
 * @param format - Invoice format
 * @returns Next sequence number
 */
export async function getNextInvoiceSequence(
  businessId: number,
  date: Date,
  prefix: string,
  format: 'short' | 'long' | 'custom'
): Promise<number> {
  // This will be implemented to query the database for the last invoice number
  // and return the next sequence. For now, return 1 as placeholder.
  // The actual implementation should query transactions table.
  return 1;
}

/**
 * Generate purchase number based on settings
 * @param settings - Purchase settings from business configuration
 * @param sequence - Sequence number for the purchase
 * @param date - Date for the purchase (defaults to today)
 * @returns Generated purchase number string
 */
export function generatePurchaseNumber(
  settings: PurchaseSettings,
  sequence: number,
  date: Date = new Date()
): string {
  const prefix = settings.purchase_prefix || 'PUR';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');

  switch (settings.purchase_format) {
    case 'short':
      // Format: PUR-001
      return `${prefix}-${seq}`;
    
    case 'long':
      // Format: PUR-2026-001
      return `${prefix}-${year}-${seq}`;
    
    case 'custom':
      // Format: Custom with placeholders
      if (settings.purchase_custom_format) {
        return settings.purchase_custom_format
          .replace(/{PREFIX}/g, prefix)
          .replace(/{YEAR}/g, String(year))
          .replace(/{MONTH}/g, month)
          .replace(/{DAY}/g, day)
          .replace(/{SEQ}/g, seq);
      }
      // Fallback to long format if custom format is empty
      return `${prefix}-${year}-${seq}`;
    
    default:
      // Default to long format
      return `${prefix}-${year}-${seq}`;
  }
}

/**
 * Generate rental number based on settings
 * @param settings - Rental settings from business configuration
 * @param sequence - Sequence number for the rental
 * @param date - Date for the rental (defaults to today)
 * @returns Generated rental number string
 */
export function generateRentalNumber(
  settings: RentalSettings,
  sequence: number,
  date: Date = new Date()
): string {
  const prefix = settings.rental_prefix || 'REN';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');

  switch (settings.rental_format) {
    case 'short':
      return `${prefix}-${seq}`;
    case 'long':
      return `${prefix}-${year}-${seq}`;
    case 'custom':
      if (settings.rental_custom_format) {
        return settings.rental_custom_format
          .replace(/{PREFIX}/g, prefix)
          .replace(/{YEAR}/g, String(year))
          .replace(/{MONTH}/g, month)
          .replace(/{DAY}/g, day)
          .replace(/{SEQ}/g, seq);
      }
      return `${prefix}-${year}-${seq}`;
    default:
      return `${prefix}-${year}-${seq}`;
  }
}

/**
 * Generate project number based on settings
 * @param settings - Project settings from business configuration
 * @param sequence - Sequence number for the project
 * @param date - Date for the project (defaults to today)
 * @returns Generated project number string
 */
export function generateProjectNumber(
  settings: ProjectSettings,
  sequence: number,
  date: Date = new Date()
): string {
  const prefix = settings.project_prefix || 'STU';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');

  switch (settings.project_format) {
    case 'short':
      return `${prefix}-${seq}`;
    case 'long':
      return `${prefix}-${year}-${seq}`;
    case 'custom':
      if (settings.project_custom_format) {
        return settings.project_custom_format
          .replace(/{PREFIX}/g, prefix)
          .replace(/{YEAR}/g, String(year))
          .replace(/{MONTH}/g, month)
          .replace(/{DAY}/g, day)
          .replace(/{SEQ}/g, seq);
      }
      return `${prefix}-${year}-${seq}`;
    default:
      return `${prefix}-${year}-${seq}`;
  }
}

/**
 * Generate POS receipt number based on settings
 * @param settings - POS Receipt settings from business configuration
 * @param sequence - Sequence number for the receipt
 * @param date - Date for the receipt (defaults to today)
 * @returns Generated POS receipt number string
 */
export function generatePOSReceiptNumber(
  settings: POSReceiptSettings,
  sequence: number,
  date: Date = new Date()
): string {
  const prefix = settings.pos_receipt_prefix || 'POS';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');

  switch (settings.pos_receipt_format) {
    case 'short':
      return `${prefix}-${seq}`;
    case 'long':
      return `${prefix}-${year}-${seq}`;
    case 'custom':
      if (settings.pos_receipt_custom_format) {
        return settings.pos_receipt_custom_format
          .replace(/{PREFIX}/g, prefix)
          .replace(/{YEAR}/g, String(year))
          .replace(/{MONTH}/g, month)
          .replace(/{DAY}/g, day)
          .replace(/{SEQ}/g, seq);
      }
      return `${prefix}-${year}-${seq}`;
    default:
      return `${prefix}-${year}-${seq}`;
  }
}

/**
 * Generate voucher number based on settings
 * @param settings - Voucher settings from business configuration
 * @param sequence - Sequence number for the voucher
 * @param date - Date for the voucher (defaults to today)
 * @returns Generated voucher number string
 */
export function generateVoucherNumber(
  settings: VoucherSettings,
  sequence: number,
  date: Date = new Date()
): string {
  const prefix = settings.voucher_prefix || 'VOU';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');

  switch (settings.voucher_format) {
    case 'short':
      return `${prefix}-${seq}`;
    case 'long':
      return `${prefix}-${year}-${seq}`;
    case 'custom':
      if (settings.voucher_custom_format) {
        return settings.voucher_custom_format
          .replace(/{PREFIX}/g, prefix)
          .replace(/{YEAR}/g, String(year))
          .replace(/{MONTH}/g, month)
          .replace(/{DAY}/g, day)
          .replace(/{SEQ}/g, seq);
      }
      return `${prefix}-${year}-${seq}`;
    default:
      return `${prefix}-${year}-${seq}`;
  }
}

// Alias functions for consistency with naming conventions
export const generatePOSNumber = generatePOSReceiptNumber;
export const generateStudioNumber = generateProjectNumber;
