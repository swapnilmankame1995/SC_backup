# Pricing Calculation Flow - Complete Documentation

## Overview
This document provides a comprehensive breakdown of how pricing is calculated throughout the Sheetcutters.com platform, from DXF file upload to final payment.

---

## 📐 Core Pricing Formula

```
Base Price (₹) = Cutting Length (mm) × Price Per MM (₹/mm)
Final Price (₹) = max(Base Price × Quantity, ₹100 minimum)
```

### Key Components:
1. **Cutting Length** - Total path the laser must travel (extracted from DXF file)
2. **Price Per MM** - Material + thickness specific rate (e.g., Mild Steel 3mm: ₹0.10/mm)
3. **Quantity** - Number of identical parts to cut
4. **₹100 Minimum** - Applied to (Base Price × Quantity) NOT per unit

---

## 🔍 Step-by-Step Calculation Locations

### 1️⃣ **DXF Parser** (`/utils/dxf-parser.ts`)

**Purpose:** Extract cutting length from uploaded DXF file

**Location in code:**
- Lines 63-682: Main `parseDXF()` function
- Line 69: `let totalLength = 0;` - Initialize accumulator
- Lines 162-641: Parse all entities (LINE, CIRCLE, ARC, LWPOLYLINE, POLYLINE, SPLINE, ELLIPSE)
- Line 675: `cuttingLength: totalLength` - Return cutting length in result

**How cutting length is calculated:**
```typescript
// LINE entities
const length = Math.sqrt((x2-x1)² + (y2-y1)²);
totalLength += length;

// CIRCLE entities  
const circumference = 2 * π * radius;
totalLength += circumference;

// ARC entities
const arcLength = (angleDiff/360) * 2 * π * radius;
totalLength += arcLength;

// LWPOLYLINE entities
for each segment:
  if (bulge !== 0) {
    // Curved segment
    theta = 4 * atan(|bulge|);
    radius = chordLength / (2 * sin(theta/2));
    arcLength = radius * theta;
    totalLength += arcLength;
  } else {
    // Straight segment
    totalLength += chordLength;
  }

// CRITICAL: Add closing segment if polyline is closed
if (polyData.closed && vertices.length > 2) {
  closingLength = distance(lastVertex, firstVertex);
  totalLength += closingLength;
}
```

**Output:**
```typescript
{
  width: 200.5,           // Bounding box width (mm)
  height: 150.3,          // Bounding box height (mm)
  cuttingLength: 825.47,  // ✅ USED FOR PRICING
  entities: [...],        // Geometric shapes
  minX, minY, maxX, maxY  // Bounds
}
```

**Bug Fix (Feb 2026):**
- Previously missed closing segments on closed polylines (group code 70)
- Resulted in cutting lengths showing ~50% of actual value
- Now properly checks `(flags & 1) === 1` for closed flag

---

### 2️⃣ **Thickness Selection Screen** (`/components/ThicknessScreen.tsx`)

**Purpose:** Calculate base price when user selects material thickness

**Location in code:**
- Lines 49-62: `calculatePrice(thickness)` function
- Line 64-67: `getPricePerMm(thickness)` helper
- Line 70-74: `getDisplayPrice(thickness)` - shows ₹100 minimum in UI
- Line 78: Passes calculated price to `onNext()`

**Calculation logic:**
```typescript
const calculatePrice = (thickness: number): number => {
  if (!material || !dxfData) return 100;
  
  // Find pricing for selected thickness
  const pricingInfo = material.pricing.find(p => p.thickness === thickness);
  if (!pricingInfo) return 100; // Fallback
  
  // Calculate base price WITHOUT applying minimum
  // Minimum will be applied after quantity multiplication in SummaryScreen
  const basePrice = dxfData.cuttingLength * pricingInfo.pricePerMm;
  return basePrice;
};
```

**Example:**
```
Material: Mild Steel 3mm
Cutting Length: 9,850.5 mm
Price Per MM: ₹0.10/mm

Base Price = 9,850.5 × 0.10 = ₹985.05
```

**Display logic:**
```typescript
const getDisplayPrice = (thickness: number): number => {
  const actualPrice = calculatePrice(thickness);
  // Show ₹100 if below minimum, but keep actual price in state
  return Math.max(actualPrice, 100);
};
```

**UI Display:**
- Shows all available thicknesses with their prices
- Displays cutting length info: `"Cutting Length: 9,850.5 mm"`
- Shows minimum charge notice: `"Min. Charge: ₹100"`
- Selected price shown in green card at bottom

