oad large DXF file (high cutting length)
- [ ] Select heavy material (e.g., Stainless Steel)
- [ ] Select thick option (e.g., 3mm)
- [ ] Set high quantity (e.g., 10)
- [ ] Proceed to checkout
- [ ] Select Karnataka as state
- [ ] Verify shipping cost (lower)
- [ ] Change state to Tamil Nadu
- [ ] Verify shipping cost increases
- [ ] Verify weight is calculated correctly

#### Test Case 9: Multiple Browser Tabs + Cart Sync
- [ ] Open site in Tab 1
- [ ] Add item to cart
- [ ] Open site in Tab 2 (same browser)
- [ ] Verify cart count shows correctly in Tab 2
- [ ] Add different item to cart in Tab 2
- [ ] Switch back to Tab 1
- [ ] Verify cart has both items (might need refresh)

#### Test Case 10: Mobile Purchase Flow
- [ ] Access site on mobile device
- [ ] Complete full purchase flow from landing to order
- [ ] Verify all interactions work on touch
- [ ] Verify layout is appropriate for mobile
- [ ] Verify checkout form is easy to complete
- [ ] Verify payment buttons work
- [ ] Complete order successfully

---

## 20. Edge Cases & Error Handling

### 20.1 File Upload Edge Cases
- [ ] Upload file with special characters in filename
- [ ] Upload file with very long filename (> 255 chars)
- [ ] Upload file with no extension
- [ ] Upload file with wrong extension but correct content
- [ ] Upload corrupted DXF file
- [ ] Upload DXF file with zero dimensions
- [ ] Upload DXF file with extremely large dimensions (> 3000mm)
- [ ] Upload DXF file with negative dimensions
- [ ] Upload multiple files simultaneously
- [ ] Cancel upload mid-process

### 20.2 Input Validation Edge Cases
- [ ] Enter negative quantity
- [ ] Enter quantity = 0
- [ ] Enter extremely large quantity (> 1000)
- [ ] Enter non-numeric characters in quantity
- [ ] Enter special characters in name fields
- [ ] Enter SQL injection attempt in text fields
- [ ] Enter XSS attempt in text fields
- [ ] Enter email without @ symbol
- [ ] Enter phone number with letters
- [ ] Enter pin code with 5 digits (should be 6)
- [ ] Enter pin code with 7 digits
- [ ] Leave required fields empty and try to submit

### 20.3 Payment Edge Cases
- [ ] ⚠️ Try to place order with ₹0 total
- [ ] ⚠️ Try to place order with negative total
- [ ] Apply discount code that makes total negative
- [ ] Apply loyalty points greater than order total
- [ ] Try to use points without being logged in
- [ ] Try to use expired discount code
- [ ] Try to use discount code at usage limit
- [ ] Try to apply multiple discount codes

### 20.4 Cart Edge Cases
- [ ] Add 100+ items to cart
- [ ] Add same item 50+ times
- [ ] Remove all items from cart
- [ ] Modify cart item quantity to 0
- [ ] Access cart with expired items
- [ ] Clear localStorage while items in cart
- [ ] Add item, logout, login, verify cart persists

### 20.5 Order Edge Cases
- [ ] Place order with all fields at minimum length
- [ ] Place order with all fields at maximum length
- [ ] Place order without delivery info (should fail)
- [ ] Place order without payment method (should fail)
- [ ] Place order as guest without email
- [ ] Place order with invalid pin code format
- [ ] Place order with future date (if date input exists)

### 20.6 Authentication Edge Cases
- [ ] Login with whitespace in email
- [ ] Login with uppercase email (should normalize)
- [ ] Signup with existing email (different case)
- [ ] Login immediately after signup (within 1 second)
- [ ] Logout during active API call
- [ ] Session expires during checkout process
- [ ] Token refresh fails during active session
- [ ] Multiple login attempts with wrong password (rate limiting)
- [ ] Access protected route without login
- [ ] Access admin route as non-admin

### 20.7 Admin Panel Edge Cases
- [ ] Delete material that's used in existing orders
- [ ] Delete user with existing orders
- [ ] Update order status to invalid value
- [ ] Create discount code with empty code field
- [ ] Create affiliate with existing code
- [ ] Set discount value > order total
- [ ] Set commission rate > 100%
- [ ] Set negative pricing for material
- [ ] Bulk update materials with negative percentage

### 20.8 Network Edge Cases
- [ ] Slow network (throttle to 3G)
- [ ] Intermittent connection (disconnect/reconnect)
- [ ] API timeout (> 30 seconds)
- [ ] Server returns 500 error
- [ ] Server returns 403 error
- [ ] Server returns malformed JSON
- [ ] File upload fails mid-upload
- [ ] Retry failed API call

