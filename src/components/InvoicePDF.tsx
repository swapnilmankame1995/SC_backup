/**
 * Invoice PDF Generator Component
 * 
 * Generates professional GST-compliant invoices for Sheetcutters.com orders.
 * Uses @react-pdf/renderer for client-side PDF generation.
 * 
 * Features:
 * - GST-compliant format (GSTIN, HSN/SAC codes, tax breakdown)
 * - Dual GST rates (12% for laser cutting, 18% for CAD services)
 * - Company branding (logo, signature, brand colors)
 * - Itemized line items with quantity, price, discount, tax
 * - Shipping cost breakdown
 * - Payment status indicators
 * - Bank details for payment
 * - Professional typography and layout
 * 
 * GST Compliance:
 * - GSTIN display (company + customer if available)
 * - HSN Code: 8456 (Laser cutting machines)
 * - SAC Code: 998386 (CAD/CAM services)
 * - Tax breakdown by rate (12% and 18%)
 * - Place of supply
 * - Invoice number sequence
 * 
 * Design:
 * - Black/white/red color scheme (#dc0000 accent)
 * - A4 page size (210mm × 297mm)
 * - 40px margins
 * - Helvetica font family
 * - Professional business invoice layout
 * 
 * @component
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

/**
 * External Assets (Cloudinary CDN)
 * 
 * Using CDN instead of local files for:
 * - Reliability (always accessible)
 * - Performance (Cloudinary optimization)
 * - Deployment simplicity (no file uploads needed)
 */
const signatureImageUrl = 'https://res.cloudinary.com/dghus7hyd/image/upload/v1764955885/Sign_nppiqg.png';
const companyLogoUrl = 'https://res.cloudinary.com/dghus7hyd/image/upload/v1764957512/S__2_-removebg-preview_g098mi.png';

/**
 * PDF Stylesheet
 * 
 * Defines visual layout for invoice PDF.
 * Follows professional invoice design standards.
 * 
 * Color Palette:
 * - Primary: #000000 (black) - Headers, important text
 * - Accent: #dc0000 (red) - Brand color, section titles
 * - Text: #333333, #666666 (grays) - Body text
 * - Backgrounds: #f9f9f9 (light gray) - Subtle sections
 * 
 * Typography:
 * - Company name: 28pt Times-Italic (professional, serif)
 * - Invoice title: 20pt Bold (clear hierarchy)
 * - Section headers: 11pt Bold + red accent
 * - Body text: 8-10pt (readable, compact)
 */
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2px solid #000000',
    paddingBottom: 15,
  },
  companyName: {
    fontSize: 28,
    fontFamily: 'Times-Italic',
    color: '#000000',
    marginBottom: 5,
  },
  companyTagline: {
    fontSize: 10,
    color: '#dc0000',
    marginBottom: 8,
  },
  companyDetails: {
    fontSize: 8,
    color: '#333333',
    lineHeight: 1.4,
  },
  invoiceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 10,
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#dc0000',
    marginBottom: 8,
    borderBottom: '1px solid #e5e5e5',
    paddingBottom: 3,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    width: '40%',
    fontSize: 9,
    color: '#666666',
  },
  value: {
    width: '60%',
    fontSize: 9,
    color: '#000000',
    fontWeight: 'bold',
  },
  table: {
    marginTop: 10,
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    padding: 6,
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #e5e5e5',
    padding: 6,
    fontSize: 8,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottom: '1px solid #e5e5e5',
    padding: 6,
    fontSize: 8,
    backgroundColor: '#f9f9f9',
  },
  col1: { width: '4%' },
  col2: { width: '26%' },
  col3: { width: '13%' },
  col4: { width: '8%' },
  col5: { width: '10%' },
  col6: { width: '12%' },
  col7: { width: '9%' },
  col8: { width: '13%', textAlign: 'right' },
  totalsSection: {
    marginTop: 10,
    marginLeft: '50%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    fontSize: 9,
  },
  totalLabel: {
    width: '60%',
    textAlign: 'right',
    paddingRight: 10,
    color: '#666666',
  },
  totalValue: {
    width: '40%',
    textAlign: 'right',
    fontWeight: 'bold',
    color: '#000000',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    paddingTop: 5,
    borderTop: '2px solid #000000',
    fontSize: 11,
  },
  grandTotalLabel: {
    width: '60%',
    textAlign: 'right',
    paddingRight: 10,
    fontWeight: 'bold',
    color: '#000000',
  },
  grandTotalValue: {
    width: '40%',
    textAlign: 'right',
    fontWeight: 'bold',
    color: '#dc0000',
  },
  notesSection: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderLeft: '3px solid #dc0000',
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000000',
  },
  notesText: {
    fontSize: 8,
    color: '#333333',
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#666666',
    borderTop: '1px solid #e5e5e5',
    paddingTop: 10,
  },
  twoColumn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  column: {
    width: '48%',
  },
  infoBox: {
    padding: 8,
    backgroundColor: '#f9f9f9',
    border: '1px solid #e5e5e5',
    borderRadius: 4,
  },
  statusPaid: {
    backgroundColor: '#d4edda',
    color: '#155724',
    padding: 4,
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 5,
  },
  statusPending: {
    backgroundColor: '#fff3cd',
    color: '#856404',
    padding: 4,
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 5,
  },
});