---

### 3️⃣ **Summary Screen** (`/components/SummaryScreen.tsx`)

**Purpose:** Show order summary with quantity controls and final price

**Location in code:**
- Lines 66-67: Initialize quantity state
- Lines 69-72: Get `pricePerMm` for breakdown display
- Lines 101-105: Handle quantity changes (1-999 range)
- Lines 108-110: **Calculate final total with ₹100 minimum**

**Critical calculation:**
```typescript
const MINIMUM_ORDER_PRICE = 100;

// Step 1: Calculate base total
const baseTotal = isSketchWorkflow 
  ? price 
  : price * quantity;

// Step 2: Apply ₹100 minimum AFTER quantity multiplication
const totalPrice = isSketchWorkflow 
  ? baseTotal 
  : Math.max(baseTotal, MINIMUM_ORDER_PRICE);
```

**Example scenarios:**

**Scenario A - Below minimum:**
```
Base Price: ₹45.50 (per piece)
Quantity: 1
Base Total: ₹45.50 × 1 = ₹45.50
Final Price: max(₹45.50, ₹100) = ₹100 ✅ (minimum applied)
```

**Scenario B - Above minimum with quantity:**
```
Base Price: ₹45.50 (per piece)
Quantity: 3
Base Total: ₹45.50 × 3 = ₹136.50
Final Price: max(₹136.50, ₹100) = ₹136.50 ✅ (no minimum needed)
```

**Scenario C - High value part:**
```
Base Price: ₹985.05 (per piece)
Quantity: 2
Base Total: ₹985.05 × 2 = ₹1,970.10
Final Price: max(₹1,970.10, ₹100) = ₹1,970.10 ✅
```

**UI Display (Lines 288-363):**
```
Pricing Breakdown:
├─ Base Price: 9,850.5 mm × ₹0.10 = ₹985.05
├─ Quantity: 2 (with +/- controls)
├─ Subtotal: ₹985.05 × 2 = ₹1,970.10
└─ Total Amount: ₹1,970.10
```

**Bulk pricing helper (Lines 394-450):**
- Shown when `price < MINIMUM_ORDER_PRICE`
- Displays pricing for 1, 3, 5, 10 pieces
- Highlights quantities that exceed ₹100 minimum
- Shows per-piece cost breakdown

---

### 4️⃣ **Cart Screen** (`/components/CartScreen.tsx`)

**Purpose:** Display cart items with individual pricing and quantity controls

**Location in code:**
- Lines 117-126: `getItemTotal(item)` - Calculate price per cart item
- Lines 140-145: `handleQuantityChange()` - Update item quantity
- Lines 168-191: Calculate totals separated by GST rate

**Per-item calculation:**
```typescript
const MINIMUM_ORDER_VALUE = 100;

const getItemTotal = (item: CartItem): number => {
  if (item.isSketchService) {
    // Sketch service: fixed ₹150, no minimum needed
    return item.price * (item.quantity || 1);
  }
  
  // Laser cutting: Apply ₹100 minimum to (price × quantity)
  const rawTotal = item.price * (item.quantity || 1);
  return Math.max(rawTotal, MINIMUM_ORDER_VALUE);
};
```

**Cart total calculation:**
```typescript
// Separate by GST rate for invoice compliance

// Laser cutting items (12% GST) - with ₹100 minimum per item
const laserCuttingTotal = items
  .filter(item => !item.isSketchService)
  .reduce((sum, item) => sum + getItemTotal(item), 0);

// CAD/sketch service items (18% GST) - no minimum
const cadServiceTotal = items
  .filter(item => item.isSketchService)
  .reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

// Reverse calculate GST (prices already include GST)
const laserSubtotal = laserCuttingTotal / 1.12;  // Ex-GST
const laserTax = laserCuttingTotal - laserSubtotal;

const cadSubtotal = cadServiceTotal / 1.18;
const cadTax = cadServiceTotal - cadSubtotal;

const total = laserCuttingTotal + cadServiceTotal;
```

**Example cart:**
```
Item 1: Mild Steel 3mm, Qty: 2
  Base: ₹45.50 × 2 = ₹91.00
  Final: max(₹91.00, ₹100) = ₹100.00

Item 2: Aluminum 5mm, Qty: 1
  Base: ₹250.00 × 1 = ₹250.00
  Final: max(₹250.00, ₹100) = ₹250.00

Cart Total: ₹100.00 + ₹250.00 = ₹350.00
```

