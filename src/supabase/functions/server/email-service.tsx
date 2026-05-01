import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const FROM_EMAIL = 'support@sheetcutters.com';
const BRAND_COLOR = '#dc0000';

// Email Templates

// Shared email styles
const emailStyles = `
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #000000;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background-color: #000000;
      padding: 30px 20px;
      text-align: center;
    }
    .logo {
      color: #ffffff;
      font-size: 28px;
      font-weight: bold;
      text-decoration: none;
      letter-spacing: 0.5px;
    }
    .logo-sheet {
      font-family: 'Brush Script MT', cursive;
      font-style: italic;
    }
    .logo-cutters {
      font-family: 'Brush Script MT', cursive;
      color: ${BRAND_COLOR};
      font-style: italic;
    }
    .content {
      padding: 40px 30px;
    }
    .title {
      color: #000000;
      font-size: 24px;
      font-weight: bold;
      margin: 0 0 20px 0;
    }
    .subtitle {
      color: #666666;
      font-size: 16px;
      margin: 0 0 30px 0;
    }
    .details-box {
      background-color: #f5f5f5;
      border-left: 4px solid ${BRAND_COLOR};
      padding: 20px;
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #000000;
    }
    .detail-value {
      color: #333333;
      text-align: right;
    }
    .button {
      display: inline-block;
      background-color: ${BRAND_COLOR};
      color: #ffffff !important;
      padding: 14px 30px;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #b00000;
    }
    .footer {
      background-color: #000000;
      color: #ffffff;
      padding: 30px;
      text-align: center;
      font-size: 14px;
    }
    .footer a {
      color: ${BRAND_COLOR};
      text-decoration: none;
    }
    .divider {
      border: none;
      border-top: 2px solid #e0e0e0;
      margin: 30px 0;
    }
    .highlight {
      color: ${BRAND_COLOR};
      font-weight: 600;
    }
    .order-number {
      background-color: #000000;
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 4px;
      font-weight: 600;
      display: inline-block;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      text-transform: capitalize;
    }
    .status-pending {
      background-color: #fff3cd;
      color: #856404;
    }
    .status-processing {
      background-color: #cce5ff;
      color: #004085;
    }
    .status-shipped {
      background-color: #d4edda;
      color: #155724;
    }
    .status-completed {
      background-color: #d1ecf1;
      color: #0c5460;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .items-table th {
      background-color: #000000;
      color: #ffffff;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #e0e0e0;
    }
    .total-row {
      background-color: #f5f5f5;
      font-weight: 600;
      font-size: 18px;
    }
    
    /* Mobile responsive styles */
    @media only screen and (max-width: 600px) {
      .content {
        padding: 20px 15px !important;
      }
      .details-box {
        padding: 15px !important;
      }
      .items-table {
        font-size: 12px !important;
      }
      .items-table th,
      .items-table td {
        padding: 8px 4px !important;
      }
      .items-table th {
        font-size: 11px !important;
      }
      .total-row {
        font-size: 14px !important;
      }
    }
  </style>
`;

