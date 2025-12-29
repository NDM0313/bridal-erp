# Unit Conversion Guide
## How Box/Pieces Conversion Works

## 🔄 Conversion Logic

### Base Unit (Pieces)
- **ID**: Usually 1
- **Name**: "Pieces"
- **base_unit_id**: `NULL`
- **base_unit_multiplier**: `NULL`

### Secondary Unit (Box)
- **ID**: Usually 3
- **Name**: "Box"
- **base_unit_id**: `1` (references Pieces)
- **base_unit_multiplier**: `12` (1 Box = 12 Pieces)

## 📐 Conversion Formula

```
quantity_in_pieces = quantity_in_boxes × base_unit_multiplier
```

**Example:**
- Selling 2 Boxes
- Multiplier: 12
- Conversion: 2 × 12 = 24 Pieces
- Stock Deducted: 24 Pieces

## 🔍 How It Works in Code

### Step 1: Get Unit Information

```javascript
// Get unit from database
const unit = await supabase
  .from('units')
  .select('id, actual_name, base_unit_id, base_unit_multiplier')
  .eq('id', unitId)
  .single();

// Result:
// {
//   id: 3,
//   actual_name: "Box",
//   base_unit_id: 1,
//   base_unit_multiplier: 12
// }
```

### Step 2: Get Base Unit

```javascript
// Get base unit (Pieces)
const baseUnit = await supabase
  .from('units')
  .select('id, actual_name')
  .eq('business_id', businessId)
  .is('base_unit_id', null)
  .single();

// Result:
// {
//   id: 1,
//   actual_name: "Pieces"
// }
```

### Step 3: Convert Quantity

```javascript
import { convertToBaseUnit } from './utils/unitConverter.js';

const quantityInPieces = convertToBaseUnit(
  2,        // quantity in Box
  unit,     // Box unit object
  baseUnit  // Pieces unit object
);

// Result: 24 (2 boxes × 12 = 24 pieces)
```

### Step 4: Deduct Stock

```javascript
// Stock is always in Pieces
await supabase
  .from('variation_location_details')
  .update({ qty_available: currentStock - quantityInPieces })
  .eq('variation_id', variationId)
  .eq('location_id', locationId);
```

## 📊 Example Scenarios

### Scenario 1: Sale in Pieces

**Input:**
- Quantity: 24
- Unit: Pieces (id: 1)
- Multiplier: N/A (base unit)

**Conversion:**
- No conversion needed
- Quantity in Pieces: 24

**Stock Deducted:** 24 Pieces

---

### Scenario 2: Sale in Box

**Input:**
- Quantity: 2
- Unit: Box (id: 3)
- Multiplier: 12

**Conversion:**
- 2 × 12 = 24 Pieces

**Stock Deducted:** 24 Pieces

---

### Scenario 3: Mixed Units

**Input:**
- Item 1: 1 Box
- Item 2: 6 Pieces

**Conversion:**
- Item 1: 1 × 12 = 12 Pieces
- Item 2: 6 Pieces
- Total: 18 Pieces

**Stock Deducted:** 18 Pieces

## ⚠️ Important Rules

1. **Stock is ALWAYS in Pieces**: Never store stock in Box
2. **Conversion is Automatic**: Happens before stock deduction
3. **Validation**: Check stock availability in Pieces
4. **Error Handling**: Clear messages if conversion fails

## 🔧 Utility Functions

### `convertToBaseUnit(quantity, unit, baseUnit)`
Converts any quantity to base unit (Pieces).

### `getUnitMultiplier(sourceUnit, targetUnit)`
Gets multiplier between two units.

### `areUnitsCompatible(unit1, unit2)`
Checks if units can be converted.

## 📝 Database Structure

```sql
-- Units table
units:
  id: 1, actual_name: "Pieces", base_unit_id: NULL, base_unit_multiplier: NULL
  id: 3, actual_name: "Box", base_unit_id: 1, base_unit_multiplier: 12

-- Stock table (ALWAYS in Pieces)
variation_location_details:
  qty_available: 120  -- This is 120 Pieces (or 10 Boxes)
```

## ✅ Testing

Test with different scenarios:
1. Sale in Pieces only
2. Sale in Box only
3. Mixed units sale
4. Insufficient stock (Box conversion)
5. Invalid unit conversion

---

**All conversions happen automatically!** 🎯