---

### 5️⃣ **Checkout Screen** (`/components/CheckoutScreen.tsx`)

**Purpose:** Final price calculation with shipping, discounts, GST, and loyalty points

**Location in code:**
- Lines 288-312: Calculate base price with ₹100 minimum
- Lines 343-373: Separate items by GST rate (12% vs 18%)
- Lines 413-466: Apply discounts and loyalty points to ex-GST amounts
- Lines 470-483: Calculate final GST amounts
- Lines 489-494: Shipping calculation state

**Business rules implemented:**
1. ✅ ₹100 Minimum per laser cutting item (price × quantity ≥ ₹100)
2. ✅ GST Rates: 12% for laser cutting, 18% for CAD services
3. ✅ Shipping: Weight-based with state-specific rates
4. ✅ Loyalty Points: Max 50% of order value, excludes shipping
5. ✅ Free Shipping: Based on state threshold (e.g., Karnataka 2kg free)

**Step 1: Calculate base price (Lines 296-312)**
```typescript
const MINIMUM_ORDER_PRICE = 100;

// For cart checkout
const getItemTotal = (item: CartItem): number => {
  if (item.isSketchService) {
    return item.price * (item.quantity || 1);
  }
  const rawTotal = item.price * (item.quantity || 1);
  return Math.max(rawTotal, MINIMUM_ORDER_PRICE);
};

const cartTotal = cartItems?.reduce((sum, item) => {
  return sum + getItemTotal(item);
}, 0) || 0;

// For single item checkout
const rawBasePrice = (cartItems && cartItems.length > 0) 
  ? cartTotal 
  : Math.max((price || 0) * quantity, MINIMUM_ORDER_PRICE);
```

**Step 2: Separate by GST category (Lines 343-373)**
```typescript
let rawLaserCuttingTotal = 0;  // 12% GST items
let rawCadServiceTotal = 0;     // 18% GST items

if (cartItems && cartItems.length > 0) {
  // Cart checkout
  cartItems.forEach(item => {
    const itemTotal = getItemTotal(item);
    if (item.material?.category === 'service') {
      rawCadServiceTotal += itemTotal;  // 18% GST
    } else {
      rawLaserCuttingTotal += itemTotal; // 12% GST
    }
  });
} else {
  // Single item checkout
  if (material?.category === 'service' || isSketchWorkflow) {
    rawCadServiceTotal = (price || 0) * quantity;
  } else {
    rawLaserCuttingTotal = Math.max((price || 0) * quantity, MINIMUM_ORDER_PRICE);
  }
}

const laserCuttingTotal = rawLaserCuttingTotal;
const cadServiceTotal = rawCadServiceTotal;
const basePrice = laserCuttingTotal + cadServiceTotal;
```

**Step 3: Extract ex-GST amounts (Lines 413-416)**
```typescript
// Prices are GST-inclusive, reverse-calculate subtotal
const laserSubtotalOriginal = laserCuttingTotal / 1.12;  // Ex-GST
const cadSubtotalOriginal = cadServiceTotal / 1.18;      // Ex-GST
const subtotalOriginal = laserSubtotalOriginal + cadSubtotalOriginal;
```

