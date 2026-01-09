/**
 * Global Formatting Utilities
 * Ensures consistent 2-decimal formatting across the entire application
 */

/**
 * Format number to exactly 2 decimal places
 * @param value - Number or string to format
 * @returns Formatted string with 2 decimals
 */
export function formatDecimal(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '0.00';
  }
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return '0.00';
  }
  
  return num.toFixed(2);
}

/**
 * Format currency with 2 decimal places
 * @param value - Number or string to format
 * @param currency - Currency symbol (default: empty)
 * @returns Formatted currency string
 */
export function formatCurrency(value: number | string | null | undefined, currency: string = ''): string {
  const formatted = formatDecimal(value);
  return currency ? `${currency}${formatted}` : formatted;
}

/**
 * Format quantity/stock with 2 decimal places
 * @param value - Number or string to format
 * @param unit - Unit suffix (e.g., 'M', 'Pc', 'Box')
 * @returns Formatted quantity string
 */
export function formatQuantity(value: number | string | null | undefined, unit: string = ''): string {
  const formatted = formatDecimal(value);
  return unit ? `${formatted}${unit}` : formatted;
}

/**
 * Parse input value to number with 2 decimal precision
 * Useful for onBlur handlers
 * @param value - Input value
 * @returns Number with 2 decimal precision
 */
export function parseDecimal(value: string | number): number {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? 0 : parseFloat(num.toFixed(2));
}

/**
 * Format packing display: Boxes / Pieces / Meters
 * @param boxes - Number of boxes
 * @param pieces - Number of pieces
 * @param meters - Total meters
 * @returns Formatted packing string
 */
export function formatPacking(boxes: number, pieces: number, meters: number): string {
  return `${boxes} / ${pieces.toFixed(0)} / ${formatDecimal(meters)}M`;
}