// 1. Order Confirmation Email
export async function sendOrderConfirmationEmail(data: {
  email: string;
  orderNumber: string;
  customerName: string;
  items: Array<{
    fileName?: string;
    material: string;
    thickness: number;
    quantity: number;
    price: number;
    color?: string | null;
  }>;
  subtotal: number;
  shippingCost: number;
  discount?: number;
  pointsUsed?: number;
  total: number;
  deliveryAddress: {
    address: string;
    apartment?: string;
    city: string;
    state: string;
    pinCode: string;
  };
  paymentTransaction?: {
    transactionId: string;
    gateway: string;
    method: string;
    amount: number;
    verifiedAt: string;
  };
}): Promise<void> {
  const itemsHtml = data.items.map(item => `
    <tr>
      <td>${item.fileName || 'Custom Design'}</td>
      <td>${item.material}${item.color ? ` <span style="display:inline-block;background:#2a2a2a;color:#cccccc;font-size:11px;padding:1px 6px;border-radius:4px;border:1px solid #444;margin-left:4px;">${item.color}</span>` : ''}</td>
      <td>${item.thickness > 0 ? item.thickness + 'mm' : '—'}</td>
      <td>${item.quantity}</td>
      <td>₹${item.price.toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${emailStyles}
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="logo"><span class="logo-sheet">Sheet</span><span class="logo-cutters">Cutters</span></div>
        </div>
        
        <div class="content">
          <h1 class="title">Order Confirmed! 🎉</h1>
          <p class="subtitle">Hi ${data.customerName}, thank you for your order!</p>
          
          <p>Your order <span class="order-number">${data.orderNumber}</span> has been received and is being processed by our team.</p>
          
          <div class="details-box">
            <h3 style="margin-top: 0;">Order Details</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Material</th>
                  <th>Thickness</th>
                  <th>Qty</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
                <tr>
                  <td colspan="4" style="text-align: right; font-weight: 600;">Subtotal:</td>
                  <td>₹${data.subtotal.toFixed(2)}</td>
                </tr>
                ${data.shippingCost > 0 ? `
                <tr>
                  <td colspan="4" style="text-align: right; font-weight: 600;">Shipping:</td>
                  <td>₹${data.shippingCost.toFixed(2)}</td>
                </tr>
                ` : ''}
                ${data.discount ? `
                <tr>
                  <td colspan="4" style="text-align: right; font-weight: 600; color: ${BRAND_COLOR};">Discount:</td>
                  <td style="color: ${BRAND_COLOR};">-₹${data.discount.toFixed(2)}</td>
                </tr>
                ` : ''}
                ${data.pointsUsed ? `
                <tr>
                  <td colspan="4" style="text-align: right; font-weight: 600; color: ${BRAND_COLOR};">Points Used:</td>
                  <td style="color: ${BRAND_COLOR};">-₹${data.pointsUsed.toFixed(2)}</td>
                </tr>
                ` : ''}
                <tr class="total-row">
                  <td colspan="4" style="text-align: right;">Total:</td>
                  <td>₹${data.total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="details-box">
            <h3 style="margin-top: 0;">Delivery Address</h3>
            <p style="margin: 0;">
              ${data.deliveryAddress.address}${data.deliveryAddress.apartment ? ', ' + data.deliveryAddress.apartment : ''}<br>
              ${data.deliveryAddress.city}, ${data.deliveryAddress.state} ${data.deliveryAddress.pinCode}
            </p>
          </div>

          ${data.paymentTransaction ? `
          <div class="details-box">
            <h3 style="margin-top: 0;">Payment Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 8px 0; font-weight: 600; color: #000000;">Transaction ID:</td>
                <td style="padding: 8px 0; color: #333333; text-align: right;">${data.paymentTransaction.transactionId}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 8px 0; font-weight: 600; color: #000000;">Gateway:</td>
                <td style="padding: 8px 0; color: #333333; text-align: right; text-transform: capitalize;">${data.paymentTransaction.gateway}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 8px 0; font-weight: 600; color: #000000;">Method:</td>
                <td style="padding: 8px 0; color: #333333; text-align: right; text-transform: capitalize;">${data.paymentTransaction.method}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 8px 0; font-weight: 600; color: #000000;">Amount:</td>
                <td style="padding: 8px 0; color: #10b981; font-weight: 600; text-align: right;">₹${data.paymentTransaction.amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #000000;">Verified At:</td>
                <td style="padding: 8px 0; color: #333333; text-align: right;">${new Date(data.paymentTransaction.verifiedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</td>
              </tr>
            </table>
          </div>
          ` : ''}

          <center>
            <a href="https://www.sheetcutters.com/dashboard" class="button">View Order Details</a>
          </center>
        </div>

        <div class="footer">
          <p style="margin: 0 0 10px 0;"><strong>Need help?</strong></p>
          <p style="margin: 0;">Contact us at <a href="mailto:support@sheetcutters.com">support@sheetcutters.com</a></p>
          <p style="margin: 20px 0 0 0; color: #666666; font-size: 12px;">
            © ${new Date().getFullYear()} Sheetcutters. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: `Order Confirmation #${data.orderNumber} - Sheetcutters`,
      html,
    });
    console.log(`✅ Order confirmation email sent to ${data.email}`);
  } catch (error) {
    console.error('❌ Failed to send order confirmation email:', error);
    throw error;
  }
}

// 2. Order Status Update Email
export async function sendOrderStatusUpdateEmail(data: {
  email: string;
  orderNumber: string;
  customerName: string;
  status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';
  trackingUrl?: string;
  trackingNumber?: string;
  carrier?: string;
}): Promise<void> {
  const statusMessages = {
    pending: {
      title: 'Order Received',
      message: 'We have received your order and will start processing it soon.',
      icon: '📋',
    },
    processing: {
      title: 'Order Processing',
      message: 'Your order is being prepared by our team. We\'ll notify you once it ships!',
      icon: '⚙️',
    },
    shipped: {
      title: 'Order Shipped!',
      message: 'Great news! Your order has been shipped and is on its way to you.',
      icon: '📦',
    },
    completed: {
      title: 'Order Delivered',
      message: 'Your order has been delivered. We hope you love it!',
      icon: '✅',
    },
    cancelled: {
      title: 'Order Cancelled',
      message: 'Your order has been cancelled. If you have any questions, please contact us.',
      icon: '❌',
    },
  };

  const statusInfo = statusMessages[data.status];

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${emailStyles}
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="logo"><span class="logo-sheet">Sheet</span><span class="logo-cutters">Cutters</span></div>
        </div>
        
        <div class="content">
          <h1 class="title">${statusInfo.icon} ${statusInfo.title}</h1>
          <p class="subtitle">Hi ${data.customerName},</p>
          
          <p>Your order <span class="order-number">${data.orderNumber}</span> status has been updated.</p>
          
          <div class="details-box">
            <div style="text-align: center; padding: 20px 0;">
              <div style="font-size: 48px; margin-bottom: 10px;">${statusInfo.icon}</div>
              <div class="status-badge status-${data.status}">${data.status}</div>
            </div>
            <p style="text-align: center; margin: 20px 0 0 0;">${statusInfo.message}</p>
          </div>

          ${data.status === 'shipped' && (data.trackingUrl || data.trackingNumber) ? `
            <div class="details-box">
              <h3 style="margin-top: 0;">Tracking Information</h3>
              ${data.carrier ? `<p><strong>Carrier:</strong> ${data.carrier}</p>` : ''}
              ${data.trackingNumber ? `<p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>` : ''}
              ${data.trackingUrl ? `
                <center>
                  <a href="${data.trackingUrl}" class="button">Track Your Order</a>
                </center>
              ` : ''}
            </div>
          ` : ''}

          <center>
            <a href="https://www.sheetcutters.com/dashboard" class="button">View Order Details</a>
          </center>
        </div>

        <div class="footer">
          <p style="margin: 0 0 10px 0;"><strong>Need help?</strong></p>
          <p style="margin: 0;">Contact us at <a href="mailto:support@sheetcutters.com">support@sheetcutters.com</a></p>
          <p style="margin: 20px 0 0 0; color: #666666; font-size: 12px;">
            © ${new Date().getFullYear()} Sheetcutters. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: `Order Update: ${statusInfo.title} - #${data.orderNumber}`,
      html,
    });
    console.log(`✅ Order status update email sent to ${data.email}`);
  } catch (error) {
    console.error('❌ Failed to send order status update email:', error);
    throw error;
  }
}