**Step 4: Apply discount & loyalty points (Lines 418-466)**
```typescript
let laserSubtotal = laserSubtotalOriginal;
let cadSubtotal = cadSubtotalOriginal;
let discountAmountExGST = 0;
let loyaltyAmountApplied = 0;

if (isCartCheckout && cartItems && cartItems.length > 0) {
  // CART: Apply ALL discount/loyalty to FIRST item only (avoids splitting complexity)
  const firstItem = cartItems[0];
  const isFirstItemService = firstItem.material?.category === 'service';
  const firstItemGSTRate = isFirstItemService ? 0.18 : 0.12;
  const firstItemExGST = (firstItem.price * (firstItem.quantity || 1)) / (1 + firstItemGSTRate);
  
  // Apply discount
  if (appliedDiscount?.amount) {
    discountAmountExGST = appliedDiscount.amount / (1 + firstItemGSTRate);
    discountAmountExGST = Math.min(discountAmountExGST, firstItemExGST);
  }
  
  // Apply loyalty
  const firstItemAfterDiscount = Math.max(0, firstItemExGST - discountAmountExGST);
  loyaltyAmountApplied = Math.min(appliedPoints, firstItemAfterDiscount);
  
  // Reduce appropriate category
  const totalReduction = discountAmountExGST + loyaltyAmountApplied;
  if (isFirstItemService) {
    cadSubtotal = Math.max(0, cadSubtotalOriginal - totalReduction);
  } else {
    laserSubtotal = Math.max(0, laserSubtotalOriginal - totalReduction);
  }
} else {
  // SINGLE: Apply discount/loyalty proportionally
  if (appliedDiscount?.amount) {
    const discountRatio = appliedDiscount.amount / basePrice;
    discountAmountExGST = subtotalOriginal * discountRatio;
  }
  
  const subtotalAfterDiscount = Math.max(0, subtotalOriginal - discountAmountExGST);
  loyaltyAmountApplied = Math.min(appliedPoints, subtotalAfterDiscount);
  
  const totalReduction = discountAmountExGST + loyaltyAmountApplied;
  const subtotalAfterPoints = Math.max(0, subtotalOriginal - totalReduction);
  const reductionRatio = subtotalOriginal > 0 ? subtotalAfterPoints / subtotalOriginal : 1;
  
  laserSubtotal = laserSubtotalOriginal * reductionRatio;
  cadSubtotal = cadSubtotalOriginal * reductionRatio;
}

const subtotal = laserSubtotal + cadSubtotal;  // Final ex-GST subtotal
```

**Step 5: Calculate GST on reduced amounts (Lines 470-483)**
```typescript
// Calculate GST on the reduced ex-GST amounts
const laserTax = laserSubtotal * 0.12;  // 12% of ex-GST amount
const cadTax = cadSubtotal * 0.18;      // 18% of ex-GST amount
const taxAmount = laserTax + cadTax;

// Calculate GST-inclusive amounts
const finalLaserTotal = laserSubtotal + laserTax;
const finalCadTotal = cadSubtotal + cadTax;

const priceAfterPoints = subtotal + taxAmount;  // Total after all reductions
```

**Step 6: Add shipping (separate calculation)**
```typescript
// Shipping has its own 18% GST
const shippingExGST = shippingCost / 1.18;
const shippingGST = shippingCost - shippingExGST;

// Final total
const total = priceAfterPoints + shippingCost;
```

**Complete example:**
```
Material: Mild Steel 3mm
Cutting Length: 10,747.84 mm
Price Per MM: ₹0.10/mm
Quantity: 1

Step 1: Base price
  10,747.84 × 0.10 = ₹1,074.78 ✅

Step 2: Apply minimum
  max(₹1,074.78, ₹100) = ₹1,074.78 ✅

Step 3: Extract ex-GST
  Ex-GST: ₹1,074.78 / 1.12 = ₹959.63
  GST (12%): ₹1,074.78 - ₹959.63 = ₹115.15

Step 4: Apply 10% discount
  Discount ex-GST: ₹959.63 × 0.10 = ₹95.96
  After discount: ₹959.63 - ₹95.96 = ₹863.67

Step 5: Apply ₹5 loyalty points
  After loyalty: ₹863.67 - ₹5.00 = ₹858.67

Step 6: Recalculate GST
  GST (12%): ₹858.67 × 0.12 = ₹103.04
  Subtotal with GST: ₹858.67 + ₹103.04 = ₹961.71

Step 7: Add shipping (Karnataka, 1.5kg)
  Shipping ex-GST: ₹233.90
  Shipping GST (18%): ₹42.10
  Shipping total: ₹276.00

Final Total: ₹961.71 + ₹276.00 = ₹1,237.71 ✅
```

**Pricing data stored in sessionStorage:**
```typescript
sessionStorage.setItem('orderPricing', JSON.stringify({
  subtotal: 858.67,              // Ex-GST after discounts
  tax: 103.04,                   // GST on reduced amount
  shipping: 276.00,              // Shipping with GST
  discount: 95.96,               // Discount amount (ex-GST)
  discountAmount: 107.46,        // Discount amount (GST-inclusive)
  loyaltyPoints: 5.00,           // Points used
  total: 1237.71                 // Final amount to charge
}));
```

---

### 6️⃣ **App.tsx** (Flow Controller)

**Purpose:** Manage app state and pass pricing through workflow

**Location in code:**
- Lines 80-90: State variables for price, material, thickness, quantity
- Line 331-333: `handleThicknessSelect()` - Receive price from ThicknessScreen
- Lines 710-711: Retrieve final pricing from sessionStorage at payment
- Lines 929, 1307: Send discount amount to backend

