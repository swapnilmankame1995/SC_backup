# 🎯 Payment Gateway Integration - Complete Implementation Guide

## 🚨 Current Issue

**Problem:** Checkout creates orders without processing actual payments through Razorpay/PayU.

**Current Flow (INCORRECT):**
```
Checkout → Click "Pay Now" → Create Order → Upload Files → Confirmation
                              ❌ Payment skipped!
```

**Expected Flow (CORRECT):**
```
Checkout → Click "Pay Now" → Create Payment Order → Payment Gateway Modal 
→ User Pays → Payment Verification → Create Order → Upload Files → Confirmation
```

---

## ✅ Server Implementation (COMPLETED)

I've added two new endpoints to `/supabase/functions/server/index.tsx`:

### 1. **POST `/create-payment-order`**
Creates a Razorpay/PayU payment order before checkout.

**Request:**
```json
{
  "amount": 1250.50,
  "currency": "INR",
  "gateway": "razorpay",
  "receipt": "receipt_order_123"
}
```

**Response (Razorpay):**
```json
{
  "success": true,
  "orderId": "order_MhW7Lx8FmH9T2g",
  "amount": 125050,
  "currency": "INR",
  "keyId": "rzp_test_xxxxx"
}
```

**Response (PayU):**
```json
{
  "success": true,
  "txnid": "TXN1734459887xyz",
  "merchantId": "xxxxxx",
  "amount": 1250.50,
  "productInfo": "Laser Cutting Order",
  "firstName": "swapnil",
  "email": "swapnilum95@gmail.com"
}
```

---

### 2. **POST `/verify-payment`**
Verifies payment signature after payment completion.

**Request (Razorpay):**
```json
{
  "gateway": "razorpay",
  "razorpay_order_id": "order_MhW7Lx8FmH9T2g",
  "razorpay_payment_id": "pay_MhW7M7Y2NAFj3h",
  "razorpay_signature": "d8e8f..." 
}
```

**Response:**
```json
{
  "success": true,
  "verified": true,
  "paymentId": "pay_MhW7M7Y2NAFj3h",
  "orderId": "order_MhW7Lx8FmH9T2g"
}
```

---

## 🔧 Frontend Implementation (REQUIRED)

### Step 1: Load Razorpay SDK

Add this script to `/index.html` (before closing `</body>`):

```html
<!-- Razorpay Checkout SDK -->
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

---

### Step 2: Update `handlePlaceOrder` in `/App.tsx`

The function needs to be completely refactored to:

1. Get the final total from sessionStorage (set by CheckoutScreen)
2. Call `/create-payment-order` to create Razorpay/PayU order
3. Open Razorpay/PayU payment modal
4. Wait for payment success callback
5. Verify payment with `/verify-payment`
6. ONLY THEN create the actual order

**Pseudocode:**
```typescript
const handlePlaceOrder = async (
  paymentMethod: string,
  discountCode: string | undefined,
  deliveryInfo: any,
  pointsUsed: number = 0,
  shippingCost: number = 0,
  shippingCarrier?: string,
  totalWeight?: number
) => {
  if (!user) {
    toast.error('Please login to place an order');
    return;
  }

  try {
    // Step 1: Get final total from sessionStorage
    const pricingBreakdown = JSON.parse(sessionStorage.getItem('orderPricing') || '{}');
    const finalTotal = pricingBreakdown.total || price;

    // Step 2: Create payment order
    const paymentOrderResult = await apiCall('/create-payment-order', {
      method: 'POST',
      body: JSON.stringify({
        amount: finalTotal,
        currency: 'INR',
        gateway: paymentMethod.toLowerCase(), // 'razorpay' or 'payu'
        receipt: `receipt_${Date.now()}`
      })
    });

    if (!paymentOrderResult.success) {
      throw new Error('Failed to create payment order');
    }

    // Step 3: Open Razorpay/PayU payment modal
    if (paymentMethod.toLowerCase() === 'razorpay') {
      await processRazorpayPayment(paymentOrderResult, finalTotal, deliveryInfo);
    } else if (paymentMethod.toLowerCase() === 'payu') {
      await processPayUPayment(paymentOrderResult, finalTotal, deliveryInfo);
    }

    // Step 4: After successful payment verification, create order
    // (This happens in the payment success callback below)

  } catch (error: any) {
    console.error('Payment error:', error);
    toast.error(error.message || 'Payment failed');
  }
};