// 3. Affiliate Welcome Email
export async function sendAffiliateWelcomeEmail(data: {
  email: string;
  name: string;
  discountCode: string;
  commissionPercentage: number;
  referralLink: string;
}): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${emailStyles}
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="logo"><span class="logo-sheet">Sheet</span><span class="logo-cutters">Cutters</span></div>
        </div>
        
        <div class="content">
          <h1 class="title">🎉 Welcome to the Sheetcutters Affiliate Program!</h1>
          <p class="subtitle">Hi ${data.name},</p>
          
          <p>Congratulations! Your affiliate account has been approved. You can now start earning commissions by referring customers to Sheetcutters.</p>

          <div class="details-box">
            <h3 style="margin-top: 0;">Your Affiliate Details</h3>
            <div class="detail-row">
              <span class="detail-label">Discount Code:</span>
              <span class="detail-value"><strong>${data.discountCode}</strong></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Commission Rate:</span>
              <span class="detail-value"><strong>${data.commissionPercentage}%</strong></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Referral Link:</span>
              <span class="detail-value" style="word-break: break-all;">${data.referralLink}</span>
            </div>
          </div>

          <h3>How It Works</h3>
          <ol style="line-height: 2;">
            <li>Share your unique discount code or referral link with your audience</li>
            <li>When someone makes a purchase using your code, you earn ${data.commissionPercentage}% commission</li>
            <li>Track your earnings and performance in your affiliate dashboard</li>
            <li>Get paid when you reach the minimum payout threshold</li>
          </ol>

          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
            <strong>⚠️ Important:</strong> Please note that you cannot use your own discount code for personal purchases. This is considered fraud and may result in account suspension.
          </div>

          <center>
            <a href="https://sheetcutters.com/affiliate-dashboard" class="button">Go to Affiliate Dashboard</a>
          </center>
        </div>

        <div class="footer">
          <p style="margin: 0 0 10px 0;"><strong>Questions about the program?</strong></p>
          <p style="margin: 0;">Contact us at <a href="mailto:support@sheetcutters.com">support@sheetcutters.com</a></p>
          <p style="margin: 20px 0 0 0; color: #666666; font-size: 12px;">
            © ${new Date().getFullYear()} Sheetcutters. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: 'Welcome to Sheetcutters Affiliate Program! 🎉',
      html,
    });
    console.log(`✅ Affiliate welcome email sent to ${data.email}`);
  } catch (error) {
    console.error('❌ Failed to send affiliate welcome email:', error);
    throw error;
  }
}