**Key flow:**
```typescript
// 1. Receive calculated price from ThicknessScreen
const handleThicknessSelect = (thickness: number, calculatedPrice: number) => {
  setSelectedThickness(thickness);
  setPrice(calculatedPrice);  // Store base price
  setCurrentScreen('summary');
};

// 2. At payment time, get final pricing from CheckoutScreen
const pricingData = JSON.parse(sessionStorage.getItem('orderPricing') || '{}');
const finalAmount = pricingData.total || price;

console.log(`💰 Final amount to charge: ₹${finalAmount}`);
```

**Note:** App.tsx does NOT recalculate price, it only passes it through the workflow.

---

### 7️⃣ **Backend Server** (`/supabase/functions/server/index.tsx`)

**Purpose:** Store materials pricing and handle order creation

**Location in code:**
- Lines 1447-1449: Materials table schema documentation
- Lines 1476-1485: Convert DB format to frontend pricing format
- Lines 1502-1508: Default material pricing data

**Material pricing storage:**
```typescript
// Database schema (SQL table: materials)
{
  id: 'mild-steel',
  name: 'Mild Steel',
  category: 'Metals',
  price_per_mm: 0.10,           // Base price (₹/mm)
  thicknesses: [1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12],
  density: 7850,                // kg/m³ (for shipping weight)
  available: true
}

// Frontend format conversion
const pricing = material.thicknesses?.map((t: number) => ({
  thickness: t,
  pricePerMm: parseFloat(material.price_per_mm)
})) || [];

// Result:
[
  { thickness: 1, pricePerMm: 0.10 },
  { thickness: 1.5, pricePerMm: 0.10 },
  { thickness: 2, pricePerMm: 0.10 },
  ...
]
```

**Default material pricing:**
```typescript
// Metals
Mild Steel:       ₹0.10/mm (density: 7850 kg/m³)
Stainless Steel:  ₹0.15/mm (density: 8000 kg/m³)
Aluminum:         ₹0.12/mm (density: 2700 kg/m³)

// Non-Metals
Acrylic:          ₹0.08/mm (density: 1190 kg/m³)
MDF:              ₹0.06/mm (density: 750 kg/m³)
PVC:              ₹0.07/mm (density: 1400 kg/m³)
```

**Backend order creation:**
- Backend does NOT recalculate price
- Trusts frontend calculation
- Stores price, discount amount, shipping cost as received
- Validates user authentication and order data
- Sends confirmation emails with stored pricing

---

## 🧮 Calculation Summary Table

| Screen | Calculation | Formula | Minimum Applied? |
|--------|-------------|---------|------------------|
| **DXF Parser** | Extract cutting length | Parse all entities, sum path lengths | N/A |
| **Thickness Screen** | Calculate base price | `cutting_length × price_per_mm` | ❌ No (raw price) |
| **Summary Screen** | Apply quantity & minimum | `max(base_price × quantity, ₹100)` | ✅ Yes |
| **Cart Screen** | Per-item totals | `max(price × quantity, ₹100)` per item | ✅ Yes |
| **Checkout Screen** | Final with discounts/GST | Extract ex-GST → Apply discounts → Recalculate GST → Add shipping | ✅ Yes (in base) |
| **App.tsx** | Pass-through | Stores and passes price, no recalculation | N/A |
| **Backend** | Store order | Saves received price, no recalculation | N/A |

---

## 💡 Key Insights

### 1. **Cutting Length is Everything**
- The DXF parser's cutting length calculation is the FOUNDATION of all pricing
- Recent bug fix added missing closing segments on polylines
- Without accurate cutting length, all downstream pricing is wrong

### 2. **₹100 Minimum Applied AFTER Quantity**
```
❌ WRONG:  max(price, ₹100) × quantity
✅ CORRECT: max(price × quantity, ₹100)
```
This allows bulk orders to avoid the minimum:
- 1× ₹45 part = ₹100 (minimum applied)
- 3× ₹45 part = ₹135 (no minimum needed)

