# 📋 Dropdown Best Practices - Future-Proof Pattern

## 🎯 **Problem Statement**

Jab bhi naya module add karte hain, dropdown me yeh common issues aate hain:
- ❌ Click register nahi hota
- ❌ Dropdown blur se turant close ho jata hai
- ❌ MouseDown se click miss ho jata hai

## ✅ **Solution: Reusable `useDropdown` Hook**

Main ne ek **proven pattern** ko reusable hook me convert kar diya hai jo:
- ✅ Product Variation dropdown me use hua
- ✅ Add Packing dropdown me use hua  
- ✅ Branch Selector me use hua

**Ab har naye dropdown me yeh hook use karo - issue nahi aayega!**

---

## 🚀 **Quick Start**

### **Step 1: Import Hook**

```typescript
import { useDropdown } from '@/lib/hooks/useDropdown';
```

### **Step 2: Use in Component**

```typescript
function MyDropdown() {
  const {
    isOpen,
    handleToggle,
    handleMouseDown,
    handleBlur,
    handleItemClick,
  } = useDropdown({
    onItemSelect: (item) => {
      // Your selection logic here
      console.log('Selected:', item);
    },
  });

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={handleToggle}
        onBlur={handleBlur}  // ← CRITICAL: Add this
      >
        Open Dropdown
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div>
          {items.map((item) => (
            <button
              key={item.id}
              onMouseDown={handleMouseDown}  // ← CRITICAL: Add this
              onClick={() => handleItemClick(item)}  // ← Use this instead of direct onClick
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 📖 **Complete Example**

### **Example 1: Simple Dropdown**

```typescript
'use client';

import { useDropdown } from '@/lib/hooks/useDropdown';
import { ChevronDown } from 'lucide-react';