// 4. Affiliate Commission Notification Email
export async function sendAffiliateCommissionEmail(data: {
  email: string;
  affiliateName: string;
  orderNumber: string;
  customerEmail: string;
  orderValue: number;
  commission: number;
  totalEarnings: number;
}): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${emailStyles}
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="logo"><span class="logo-sheet">Sheet</span><span class="logo-cutters">Cutters</span></div>
        </div>
        
        <div class="content">
          <h1 class="title">💰 You Earned a Commission!</h1>
          <p class="subtitle">Hi ${data.affiliateName},</p>
          
          <p>Great news! You've earned a new commission from a referred purchase.</p>

          <div class="details-box">
            <h3 style="margin-top: 0;">Commission Details</h3>
            <div class="detail-row">
              <span class="detail-label">Order Number:</span>
              <span class="detail-value">${data.orderNumber}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Order Value:</span>
              <span class="detail-value">₹${data.orderValue.toFixed(2)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Your Commission:</span>
              <span class="detail-value" style="color: ${BRAND_COLOR}; font-size: 18px;"><strong>₹${data.commission.toFixed(2)}</strong></span>
            </div>
          </div>

          <div class="details-box">
            <div class="detail-row">
              <span class="detail-label">Total Earnings (All Time):</span>
              <span class="detail-value" style="font-size: 20px;"><strong>₹${data.totalEarnings.toFixed(2)}</strong></span>
            </div>
          </div>

          <p>Keep up the great work! Continue sharing your discount code to earn more commissions.</p>

          <center>
            <a href="https://sheetcutters.com/affiliate-dashboard" class="button">View Affiliate Dashboard</a>
          </center>
        </div>

        <div class="footer">
          <p style="margin: 0 0 10px 0;"><strong>Questions?</strong></p>
          <p style="margin: 0;">Contact us at <a href="mailto:support@sheetcutters.com">support@sheetcutters.com</a></p>
          <p style="margin: 20px 0 0 0; color: #666666; font-size: 12px;">
            © ${new Date().getFullYear()} Sheetcutters. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: `You Earned ₹${data.commission.toFixed(2)} Commission! 💰`,
      html,
    });
    console.log(`✅ Commission notification email sent to ${data.email}`);
  } catch (error) {
    console.error('❌ Failed to send commission notification email:', error);
    throw error;
  }
}

