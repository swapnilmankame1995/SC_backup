# Visual Replacement Guide - Step by Step

## 📧 Email Logo Fix (2 minutes)

### Step 1: Open the file
```
/supabase/functions/server/email-service.tsx
```

### Step 2: Press Ctrl+H (Windows/Linux) or Cmd+H (Mac)

### Step 3: Copy-paste into Find box:
```html
<div class="logo">SHEET<span class="logo-accent">CUTTERS</span></div>
```

### Step 4: Copy-paste into Replace box:
```html
<div class="logo"><span class="logo-sheet">Sheet</span><span class="logo-cutters">Cutters</span></div>
```

### Step 5: Click "Replace All" (should say "7 replacements made")

### Step 6: Save the file ✓

---

## 📝 Email Threshold Notice (3 minutes)

### Still in: `/supabase/functions/server/email-service.tsx`

### Step 1: Press Ctrl+F (or Cmd+F) and search for:
```
Delivery Address
```

### Step 2: You'll find this around line 267:
```html
          </div>

          <div class="details-box">
            <h3 style="margin-top: 0;">Delivery Address</h3>
```

### Step 3: Place your cursor RIGHT BEFORE `<div class="details-box">` on that line

### Step 4: Hit Enter to make a new line, then paste this:
```html
          <div style="background-color: #fff9e6; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>ℹ️ Minimum Order Notice:</strong> We have a ₹100 minimum order value for laser cutting services. 
              If your calculated order total is below ₹100, we automatically adjust it to meet this minimum threshold to ensure quality production standards.
            </p>
          </div>

```

### Step 5: Result should look like:
```html
          </div>

          <div style="background-color: #fff9e6; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>ℹ️ Minimum Order Notice:</strong> We have a ₹100 minimum order value for laser cutting services. 
              If your calculated order total is below ₹100, we automatically adjust it to meet this minimum threshold to ensure quality production standards.
            </p>
          </div>

          <div class="details-box">
            <h3 style="margin-top: 0;">Delivery Address</h3>
```

### Step 6: Save the file ✓

---

## 🎯 Frontend Changes (5 minutes)

### File: `/App.tsx`

### Change 1: Add state variable

**Find this section** (near the top, with other useState calls):
```typescript
const [price, setPrice] = useState<number | undefined>();
const [orderId, setOrderId] = useState('');
```

**Add this line right after:**
```typescript
const [originalSubtotal, setOriginalSubtotal] = useState<number | undefined>();
```

---

### Change 2: Track original subtotal in checkout

**Search for:** `handleCartCheckout` or wherever you call `/orders/batch`

**Look for code like this:**
```typescript
const orderData = {
  orders: cartItems,
  deliveryInfo,
  // ... other fields
};

const result = await apiCall('/orders/batch', {
  method: 'POST',
  body: JSON.stringify(orderData),
});
```

**Add this RIGHT BEFORE the apiCall:**
```typescript
// Calculate and save original subtotal (before server applies ₹100 minimum)
const rawTotal = cartItems.reduce((sum, item) => {
  const itemTotal = (item.price || 0) * (item.quantity || 1);
  return sum + itemTotal;
}, 0);
setOriginalSubtotal(rawTotal);
console.log('📊 Original subtotal:', rawTotal); // Helpful for debugging
```

---

### Change 3: Update FinalScreen call

**Search for:** `<FinalScreen`

**You'll find something like:**
```typescript
case 'final':
  return (
    <Suspense fallback={<LoadingFallback />}>
      <FinalScreen
        orderId={orderId}
        price={price}
        onStartNew={handleResetOrder}
        onViewOrders={handleViewOrders}
      />
    </Suspense>
  );
```

**Update to:**
```typescript
case 'final':
  return (
    <Suspense fallback={<LoadingFallback />}>
      <FinalScreen
        orderId={orderId}
        price={price}
        subtotal={originalSubtotal}
        wasAdjusted={price !== undefined && originalSubtotal !== undefined && price >= 100 && originalSubtotal < 100}
        onStartNew={handleResetOrder}
        onViewOrders={handleViewOrders}
      />
    </Suspense>
  );
```

---

## ✅ Testing Your Changes

### Test 1: Email Logo
1. Complete an order
2. Check the email you receive
3. Logo should show: **Sheet**_Cutters_ (Cutters in red cursive)

### Test 2: Email Threshold Notice
1. Place an order with total < ₹100
2. Check the order confirmation email
3. Should see yellow box with "Minimum Order Notice"

### Test 3: Order Confirmed Screen
1. Place an order with total < ₹100 (like ₹39.48)
2. On the "Order Confirmed" screen, you should see:
   - Calculated Amount: ~~₹39.48~~ (crossed out)
   - Total Amount: ₹100.00
   - Yellow box explaining ₹100 minimum applied

### Test 4: Order Over ₹100
1. Place an order with total > ₹100 (like ₹150)
2. Should NOT see the "calculated amount" line
3. Should NOT see the yellow threshold box
4. Just shows: Total Amount: ₹150.00

---

## 🎨 What Each Fix Does

| Fix | What It Changes | Why |
|-----|----------------|-----|
| **Logo Replacement** | Changes "SHEETCUTTERS" to "Sheet**Cutters**" | Makes "Cutters" appear in red Brush Script MT cursive font, matching your brand |
| **Threshold Notice** | Adds yellow info box to emails | Explains to customers why their ₹39 order became ₹100 |
| **FinalScreen Data** | Passes original amount to screen | Shows customers the calculation transparently |

---

## 🚨 Common Mistakes to Avoid

❌ **Don't** modify the server's threshold calculation (it's already correct)  
✅ **Do** just track the original amount before sending to server

❌ **Don't** copy the Find & Replace text with extra spaces  
✅ **Do** copy exactly as shown (no leading/trailing spaces)

❌ **Don't** forget to save files after editing  
✅ **Do** save immediately after each change

❌ **Don't** skip testing with a real order  
✅ **Do** test with both <₹100 and >₹100 orders

---

## 💾 Backup Reminder

Before making changes:
1. Commit your current code to git
2. Or make a backup copy of:
   - `/supabase/functions/server/email-service.tsx`
   - `/App.tsx`

This way you can easily revert if needed!

---

## 🎉 When You're Done

All three fixes should take about 10 minutes total:
- ✅ Email logo shows "Sheet**Cutters**" in correct styling
- ✅ Order confirmation emails explain ₹100 minimum
- ✅ Order confirmed screen shows price breakdown

Your customers will now have complete transparency about the minimum order threshold!