### 3. **Price Per MM Varies by Material AND Thickness**
```typescript
// Same material, different thickness = SAME price per mm currently
Mild Steel 1mm:  ₹0.10/mm
Mild Steel 3mm:  ₹0.10/mm
Mild Steel 10mm: ₹0.10/mm

// But the system SUPPORTS different pricing per thickness:
material.pricing = [
  { thickness: 1, pricePerMm: 0.08 },   // Thinner = cheaper per mm
  { thickness: 3, pricePerMm: 0.10 },
  { thickness: 10, pricePerMm: 0.15 }   // Thicker = more expensive per mm
]
```

### 4. **GST Separation is Critical**
- Laser Cutting: 12% GST (manufacturing service)
- CAD Services: 18% GST (professional service)
- Shipping: 18% GST (logistics service)
- Discounts/loyalty are applied to ex-GST amounts, then GST recalculated
- This ensures correct tax accounting

### 5. **Frontend Controls Pricing**
- Backend stores materials pricing (price_per_mm, thicknesses, density)
- Frontend calculates order price based on cutting length
- Backend trusts frontend calculation
- No server-side recalculation at order creation

### 6. **Shipping is Calculated Separately**
- Based on total weight (calculated from dimensions × thickness × material density)
- State-based shipping rates (e.g., Karnataka, Tamil Nadu, etc.)
- Free shipping thresholds (e.g., 2kg free in Karnataka)
- Bulk discount (5% off shipping for 5kg+)
- Shipping has its own 18% GST

---

## 🐛 Recent Bug Fixes

### **Closed Polyline Bug (Feb 2026)**
**Problem:**
- DXF parser wasn't checking the "closed" flag (group code 70)
- Missing closing segment from last vertex back to first vertex
- Cutting lengths showing ~50% of actual value (e.g., 9,709mm vs 18,255mm)

**Fix:**
```typescript
// Check for closed flag
if (code === '70') {
  const flags = parseInt(value);
  polyData.closed = (flags & 1) === 1; // Bit 0 = closed
}

// Add closing segment if closed
if (polyData.closed && polyData.vertices.length > 2) {
  const lastV = polyData.vertices[polyData.vertices.length - 1];
  const firstV = polyData.vertices[0];
  const closingLength = Math.sqrt(
    Math.pow(firstV.x - lastV.x, 2) + 
    Math.pow(firstV.y - lastV.y, 2)
  );
  totalLength += closingLength;
}
```

**Impact:**
- Fixed pricing for all closed shapes (rectangles, polygons, closed paths)
- Added support for SPLINE and ELLIPSE entities
- Implemented safeguard modal when cutting length = 0

---

## 📊 Example Pricing Scenarios

### **Scenario 1: Small Part (Below Minimum)**
```
DXF File: Small bracket
Cutting Length: 455 mm
Material: Mild Steel 3mm
Price Per MM: ₹0.10/mm
Quantity: 1

Calculation:
  Base Price = 455 × 0.10 = ₹45.50
  Apply Minimum = max(₹45.50 × 1, ₹100) = ₹100.00
  
Final Price: ₹100.00 (minimum applied)
```

### **Scenario 2: Small Part (Bulk Order)**
```
DXF File: Same small bracket
Cutting Length: 455 mm
Material: Mild Steel 3mm
Price Per MM: ₹0.10/mm
Quantity: 5

Calculation:
  Base Price = 455 × 0.10 = ₹45.50
  Apply Minimum = max(₹45.50 × 5, ₹100) = ₹227.50
  
Final Price: ₹227.50 (no minimum needed!)
Per Piece: ₹227.50 / 5 = ₹45.50
```

### **Scenario 3: Large Part**
```
DXF File: Complex panel
Cutting Length: 10,747.84 mm
Material: Mild Steel 3mm
Price Per MM: ₹0.10/mm
Quantity: 2

Calculation:
  Base Price = 10,747.84 × 0.10 = ₹1,074.78
  Apply Minimum = max(₹1,074.78 × 2, ₹100) = ₹2,149.56
  
Final Price: ₹2,149.56
```

### **Scenario 4: With Discount & Loyalty Points**
```
DXF File: Panel
Cutting Length: 10,747.84 mm
Material: Mild Steel 3mm (12% GST)
Price Per MM: ₹0.10/mm
Quantity: 1
Discount: 10% off
Loyalty Points: ₹5

Step-by-step:
1. Base Price (GST-incl): ₹1,074.78
2. Ex-GST: ₹1,074.78 / 1.12 = ₹959.63
3. Discount 10%: ₹959.63 × 0.10 = ₹95.96
4. After discount: ₹959.63 - ₹95.96 = ₹863.67
5. Loyalty: ₹863.67 - ₹5 = ₹858.67
6. GST 12%: ₹858.67 × 0.12 = ₹103.04
7. Subtotal: ₹858.67 + ₹103.04 = ₹961.71
8. Shipping (Karnataka, 1.5kg): ₹276.00 (incl. 18% GST)
9. FINAL TOTAL: ₹1,237.71
```