// 5. Contact Form Submission Email (to Admin)
export async function sendContactFormEmail(data: {
  adminEmail: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  subject: string;
  message: string;
}): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${emailStyles}
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="logo"><span class="logo-sheet">Sheet</span><span class="logo-cutters">Cutters</span></div>
        </div>
        
        <div class="content">
          <h1 class="title">📧 New Contact Form Submission</h1>
          
          <div class="details-box">
            <h3 style="margin-top: 0;">Customer Information</h3>
            <div class="detail-row">
              <span class="detail-label">Name:</span>
              <span class="detail-value">${data.customerName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Email:</span>
              <span class="detail-value"><a href="mailto:${data.customerEmail}">${data.customerEmail}</a></span>
            </div>
            ${data.customerPhone ? `
            <div class="detail-row">
              <span class="detail-label">Phone:</span>
              <span class="detail-value">${data.customerPhone}</span>
            </div>
            ` : ''}
            <div class="detail-row">
              <span class="detail-label">Subject:</span>
              <span class="detail-value">${data.subject}</span>
            </div>
          </div>

          <div class="details-box">
            <h3 style="margin-top: 0;">Message</h3>
            <p style="white-space: pre-wrap; margin: 0;">${data.message}</p>
          </div>

          <p style="color: #666666; font-size: 14px;">
            Received: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </p>
        </div>

        <div class="footer">
          <p style="margin: 20px 0 0 0; color: #666666; font-size: 12px;">
            © ${new Date().getFullYear()} Sheetcutters. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.adminEmail,
      replyTo: data.customerEmail,
      subject: `Contact Form: ${data.subject}`,
      html,
    });
    console.log(`✅ Contact form email sent to admin`);
  } catch (error) {
    console.error('❌ Failed to send contact form email:', error);
    throw error;
  }
}

// 6. Password Reset Email
export async function sendPasswordResetEmail(data: {
  email: string;
  resetLink: string;
  expiryMinutes?: number;
}): Promise<void> {
  const expiry = data.expiryMinutes || 60;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${emailStyles}
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="logo"><span class="logo-sheet">Sheet</span><span class="logo-cutters">Cutters</span></div>
        </div>
        
        <div class="content">
          <h1 class="title">🔑 Password Reset Request</h1>
          <p class="subtitle">We received a request to reset your password.</p>
          
          <p>Click the button below to reset your password. This link will expire in <strong>${expiry} minutes</strong>.</p>

          <center>
            <a href="${data.resetLink}" class="button">Reset Password</a>
          </center>

          <p style="margin-top: 30px; color: #666666;">Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 14px;">
            ${data.resetLink}
          </p>

          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
            <strong>⚠️ Didn't request this?</strong><br>
            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </div>
        </div>

        <div class="footer">
          <p style="margin: 0 0 10px 0;"><strong>Need help?</strong></p>
          <p style="margin: 0;">Contact us at <a href="mailto:support@sheetcutters.com">support@sheetcutters.com</a></p>
          <p style="margin: 20px 0 0 0; color: #666666; font-size: 12px;">
            © ${new Date().getFullYear()} Sheetcutters. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: 'Password Reset Request - Sheetcutters',
      html,
    });
    console.log(`✅ Password reset email sent to ${data.email}`);
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    throw error;
  }
}

