# Invoice Email Template - Sheetcutters

This document serves as the source template for invoice emails. Edit this file to update email content and structure.

---

## Email Configuration

### From
- **Sender Name:** Sheetcutters
- **Sender Email:** `{{FROM_EMAIL}}` (configured in Email Settings)

### Subject Line
```
Your Invoice from Sheetcutters - Order #{{ORDER_NUMBER}}
```

---

## Email Body (HTML)

### Greeting
```
Dear {{CUSTOMER_NAME}},
```

### Main Message
```
Thank you for your order with Sheetcutters! We appreciate your business.

Your invoice is ready and attached to this email as a PDF document.
```

### Order Summary Section
```
Order Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Invoice Number:     {{INVOICE_NUMBER}}
• Order Reference:    #{{ORDER_NUMBER}}
• Invoice Date:       {{INVOICE_DATE}}
• Total Amount:       ₹{{TOTAL_AMOUNT}}
• Payment Status:     {{PAYMENT_STATUS}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Order Items Summary (Optional)
```
Items Included:
• {{ITEM_COUNT}} laser cut part(s)
• Material: {{MATERIAL_NAMES}}
• Total Cutting Length: {{TOTAL_CUTTING_LENGTH}}m

{{#if DESIGN_SERVICE}}
• CAD Design Service: Included
{{/if}}

{{#if SHIPPING}}
• Shipping: {{SHIPPING_METHOD}}
{{/if}}
```

### Payment Information (if unpaid)
```
{{#if NOT_PAID}}
Payment Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bank Transfer:
• Account Name:    Sheetcutters
• Account Number:  {{ACCOUNT_NUMBER}}
• IFSC Code:       {{IFSC_CODE}}
• Bank:            {{BANK_NAME}}

UPI Payment:
• UPI ID:          {{UPI_ID}}

Payment Due: {{PAYMENT_DUE_DATE}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{/if}}
```

### Support Section
```
Need Help?

If you have any questions about your invoice or order, please don't hesitate to reach out:

• WhatsApp: +{{WHATSAPP_NUMBER}}
• Email: {{COMPANY_EMAIL}}
• Website: www.sheetcutters.com

We're here to help! 🛠️
```

### Closing
```
Thank you for choosing Sheetcutters for your precision laser cutting needs!

Best regards,
The Sheetcutters Team
```

### Footer
```
─────────────────────────────────────────

Sheetcutters
{{COMPANY_ADDRESS}}
GSTIN: {{COMPANY_GSTIN}}
www.sheetcutters.com

This is an automated email. Please do not reply directly to this message.
For support, contact us via WhatsApp or email above.
```

---

## Plain Text Version (Fallback)

```
INVOICE FROM SHEETCUTTERS - ORDER #{{ORDER_NUMBER}}

Dear {{CUSTOMER_NAME}},

Thank you for your order with Sheetcutters! We appreciate your business.

Your invoice is ready and attached to this email as a PDF document.

ORDER DETAILS
─────────────────────────────────────────
Invoice Number:     {{INVOICE_NUMBER}}
Order Reference:    #{{ORDER_NUMBER}}
Invoice Date:       {{INVOICE_DATE}}
Total Amount:       ₹{{TOTAL_AMOUNT}}
Payment Status:     {{PAYMENT_STATUS}}
─────────────────────────────────────────

{{#if NOT_PAID}}
PAYMENT INFORMATION
─────────────────────────────────────────
Bank Transfer:
  Account Name:    Sheetcutters
  Account Number:  {{ACCOUNT_NUMBER}}
  IFSC Code:       {{IFSC_CODE}}
  Bank:            {{BANK_NAME}}

UPI Payment:
  UPI ID:          {{UPI_ID}}

Payment Due: {{PAYMENT_DUE_DATE}}
─────────────────────────────────────────
{{/if}}

NEED HELP?
If you have any questions, please contact us:
  WhatsApp: +{{WHATSAPP_NUMBER}}
  Email: {{COMPANY_EMAIL}}
  Website: www.sheetcutters.com

Thank you for choosing Sheetcutters!

Best regards,
The Sheetcutters Team

─────────────────────────────────────────
Sheetcutters
{{COMPANY_ADDRESS}}
GSTIN: {{COMPANY_GSTIN}}
www.sheetcutters.com
```

---

## Attachment

- **File Name:** `Invoice-{{INVOICE_NUMBER}}.pdf`
- **Content-Type:** `application/pdf`
- **Size Target:** < 200KB (optimized)

---

## HTML Styling Guidelines

### Colors
- **Background:** #ffffff (white)
- **Primary Text:** #000000 (black)
- **Secondary Text:** #666666 (gray)
- **Accent:** #dc0000 (Sheetcutters red)
- **Borders/Lines:** #e5e5e5 (light gray)
- **Info Box Background:** #f9f9f9 (very light gray)

### Typography
- **Font Family:** Arial, Helvetica, sans-serif (email-safe)
- **Heading Size:** 18px, bold
- **Body Text:** 14px, regular
- **Small Text:** 12px (footer)
- **Line Height:** 1.6

### Layout
- **Max Width:** 600px (centered)
- **Padding:** 20px
- **Mobile Responsive:** Yes (stack columns on mobile)

### Design Elements
- Use tables for layout (better email client support)
- Inline CSS only (no external stylesheets)
- No JavaScript
- Test across Gmail, Outlook, Apple Mail

---

## Conditional Display Rules

1. **Payment Info:** Only show if `paymentStatus !== 'Paid'`
2. **Design Service:** Only show if order includes design service
3. **Shipping Info:** Only show if shipping is included
4. **Discount Details:** Show if discount was applied
5. **Affiliate Credit:** Show if order came through affiliate

---

## Trigger Events

### When to Send Invoice Email

1. **Order Marked as Paid:**
   - Auto-send invoice email
   - Subject: "Your Invoice from Sheetcutters - Order #XXX"

2. **Customer Requests from Dashboard:**
   - Send on demand
   - Subject: "Your Requested Invoice - Order #XXX"

3. **Admin Sends Manually:**
   - Send from admin panel
   - Subject: "Your Invoice from Sheetcutters - Order #XXX"

4. **Batch Send:**
   - Multiple invoices for multiple orders
   - Subject: "Your Invoice from Sheetcutters - Order #XXX" (one per order)

---

## Email Validation

Before sending:
- ✅ Verify customer email is valid
- ✅ Invoice PDF generated successfully
- ✅ All placeholders populated
- ✅ Attachment size < 500KB
- ✅ Test email rendering (optional)

---

## Error Handling

If email fails:
- Log error details
- Show error message to admin/customer
- Retry option (up to 3 attempts)
- Fallback: Download PDF manually

---

## Tracking (Optional)

- Email sent timestamp
- Email opened (if tracking enabled)
- PDF downloaded from email
- Bounce/delivery status

---

**Last Updated:** 30 Nov 2024
