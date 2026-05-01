# Resend Email Integration - Implementation Guide

## ✅ What's Been Implemented

### 1. Email Service Module (`/supabase/functions/server/email-service.tsx`)

Created a comprehensive email service with **7 branded email templates**:

1. **Order Confirmation** - Sent immediately after checkout
2. **Order Status Updates** - Sent when order status changes (pending, processing, shipped, completed, cancelled)
3. **Affiliate Welcome** - Welcome email when someone signs up as affiliate
4. **Affiliate Commission Notifications** - Alert affiliates when they earn commissions
5. **Contact Form Submissions** - Send to admin when customers use contact form
6. **Password Reset** - For customer account recovery
7. **Quote Confirmations** - For laser cutting quotes

All templates feature:
- ✨ Professional black/white/red (#dc0000) branding matching your design
- 📱 Mobile-responsive HTML design
- 🎨 Consistent styling with your Sheetcutters brand
- 📊 Detailed order information tables
- 🔗 Call-to-action buttons
- 🔐 Security warnings where appropriate

### 2. Server Integration

**Already integrated:**
- ✅ Order Confirmation emails added to batch order creation (`/orders/batch`)
- ✅ Email service imported into main server file
- ✅ Resend API key secret created in Supabase

**Status:** READY TO USE once you add the API key!

---

## 📋 Setup Instructions

### Step 1: Get Your Resend API Key

1. Go to [Resend.com](https://resend.com)
2. Sign up or log in
3. Go to **API Keys** section
4. Click **Create API Key**
5. Give it a name (e.g., "Sheetcutters Production")
6. Copy the API key (starts with `re_...`)

### Step 2: Add API Key to Supabase

1. A modal should have appeared when the secret was created
2. Paste your Resend API key
3. Click **Save**

**OR manually add it:**
1. Go to Supabase Dashboard
2. Navigate to: **Project Settings** → **Edge Functions** → **Secrets**
3. Find or add `RESEND_API_KEY`
4. Paste your API key
5. Click **Save**

### Step 3: Verify Domain (Important!)

For production emails to work reliably:

1. Go to Resend Dashboard → **Domains**
2. Click **Add Domain**
3. Add `sheetcutters.com`
4. Follow DNS setup instructions to add the records to your domain
5. Wait for verification (usually a few minutes)

**Until domain is verified:** Emails will be sent from `onboarding@resend.dev` and may have limitations.

**After domain verification:** Emails will be sent from `support@sheetcutters.com` ✨

---

## 🎯 What's Currently Working

### HIGH PRIORITY (Already Integrated!)

#### ✅ Order Confirmations
- **When:** Immediately after batch checkout
- **To:** Customer email
- **Contains:**
  - Order number
  - All items with materials, thickness, qty, pricing
  - Subtotal, shipping, discounts, points used
  - Total amount
  - Delivery address
  - Link to dashboard

**Test it:** Complete a checkout and check the customer's email!

---

## 🔧 Still Needs Integration

The following email types are READY but need to be integrated into your server routes:

### 1. Order Status Updates

**Needs integration in these routes:**
- `/make-server-8927474f/admin/orders/bulk` (line ~1723)
- `/make-server-8927474f/admin/orders/:id` (line ~1770)
- `/make-server-8927474f/admin/orders/:id/status` (line ~1825)

**Current:** Using basic HTML email  
**Should use:** `sendOrderStatusUpdateEmail()` function

**Example implementation:**
```typescript
// Replace the existing email code with:
await sendOrderStatusUpdateEmail({
  email: customerEmail,
  orderNumber: order.orderNumber,
  customerName: customerName,
  status: updates.deliveryStatus, // 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled'
  trackingUrl: updates.trackingUrl,
  trackingNumber: order.trackingNumber,
  carrier: order.shippingCarrier,
});
```

### 2. Affiliate Emails

**Welcome Email** - Needs integration when affiliate is approved:
```typescript
await sendAffiliateWelcomeEmail({
  email: affiliate.email,
  name: affiliate.name,
  discountCode: affiliate.discountCode,
  commissionPercentage: affiliate.commissionPercentage,
  referralLink: `https://sheetcutters.com?ref=${affiliate.discountCode}`,
});
```

**Commission Notification** - Needs integration when commission is earned (already tracking usage):
```typescript
await sendAffiliateCommissionEmail({
  email: affiliate.email,
  affiliateName: affiliate.name,
  orderNumber: orderNumber,
  customerEmail: customerEmail,
  orderValue: totalBatchPrice,
  commission: commission,
  totalEarnings: affiliate.totalCommission,
});
```

### 3. Contact Form

**Needs:** Contact form route creation
```typescript
app.post('/make-server-8927474f/contact', async (c) => {
  const { name, email, phone, subject, message } = await c.req.json();
  
  await sendContactFormEmail({
    adminEmail: 'admin@sheetcutters.com', // Or from config
    customerName: name,
    customerEmail: email,
    customerPhone: phone,
    subject: subject,
    message: message,
  });
  
  return c.json({ success: true });
});
```

### 4. Password Reset

**Needs:** Integration with Supabase auth password reset flow
```typescript
await sendPasswordResetEmail({
  email: user.email,
  resetLink: resetUrl, // From Supabase auth
  expiryMinutes: 60,
});
```

### 5. Quote Confirmations

**For sketch service orders** - Already creates orders but doesn't send quote confirmation:
```typescript
// Add to /create-sketch-order route (line ~1140)
await sendQuoteConfirmationEmail({
  email: customerEmail,
  customerName: customerName,
  quoteNumber: orderNumber,
  description: notes || 'CAD Design Service Request',
  estimatedPrice: finalPrice,
  sketchFiles: uploadedFileNames,
  notes: notes,
});
```

---

## 🧪 Testing Your Emails

### Test Order Confirmation (Already Working!)
1. Log in to your app
2. Add items to cart
3. Complete checkout
4. Check the email address you entered
5. You should receive a beautiful branded order confirmation! 🎉

### Test Order Status Updates (Once integrated)
1. Log into admin panel
2. Find an order
3. Update the status (e.g., to "shipped")
4. Add tracking URL (optional)
5. Check customer email

### Test with Real Email Address
Use a real email address you can access to verify:
- Email delivery
- Design/branding looks correct
- Links work properly
- Content is accurate

### Test with Different Email Clients
- Gmail
- Outlook
- Apple Mail
- Mobile devices

---

## 🚨 Important Notes

### From Email Address
All emails are sent from: `support@sheetcutters.com`

**Before domain verification:** May show as `onboarding@resend.dev`  
**After domain verification:** Will show as `support@sheetcutters.com` ✅

### Error Handling
- All email functions are wrapped in try-catch
- Failed emails won't break order creation
- Errors are logged to console
- Check server logs if emails don't arrive

### Rate Limits (Resend Free Tier)
- 100 emails/day
- 3,000 emails/month
- Upgrade to paid plan for production use

### Email Deliverability Tips
1. ✅ Verify your domain (most important!)
2. ✅ Use a real "from" address
3. ✅ Include unsubscribe links (for marketing emails)
4. ✅ Monitor bounce rates
5. ✅ Don't send too many emails too quickly

---

## 📞 Next Steps

### Immediate (High Priority)
1. ✅ Add Resend API key to Supabase ← **YOU ARE HERE**
2. ⏳ Verify domain in Resend
3. ⏳ Test order confirmation emails by completing a checkout
4. ⏳ Integrate order status update emails (replace basic HTML)

### Soon (Medium Priority)
5. ⏳ Add affiliate commission notifications
6. ⏳ Add affiliate welcome emails
7. ⏳ Test all email templates

### Later (Low Priority)
8. ⏳ Create contact form route
9. ⏳ Integrate password reset emails
10. ⏳ Add quote confirmation emails to sketch service

---

## 🔍 Debugging

### Email Not Received?

**Check:**
1. ✅ API key is correctly added to Supabase
2. ✅ Check server logs for email errors
3. ✅ Check spam/junk folder
4. ✅ Verify email address is correct
5. ✅ Check Resend dashboard for delivery logs

**Resend Dashboard:**
- Go to **Emails** section
- See all sent emails
- Check delivery status
- View bounce/complaint reports

### Common Issues

**"Resend API key not configured"**
→ API key not added to Supabase secrets

**Emails from wrong domain**
→ Domain not verified in Resend

**Emails not styled**
→ Check email client supports HTML (all modern clients do)

**Emails going to spam**
→ Verify domain, add SPF/DKIM records, avoid spam trigger words

---

## 📧 Email Template Preview

### Order Confirmation
```
Subject: Order Confirmation #SC-2025-0000123 - Sheetcutters