// 7. Quote Confirmation Email
export async function sendQuoteConfirmationEmail(data: {
  email: string;
  customerName: string;
  quoteNumber: string;
  description: string;
  estimatedPrice?: number;
  sketchFiles?: string[];
  notes?: string;
}): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${emailStyles}
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="logo"><span class="logo-sheet">Sheet</span><span class="logo-cutters">Cutters</span></div>
        </div>
        
        <div class="content">
          <h1 class="title">📝 Quote Request Received</h1>
          <p class="subtitle">Hi ${data.customerName},</p>
          
          <p>Thank you for your quote request! We have received your inquiry and our team will review it shortly.</p>

          <div class="details-box">
            <h3 style="margin-top: 0;">Quote Details</h3>
            <div class="detail-row">
              <span class="detail-label">Quote Number:</span>
              <span class="detail-value"><strong>${data.quoteNumber}</strong></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Description:</span>
              <span class="detail-value">${data.description}</span>
            </div>
            ${data.estimatedPrice ? `
            <div class="detail-row">
              <span class="detail-label">Estimated Price:</span>
              <span class="detail-value">₹${data.estimatedPrice.toFixed(2)}</span>
            </div>
            ` : ''}
            ${data.sketchFiles && data.sketchFiles.length > 0 ? `
            <div class="detail-row">
              <span class="detail-label">Files Submitted:</span>
              <span class="detail-value">${data.sketchFiles.length} file(s)</span>
            </div>
            ` : ''}
          </div>

          ${data.notes ? `
          <div class="details-box">
            <h3 style="margin-top: 0;">Additional Notes</h3>
            <p style="white-space: pre-wrap; margin: 0;">${data.notes}</p>
          </div>
          ` : ''}

          <p>Our team will review your request and get back to you within 24-48 hours with a detailed quote.</p>

          <center>
            <a href="https://www.sheetcutters.com/dashboard" class="button">View Dashboard</a>
          </center>
        </div>

        <div class="footer">
          <p style="margin: 0 0 10px 0;"><strong>Need help?</strong></p>
          <p style="margin: 0;">Contact us at <a href="mailto:support@sheetcutters.com">support@sheetcutters.com</a></p>
          <p style="margin: 20px 0 0 0; color: #666666; font-size: 12px;">
            © ${new Date().getFullYear()} Sheetcutters. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: `Quote Request Received - ${data.quoteNumber}`,
      html,
    });
    console.log(`✅ Quote confirmation email sent to ${data.email}`);
  } catch (error) {
    console.error('❌ Failed to send quote confirmation email:', error);
    throw error;
  }
}

