import { useState } from 'react';
import { apiCall } from '../utils/api';
import { toast } from 'sonner@2.0.3';

export const useInvoiceDownload = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadInvoice = async (orderId: string) => {
    setIsGenerating(true);
    
    try {
      console.log('🚀 useInvoiceDownload: Starting download for order:', orderId);
      
      // Fetch invoice data from backend
      console.log('📡 useInvoiceDownload: Making API call to /orders/${orderId}/invoice');
      const response = await apiCall(`/orders/${orderId}/invoice`, { method: 'GET' });
      
      console.log('📥 useInvoiceDownload: API response:', response);
      
      if (!response.success || !response.invoice) {
        console.error('❌ useInvoiceDownload: Invalid response:', response);
        throw new Error(response.error || 'Failed to fetch invoice data');
      }

      const invoiceData = response.invoice;
      console.log('✅ useInvoiceDownload: Invoice data received:', invoiceData.invoiceNumber);

      // Lazy load PDF library (jsPDF instead of react-pdf to avoid React conflicts)
      console.log('📄 useInvoiceDownload: Loading jsPDF library...');
      const { jsPDF } = await import('jspdf');
      
      // Generate PDF using jsPDF
      console.log('📄 useInvoiceDownload: Generating PDF...');
      const doc = new jsPDF();
      
      // Brand colors
      const RED = { r: 220, g: 0, b: 0 };
      const BLACK = { r: 0, g: 0, b: 0 };
      const GRAY_DARK = { r: 60, g: 60, b: 60 };
      const GRAY_MED = { r: 120, g: 120, b: 120 };
      const GRAY_LIGHT = { r: 200, g: 200, b: 200 };
      const WHITE = { r: 255, g: 255, b: 255 };
      const GREEN = { r: 16, g: 185, b: 129 };
      
      // Helper functions
      const formatCurrency = (amount: number) => `Rs ${amount.toFixed(2)}`;
      const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      };
      const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        const dateStr = date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
        const timeStr = date.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
        return `${dateStr} ${timeStr}`;
      };
      
      let yPos = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - (2 * margin);
      
      // ============= HEADER SECTION =============
      // Red top bar
      doc.setFillColor(RED.r, RED.g, RED.b);
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      // Company name
      doc.setTextColor(WHITE.r, WHITE.g, WHITE.b);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('SHEETCUTTERS', margin, 18);
      
      // Tagline
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Precision Laser Cutting for Makers', margin, 25);
      
      // Invoice number on right side of red bar
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(invoiceData.invoiceNumber, pageWidth - margin, 18, { align: 'right' });
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('TAX INVOICE', pageWidth - margin, 24, { align: 'right' });
      
      yPos = 42;
      
      // ============= COMPANY & CUSTOMER INFO SECTION =============
      doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
      
      // Company info (left column)
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(GRAY_DARK.r, GRAY_DARK.g, GRAY_DARK.b);
      doc.text('FROM', margin, yPos);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
      doc.text(invoiceData.companyInfo.name || 'Sheetcutters', margin, yPos + 5);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(GRAY_DARK.r, GRAY_DARK.g, GRAY_DARK.b);
      let yCompany = yPos + 10;
      
      if (invoiceData.companyInfo.address) {
        const addrLines = doc.splitTextToSize(invoiceData.companyInfo.address, 80);
        doc.text(addrLines, margin, yCompany);
        yCompany += addrLines.length * 4;
      }
      
      if (invoiceData.companyInfo.phone) {
        doc.text(`Phone: ${invoiceData.companyInfo.phone}`, margin, yCompany);
        yCompany += 4;
      }
      
      if (invoiceData.companyInfo.email) {
        doc.text(`Email: ${invoiceData.companyInfo.email}`, margin, yCompany);
        yCompany += 4;
      }
      
      if (invoiceData.companyInfo.website) {
        doc.text(`Web: ${invoiceData.companyInfo.website}`, margin, yCompany);
        yCompany += 4;
      }
      
      if (invoiceData.companyInfo.gstin) {
        doc.setFont('helvetica', 'bold');
        doc.text(`GSTIN: ${invoiceData.companyInfo.gstin}`, margin, yCompany);
        yCompany += 4;
      }
      
      // Customer info (right column)
      const rightColX = 110;
      let yCustomer = yPos;
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(GRAY_DARK.r, GRAY_DARK.g, GRAY_DARK.b);
      doc.text('BILL TO', rightColX, yCustomer);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
      doc.text(invoiceData.customer.name, rightColX, yCustomer + 5);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(GRAY_DARK.r, GRAY_DARK.g, GRAY_DARK.b);
      yCustomer += 10;
      
      if (invoiceData.customer.billingAddress) {
        const custAddrLines = doc.splitTextToSize(invoiceData.customer.billingAddress, 80);
        doc.text(custAddrLines, rightColX, yCustomer);
        yCustomer += custAddrLines.length * 4;
      }
      
      if (invoiceData.customer.email) {
        doc.text(`Email: ${invoiceData.customer.email}`, rightColX, yCustomer);
        yCustomer += 4;
      }
      
      if (invoiceData.customer.phone) {
        doc.text(`Phone: ${invoiceData.customer.phone}`, rightColX, yCustomer);
        yCustomer += 4;
      }
      
      if (invoiceData.customer.gstin) {
        doc.setFont('helvetica', 'bold');
        doc.text(`GSTIN: ${invoiceData.customer.gstin}`, rightColX, yCustomer);
        yCustomer += 4;
      }
      
      yPos = Math.max(yCompany, yCustomer) + 8;
      
      // ============= INVOICE DETAILS BAR =============
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, yPos, contentWidth, 12, 'F');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(GRAY_DARK.r, GRAY_DARK.g, GRAY_DARK.b);
      
      const detailY = yPos + 4;
      doc.text('Invoice Date:', margin + 3, detailY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
      doc.text(formatDate(invoiceData.invoiceDate), margin + 3, detailY + 4);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(GRAY_DARK.r, GRAY_DARK.g, GRAY_DARK.b);
      doc.text('Order Reference:', margin + 55, detailY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
      doc.text(`#${invoiceData.orderNumber}`, margin + 55, detailY + 4);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(GRAY_DARK.r, GRAY_DARK.g, GRAY_DARK.b);
      doc.text('Payment Status:', margin + 110, detailY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(invoiceData.paymentStatus === 'paid' ? GREEN.r : RED.r, 
                       invoiceData.paymentStatus === 'paid' ? GREEN.g : RED.g,
                       invoiceData.paymentStatus === 'paid' ? GREEN.b : RED.b);
      doc.text(invoiceData.paymentStatus.toUpperCase(), margin + 110, detailY + 4);
      
      yPos += 18;
      
      // ============= ITEMS TABLE =============
      // Table header
      doc.setFillColor(BLACK.r, BLACK.g, BLACK.b);
      doc.rect(margin, yPos, contentWidth, 8, 'F');
      
      doc.setTextColor(WHITE.r, WHITE.g, WHITE.b);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      
      const colX = {
        no: margin + 2,
        desc: margin + 10,
        material: margin + 68,
        qty: margin + 103,
        rate: margin + 123,
        taxable: margin + 143,
        tax: margin + 158,
        amount: pageWidth - margin - 2
      };
      
      doc.text('#', colX.no, yPos + 5.5);
      doc.text('DESCRIPTION', colX.desc, yPos + 5.5);
      doc.text('MATERIAL', colX.material, yPos + 5.5);
      doc.text('QTY', colX.qty, yPos + 5.5, { align: 'right' });
      doc.text('RATE', colX.rate, yPos + 5.5, { align: 'right' });
      doc.text('TAXABLE', colX.taxable, yPos + 5.5, { align: 'right' });
      doc.text('TAX%', colX.tax, yPos + 5.5, { align: 'right' });
      doc.text('AMOUNT', colX.amount, yPos + 5.5, { align: 'right' });
      
      yPos += 10;
      
      // Table rows
      doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      
      let rowBg = true;
      invoiceData.items.forEach((item: any, index: number) => {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }
        
        // Alternating row background
        if (rowBg) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, yPos - 2, contentWidth, 9, 'F');
        }
        rowBg = !rowBg;
        
        // Item number
        doc.setTextColor(GRAY_MED.r, GRAY_MED.g, GRAY_MED.b);
        doc.text(String(index + 1), colX.no, yPos + 3);
        
        // Description (with wrapping)
        doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
        const descParts = [];
        if (item.description) descParts.push(item.description);
        if (item.thickness > 0) descParts.push(`${item.thickness}mm`);
        if (item.laserLength > 0) descParts.push(`${item.laserLength.toFixed(2)}m`);
        const fullDesc = descParts.join(' ');
        
        const descLines = doc.splitTextToSize(fullDesc, 55);
        doc.text(descLines, colX.desc, yPos + 3);
        const descHeight = descLines.length * 4;
        
        // Material
        doc.setTextColor(GRAY_DARK.r, GRAY_DARK.g, GRAY_DARK.b);
        const materialLines = doc.splitTextToSize(item.material || 'N/A', 32);
        doc.text(materialLines, colX.material, yPos + 3);
        
        // Numbers (right-aligned)
        doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
        doc.text(String(item.quantity || 0), colX.qty, yPos + 3, { align: 'right' });
        doc.text(formatCurrency(item.unitPrice || 0), colX.rate, yPos + 3, { align: 'right' });
        doc.text(formatCurrency(item.taxableValue || 0), colX.taxable, yPos + 3, { align: 'right' });
        
        // Tax rate with color
        doc.setTextColor(RED.r, RED.g, RED.b);
        doc.text(`${item.gstRate || 0}%`, colX.tax, yPos + 3, { align: 'right' });
        
        // Line total (bold)
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
        doc.text(formatCurrency(item.lineTotal || 0), colX.amount, yPos + 3, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        
        yPos += Math.max(descHeight + 2, 9);
      });
      
      // Table bottom border
      doc.setDrawColor(GRAY_LIGHT.r, GRAY_LIGHT.g, GRAY_LIGHT.b);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      
      yPos += 8;
      
      // ============= TOTALS SECTION =============
      const totalsX = pageWidth - margin - 75;
      const totalsValueX = pageWidth - margin - 2;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(GRAY_DARK.r, GRAY_DARK.g, GRAY_DARK.b);
      
      // Subtotal
      doc.text('Subtotal:', totalsX, yPos);
      doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
      doc.text(formatCurrency(invoiceData.subtotal), totalsValueX, yPos, { align: 'right' });
      yPos += 6;
      
      // Discount
      if (invoiceData.totalDiscount > 0) {
        doc.setTextColor(RED.r, RED.g, RED.b);
        doc.text('Discount:', totalsX, yPos);
        doc.text(`-${formatCurrency(invoiceData.totalDiscount)}`, totalsValueX, yPos, { align: 'right' });
        yPos += 6;
      }
      
      // Loyalty points
      if (invoiceData.loyaltyPointsUsed && invoiceData.loyaltyPointsUsed > 0) {
        doc.setTextColor(GREEN.r, GREEN.g, GREEN.b);
        doc.text('Loyalty Points:', totalsX, yPos);
        doc.text(`-${formatCurrency(invoiceData.loyaltyPointsUsed)}`, totalsValueX, yPos, { align: 'right' });
        yPos += 6;
      }
      
      // Net taxable value
      doc.setTextColor(GRAY_DARK.r, GRAY_DARK.g, GRAY_DARK.b);
      doc.text('Net Taxable Value:', totalsX, yPos);
      doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
      doc.text(formatCurrency(invoiceData.netTaxableValue), totalsValueX, yPos, { align: 'right' });
      yPos += 6;
      
      // GST breakdown
      if (invoiceData.totalGst12 !== undefined && invoiceData.totalGst12 > 0) {
        doc.setTextColor(GRAY_DARK.r, GRAY_DARK.g, GRAY_DARK.b);
        doc.text('GST @ 18%:', totalsX, yPos);
        doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
        doc.text(formatCurrency(invoiceData.totalGst12), totalsValueX, yPos, { align: 'right' });
        yPos += 6;
      }
      
      if (invoiceData.totalGst18 !== undefined && invoiceData.totalGst18 > 0) {
        doc.setTextColor(GRAY_DARK.r, GRAY_DARK.g, GRAY_DARK.b);
        doc.text('GST @ 18%:', totalsX, yPos);
        doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
        doc.text(formatCurrency(invoiceData.totalGst18), totalsValueX, yPos, { align: 'right' });
        yPos += 6;
      }
      
      if (!(invoiceData.totalGst12 !== undefined && invoiceData.totalGst12 > 0) && 
          !(invoiceData.totalGst18 !== undefined && invoiceData.totalGst18 > 0)) {
        doc.setTextColor(GRAY_DARK.r, GRAY_DARK.g, GRAY_DARK.b);
        doc.text('GST:', totalsX, yPos);
        doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
        doc.text(formatCurrency(invoiceData.totalGst), totalsValueX, yPos, { align: 'right' });
        yPos += 6;
      }
      
      // Shipping
      if (invoiceData.shippingCost && invoiceData.shippingCost > 0) {
        doc.setTextColor(GRAY_DARK.r, GRAY_DARK.g, GRAY_DARK.b);
        doc.text('Shipping:', totalsX, yPos);
        doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
        doc.text(formatCurrency(invoiceData.shippingCost), totalsValueX, yPos, { align: 'right' });
        yPos += 6;
      }
      
      // Total box
      yPos += 3;
      doc.setFillColor(BLACK.r, BLACK.g, BLACK.b);
      doc.rect(totalsX - 5, yPos - 5, 80, 12, 'F');
      
      doc.setTextColor(WHITE.r, WHITE.g, WHITE.b);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL AMOUNT:', totalsX, yPos + 2);
      doc.setFontSize(12);
      doc.text(formatCurrency(invoiceData.totalAmount), totalsValueX - 2, yPos + 2, { align: 'right' });
      
      yPos += 18;
      
      // ============= PAYMENT TRANSACTION DETAILS =============
      if (invoiceData.paymentTransaction && invoiceData.paymentTransaction.transactionId) {
        if (yPos > 230) {
          doc.addPage();
          yPos = 20;
        }
        
        // Section header
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
        doc.text('PAYMENT TRANSACTION DETAILS', margin, yPos);
        yPos += 6;
        
        // Border box
        const boxStartY = yPos;
        doc.setDrawColor(BLACK.r, BLACK.g, BLACK.b);
        doc.setLineWidth(1.5);
        doc.rect(margin, yPos, contentWidth, 38, 'D');
        
        yPos += 6;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        
        // Transaction details in two columns
        const col1X = margin + 5;
        const col2X = pageWidth / 2 + 5;
        let yLeft = yPos;
        let yRight = yPos;
        
        // Left column
        if (invoiceData.paymentTransaction.transactionId) {
          doc.setTextColor(GRAY_MED.r, GRAY_MED.g, GRAY_MED.b);
          doc.text('Transaction ID:', col1X, yLeft);
          doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
          doc.setFont('helvetica', 'bold');
          const txId = String(invoiceData.paymentTransaction.transactionId);
          const txIdShort = txId.length > 25 ? txId.substring(0, 25) + '...' : txId;
          doc.text(txIdShort, col1X + 30, yLeft);
          doc.setFont('helvetica', 'normal');
          yLeft += 6;
        }
        
        if (invoiceData.paymentTransaction.gateway) {
          doc.setTextColor(GRAY_MED.r, GRAY_MED.g, GRAY_MED.b);
          doc.text('Payment Gateway:', col1X, yLeft);
          doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
          doc.setFont('helvetica', 'bold');
          const gateway = String(invoiceData.paymentTransaction.gateway);
          doc.text(gateway.charAt(0).toUpperCase() + gateway.slice(1), col1X + 30, yLeft);
          doc.setFont('helvetica', 'normal');
          yLeft += 6;
        }
        
        if (invoiceData.paymentTransaction.method) {
          doc.setTextColor(GRAY_MED.r, GRAY_MED.g, GRAY_MED.b);
          doc.text('Payment Method:', col1X, yLeft);
          doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
          doc.setFont('helvetica', 'bold');
          const method = String(invoiceData.paymentTransaction.method);
          doc.text(method.charAt(0).toUpperCase() + method.slice(1), col1X + 30, yLeft);
          doc.setFont('helvetica', 'normal');
          yLeft += 6;
        }
        
        // Right column
        if (invoiceData.paymentTransaction.amount > 0) {
          doc.setTextColor(GRAY_MED.r, GRAY_MED.g, GRAY_MED.b);
          doc.text('Amount Paid:', col2X, yRight);
          doc.setTextColor(GREEN.r, GREEN.g, GREEN.b);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text(formatCurrency(invoiceData.paymentTransaction.amount), col2X + 25, yRight);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          yRight += 6;
        }
        
        if (invoiceData.paymentTransaction.verifiedAt) {
          doc.setTextColor(GRAY_MED.r, GRAY_MED.g, GRAY_MED.b);
          doc.text('Verified At:', col2X, yRight);
          doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.text(formatDateTime(invoiceData.paymentTransaction.verifiedAt), col2X + 25, yRight);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          yRight += 6;
        }
        
        // Payment status badge at bottom
        yPos = boxStartY + 30;
        doc.setTextColor(GRAY_MED.r, GRAY_MED.g, GRAY_MED.b);
        doc.text('Payment Status:', col1X, yPos);
        
        // Status badge
        const status = invoiceData.paymentStatus.toUpperCase();
        const statusColor = status === 'PAID' ? GREEN : RED;
        doc.setFillColor(statusColor.r, statusColor.g, statusColor.b);
        doc.roundedRect(col1X + 30, yPos - 4, 20, 6, 1, 1, 'F');
        doc.setTextColor(WHITE.r, WHITE.g, WHITE.b);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(status, col1X + 40, yPos, { align: 'center' });
        
        yPos += 12;
      }
      
      // ============= FOOTER =============
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      yPos += 5;
      
      // Thank you note
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
      doc.text('Thank you for your business!', pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(GRAY_MED.r, GRAY_MED.g, GRAY_MED.b);
      doc.text('For support, contact us at support@sheetcutters.com', pageWidth / 2, yPos, { align: 'center' });
      
      // Bottom border
      const footerY = doc.internal.pageSize.getHeight() - 15;
      doc.setDrawColor(GRAY_LIGHT.r, GRAY_LIGHT.g, GRAY_LIGHT.b);
      doc.setLineWidth(0.5);
      doc.line(margin, footerY, pageWidth - margin, footerY);
      
      doc.setFontSize(7);
      doc.setTextColor(GRAY_MED.r, GRAY_MED.g, GRAY_MED.b);
      doc.text(`Generated on ${formatDate(new Date().toISOString())}`, margin, footerY + 5);
      doc.text(`www.sheetcutters.com`, pageWidth - margin, footerY + 5, { align: 'right' });
      
      // Download PDF
      doc.save(`Invoice-${invoiceData.invoiceNumber}.pdf`);

      console.log('💾 useInvoiceDownload: PDF downloaded successfully');
      toast.success('Invoice downloaded successfully');
    } catch (error: any) {
      console.error('❌ useInvoiceDownload: Download invoice error:', error);
      console.error('❌ useInvoiceDownload: Error stack:', error.stack);
      toast.error(error.message || 'Failed to download invoice');
    } finally {
      setIsGenerating(false);
    }
  };

  return { downloadInvoice, isGenerating };
};