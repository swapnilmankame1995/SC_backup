# Invoice Template - Sheetcutters

This document serves as the source template for invoice generation. Edit this file to update invoice structure, content, and design requirements.

---

## 1. Header

### Company Branding
- **Company Logo:** Prominently display the "Sheetcutters" logo at the top left or center
- **Company Name:** Sheetcutters
- **Company Slogan (Optional):** "Precision Laser Cutting Solutions" or "Cutting Edge Technology, Unmatched Precision"

### Company Contact Information
- **Address:** `{{COMPANY_ADDRESS}}`
- **Phone:** `{{COMPANY_PHONE}}`
- **Email:** `{{COMPANY_EMAIL}}`
- **Website:** www.sheetcutters.com
- **GSTIN:** `{{COMPANY_GSTIN}}`

---

## 2. Invoice Details

- **Invoice Title:** TAX INVOICE (large and bold - reflecting GST inclusion)
- **Invoice Number:** `{{INVOICE_NUMBER}}` (e.g., SC-2024-001)
- **Date Issued:** `{{INVOICE_DATE}}`
- **Payment Due Date:** `{{PAYMENT_DUE_DATE}}`
- **Purchase Order (PO) Number:** `{{PO_NUMBER}}` (if applicable)
- **Order Reference:** `{{ORDER_REFERENCE}}`
- **Quotation Reference:** `{{QUOTATION_REF}}` (if applicable)

---

## 3. Bill To / Ship To Information

### Bill To
- **Customer Name:** `{{CUSTOMER_NAME}}`
- **Contact Person:** `{{CUSTOMER_CONTACT}}`
- **Address:** `{{CUSTOMER_BILLING_ADDRESS}}`
- **Phone:** `{{CUSTOMER_PHONE}}`
- **Email:** `{{CUSTOMER_EMAIL}}`
- **Customer GSTIN:** `{{CUSTOMER_GSTIN}}` (if applicable)

### Ship To (if different from Bill To)
- **Recipient Name:** `{{SHIPPING_NAME}}`
- **Address:** `{{SHIPPING_ADDRESS}}`
- **Phone:** `{{SHIPPING_PHONE}}`

---

## 4. Services/Items Rendered Table

This table details the work performed with specific laser cutting metrics.

| Qty | Description | Material Type | Thickness (mm) | Laser Length (m) | Unit Price (₹) | Line Subtotal (₹) | Discount (%) | Discount Amount (₹) | Taxable Value (₹) | GST (12%) (₹) | Total (₹) |
| :-- | :---------- | :------------ | :------------- | :--------------- | :------------- | :---------------- | :----------- | :------------------ | :---------------- | :------------ | :-------- |
| `{{QTY}}` | `{{DESCRIPTION}}` | `{{MATERIAL}}` | `{{THICKNESS}}` | `{{LASER_LENGTH}}` | `{{UNIT_PRICE}}` | `{{LINE_SUBTOTAL}}` | `{{DISCOUNT_PCT}}` | `{{DISCOUNT_AMT}}` | `{{TAXABLE_VALUE}}` | `{{GST_AMT}}` | `{{LINE_TOTAL}}` |

### Example Rows:
- Laser Cut Parts (Drawing #X)
- CAD Design Service (if applicable)
- Shipping & Handling

---

## 5. Summary Totals

- **Subtotal (before discounts & taxes):** `{{SUBTOTAL}}`
- **Total Discount:** `{{TOTAL_DISCOUNT}}`
- **Net Taxable Value:** `{{NET_TAXABLE_VALUE}}`
- **Total GST (12%):** `{{TOTAL_GST}}`
- **Shipping Charges:** `{{SHIPPING_CHARGES}}`
- **Total Amount Due (in Words):** `{{TOTAL_IN_WORDS}}`
- **Total Amount Due (in Figures):** ₹`{{TOTAL_AMOUNT}}`

---

## 6. Payment Information

### Payment Methods Accepted
- Bank Transfer
- UPI
- Credit Card
- Razorpay

### Bank Transfer Details
- **Bank Name:** `{{BANK_NAME}}`
- **Account Name:** Sheetcutters
- **Account Number:** `{{ACCOUNT_NUMBER}}`
- **IFSC Code:** `{{IFSC_CODE}}`

### UPI Details
- **UPI ID:** `{{UPI_ID}}`

### Payment Terms
- **Terms:** Due Upon Receipt
- **Late Payment Policy:** A late fee of 1.5% per month will be applied to overdue balances

---

## 7. Footer / Additional Notes

### Messages
- **Thank You Message:** "Thank you for your business!" or "We appreciate your continued partnership"
- **Terms and Conditions:** "For full terms and conditions, please visit www.sheetcutters.com/terms"

### Authorization
- **Authorized Signature Line**
- **Name and Designation:** `{{SIGNATORY_NAME}}`
- **For:** Sheetcutters

### Company Registration
- **CIN:** `{{CIN_NUMBER}}` (if applicable)
- **TAN:** `{{TAN_NUMBER}}` (if applicable)

---

## Design Guidelines

### Colors
- **Primary Accent:** #dc0000 (Sheetcutters red)
- **Background:** White
- **Text:** Black
- **Secondary Text:** Gray (#666666)
- **Border/Lines:** Light gray (#e5e5e5)

### Typography
- **Invoice Title:** Large, bold
- **Section Headings:** Medium, bold, red accent
- **Body Text:** Regular weight
- **Totals:** Bold

### Layout
- **Page Size:** A4 (210mm × 297mm)
- **Margins:** 20mm on all sides
- **Header:** Company branding and contact info
- **Body:** Invoice details, billing info, items table
- **Footer:** Payment info, terms, signature

---

## Notes for Implementation

1. All placeholders are marked with `{{PLACEHOLDER_NAME}}`
2. GST rate is currently 12% - update if needed
3. Currency is Indian Rupees (₹)
4. Date format: DD MMM YYYY (e.g., 30 Nov 2024)
5. Invoice numbers follow format: SC-YYYY-NNN
6. Table should auto-expand for multiple line items
7. Discount column should only show if discounts are applied
8. Ship To section should only show if different from Bill To

---

**Last Updated:** 30 Nov 2024