// Razorpay Payment Handler
const processRazorpayPayment = (
  paymentOrderData: any,
  amount: number,
  deliveryInfo: any
) => {
  return new Promise((resolve, reject) => {
    const options = {
      key: paymentOrderData.keyId,
      amount: paymentOrderData.amount,
      currency: paymentOrderData.currency,
      name: 'Sheetcutters.com',
      description: 'Laser Cutting Service',
      order_id: paymentOrderData.orderId,
      handler: async (response: any) => {
        try {
          // Verify payment
          const verifyResult = await apiCall('/verify-payment', {
            method: 'POST',
            body: JSON.stringify({
              gateway: 'razorpay',
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });

          if (!verifyResult.success || !verifyResult.verified) {
            throw new Error('Payment verification failed');
          }

          // Payment verified! Now create the actual order
          await createOrderAfterPayment(deliveryInfo, verifyResult.paymentId);
          resolve(true);
        } catch (error: any) {
          reject(error);
        }
      },
      prefill: {
        name: `${deliveryInfo.firstName} ${deliveryInfo.lastName}`,
        email: user.email,
        contact: deliveryInfo.phone
      },
      theme: {
        color: '#dc0000' // Your brand color
      },
      modal: {
        ondismiss: () => {
          reject(new Error('Payment cancelled'));
        }
      }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  });
};

// Create order after successful payment
const createOrderAfterPayment = async (
  deliveryInfo: any,
  paymentId: string
) => {
  setIsUploading(true);

  try {
    // Upload file (if needed)
    let uploadedFilePath = filePath;
    if (file && !filePath) {
      const uploadResult = await uploadDXF(file);
      if (!uploadResult.success) {
        throw new Error('File upload failed');
      }
      uploadedFilePath = uploadResult.filePath;
    }

    // Create order
    const orderData = {
      orders: [{
        fileName,
        filePath: uploadedFilePath,
        material: selectedMaterial,
        thickness: selectedThickness,
        price,
        quantity: orderQuantity,
        dxfData,
        isSketchService: false
      }],
      deliveryInfo,
      paymentMethod: 'razorpay',
      paymentId: paymentId, // Include verified payment ID
      paymentStatus: 'paid', // Mark as paid
      // ... other fields
    };

    const result = await apiCall('/orders/batch', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });

    if (!result.success) throw new Error(result.error);

    setOrderId(result.batchId || result.orderId);
    startTransition(() => {
      setCurrentScreen('final');
      setCurrentStep(5);
    });
    toast.success('Payment successful! Order placed.');
  } catch (error: any) {
    console.error('Order creation error:', error);
    toast.error(error.message || 'Failed to create order');
  } finally {
    setIsUploading(false);
  }
};
```

---

## 🧪 Testing Steps

### 1. **Test Mode Setup**

For testing, use Razorpay Test API keys:

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys)
2. Switch to "Test Mode"
3. Copy Test Key ID (`rzp_test_xxxxx`)
4. Copy Test Key Secret (`xxxxx`)
5. Add them in Admin Panel → Payments → Gateway Settings

### 2. **Test Payment Flow**

1. Add an item to cart
2. Click "Proceed to Checkout"
3. Fill delivery details
4. Click "Pay Now"
5. **Razorpay modal should appear** ✅
6. Use test card: `4111 1111 1111 1111`
7. Expiry: Any future date
8. CVV: Any 3 digits
9. Click "Pay"
10. Payment should succeed ✅
11. Order should be created ✅
12. Files should upload ✅
13. Show confirmation page ✅

### 3. **Test Cards (Razorpay Test Mode)**

| Card Number | Type | Result |
|-------------|------|--------|
| `4111 1111 1111 1111` | Visa | Success |
| `5555 5555 5555 4444` | Mastercard | Success |
| `4000 0000 0000 0002` | Visa | Failed (Decline) |

---

## 🎯 Implementation Priority

### Phase 1: Razorpay Only (RECOMMENDED)
Start with Razorpay only since it's simpler and more commonly used in India.

1. ✅ Load Razorpay SDK in `index.html`
2. ✅ Refactor `handlePlaceOrder` to create payment order
3. ✅ Open Razorpay modal
4. ✅ Verify payment
5. ✅ Create order after payment success

### Phase 2: PayU Integration (Later)
PayU is more complex (requires hash generation, redirect-based flow).

---

## 🔒 Security Notes

### ✅ **Server-Side Verification (IMPLEMENTED)**

The `/verify-payment` endpoint verifies signatures server-side:

**Razorpay:**
```typescript
const expectedSignature = crypto
  .createHmac('sha256', secretKey)
  .update(`${razorpay_order_id}|${razorpay_payment_id}`)
  .digest('hex');

if (expectedSignature !== razorpay_signature) {
  // Payment REJECTED
}
```

**PayU:**
```typescript
const hashString = `${secretKey}|${status}||||||||||${email}|${firstName}|${productInfo}|${amount}|${txnid}|${merchantId}`;
const expectedHash = crypto.createHash('sha512').update(hashString).digest('hex');

if (expectedHash !== hash) {
  // Payment REJECTED
}
```

### ❌ **Never Trust Frontend Payment Data**

ALWAYS verify payment on server before creating orders. The endpoints I added do this correctly.

---

## 📊 Database Changes Required

### Update Orders Table

Add payment tracking fields to the `orders` table:

```sql
-- Add payment fields
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_id TEXT,
ADD COLUMN IF NOT EXISTS payment_gateway TEXT, -- 'razorpay' or 'payu'
ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMP;
```

Update order creation in `/orders/batch` endpoint to store payment info.

---

## 🎨 User Experience

### Before Payment:
- "Pay Now" button enabled
- "Processing Order" shown after clicking

### During Payment:
- Razorpay modal opens
- User enters card details
- Shows loading spinner

### After Payment Success:
- "Payment Successful!" toast
- "Uploading Files..." progress
- Redirect to confirmation page

### After Payment Failure:
- "Payment Failed" toast
- User stays on checkout page
- Can retry payment

---

## 🐛 Common Issues & Solutions

### Issue 1: "Razorpay is not defined"
**Solution:** Add Razorpay SDK script to `index.html`

### Issue 2: Payment modal doesn't open
**Solution:** Check browser console for errors. Verify API keys are correct.

### Issue 3: Payment succeeds but order fails
**Solution:** Check server logs. Ensure file upload succeeds after payment.

### Issue 4: "Payment verification failed"
**Solution:** Check that secret key is correct in admin panel. Ensure signature verification logic is correct.

---

## 📝 Next Steps

1. **Add Razorpay SDK to index.html**
2. **Refactor `handlePlaceOrder` in App.tsx** (most complex part)
3. **Test with Razorpay test mode**
4. **Add database migration for payment fields**
5. **Update order creation endpoints to store payment info**
6. **Add PayU integration (later)**

---

## 🚀 Quick Start (Minimal Implementation)

For a quick test, you can create a separate payment button in CheckoutScreen that:

1. Calls `/create-payment-order`
2. Opens Razorpay modal
3. On success, shows "Payment successful" alert
4. Then calls existing order creation flow

This lets you test payment integration without refactoring the entire flow.

---

## ⚠️ IMPORTANT WARNING

**DO NOT create orders before payment verification!** This causes:

- Revenue loss (orders placed without payment)
- Inventory issues (stock allocated to unpaid orders)
- Customer confusion (confirmation page shown without payment)

The current implementation has this bug - fix it ASAP before going live!

---

Need help implementing this? Let me know which part you'd like to tackle first! 🚀
