# 📊 Thickness Multiplier Table - How It Works

## 🎯 **Purpose**
Thicker materials require **slower cutting speeds** and cause **more laser wear**, so they should cost more to cut per meter. The thickness multiplier (T_f) adjusts the cutting cost accordingly.

---

## 📋 **The Table Structure**

```
┌─────────────┬──────────────┬──────────────┬────────────┐
│ Label       │ Min (mm)     │ Max (mm)     │ Multiplier │
├─────────────┼──────────────┼──────────────┼────────────┤
│ 2-3mm       │ 2            │ 3            │ 1.0        │
│ 4-5mm       │ 4            │ 5            │ 1.4        │
│ 6mm         │ 6            │ 6            │ 1.8        │
│ 8mm         │ 8            │ 8            │ 2.5        │
│ 12mm+       │ 12           │ 999          │ 3.0        │
└─────────────┴──────────────┴──────────────┴────────────┘
```

---

## 🔍 **How It's Used in the Formula**

### **Step-by-Step:**

1. **User selects thickness:** e.g., `5mm`

2. **System looks up thickness in table:**
   ```javascript
   // File: /utils/pricing.ts, Line 164-175
   export function getThicknessMultiplier(
     thickness: number,
     multipliers: ThicknessMultiplier[]
   ): number {
     // Find matching range
     const match = multipliers.find(
       (m) => thickness >= m.minThickness && thickness <= m.maxThickness
     );
     
     // Return multiplier or default to 1.0
     return match ? match.multiplier : 1.0;
   }
   ```

3. **For thickness = 5mm:**
   - Checks: Is 5 between 2 and 3? ❌ No
   - Checks: Is 5 between 4 and 5? ✅ **YES!**
   - Returns: `multiplier = 1.4`

4. **Applied to formula (Line 266-271):**
   ```javascript
   // Get thickness multiplier
   const T_f = getThicknessMultiplier(thickness, constants.thicknessMultipliers);
   // T_f = 1.4
   
   // Calculate cutting cost
   const cuttingCost = L × R_l × T_f;
   //                 = (length in meters) × (₹ per meter) × 1.4
   ```

---

## 💡 **Example Calculation**

### **Scenario:**
- **Material:** Mild Steel
- **Thickness:** 5mm
- **Cutting Length:** 1000mm (1 meter)
- **Price per mm:** ₹0.10
- **Area:** 1 sq ft
- **Price per sq ft:** ₹50

### **Calculation:**

1. **Material Cost:**
   ```
   A × R_a = 1 sq ft × ₹50/sq ft = ₹50
   ```

2. **Cutting Cost (WITHOUT multiplier):**
   ```
   L × R_l = 1m × (₹0.10/mm × 1000) = 1m × ₹100/m = ₹100
   ```

3. **Cutting Cost (WITH multiplier for 5mm):**
   ```
   L × R_l × T_f = 1m × ₹100/m × 1.4 = ₹140
   
   💡 40% more expensive because 5mm is thicker!
   ```

4. **Final Price (before margin):**
   ```
   Material Cost + Cutting Cost + Setup Cost
   = ₹50 + ₹140 + ₹100 = ₹290
   ```

5. **Selling Price (40% margin):**
   ```
   ₹290 × (1 + 0.40) = ₹290 × 1.40 = ₹406
   ```

---

## 🔄 **Data Flow Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. ADMIN PANEL - Pricing Settings                          │
│    User edits thickness multiplier table                   │
│    Clicks "Save Pricing Settings"                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. BACKEND - POST /pricing-constants                       │
│    Saves table to KV store:                                │
│    kv.set('pricing_constants', {                           │
│      thicknessMultipliers: [                               │
│        { minThickness: 2, maxThickness: 3, multiplier: 1.0 }│
│        { minThickness: 4, maxThickness: 5, multiplier: 1.4 }│
│        ...                                                  │
│      ]                                                      │
│    })                                                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. CUSTOMER - Selects 5mm thickness                        │
│    ThicknessScreen.tsx calls calculateSimplePrice()        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. PRICING ENGINE - /utils/pricing.ts                     │
│                                                             │
│    a) Fetch pricing constants from backend:                │
│       getPricingConstants() → GET /pricing-constants       │
│                                                             │
│    b) Look up thickness multiplier:                        │
│       getThicknessMultiplier(5, multipliers)               │
│       → Finds: 5 is between 4 and 5                        │
│       → Returns: 1.4                                       │
│                                                             │
│    c) Apply to formula:                                    │
│       cuttingCost = L × R_l × 1.4                         │
│                                                             │
│    d) Return final selling price                           │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ **Verification - Is it correctly connected?**

### **YES! Here's the proof:**

1. **Admin saves table** → `/components/admin/PricingSettings.tsx:62`
   ```javascript
   await savePricingConstants(constants);
   ```

2. **Backend stores it** → `/supabase/functions/server/index.tsx:7982`
   ```javascript
   await kv.set('pricing_constants', updated);
   ```

3. **Frontend fetches it** → `/utils/pricing.ts:103-123`
   ```javascript
   export async function getPricingConstants() {
     const response = await fetch('/pricing-constants');
     return data.thicknessMultipliers; // ← Contains your table
   }
   ```

4. **Pricing uses it** → `/utils/pricing.ts:266`
   ```javascript
   const T_f = getThicknessMultiplier(thickness, constants.thicknessMultipliers);
   ```

5. **Applied to cost** → `/utils/pricing.ts:271`
   ```javascript
   const cuttingCost = L * R_l * T_f; // ← T_f is from YOUR table!
   ```

---

## 🎮 **Who Decides Which Multiplier to Use?**

### **Answer: The `getThicknessMultiplier()` function decides automatically**

**Logic:**
```javascript
// User selected: 5mm thickness
// Table rows:
//   Row 1: min=2, max=3, multiplier=1.0  → Is 5 between 2 and 3? NO
//   Row 2: min=4, max=5, multiplier=1.4  → Is 5 between 4 and 5? YES! ✅
//   Row 3: min=6, max=6, multiplier=1.8  → (stop searching, already found)
// 
// Result: Returns 1.4
```

**If no match found:** Returns default `1.0` (no multiplier effect)

---

## 🧪 **Test Cases**

| User Selects | Min | Max | Multiplier Used | Result |
|-------------|-----|-----|-----------------|--------|
| 2mm         | 2   | 3   | 1.0             | ✅ Matched |
| 2.5mm       | 2   | 3   | 1.0             | ✅ Matched |
| 3mm         | 2   | 3   | 1.0             | ✅ Matched |
| 4mm         | 4   | 5   | 1.4             | ✅ Matched |
| 5mm         | 4   | 5   | 1.4             | ✅ Matched |
| 6mm         | 6   | 6   | 1.8             | ✅ Matched |
| 8mm         | 8   | 8   | 2.5             | ✅ Matched |
| 12mm        | 12  | 999 | 3.0             | ✅ Matched |
| 20mm        | 12  | 999 | 3.0             | ✅ Matched |
| 1mm         | -   | -   | 1.0 (default)   | ⚠️ No match |

---

## 📝 **Summary**

✅ **Connection Verified:** Table → KV Store → Pricing Formula → Final Price  
✅ **Decision Logic:** Automatic range matching in `getThicknessMultiplier()`  
✅ **Application Point:** Cutting cost calculation (Line 271)  
✅ **User Control:** Fully editable in Admin Panel → Materials → Pricing Settings

**Bottom Line:** The thickness multiplier table you edit in the admin panel is **directly used** in the pricing formula. When a customer selects a thickness, the system automatically finds the matching row in your table and uses that multiplier to adjust the cutting cost.
