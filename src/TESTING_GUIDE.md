# 🧪 Testing Guide - New Pricing Formula

## 🎯 **What to Test**

### **Test 1: Admin Panel - Pricing Settings**
1. Login as admin
2. Go to **Admin Panel → Materials**
3. Scroll down to **"Pricing Settings"** card
4. You should see:
   - Setup Cost input (default: ₹100)
   - Profit Margin input (default: 40%)
   - Thickness Multiplier Table with 5 rows

**Expected Result:** ✅ All fields are editable and save button works

---

### **Test 2: Material Price Per Sq Ft**
1. In Admin Panel → Materials
2. Click "Edit" on any material (e.g., Mild Steel)
3. Look for **"Price per Sq Ft (₹/sq ft)"** input field
4. Enter a value (e.g., 50)
5. Click "Save"

**Expected Result:** ✅ Material saves with price_per_sqf value

---

### **Test 3: Pricing Calculation with Console Logs**
1. Open browser **Developer Console** (F12)
2. Upload a DXF file
3. Select a material (e.g., Mild Steel)
4. Select a thickness (e.g., 5mm)
5. Watch the console logs

**Expected Console Output:**
```
🧮 ===== PRICING CALCULATION START =====
📊 Inputs: { material: "Mild Steel", thickness: "5mm", quantity: 1, ... }
📐 STEP 1: Area = 0.1234 sq ft
💰 STEP 2: Material rate = ₹50/sq ft
💵 STEP 3: Material cost = 0.1234 × ₹50 = ₹6.17
📏 STEP 4: Cutting length = 1.234 meters
⚡ STEP 5: Laser rate = ₹0.10/mm × 1000 = ₹100/meter
✅ Thickness 5mm matched: 4-5mm (multiplier: 1.4)  ← CHECK THIS!
🔧 STEP 6: Thickness multiplier = 1.4 (from table lookup)
✂️ STEP 7: Cutting cost = 1.234 × ₹100 × 1.4 = ₹172.76
🔧 STEP 8: Setup cost = ₹100
📊 STEP 9: Final price = ₹6.17 + ₹172.76 + ₹100 = ₹278.93
💸 STEP 10: Selling price = ₹278.93 × (1 + 0.4) × 1 = ₹390.50
🧮 ===== PRICING CALCULATION END =====
```

**Key Things to Verify:**
- ✅ Thickness lookup shows correct multiplier
- ✅ Material cost uses price_per_sqf
- ✅ Cutting cost includes multiplier
- ✅ Setup cost is applied
- ✅ Profit margin is applied

---

### **Test 4: Thickness Multiplier Lookup**

Test different thicknesses to verify the table works:

| Thickness | Expected Match | Expected Multiplier |
|-----------|----------------|---------------------|
| 2mm       | 2-3mm          | 1.0                 |
| 3mm       | 2-3mm          | 1.0                 |
| 4mm       | 4-5mm          | 1.4                 |
| 5mm       | 4-5mm          | 1.4                 |
| 6mm       | 6mm            | 1.8                 |
| 8mm       | 8mm            | 2.5                 |
| 12mm      | 12mm+          | 3.0                 |
| 20mm      | 12mm+          | 3.0                 |
| 1mm       | (no match)     | 1.0 (default)       |

**How to Test:**
1. Select each thickness in the UI
2. Check console log for: `✅ Thickness Xmm matched: ...`
3. Verify the multiplier matches the table

---

### **Test 5: Edit Thickness Multipliers**
1. Admin Panel → Materials → Pricing Settings
2. Change the multiplier for "4-5mm" from 1.4 to **2.0**
3. Click "Save Pricing Settings"
4. Upload a DXF, select 5mm thickness
5. Check console - should now show:
   ```
   ✅ Thickness 5mm matched: 4-5mm (multiplier: 2.0)
   ```

**Expected Result:** ✅ New multiplier is used in calculations

---

