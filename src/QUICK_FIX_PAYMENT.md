# 🚀 Quick Fix: Payment Gateway Integration

## Problem
Clicking "Pay Now" skips payment and creates orders immediately.

## Solution (3 Steps)

### Step 1: Add Razorpay SDK
Find your main HTML file (`index.html` or `public/index.html`) and add before `</body>`:

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### Step 2: Configure Razorpay Test Keys  
1. Go to Admin Panel → Payments → Gateway Settings
2. Select Razorpay
3. Key ID: `rzp_test_xxxxxxxxxx` (get from https://dashboard.razorpay.com/app/keys)
4. Secret Key: `xxxxxxxxxx`
5. Enable checkbox ✅
6. Save

### Step 3: Update handlePlaceOrder in App.tsx

**Find this code (around line 396):**
```typescript
const handlePlaceOrder = async (paymentMethod: string, ...) => {
  // ... current code that creates order immediately
}
```

**Add THIS NEW FUNCTION above it:**
```typescript
const handlePayment = async (
  finalAmount: number,
  gateway: string,
  deliveryInfo: any,
  onSuccess: (paymentId: string) => void
) => {
  console.log(`💳 Creating ${gateway} payment for ₹${finalAmount}`);
  
  // Create payment order
  const paymentOrder = await apiCall('/create-payment-order', {
    method: 'POST',
    body: JSON.stringify({
      amount: finalAmount,
      currency: 'INR',
      gateway: gateway.toLowerCase(),
      receipt: `order_${Date.now()}`
    })
  });

  if (!paymentOrder.success) {
    throw new Error('Failed to create payment order');
  }

  // Open Razorpay modal
  const options = {
    key: paymentOrder.keyId,
    amount: paymentOrder.amount,
    currency: paymentOrder.currency,
    name: 'Sheetcutters.com',
    description: 'Laser Cutting Service',
    order_id: paymentOrder.orderId,
    handler: async (response: any) => {
      try {
        // Verify payment
        const verify = await apiCall('/verify-payment', {
          method: 'POST',
          body: JSON.stringify({
            gateway: 'razorpay',
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          })
        });

        if (verify.success && verify.verified) {
          toast.success('Payment successful!');
          onSuccess(verify.paymentId);
        } else {
          throw new Error('Payment verification failed');
        }
      } catch (error: any) {
        toast.error(error.message || 'Payment failed');
      }
    },
    prefill: {
      name: `${deliveryInfo.firstName} ${deliveryInfo.lastName}`,
      email: user.email,
      contact: deliveryInfo.phone || ''
    },
    theme: {
      color: '#dc0000'
    },
    modal: {
      ondismiss: () => toast.error('Payment cancelled')
    }
  };

  const rzp = new (window as any).Razorpay(options);
  rzp.open();
};
```

**Then UPDATE handlePlaceOrder to call payment FIRST:**
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
    // Get final amount from CheckoutScreen
    const pricingData = JSON.parse(sessionStorage.getItem('orderPricing') || '{}');
    const finalAmount = pricingData.total || price;

    // PAYMENT FIRST! 💳
    await handlePayment(finalAmount, paymentMethod, deliveryInfo, async (paymentId) => {
      // This callback runs AFTER successful payment
      setIsUploading(true);

      try {
        // NOW create the order (existing code, but add paymentId)
        if (isSketchWorkflow) {
          // ... existing sketch workflow code ...
        } else {
          // ... existing DXF workflow code ...
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
            paymentMethod,
            paymentId, // ✅ Add this
            paymentStatus: 'paid', // ✅ Add this
            discountCode,
            pointsUsed,
            notes: orderNotes || '',
            shippingCost,
            shippingCarrier,
            totalWeight: totalWeight || 0,
          };

          const result = await apiCall('/orders/batch', {
            method: 'POST',
            body: JSON.stringify(orderData)
          });

          if (!result.success) throw new Error(result.error);

          setOrderId(result.batchId || result.orderId);
        }

        startTransition(() => {
          setCurrentScreen('final');
          setCurrentStep(5);
        });
        toast.success('Order placed successfully!');
      } catch (error: any) {
        console.error('Order creation error:', error);
        toast.error(error.message || 'Failed to create order');
      } finally {
        setIsUploading(false);
      }
    });

  } catch (error: any) {
    console.error('Payment error:', error);
    toast.error(error.message || 'Payment failed');
  }
};
```

## Test It! 🧪

1. Add item to cart
2. Checkout
3. Click "Pay Now"
4. **Razorpay modal opens** ✅
5. Test card: `4111 1111 1111 1111`
6. Expiry: `12/25`, CVV: `123`
7. Click Pay
8. **"Payment successful!"** ✅
9. **Order created** ✅

## Done! 🎉

Your payment gateway is now integrated. Orders will ONLY be created after successful payment.

---

**What I Did:**
- ✅ Added `/create-payment-order` endpoint
- ✅ Added `/verify-payment` endpoint
- ✅ Fixed all `.upsert()` conflicts

**What You Need to Do:**
- ✅ Add Razorpay SDK to HTML
- ✅ Update `handlePlaceOrder` in App.tsx
- ✅ Test with Razorpay test mode

**Production Checklist:**
- [ ] Replace test keys with live keys
- [ ] Test with real card (small amount)
- [ ] Add payment history in admin panel
- [ ] Add database fields for payment tracking

---

See `/PAYMENT_INTEGRATION_SUMMARY.md` for detailed explanation.
