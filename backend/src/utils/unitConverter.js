/**
 * Unit Conversion Utility
 * Handles conversion between base units (Pieces) and sub-units (Box, etc.)
 * 
 * CRITICAL BUSINESS RULES:
 * - All stock is stored in BASE UNIT = PIECES
 * - Sales can be made in Box or Pieces
 * - Conversion uses units.base_unit_multiplier
 * - Example: 1 Box = 12 Pieces (multiplier = 12)
 */

/**
 * Get multiplier to convert from source unit to target unit
 * 
 * @param {object} sourceUnit - Source unit object from database
 * @param {object} targetUnit - Target unit object from database
 * @returns {number} Multiplier (e.g., 12 means 1 sourceUnit = 12 targetUnit)
 * 
 * @example
 * // 1 Box = 12 Pieces
 * getUnitMultiplier(boxUnit, piecesUnit) // returns 12
 * getUnitMultiplier(piecesUnit, boxUnit) // returns 1/12
 */
export function getUnitMultiplier(sourceUnit, targetUnit) {
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
  // For now, throw error (can be extended to handle complex conversions)
  throw new Error(
    `Units ${sourceUnit.actual_name} and ${targetUnit.actual_name} are not directly compatible`
  );
}

/**
 * Convert quantity from one unit to another
 * 
 * @param {number} quantity - Quantity to convert
 * @param {object} fromUnit - Source unit
 * @param {object} toUnit - Target unit
 * @returns {number} Converted quantity
 * 
 * @example
 * convertQuantity(2, boxUnit, piecesUnit) // 2 boxes = 24 pieces (if 1 box = 12 pieces)
 * convertQuantity(24, piecesUnit, boxUnit) // 24 pieces = 2 boxes
 */
export function convertQuantity(quantity, fromUnit, toUnit) {
  const multiplier = getUnitMultiplier(fromUnit, toUnit);
  return quantity * multiplier;
}

/**
 * Convert quantity to base unit (Pieces)
 * This is the most common conversion for stock calculations
 * 
 * @param {number} quantity - Quantity in any unit
 * @param {object} unit - Unit object (must have base_unit_id and base_unit_multiplier if sub-unit)
 * @param {object} baseUnit - Base unit (Pieces)
 * @returns {number} Quantity in base unit (Pieces)
 * 
 * @example
 * convertToBaseUnit(2, boxUnit, piecesUnit) // returns 24 (if 1 box = 12 pieces)
 * convertToBaseUnit(24, piecesUnit, piecesUnit) // returns 24
 */
export function convertToBaseUnit(quantity, unit, baseUnit) {
  // If unit is already base unit, return as-is
  if (unit.id === baseUnit.id || !unit.base_unit_id) {
    return quantity;
  }

  // Convert using multiplier
  if (unit.base_unit_id === baseUnit.id && unit.base_unit_multiplier) {
    return quantity * unit.base_unit_multiplier;
  }

  throw new Error(`Cannot convert ${unit.actual_name} to base unit ${baseUnit.actual_name}`);
}

/**
 * Validate if units are compatible
 * 
 * @param {object} unit1 - First unit
 * @param {object} unit2 - Second unit
 * @returns {boolean} True if compatible
 */
export function areUnitsCompatible(unit1, unit2) {
  try {
    getUnitMultiplier(unit1, unit2);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get price per unit based on customer type
 * 
 * @param {object} variation - Variation object with retail_price and wholesale_price
 * @param {string} customerType - 'retail' or 'wholesale'
 * @returns {number} Price per unit
 */
export function getPriceByCustomerType(variation, customerType) {
  if (customerType === 'retail') {
    return parseFloat(variation.retail_price) || 0;
  } else if (customerType === 'wholesale') {
    return parseFloat(variation.wholesale_price) || 0;
  }
  throw new Error(`Invalid customer type: ${customerType}. Must be 'retail' or 'wholesale'`);
}

