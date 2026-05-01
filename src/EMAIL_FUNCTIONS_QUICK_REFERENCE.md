# Email Functions Quick Reference

All email functions are in `/supabase/functions/server/email-service.tsx`

## 📧 Available Email Functions

### 1. Order Confirmation Email

```typescript
await sendOrderConfirmationEmail({
  email: string,                    // Customer email
  orderNumber: string,              // e.g., "SC-2025-0000123"
  customerName: string,             // Customer's name
  items: Array<{                    // Order items
    fileName?: string,              // File name or description
    material: string,               // Material name
    thickness: number,              // Thickness in mm
    quantity: number,               // Quantity
    price: number,                  // Item total (price × qty)
  }>,
  subtotal: number,                 // Subtotal before shipping/discounts
  shippingCost: number,             // Shipping cost
  discount?: number,                // Discount amount (optional)
  pointsUsed?: number,              // Loyalty points used (optional)
  total: number,                    // Final total
  deliveryAddress: {                // Delivery address
    address: string,
    apartment?: string,
    city: string,
    state: string,
    pinCode: string,
  },
});
```

**When to use:** Immediately after order creation  
**Currently integrated:** ✅ Yes - in `/orders/batch` route

---

### 2. Order Status Update Email

```typescript
await sendOrderStatusUpdateEmail({
  email: string,                              // Customer email
  orderNumber: string,                        // Order number
  customerName: string,                       // Customer's name
  status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled',
  trackingUrl?: string,                       // Tracking URL (optional)
  trackingNumber?: string,                    // Tracking number (optional)
  carrier?: string,                           // Shipping carrier (optional)
});
```

**When to use:** When admin updates order status  
**Currently integrated:** ⏳ Needs integration in admin order update routes

**Routes that need this:**
- `/make-server-8927474f/admin/orders/bulk` (line 1723)
- `/make-server-8927474f/admin/orders/:id` (line 1770)
- `/make-server-8927474f/admin/orders/:id/status` (line 1825)

---

### 3. Affiliate Welcome Email

```typescript
await sendAffiliateWelcomeEmail({
  email: string,                    // Affiliate email
  name: string,                     // Affiliate name
  discountCode: string,             // Their unique discount code
  commissionPercentage: number,     // Commission % (e.g., 10)
  referralLink: string,             // Referral URL
});
```

**When to use:** When affiliate account is approved  
**Currently integrated:** ⏳ Needs integration in affiliate approval flow

---

### 4. Affiliate Commission Notification Email

```typescript
await sendAffiliateCommissionEmail({
  email: string,                    // Affiliate email
  affiliateName: string,            // Affiliate name
  orderNumber: string,              // Order that earned commission
  customerEmail: string,            // Customer who used code
  orderValue: number,               // Order value
  commission: number,               // Commission earned
  totalEarnings: number,            // Total earnings to date
});
```

**When to use:** When a customer uses affiliate code (order creation)  
**Currently integrated:** ⏳ Needs integration in batch order route

---

### 5. Contact Form Email (to Admin)

```typescript
await sendContactFormEmail({
  adminEmail: string,               // Admin email (support@sheetcutters.com)
  customerName: string,             // Customer name
  customerEmail: string,            // Customer email
  customerPhone?: string,           // Customer phone (optional)
  subject: string,                  // Message subject
  message: string,                  // Message body
});
```

**When to use:** When customer submits contact form  
**Currently integrated:** ⏳ Needs contact form route creation

---

### 6. Password Reset Email

```typescript
await sendPasswordResetEmail({
  email: string,                    // User email
  resetLink: string,                // Password reset URL from Supabase
  expiryMinutes?: number,           // Link expiry (default: 60)
});
```

**When to use:** When user requests password reset  
**Currently integrated:** ⏳ Needs integration with Supabase auth

---

### 7. Quote Confirmation Email

```typescript
await sendQuoteConfirmationEmail({
  email: string,                    // Customer email
  customerName: string,             // Customer name
  quoteNumber: string,              // Quote/order number
  description: string,              // Service description
  estimatedPrice?: number,          // Estimated price (optional)
  sketchFiles?: string[],           // Uploaded file names (optional)
  notes?: string,                   // Additional notes (optional)
});
```

**When to use:** When customer submits sketch service request  
**Currently integrated:** ⏳ Can be added to `/create-sketch-order` route

---

### 8. Legacy Email Function (Basic HTML)

```typescript
await sendEmail(
  to: string,                       // Recipient email
  subject: string,                  // Email subject
  html: string                      // HTML content
);
```

**When to use:** For custom emails not covered by templates  
**Currently integrated:** ✅ Yes - used in existing routes

---

## 🎨 Email Design Features

