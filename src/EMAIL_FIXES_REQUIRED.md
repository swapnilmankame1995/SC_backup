# Email Template Fixes Required

## 1. Logo Fix - Replace in ALL email templates

### Find and Replace:
**Find this:**
```html
<div class="logo">SHEET<span class="logo-accent">CUTTERS</span></div>
```

**Replace with:**
```html
<div class="logo"><span class="logo-sheet">Sheet</span><span class="logo-cutters">Cutters</span></div>
```

**Files affected:** `/supabase/functions/server/email-service.tsx`  
**Locations:** Every email template (7 locations total)

---

## 2. Add Threshold Pricing Notice to Order Confirmation Email

### In the `sendOrderConfirmationEmail` function, add this HTML after the order details table:

```html
<div style="background-color: #fff9e6; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
  <p style="margin: 0; color: #856404; font-size: 14px;">
    <strong>ℹ️ Minimum Order Notice:</strong> We have a ₹100 minimum order value for laser cutting services. 
    If your calculated order total is below ₹100, we automatically adjust it to meet this minimum threshold to ensure quality production standards.
  </p>
</div>
```

**Insert location:** Right after the closing `</div>` of the "Order Details" table, before the "Delivery Address" section.

---

## Quick Steps:

1. Open `/supabase/functions/server/email-service.tsx`
2. Use Find & Replace (Ctrl+H or Cmd+H) to replace all 7 logo instances
3. Scroll to `sendOrderConfirmationEmail` function (around line 168)
4. Add the threshold notice HTML after the order details table
5. Save the file

The email styles are already correctly configured with:
- `.logo-sheet` - Arial, bold, white
- `.logo-cutters` - Brush Script MT, cursive, italic, red (#dc0000)

---

## Result:

Emails will now display:
- **Logo:** "Sheet" in bold white + "Cutters" in red cursive
- **Order Confirmation:** Will include a clear explanation about the ₹100 minimum threshold