### **Test 6: Add New Thickness Range**
1. Admin Panel → Materials → Pricing Settings
2. Click "Add Row" button
3. Enter:
   - Label: "1mm"
   - Min: 1
   - Max: 1
   - Multiplier: 0.8
4. Click "Save Pricing Settings"
5. Test with 1mm thickness

**Expected Result:** ✅ 1mm now uses 0.8 multiplier instead of default 1.0

---

### **Test 7: End-to-End Order Flow**
1. Upload DXF file
2. Select material with price_per_sqf set
3. Select thickness (e.g., 5mm)
4. Review price (should use new formula)
5. Set quantity = 2
6. Add to cart
7. Proceed to checkout

**Verify at each step:**
- ✅ Price updates correctly
- ✅ Quantity multiplication works
- ✅ Cart total is accurate
- ✅ Checkout total matches

---

## 🐛 **Common Issues & Solutions**

### **Issue 1: Console shows "using default multiplier: 1.0"**
**Cause:** Thickness not in table  
**Solution:** Add that thickness range in Pricing Settings

### **Issue 2: Material cost is always ₹1**
**Cause:** `price_per_sqf` not set for material  
**Solution:** Edit material and add price per sq ft value

### **Issue 3: Prices seem too low/high**
**Cause:** Profit margin or setup cost not configured  
**Solution:** Check Pricing Settings and adjust values

### **Issue 4: Thickness multiplier not updating**
**Cause:** Browser cache or pricing constants not saved  
**Solution:** 
1. Hard refresh (Ctrl+Shift+R)
2. Check backend logs for successful save
3. Verify KV store has updated values

---

## 📊 **Sample Calculation Breakdown**

For a **100mm × 100mm part in 5mm Mild Steel**:

```
Given:
- Width: 100mm, Height: 100mm
- Cutting Length: 400mm (perimeter)
- Material: Mild Steel
- Thickness: 5mm
- Price per mm: ₹0.10
- Price per sq ft: ₹50
- Setup Cost: ₹100
- Profit Margin: 40%
- Thickness Multiplier (5mm): 1.4

Step 1: Area
  100mm × 100mm = 10,000 mm²
  10,000 ÷ (304.8²) = 0.1076 sq ft

Step 2: Material Cost
  0.1076 sq ft × ₹50/sq ft = ₹5.38

Step 3: Cutting Length
  400mm ÷ 1000 = 0.4 meters

Step 4: Cutting Cost
  0.4m × (₹0.10/mm × 1000) × 1.4
  = 0.4m × ₹100/m × 1.4
  = ₹56.00

Step 5: Final Price (before margin)
  ₹5.38 + ₹56.00 + ₹100 = ₹161.38

Step 6: Selling Price
  ₹161.38 × (1 + 0.40) = ₹225.93

✅ Customer pays: ₹225.93
```

---

## ✅ **Success Checklist**

- [ ] Pricing Settings card visible in Admin Panel
- [ ] Can edit Setup Cost and Profit Margin
- [ ] Can edit/add/remove thickness multiplier rows
- [ ] Materials have "Price per Sq Ft" field
- [ ] Console logs show detailed calculation steps
- [ ] Thickness multiplier lookup works correctly
- [ ] Prices change when editing multipliers
- [ ] End-to-end order flow completes successfully
- [ ] Cart calculations are accurate
- [ ] Checkout totals match expectations

---

## 🎓 **Understanding the Console Logs**

When you see this in console:
```
✅ Thickness 5mm matched: 4-5mm (multiplier: 1.4)
```

**This means:**
1. User selected 5mm thickness
2. System searched the multiplier table
3. Found that 5mm falls between 4mm and 5mm
4. Retrieved multiplier value: 1.4
5. Applied 1.4x to cutting cost

**The multiplier directly affects pricing:**
- No multiplier (1.0) → Normal cutting cost
- 1.4x multiplier → 40% more expensive
- 2.5x multiplier → 150% more expensive

This makes thicker materials more expensive to cut, which is correct!