/**
 * Invoice Data Interface
 * 
 * Complete data structure for invoice generation.
 * All monetary values are in ₹ (Indian Rupees).
 * 
 * Required for GST compliance:
 * - invoiceNumber: Unique sequential number
 * - invoiceDate: Invoice issue date
 * - companyInfo.gstin: Company GSTIN
 * - customer.gstin: Customer GSTIN (optional, for B2B)
 * - items[].gstRate: Tax rate (12% or 18%)
 * - items[].gstAmount: Tax amount per line
 */
interface InvoiceData {
  invoiceNumber: string;                   // Invoice number (e.g., "SC00123")
  invoiceDate: string;                     // Invoice date (ISO 8601)
  orderNumber: string;                     // Order number (same as invoice for now)
  paymentStatus: string;                   // Payment status (paid, pending, refunded)
  notes?: string;                          // Optional order notes
  
  /**
   * Company Information
   * Loaded from admin panel settings
   */
  companyInfo: {
    name: string;                          // Company name (e.g., "Sheetcutters")
    address: string;                       // Registered address
    phone: string;                         // Contact phone
    email: string;                         // Contact email
    website: string;                       // Company website
    gstin: string;                         // GST Identification Number (29XXXXX1234X1ZX)
    bankName: string;                      // Bank name for payments
    accountNumber: string;                 // Bank account number
    ifscCode: string;                      // Bank IFSC code
    upiId: string;                         // UPI ID for digital payments
    authorizedSignatory: string;           // Name of person authorized to sign
  };
  
  /**
   * Customer Information
   * From order delivery address
   */
  customer: {
    name: string;                          // Customer full name
    email: string;                         // Customer email
    phone: string;                         // Customer phone
    billingAddress: string;                // Full billing address
    gstin?: string;                        // Customer GSTIN (optional, for B2B)
  };
  
  /**
   * Line Items
   * Individual products/services in the order
   */
  items: Array<{
    quantity: number;                      // Quantity ordered
    description: string;                   // Item description (filename)
    material: string;                      // Material name (e.g., "Mild Steel")
    thickness: number;                     // Thickness in mm
    laserLength: number;                   // Cutting length in mm
    unitPrice: number;                     // Price per unit (₹, GST-inclusive)
    lineSubtotal: number;                  // Subtotal before discount/tax (₹)
    discountPct: number;                   // Discount percentage (0-100)
    discountAmount: number;                // Discount amount (₹)
    taxableValue: number;                  // Amount subject to GST (₹)
    gstAmount: number;                     // GST amount (₹)
    gstRate: number;                       // GST rate (12 or 18)
    lineTotal: number;                     // Final line total (₹)
  }>;
  subtotal: number;
  totalDiscount: number;
  loyaltyPointsUsed?: number;
  netTaxableValue: number;
  totalGst: number;
  totalGst12?: number;
  totalGst18?: number;
  shippingCost?: number;
  totalAmount: number;
  discountCode?: string;
  
  /**
   * Payment Transaction Details
   * Information about the payment transaction
   */
  paymentTransaction?: {
    transactionId: string | null;          // Payment transaction ID
    gateway: string | null;                // Payment gateway (razorpay, payu)
    method: string | null;                 // Payment method (card, upi, netbanking, etc.)
    amount: number;                        // Amount paid
    verifiedAt: string | null;             // Payment verification timestamp (ISO 8601)
    razorpayOrderId: string | null;        // Razorpay order ID
  };
}