// 8. Order Cancellation Email
export async function sendOrderCancellationEmail(data: {
  email: string;
  orderNumber: string;
  customerName: string;
  items: Array<{
    fileName?: string;
    material: string;
    thickness: number;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  shippingCost: number;
  discount?: number;
  pointsUsed?: number;
  total: number;
  wasPaymentCompleted: boolean;
  cancellationReason?: string;
}): Promise<void> {
  const itemsHtml = data.items.map(item => `
    <tr>
      <td>${item.fileName || 'Custom Design'}</td>
      <td>${item.material}</td>
      <td>${item.thickness}mm</td>
      <td>${item.quantity}</td>
      <td>₹${item.price.toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${emailStyles}
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="logo"><span class="logo-sheet">Sheet</span><span class="logo-cutters">Cutters</span></div>
        </div>
        
        <div class="content">
          <h1 class="title" style="color: ${BRAND_COLOR};">Order Cancelled</h1>
          <p class="subtitle">Hi ${data.customerName},</p>
          
          <p>Your order <span class="order-number">${data.orderNumber}</span> has been cancelled.</p>
          
          ${data.cancellationReason ? `
          <div class="details-box" style="background: #2a2a2a; border-left: 4px solid ${BRAND_COLOR};">
            <p style="margin: 0;"><strong>Reason:</strong> ${data.cancellationReason}</p>
          </div>
          ` : ''}
          
          <div class="details-box">
            <h3 style="margin-top: 0;">Cancelled Order Details</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Material</th>
                  <th>Thickness</th>
                  <th>Qty</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
                <tr>
                  <td colspan="4" style="text-align: right; font-weight: 600;">Subtotal:</td>
                  <td>₹${data.subtotal.toFixed(2)}</td>
                </tr>
                ${data.shippingCost > 0 ? `
                <tr>
                  <td colspan="4" style="text-align: right; font-weight: 600;">Shipping:</td>
                  <td>₹${data.shippingCost.toFixed(2)}</td>
                </tr>
                ` : ''}
                ${data.discount ? `
                <tr>
                  <td colspan="4" style="text-align: right; font-weight: 600; color: ${BRAND_COLOR};">Discount:</td>
                  <td style="color: ${BRAND_COLOR};">-₹${data.discount.toFixed(2)}</td>
                </tr>
                ` : ''}
                ${data.pointsUsed ? `
                <tr>
                  <td colspan="4" style="text-align: right; font-weight: 600; color: ${BRAND_COLOR};">Points Used:</td>
                  <td style="color: ${BRAND_COLOR};">-₹${data.pointsUsed.toFixed(2)}</td>
                </tr>
                ` : ''}
                <tr class="total-row">
                  <td colspan="4" style="text-align: right;">Total:</td>
                  <td>₹${data.total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          ${data.wasPaymentCompleted ? `
          <div class="details-box" style="background: #1a3d1a; border-left: 4px solid #4ade80;">
            <h3 style="margin-top: 0; color: #4ade80;">💰 Refund Information</h3>
            <p style="margin-bottom: 8px;color: #9ca3af; ">A refund of <strong>₹${data.total.toFixed(2)}</strong> will be processed to your original payment method.</p>
            <p style="margin: 0; color: #9ca3af; font-size: 14px;">⏱️ Refunds typically take 5-7 business days to reflect in your account.</p>
          </div>
          ` : ''}

          <h3>What Happens Next?</h3>
          <ul line-height: 1.8;">
            ${data.wasPaymentCompleted ? '<li>Your refund will be initiated within 24 hours</li>' : '<li>No charges have been made to your account</li>'}
            <li>All associated files have been removed from our system</li>
            <li>You can place a new order anytime at <a href="https://www.sheetcutters.com" style="color: ${BRAND_COLOR}; text-decoration: none;">www.sheetcutters.com</a></li>
          </ul>

          <p style="margin-top: 30px;">If you have any questions or concerns about this cancellation, please don't hesitate to reach out to our support team.</p>
          
          <div class="button-container">
            <a href="https://www.sheetcutters.com" class="button">Visit Sheetcutters</a>
          </div>
          
          <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px;">
            We're sorry to see this order cancelled. We hope to serve you again soon!
          </p>
        </div>
        
        <div class="footer">
          <p>Questions? Contact us at <a href="mailto:support@sheetcutters.com" style="color: ${BRAND_COLOR};">support@sheetcutters.com</a></p>
          <p>© 2025 Sheetcutters. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: `Order Cancelled: ${data.orderNumber}`,
      html,
    });
    console.log(`✅ Order cancellation email sent to ${data.email}`);
  } catch (error) {
    console.error('❌ Failed to send order cancellation email:', error);
    throw error;
  }
}

// Helper function to send plain email (legacy support)
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw error;
  }
}