### 20.9 Browser Edge Cases
- [ ] Disable JavaScript (site should show message)
- [ ] Disable localStorage (cart won't persist)
- [ ] Clear cookies mid-session
- [ ] Back button after checkout
- [ ] Forward button during workflow
- [ ] Refresh page during file upload
- [ ] Multiple tabs with same user logged in
- [ ] Open site in incognito mode
- [ ] Block popups (for tracking URL)

### 20.10 Database Edge Cases
- [ ] Database connection fails
- [ ] RLS policy denies access
- [ ] Duplicate order number generated
- [ ] Foreign key constraint violation
- [ ] Concurrent order creation by same user
- [ ] Database read timeout
- [ ] Database write timeout

### 20.11 Pricing Edge Cases
- [ ] Material with no pricing for selected thickness
- [ ] Thickness not in pricing table
- [ ] Price calculation results in fraction (e.g., ₹99.555)
- [ ] Price calculation results in ₹0
- [ ] Extremely large dimensions causing overflow
- [ ] Discount reduces price to exactly ₹0
- [ ] Shipping cost > order total

### 20.12 Time/Date Edge Cases
- [ ] Place order at midnight (date boundary)
- [ ] Place order on December 31st (year boundary)
- [ ] View orders across multiple years
- [ ] Discount code expiry at exact timestamp
- [ ] Cart expiry at exact 10-day mark
- [ ] Session token expiry during active use

---

## 📊 Testing Priority Matrix

### Critical Priority (Must Test Before Launch)
1. ⚠️ Payment gateway integration (currently not functional)
2. RLS security (now enabled, verify functionality)
3. File upload and storage
4. Order creation and storage
5. User authentication and session management
6. Price calculation accuracy
7. ₹100 minimum order threshold enforcement
8. Cart persistence and expiry
9. Admin order management
10. Email notifications

### High Priority (Test Thoroughly)
1. Checkout flow (all steps)
2. Cart functionality
3. Discount code system
4. Loyalty points system
5. Shipping cost calculation
6. Invoice generation
7. Admin panel (all sections)
8. Mobile responsiveness
9. Affiliate tracking
10. Delivery info autofill

### Medium Priority (Test Regularly)
1. Google Reviews integration
2. Gallery section
3. Analytics tracking
4. Sketch to CAD workflow
5. Reorder functionality
6. Order status updates
7. User dashboard
8. Material/thickness selection
9. SEO and meta tags
10. PWA features

### Low Priority (Nice to Have)
1. Advanced analytics
2. Email template customization
3. Bulk operations in admin panel
4. CSV exports
5. Additional options (anodising, polishing)
6. WhatsApp integration enhancements
7. Performance optimizations
8. Accessibility improvements

---

## 📝 Test Execution Checklist

### Before Testing
- [ ] Set up test environment (staging/development)
- [ ] Configure test accounts (admin, regular user)
- [ ] Prepare test files (valid/invalid DXF, SVG, images)
- [ ] Set up test discount codes
- [ ] Set up test affiliate codes
- [ ] Configure email testing (Resend sandbox or test email)
- [ ] Review critical bugs from previous testing

### During Testing
- [ ] Use checklist to track progress
- [ ] Document all bugs with screenshots
- [ ] Note any UX improvements
- [ ] Test on multiple devices
- [ ] Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test with different network conditions
- [ ] Record critical bugs separately

### After Testing
- [ ] Create bug report document
- [ ] Prioritize bugs (critical, high, medium, low)
- [ ] Verify all critical features work
- [ ] Sign off on tested features
- [ ] Update testing checklist with new findings

---

## 🔴 Known Critical Issues

### Payment Gateway Not Functional
**Status:** ⚠️ CRITICAL - Orders being created without payment collection  
**Impact:** Business cannot collect revenue  
**Action Required:** Implement actual Razorpay/PayU integration  
**Tracking Document:** `/PAYMENT_INTEGRATION_QUICK_START.md`

### Database RLS Enabled
**Status:** ✅ RESOLVED - RLS now enabled on all tables  
**Impact:** Security vulnerability fixed  
**Action Taken:** Ran SQL queries to enable RLS  
**Verification Needed:** Confirm application still functions correctly

---

## 📌 Test Data Requirements

### User Accounts
- Admin user: admin@sheetcutters.com
- Regular user 1: testuser1@example.com
- Regular user 2: testuser2@example.com
- Guest user: (no account)

### Test Files
- Small DXF (< 100mm × 100mm)
- Medium DXF (100mm - 500mm)
- Large DXF (> 500mm)
- Complex DXF (many entities)
- Simple DXF (few entities)
- SVG file
- Invalid file (wrong format)
- Corrupted file
- Sketch images (JPG, PNG, PDF)

### Discount Codes
- WELCOME10 (10% off)
- FLAT100 (₹100 off)
- EXPIRED123 (expired code)
- LIMITREACHED (usage limit reached)
- AFFILIATE123 (affiliate code)

### Materials
- At least one material from each category
- Materials with multiple thickness options
- Materials with single thickness option
- Material with density defined (for weight calc)

---

## ✅ Sign-Off

**Tested By:** ___________________  
**Date:** ___________________  
**Environment:** [ ] Development [ ] Staging [ ] Production  
**Browser(s):** ___________________  
**Device(s):** ___________________  

**Critical Issues Found:** ___________________  
**High Priority Issues Found:** ___________________  
**Ready for Production:** [ ] Yes [ ] No  

**Notes:**
________________________________________________________________
________________________________________________________________
________________________________________________________________

---

**Document Version:** 1.0  
**Last Updated:** December 10, 2024  
**Next Review:** Before production launch