export const InvoicePDF: React.FC<{ invoice: InvoiceData }> = ({ invoice }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image 
            src={companyLogoUrl}
            style={{ width: 180, height: 50, marginBottom: 8, objectFit: 'contain' }}
          />
          <Text style={styles.companyTagline}>Designed for Makers, Built by Makers</Text>
          <Text style={styles.companyDetails}>
            {invoice.companyInfo.address && `${invoice.companyInfo.address}\n`}
            {invoice.companyInfo.phone && `Phone: ${invoice.companyInfo.phone} | `}
            {invoice.companyInfo.email && `Email: ${invoice.companyInfo.email}\n`}
            {invoice.companyInfo.website && `Website: ${invoice.companyInfo.website} | `}
            {invoice.companyInfo.gstin && `GSTIN: ${invoice.companyInfo.gstin}`}
          </Text>
        </View>

        {/* Invoice Title */}
        <Text style={styles.invoiceTitle}>TAX INVOICE</Text>

        {/* Invoice & Customer Info */}
        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <View style={styles.infoBox}>
              <Text style={styles.sectionTitle}>Invoice Details</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Invoice No:</Text>
                <Text style={styles.value}>{invoice.invoiceNumber}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Invoice Date:</Text>
                <Text style={styles.value}>{formatDate(invoice.invoiceDate)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Order Reference:</Text>
                <Text style={styles.value}>#{invoice.orderNumber}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Payment Status:</Text>
                <Text style={styles.value}>{invoice.paymentStatus.toUpperCase()}</Text>
              </View>
              {invoice.discountCode && (
                <View style={styles.row}>
                  <Text style={styles.label}>Discount Code:</Text>
                  <Text style={styles.value}>{invoice.discountCode}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.column}>
            <View style={styles.infoBox}>
              <Text style={styles.sectionTitle}>Bill To</Text>
              <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 3 }}>
                {invoice.customer.name}
              </Text>
              {invoice.customer.billingAddress && (
                <Text style={{ fontSize: 8, marginBottom: 2, color: '#333333' }}>
                  {invoice.customer.billingAddress}
                </Text>
              )}
              {invoice.customer.email && (
                <Text style={{ fontSize: 8, marginBottom: 2, color: '#333333' }}>
                  Email: {invoice.customer.email}
                </Text>
              )}
              {invoice.customer.phone && (
                <Text style={{ fontSize: 8, marginBottom: 2, color: '#333333' }}>
                  Phone: {invoice.customer.phone}
                </Text>
              )}
              {invoice.customer.gstin && (
                <Text style={{ fontSize: 8, color: '#333333' }}>
                  GSTIN: {invoice.customer.gstin}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>#</Text>
            <Text style={styles.col2}>Description</Text>
            <Text style={styles.col3}>Material</Text>
            <Text style={styles.col4}>Qty</Text>
            <Text style={styles.col5}>Rate</Text>
            <Text style={styles.col6}>Taxable</Text>
            <Text style={styles.col7}>Tax%</Text>
            <Text style={styles.col8}>Amount</Text>
          </View>

          {invoice.items.map((item, index) => (
            <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={styles.col1}>{index + 1}</Text>
              <Text style={styles.col2}>
                {item.description}
                {item.thickness > 0 && `\n${item.thickness}mm`}
                {item.laserLength > 0 && `\n${item.laserLength.toFixed(2)}m`}
              </Text>
              <Text style={styles.col3}>{item.material}</Text>
              <Text style={styles.col4}>{item.quantity}</Text>
              <Text style={styles.col5}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={styles.col6}>{formatCurrency(item.taxableValue)}</Text>
              <Text style={styles.col7}>{item.gstRate}%</Text>
              <Text style={styles.col8}>{formatCurrency(item.lineTotal)}</Text>
            </View>
          ))}
        </View>

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
          </View>

          {invoice.totalDiscount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount:</Text>
              <Text style={[styles.totalValue, { color: '#dc0000' }]}>
                -{formatCurrency(invoice.totalDiscount)}
              </Text>
            </View>
          )}

          {invoice.loyaltyPointsUsed && invoice.loyaltyPointsUsed > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Loyalty Points Used:</Text>
              <Text style={[styles.totalValue, { color: '#10b981' }]}>
                -{formatCurrency(invoice.loyaltyPointsUsed)}
              </Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Net Taxable Value:</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.netTaxableValue)}</Text>
          </View>

          {/* Show separated GST if both rates exist */}
          {invoice.totalGst12 !== undefined && invoice.totalGst12 > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>GST @ 12% (Design Service):</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.totalGst12)}</Text>
            </View>
          )}

          {invoice.totalGst18 !== undefined && invoice.totalGst18 > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>GST @ 18% (Laser Cutting + Design):</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.totalGst18)}</Text>
            </View>
          )}

          {/* Show combined GST if only one rate, or if both rates don't have separate values */}
          {!(invoice.totalGst12 !== undefined && invoice.totalGst12 > 0) && 
           !(invoice.totalGst18 !== undefined && invoice.totalGst18 > 0) && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>GST:</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.totalGst)}</Text>
            </View>
          )}

          {invoice.shippingCost && invoice.shippingCost > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Shipping:</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.shippingCost)}</Text>
            </View>
          )}

          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total Amount:</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(invoice.totalAmount)}</Text>
          </View>
        </View>

        {/* Notes Section */}
        {invoice.notes && invoice.notes.trim() !== '' && (
          <View style={{ marginTop: 15, marginBottom: 10, padding: 8, backgroundColor: '#fff3cd', borderLeft: '3px solid #f0ad4e' }}>
            <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 4, color: '#856404' }}>Customer Notes:</Text>
            <Text style={{ fontSize: 8, color: '#856404', lineHeight: 1.4 }}>
              {invoice.notes}
            </Text>
          </View>
        )}

        {/* Payment Transaction Details */}
        {invoice.paymentTransaction && invoice.paymentTransaction.transactionId && (
          <View style={{ marginTop: 15, marginBottom: 10, padding: 10, backgroundColor: '#f9f9f9', borderLeft: '3px solid #000000' }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 8, color: '#000000' }}>
              Payment Transaction Details
            </Text>
            <View style={styles.row}>
              <Text style={{ fontSize: 8, color: '#666666', width: '40%' }}>Transaction ID:</Text>
              <Text style={{ fontSize: 8, color: '#000000', fontWeight: 'bold', width: '60%', textAlign: 'right' }}>
                {invoice.paymentTransaction.transactionId}
              </Text>
            </View>
            {invoice.paymentTransaction.gateway && (
              <View style={styles.row}>
                <Text style={{ fontSize: 8, color: '#666666', width: '40%' }}>Payment Gateway:</Text>
                <Text style={{ fontSize: 8, color: '#000000', fontWeight: 'bold', width: '60%', textAlign: 'right', textTransform: 'capitalize' }}>
                  {invoice.paymentTransaction.gateway}
                </Text>
              </View>
            )}
            {invoice.paymentTransaction.method && (
              <View style={styles.row}>
                <Text style={{ fontSize: 8, color: '#666666', width: '40%' }}>Payment Method:</Text>
                <Text style={{ fontSize: 8, color: '#000000', fontWeight: 'bold', width: '60%', textAlign: 'right', textTransform: 'capitalize' }}>
                  {invoice.paymentTransaction.method}
                </Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={{ fontSize: 8, color: '#666666', width: '40%' }}>Amount Paid:</Text>
              <Text style={{ fontSize: 8, color: '#10b981', fontWeight: 'bold', width: '60%', textAlign: 'right' }}>
                {formatCurrency(invoice.paymentTransaction.amount)}
              </Text>
            </View>
            {invoice.paymentTransaction.verifiedAt && (
              <View style={styles.row}>
                <Text style={{ fontSize: 8, color: '#666666', width: '40%' }}>Verified At:</Text>
                <Text style={{ fontSize: 8, color: '#000000', fontWeight: 'bold', width: '60%', textAlign: 'right' }}>
                  {formatDate(invoice.paymentTransaction.verifiedAt)}
                </Text>
              </View>
            )}
            <View style={{ marginTop: 5, paddingTop: 5, borderTop: '1px solid #e5e5e5' }}>
              <View style={styles.row}>
                <Text style={{ fontSize: 8, color: '#666666', width: '40%' }}>Payment Status:</Text>
                <Text style={{ fontSize: 9, color: '#10b981', fontWeight: 'bold', width: '60%', textAlign: 'right' }}>
                  {invoice.paymentStatus.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Payment Terms Section */}
        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>Payment Terms & Notes:</Text>
          <Text style={styles.notesText}>
            {`• Payment Due: Immediate\\n• GST Rate: 18% for all services (GST Council 2025/2026)\\n• All disputes subject to jurisdiction of courts in our location\\n${invoice.companyInfo.bankName ? `• Bank Details: ${invoice.companyInfo.bankName}, A/C: ${invoice.companyInfo.accountNumber}, IFSC: ${invoice.companyInfo.ifscCode}\\n` : ''}${invoice.companyInfo.upiId ? `• UPI ID: ${invoice.companyInfo.upiId}\\n` : ''}• For any queries, please contact us at ${invoice.companyInfo.phone || invoice.companyInfo.email}`}
          </Text>
        </View>

        {/* Signature Section */}
        <View style={{ marginTop: 30, alignItems: 'flex-end' }}>
          <View style={{ width: '200px' }}>
            {signatureImageUrl && signatureImageUrl !== 'YOUR_CLOUDINARY_OR_CDN_URL_HERE' && (
              <Image 
                src={signatureImageUrl}
                style={{ width: 120, height: 60 }}
              />
            )}
            <View style={{ borderTop: '1px solid #000000', paddingTop: 5, marginTop: 5 }}>
              <Text style={{ fontSize: 9, textAlign: 'center', fontWeight: 'bold' }}>
                {invoice.companyInfo.authorizedSignatory || 'Authorized Signatory'}
              </Text>
              <Text style={{ fontSize: 8, textAlign: 'center', color: '#666666' }}>
                For {invoice.companyInfo.name || 'Sheetcutters'}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            This is a computer-generated invoice and does not require a physical signature.
          </Text>
          <Text style={{ marginTop: 3 }}>
            Thank you for your business! | {invoice.companyInfo.website || 'www.sheetcutters.com'}
          </Text>
        </View>
      </Page>
    </Document>
  );
};