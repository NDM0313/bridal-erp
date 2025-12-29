/**
 * Unit Conversion Utility
 * Handles conversion between base units (Pieces) and sub-units (Box, etc.)
 * 
 * Critical Business Logic:
 * - All stock is stored in base unit (Pieces)
 * - Sales can be made in any unit (Box or Pieces)
 * - Auto-calculates conversion using base_unit_multiplier
 */

export interface Unit {
  id: number;
  actual_name: string;
  short_name: string;
  allow_decimal: boolean;
  base_unit_id: number | null;
  base_unit_multiplier: number | null;
}

export interface StockInfo {
  qty_available: number; // Always in base unit (Pieces)
  base_unit: Unit;
  secondary_unit?: Unit;
}

export interface StockDisplay {
  base: {
    quantity: number;
    unit: Unit;
  };
  secondary?: {
    quantity: number;
    unit: Unit;
  };
}

/**
 * Get multiplier to convert from source unit to target unit
 * 
 * @param sourceUnit - Source unit (e.g., Box)
 * @param targetUnit - Target unit (e.g., Pieces)
 * @returns Multiplier (e.g., 12 means 1 Box = 12 Pieces)
 * 
 * @example
 * // 1 Box = 12 Pieces
 * getUnitMultiplier(boxUnit, piecesUnit) // returns 12
 * getUnitMultiplier(piecesUnit, boxUnit) // returns 1/12
 */
export function getUnitMultiplier(
  sourceUnit: Unit,
  targetUnit: Unit
): number {
  // Same unit
  if (sourceUnit.id === targetUnit.id) {
    return 1;
  }

  // If source is a sub-unit of target (e.g., Box -> Pieces)
  if (sourceUnit.base_unit_id === targetUnit.id) {
    return sourceUnit.base_unit_multiplier || 1;
  }

  // If target is a sub-unit of source (e.g., Pieces -> Box)
  if (targetUnit.base_unit_id === sourceUnit.id) {
    return 1 / (targetUnit.base_unit_multiplier || 1);
  }

  // Both are sub-units, need to find common base
  // This requires unit lookup, so we'll throw an error for now
  // In production, you'd recursively find the base unit
  throw new Error(
    `Units ${sourceUnit.actual_name} and ${targetUnit.actual_name} are not directly compatible`
  );
}

/**
 * Convert quantity from one unit to another
 * 
 * @param quantity - Quantity to convert
 * @param fromUnit - Source unit
 * @param toUnit - Target unit
 * @returns Converted quantity
 * 
 * @example
 * convertQuantity(2, boxUnit, piecesUnit) // 2 boxes = 24 pieces (if 1 box = 12 pieces)
 * convertQuantity(24, piecesUnit, boxUnit) // 24 pieces = 2 boxes
 */
export function convertQuantity(
  quantity: number,
  fromUnit: Unit,
  toUnit: Unit
): number {
  const multiplier = getUnitMultiplier(fromUnit, toUnit);
  return quantity * multiplier;
}

/**
 * Get stock display in both base and secondary units
 * 
 * @param stock - Stock information
 * @returns Stock display with quantities in both units
 * 
 * @example
 * // Stock: 120 pieces, secondary unit: Box (1 box = 12 pieces)
 * getStockDisplay({ qty_available: 120, base_unit: piecesUnit, secondary_unit: boxUnit })
 * // Returns: { base: { quantity: 120, unit: piecesUnit }, secondary: { quantity: 10, unit: boxUnit } }
 */
export function getStockDisplay(stock: StockInfo): StockDisplay {
  const baseQty = stock.qty_available;
  const baseUnit = stock.base_unit;

  const result: StockDisplay = {
    base: {
      quantity: baseQty,
      unit: baseUnit,
    },
  };

  if (stock.secondary_unit) {
    try {
      const multiplier = getUnitMultiplier(stock.secondary_unit, baseUnit);
      result.secondary = {
        quantity: baseQty / multiplier,
        unit: stock.secondary_unit,
      };
    } catch (error) {
      // If units are not compatible, only show base unit
      console.warn('Secondary unit not compatible, showing only base unit');
    }
  }

  return result;
}

/**
 * Calculate stock after sale
 * 
 * @param currentStock - Current stock in base unit (Pieces)
 * @param saleQuantity - Quantity sold (in any unit)
 * @param saleUnit - Unit used for sale
 * @param baseUnit - Base unit (Pieces)
 * @returns Remaining stock in base unit
 * 
 * @example
 * // Current: 120 pieces, Sale: 2 boxes (1 box = 12 pieces)
 * calculateStockAfterSale(120, 2, boxUnit, piecesUnit) // returns 96
 */
export function calculateStockAfterSale(
  currentStock: number,
  saleQuantity: number,
  saleUnit: Unit,
  baseUnit: Unit
): number {
  const saleQuantityInBase = convertQuantity(saleQuantity, saleUnit, baseUnit);
  return currentStock - saleQuantityInBase;
}

/**
 * Validate if sale quantity is available in stock
 * 
 * @param requestedQuantity - Quantity requested (in any unit)
 * @param requestedUnit - Unit of requested quantity
 * @param availableStock - Available stock in base unit
 * @param baseUnit - Base unit
 * @returns true if stock is sufficient, false otherwise
 */
export function validateStockAvailability(
  requestedQuantity: number,
  requestedUnit: Unit,
  availableStock: number,
  baseUnit: Unit
): boolean {
  const requestedInBase = convertQuantity(
    requestedQuantity,
    requestedUnit,
    baseUnit
  );
  return requestedInBase <= availableStock;
}

/**
 * Format quantity with unit name
 * 
 * @param quantity - Quantity
 * @param unit - Unit
 * @returns Formatted string
 * 
 * @example
 * formatQuantity(10, boxUnit) // "10 Box"
 * formatQuantity(120, piecesUnit) // "120 Pieces"
 */
export function formatQuantity(quantity: number, unit: Unit): string {
  return `${quantity} ${unit.actual_name}`;
}

/**
 * Get the price per unit based on customer type
 * 
 * @param variation - Product variation
 * @param customerType - 'retail' or 'wholesale'
 * @returns Price per unit
 */
export function getPriceByCustomerType(
  variation: { retail_price: number; wholesale_price: number },
  customerType: 'retail' | 'wholesale'
): number {
  return customerType === 'retail'
    ? variation.retail_price
    : variation.wholesale_price;
}