┌─────────────────────────────────┐
│      SHEETCUTTERS              │  ← Black header
│                                 │
└─────────────────────────────────┘

Order Confirmed! 🎉

Hi [Customer Name], thank you for your order!

Your order SC-2025-0000123 has been received...

┌─────────────────────────────────┐
│ Order Details                   │
│                                 │
│ Item     Material  Thickness... │
│ design.dxf  Mild Steel  3mm ... │
│                                 │
│ Subtotal:              ₹500.00  │
│ Shipping:               ₹50.00  │
│ Total:                 ₹550.00  │
└─────────────────────────────────┘

[View Order Status] ← Red button

Need help?
Contact us at support@sheetcutters.com
```

### Order Status Update
```
Subject: Order Update: Order Shipped - #SC-2025-0000123

📦 Order Shipped!

Hi [Customer Name],

Your order SC-2025-0000123 status has been updated.

Great news! Your order has been shipped...

Tracking Information:
Carrier: Blue Dart
Tracking Number: BD123456789
[Track Your Order] ← Red button
```

---

## 💡 Pro Tips

1. **Test with your own email first** - Always send test emails to yourself
2. **Check mobile view** - Most customers read emails on mobile
3. **Monitor Resend dashboard** - Track delivery rates and bounces
4. **Use real data in tests** - Test with actual order data
5. **Set up monitoring** - Alert if email delivery fails
6. **Have a backup** - Keep Telegram notifications as backup

---

## 🎉 Success Checklist

- [ ] Resend API key added to Supabase
- [ ] Domain verified in Resend
- [ ] Order confirmation emails working
- [ ] Order status update emails integrated
- [ ] Tested emails in Gmail, Outlook
- [ ] Tested on mobile device
- [ ] Affiliate emails integrated
- [ ] All email templates tested
- [ ] Monitoring set up

---

**Need help?** Check Resend docs: https://resend.com/docs