All emails include:
- ✅ Black header with SHEETCUTTERS branding
- ✅ Red accent color (#dc0000)
- ✅ Professional typography
- ✅ Mobile-responsive design
- ✅ Clear call-to-action buttons
- ✅ Footer with contact information
- ✅ Consistent styling across all templates

---

## 💡 Usage Examples

### Example 1: Send Order Confirmation After Batch Order

```typescript
// After creating orders in batch
const customerEmail = deliveryInfo?.email || userData?.email || user.email;

if (customerEmail) {
  const emailItems = orders.map((item: any) => ({
    fileName: item.fileName || 'Custom Design',
    material: item.material?.name || 'N/A',
    thickness: item.thickness || 0,
    quantity: item.quantity || 1,
    price: (item.price || 0) * (item.quantity || 1),
  }));
  
  await sendOrderConfirmationEmail({
    email: customerEmail,
    orderNumber: batchOrderNumber,
    customerName: customerName,
    items: emailItems,
    subtotal: totalBatchPrice,
    shippingCost: shippingCost || 0,
    pointsUsed: pointsUsed || 0,
    total: totalBatchPrice + (shippingCost || 0),
    deliveryAddress: {
      address: deliveryInfo?.address || '',
      apartment: deliveryInfo?.apartment,
      city: deliveryInfo?.city || '',
      state: deliveryInfo?.state || '',
      pinCode: deliveryInfo?.pinCode || '',
    },
  });
}
```

### Example 2: Send Status Update When Order Ships

```typescript
// When admin updates order status to "shipped"
const orderUser = await kv.get(`user:${order.userId}`);
const customerEmail = order.deliveryInfo?.email || orderUser?.email;
const customerName = order.deliveryInfo?.name || orderUser?.name || 'Customer';

if (customerEmail) {
  await sendOrderStatusUpdateEmail({
    email: customerEmail,
    orderNumber: order.orderNumber,
    customerName: customerName,
    status: 'shipped',
    trackingUrl: 'https://tracking.bluedart.com/track/BD123456789',
    trackingNumber: 'BD123456789',
    carrier: 'Blue Dart',
  });
}
```

### Example 3: Notify Affiliate of Commission

```typescript
// When processing batch order with affiliate code
if (discountAffiliate) {
  const commission = (totalBatchPrice * discountAffiliate.commissionPercentage) / 100;
  
  await sendAffiliateCommissionEmail({
    email: discountAffiliate.email,
    affiliateName: discountAffiliate.name,
    orderNumber: batchOrderNumber,
    customerEmail: customerEmail,
    orderValue: totalBatchPrice,
    commission: commission,
    totalEarnings: (discountAffiliate.totalCommission || 0) + commission,
  });
}
```

### Example 4: Send Welcome Email to New Affiliate

```typescript
// When approving new affiliate
await sendAffiliateWelcomeEmail({
  email: affiliate.email,
  name: affiliate.name,
  discountCode: affiliate.discountCode,
  commissionPercentage: affiliate.commissionPercentage || 10,
  referralLink: `https://sheetcutters.com?ref=${affiliate.discountCode}`,
});
```

---

## 🔧 Error Handling

All email functions return a Promise. Always use try-catch or .catch():

```typescript
// Option 1: Try-catch (recommended for critical emails)
try {
  await sendOrderConfirmationEmail({...});
  console.log('✅ Email sent successfully');
} catch (error) {
  console.error('❌ Failed to send email:', error);
  // Don't fail the order if email fails
}

// Option 2: .catch() (for fire-and-forget)
sendOrderStatusUpdateEmail({...})
  .catch(err => console.error('Email error:', err));
```

---

## 📊 Email Sending Best Practices

1. **Always validate email address** before sending
2. **Don't fail operations** if email fails (use try-catch)
3. **Log errors** for debugging
4. **Use fire-and-forget** for non-critical emails
5. **Test with real email addresses** before production
6. **Monitor Resend dashboard** for delivery status

---

## 🚨 Common Pitfalls

❌ **Don't:**
- Send emails without validating the address
- Block order creation if email fails
- Send emails synchronously without error handling
- Use hardcoded email addresses

✅ **Do:**
- Validate email format
- Use try-catch or .catch()
- Log all email attempts
- Use variables for email addresses
- Test thoroughly before production

---

## 📈 Monitoring Email Delivery

### Check Resend Dashboard
1. Go to [resend.com/emails](https://resend.com/emails)
2. See all sent emails
3. Check delivery status
4. View open rates (if tracking enabled)
5. Monitor bounces and complaints

### Check Server Logs
```bash
# Look for these log messages:
✅ Order confirmation email sent to user@example.com
❌ Failed to send order confirmation email: [error]
```

### Common Log Messages
- `✅ Order confirmation email sent to [email]` - Success!
- `✅ Order status update email sent to [email]` - Success!
- `❌ Failed to send email:` - Check error details
- `⚠️ No email address provided` - Missing customer email

---

## 🎯 Integration Checklist

### Order Emails
- [x] Order confirmation (batch orders) - **DONE**
- [ ] Order confirmation (single orders) - TODO
- [ ] Order confirmation (sketch service) - TODO
- [ ] Order status updates (bulk update) - TODO
- [ ] Order status updates (single update) - TODO
- [ ] Order status updates (dedicated route) - TODO

### Affiliate Emails
- [ ] Affiliate welcome email - TODO
- [ ] Affiliate commission notification - TODO

### Other Emails
- [ ] Contact form submission - TODO (needs route)
- [ ] Password reset - TODO (needs Supabase integration)
- [ ] Quote confirmation - TODO (sketch service)

---

## 🔗 Related Files

- **Email Service:** `/supabase/functions/server/email-service.tsx`
- **Server Routes:** `/supabase/functions/server/index.tsx`
- **Setup Guide:** `/RESEND_EMAIL_INTEGRATION.md`

---

**Last Updated:** December 3, 2025