### **Scenario 5: Mixed Cart**
```
Cart Item 1:
  Material: Mild Steel 3mm (12% GST)
  Cutting Length: 455 mm
  Price Per MM: ₹0.10/mm
  Quantity: 2
  Item Price: max(₹45.50 × 2, ₹100) = ₹100.00

Cart Item 2:
  Material: Aluminum 5mm (12% GST)
  Cutting Length: 2,500 mm
  Price Per MM: ₹0.12/mm
  Quantity: 1
  Item Price: max(₹300.00 × 1, ₹100) = ₹300.00

Cart Totals:
  Laser Cutting Total (GST-incl): ₹400.00
  Ex-GST: ₹400.00 / 1.12 = ₹357.14
  GST 12%: ₹42.86
  
With 10% discount (applied to first item only):
  First item ex-GST: ₹100 / 1.12 = ₹89.29
  Discount: ₹89.29 × 0.10 = ₹8.93
  After discount: ₹89.29 - ₹8.93 = ₹80.36
  New GST: ₹80.36 × 0.12 = ₹9.64
  New item 1 total: ₹90.00
  
Cart Total: ₹90.00 + ₹300.00 = ₹390.00
```

---

## 🔐 Security & Validation

### **Frontend Validation**
- Cutting length must be > 0 (safeguard modal if 0)
- Quantity must be 1-999
- Material and thickness must be valid selections
- Price calculations are transparent in UI

### **Backend Validation**
- Stores order as received from frontend
- No price recalculation (trusts frontend)
- Validates user authentication
- Validates file upload and storage
- Sends confirmation emails with order details

### **Potential Improvements**
1. ⚠️ Backend should validate price calculation for security
2. ⚠️ Implement server-side price verification using stored cutting length
3. ⚠️ Add price audit logs for admin review
4. ⚠️ Implement price caps or anomaly detection

---

## 📝 Notes for Developers

### **When Adding New Materials:**
1. Add to `/supabase/functions/server/index.tsx` default materials (line 1502)
2. Specify: id, name, category, pricePerMm, thicknesses array, density
3. Frontend automatically converts to pricing array format
4. Material appears in MaterialScreen after refresh

### **When Changing Pricing:**
1. Update `price_per_mm` in materials table
2. Or use new pricing array format with different rates per thickness
3. No code changes needed - pricing is data-driven

### **When Debugging Pricing Issues:**
1. Check DXF parser cutting length (use console.log in parseDXF)
2. Verify material pricing in MaterialScreen
3. Check ThicknessScreen calculated price
4. Inspect SummaryScreen quantity × price logic
5. Review CheckoutScreen sessionStorage 'orderPricing'
6. Check backend order record for stored price

### **Testing Checklist:**
- [ ] Small part (below ₹100) → shows ₹100
- [ ] Small part × 3 → shows ₹100+ (no minimum)
- [ ] Large part → shows correct price
- [ ] Discount code → reduces price correctly
- [ ] Loyalty points → max 50% of order
- [ ] Shipping → calculated based on weight/state
- [ ] GST separation → 12% laser, 18% CAD
- [ ] Cart with multiple items → each item has ₹100 min
- [ ] Closed polylines → cutting length includes closing segment

---

## 🎯 Conclusion

The pricing system is **data-driven** and **transparent**, with calculations happening at multiple stages:

1. **DXF Parser** extracts cutting length (foundation)
2. **Thickness Screen** calculates base price (cutting length × rate)
3. **Summary Screen** applies quantity and ₹100 minimum
4. **Cart Screen** manages multiple items with per-item minimums
5. **Checkout Screen** applies discounts, loyalty, GST, and shipping
6. **Backend** stores the final price without recalculation

The ₹100 minimum is applied **after quantity multiplication**, allowing bulk orders to exceed the minimum and get better per-piece pricing.

All prices are **GST-inclusive** by default, with separate accounting for 12% (laser cutting) and 18% (CAD services) GST rates.

---

**Last Updated:** February 23, 2026  
**Author:** Sheetcutters.com Development Team  
**Version:** 1.0