function CategoryDropdown({ categories, onSelect }) {
  const {
    isOpen,
    handleToggle,
    handleMouseDown,
    handleBlur,
    handleItemClick,
  } = useDropdown({
    onItemSelect: onSelect,
  });

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        onBlur={handleBlur}
        className="px-4 py-2 bg-slate-800 rounded-lg"
      >
        Select Category
        <ChevronDown />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 bg-slate-900 rounded-lg shadow-xl">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onMouseDown={handleMouseDown}
              onClick={() => handleItemClick(cat)}
              className="w-full px-4 py-2 hover:bg-slate-800 text-left"
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### **Example 2: With Portal (for z-index issues)**

```typescript
import { createPortal } from 'react-dom';
import { useDropdown } from '@/lib/hooks/useDropdown';

function PortalDropdown({ items, onSelect }) {
  const {
    isOpen,
    handleToggle,
    handleMouseDown,
    handleBlur,
    handleItemClick,
  } = useDropdown({
    onItemSelect: onSelect,
  });

  return (
    <>
      <button onClick={handleToggle} onBlur={handleBlur}>
        Open
      </button>

      {isOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed z-50 bg-slate-900 rounded-lg">
          {items.map((item) => (
            <button
              key={item.id}
              onMouseDown={handleMouseDown}
              onClick={() => handleItemClick(item)}
            >
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
```

---

## 🔧 **Hook Options**

```typescript
useDropdown({
  // Delay before closing on blur (ms)
  blurDelay?: number;  // Default: 120

  // Delay before closing after item click (ms)
  clickCloseDelay?: number;  // Default: 50

  // Callback when item is selected
  onItemSelect?: (item: any) => void;
})
```

### **Custom Delays Example**

```typescript
const { ... } = useDropdown({
  blurDelay: 200,        // Longer delay for complex dropdowns
  clickCloseDelay: 100,  // Longer delay for async operations
  onItemSelect: (item) => {
    // Handle selection
  },
});
```

---

## ✅ **Checklist: Creating New Dropdown**

Jab bhi naya dropdown banate ho, yeh checklist follow karo:

- [ ] `useDropdown` hook import kiya
- [ ] `handleToggle` button ke `onClick` me use kiya
- [ ] `handleBlur` button ke `onBlur` me use kiya
- [ ] `handleMouseDown` har dropdown item ke `onMouseDown` me use kiya
- [ ] `handleItemClick` har dropdown item ke `onClick` me use kiya (direct onClick nahi)
- [ ] `onItemSelect` callback me selection logic add kiya

---

## 🚫 **Common Mistakes (Avoid These!)**

### ❌ **WRONG: Direct onClick**

```typescript
// DON'T DO THIS
<button onClick={() => {
  onSelect(item);
  setIsOpen(false);
}}>
  {item.label}
</button>
```

### ✅ **CORRECT: Use handleItemClick**

```typescript
// DO THIS
<button
  onMouseDown={handleMouseDown}
  onClick={() => handleItemClick(item)}
>
  {item.label}
</button>
```

---

### ❌ **WRONG: Missing onBlur**

```typescript
// DON'T DO THIS
<button onClick={handleToggle}>
  Open
</button>
```

### ✅ **CORRECT: Add onBlur**

```typescript
// DO THIS
<button onClick={handleToggle} onBlur={handleBlur}>
  Open
</button>
```

---

### ❌ **WRONG: Missing onMouseDown**

```typescript
// DON'T DO THIS
<button onClick={() => handleItemClick(item)}>
  {item.label}
</button>
```

### ✅ **CORRECT: Add onMouseDown**

```typescript
// DO THIS
<button
  onMouseDown={handleMouseDown}
  onClick={() => handleItemClick(item)}
>
  {item.label}
</button>
```

---

## 📚 **Reference: Existing Implementations**

### **1. Branch Selector**
**File:** `components/header/BranchSelector.tsx`
- ✅ Uses `useDropdown` pattern
- ✅ Portal-based dropdown
- ✅ Works perfectly

### **2. Product Variation Dropdown**
**File:** (Check existing variation components)
- ✅ Uses same pattern
- ✅ No click issues

### **3. Add Packing Dropdown**
**File:** (Check existing packing components)
- ✅ Uses same pattern
- ✅ Reliable selection

---

## 🎯 **Future Modules: Copy-Paste Template**

Jab bhi naya module add karo, yeh template copy karo:

```typescript
'use client';

import { useDropdown } from '@/lib/hooks/useDropdown';
import { ChevronDown } from 'lucide-react';

export function MyNewDropdown({ items, onSelect }) {
  const {
    isOpen,
    handleToggle,
    handleMouseDown,
    handleBlur,
    handleItemClick,
  } = useDropdown({
    onItemSelect: onSelect,
  });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        onBlur={handleBlur}
        className="px-4 py-2 bg-slate-800 rounded-lg"
      >
        Select...
        <ChevronDown />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 bg-slate-900 rounded-lg shadow-xl z-50">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={handleMouseDown}
              onClick={() => handleItemClick(item)}
              className="w-full px-4 py-2 hover:bg-slate-800 text-left"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 🐛 **Troubleshooting**

### **Issue: Click still not registering**

**Solution:**
1. Check `onMouseDown={handleMouseDown}` is on dropdown items
2. Check `onBlur={handleBlur}` is on trigger button
3. Check `handleItemClick` is used (not direct onClick)

### **Issue: Dropdown closes too fast**

**Solution:**
```typescript
useDropdown({
  blurDelay: 200,        // Increase delay
  clickCloseDelay: 100,  // Increase delay
})
```

### **Issue: Dropdown doesn't close**

**Solution:**
- Check if `handleItemClick` is being called
- Check if `onItemSelect` callback is working
- Verify `isOpen` state is updating

---

## ✅ **Final Verdict**

```
✅ useDropdown hook ab system me available hai
✅ Har naye dropdown me is hook ko use karo
✅ Same pattern har jagah follow karo
✅ Future me dropdown issues nahi aayenge
✅ Code consistent aur maintainable rahega
```

---

## 📝 **Quick Reference Card**

```typescript
// 1. Import
import { useDropdown } from '@/lib/hooks/useDropdown';

// 2. Use hook
const { isOpen, handleToggle, handleMouseDown, handleBlur, handleItemClick } = useDropdown({
  onItemSelect: (item) => { /* your logic */ }
});

// 3. Trigger button
<button onClick={handleToggle} onBlur={handleBlur}>Open</button>

// 4. Dropdown items
<button onMouseDown={handleMouseDown} onClick={() => handleItemClick(item)}>
  {item.label}
</button>
```

---

**Implementation Date:** January 8, 2026  
**Status:** ✅ Production Ready  
**Usage:** All future dropdowns must use this pattern
