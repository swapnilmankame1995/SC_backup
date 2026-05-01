# 🧪 Testing Referral Link System

## Issue Identified

The referral link `https://sheetcutters.com?ref=TEST10` wasn't working because you might be:
1. Testing on **localhost** (which doesn't match the production domain)
2. Getting redirected from `sheetcutters.com` to `www.sheetcutters.com` before detection runs
3. Having browser extensions blocking localStorage or scripts

---

## How to Test Properly

### **Option 1: Test on Localhost** (Development)

If you're running the app locally:

```
http://localhost:3000?ref=TEST10
```

OR if using a different port:

```
http://localhost:5173?ref=TEST10
```

**What to expect:**
1. Open browser **Developer Tools** (F12)
2. Go to **Console** tab
3. Navigate to the URL above
4. You should see these logs:
   ```
   🔍 URL Detection - Full URL: http://localhost:3000?ref=TEST10
   🔍 URL Detection - Search params: ?ref=TEST10
   🔍 URL Detection - Ref code found: TEST10
   🔗 Affiliate referral detected: TEST10
   📢 Showing toast: Referral code "TEST10" will be applied at checkout!
   ```
5. Toast notification should appear
6. Check localStorage:
   ```javascript
   localStorage.getItem('referralCode')
   // Should return: "TEST10"
   ```

---

### **Option 2: Test on Production** (Live Site)

The production site uses `www.sheetcutters.com`, so use:

```
https://www.sheetcutters.com?ref=TEST10
```

**NOT:**
```
https://sheetcutters.com?ref=TEST10  ❌ (redirects to www, may lose params)
```

**What to expect:**
1. Open browser **Developer Tools** (F12)
2. Go to **Console** tab
3. Navigate to `https://www.sheetcutters.com?ref=TEST10`
4. Check console logs (same as above)
5. Toast notification should appear
6. Check localStorage (same as above)

---

### **Option 3: Test the Redirect**

To see if the redirect preserves parameters:

1. Navigate to:
   ```
   https://sheetcutters.com?ref=TEST10
   ```

2. Watch the browser URL bar - it should redirect to:
   ```
   https://www.sheetcutters.com?ref=TEST10
   ```

3. Check if `?ref=TEST10` is still there after redirect

4. Check console logs to see if detection ran

---

## Debugging Checklist

### Step 1: Check Browser Console

Open Developer Tools (F12) → Console tab

Look for these logs:
- ✅ `🔍 URL Detection - Full URL:` → Shows the complete URL
- ✅ `🔍 URL Detection - Search params:` → Shows `?ref=TEST10`
- ✅ `🔍 URL Detection - Ref code found:` → Shows `TEST10`
- ✅ `🔗 Affiliate referral detected:` → Confirms detection
- ❌ `ℹ️ No referral code found in URL` → Means detection failed

---

### Step 2: Check localStorage

In Console tab, type:

```javascript
localStorage.getItem('referralCode')
```

**Expected:** `"TEST10"`  
**If null:** Detection didn't run or failed

---

### Step 3: Check URL Parameters

In Console tab, type:

```javascript
window.location.search
```

**Expected:** `"?ref=TEST10"`  
**If empty:** Parameters were lost during redirect

---

### Step 4: Manually Test Storage

In Console tab, type:

```javascript
// Manually set referral code
localStorage.setItem('referralCode', 'TEST10');

// Verify it was set
localStorage.getItem('referralCode');
// Should return: "TEST10"

// Try showing a toast
toast.info('Testing toast notification!');
```

If the toast shows, the system is working, just not detecting from URL.

---

## Common Issues & Solutions

### Issue 1: "No toast appears"

**Possible causes:**
- Browser ad blocker blocking toasts
- JavaScript errors preventing code execution
- Toaster component not rendered

**Solutions:**
1. Check browser console for errors (red messages)
2. Disable ad blockers and try again
3. Check if other toasts work (try the manual test above)

---

### Issue 2: "Console shows 'No referral code found'"

**Possible causes:**
- URL parameters lost during redirect
- Typo in URL (should be `?ref=` not `?code=`)
- Testing on wrong domain

**Solutions:**
1. Use `www.sheetcutters.com` instead of `sheetcutters.com`
2. Check if URL parameters are present: `window.location.search`
3. Try on localhost first to isolate production issues

---

### Issue 3: "localStorage is null"

**Possible causes:**
- Browser privacy mode blocking localStorage
- localStorage disabled in browser settings
- Code not executing

**Solutions:**
1. Exit incognito/private mode and try in normal mode
2. Check browser settings for localStorage
3. Try manual localStorage test (see Step 4 above)

---

### Issue 4: "Works on localhost, not on production"

**Possible causes:**
- Using `sheetcutters.com` instead of `www.sheetcutters.com`
- Redirect losing parameters
- Production environment differences

**Solutions:**
1. Always use `https://www.sheetcutters.com?ref=TEST10`
2. Check if redirect preserves parameters
3. Check production console logs for errors

---

## Testing the Full Flow

### Complete Test Procedure:

1. **Clear localStorage first:**
   ```javascript
   localStorage.clear()
   ```

2. **Navigate to referral link:**
   ```
   https://www.sheetcutters.com?ref=TEST10
   ```

3. **Check console logs:**
   - Should see detection logs
   - Should see "TEST10" found

4. **Check toast notification:**
   - Should appear in top-right corner
   - Should say: "Referral code 'TEST10' will be applied at checkout!"

5. **Upload a file:**
   - Click "Get Started"
   - Upload any DXF file
   - Select material and thickness

6. **Go to checkout:**
   - Click "Continue to Checkout"
   - Check discount code field

7. **Expected result:**
   - Discount code field shows: "TEST10"
   - Another toast appears: "Referral code 'TEST10' is ready to apply!"

8. **Click "Apply" button:**
   - Backend validates code
   - Discount applied to order

9. **After order completes:**
   ```javascript
   localStorage.getItem('referralCode')
   // Should return: null (cleared)
   ```

---

## Quick Test Commands

Copy these into browser console:

```javascript
// Check current URL and parameters
console.log('URL:', window.location.href);
console.log('Params:', window.location.search);
console.log('Ref:', new URLSearchParams(window.location.search).get('ref'));

// Check localStorage
console.log('Stored code:', localStorage.getItem('referralCode'));

// Manually set and test
localStorage.setItem('referralCode', 'TEST10');
console.log('After manual set:', localStorage.getItem('referralCode'));

// Test toast
toast.info('Test toast notification');

// Clear for next test
localStorage.removeItem('referralCode');
```

---

## What I Added for Debugging

I've added console logs to help diagnose the issue:

**In `/App.tsx` (lines 150-152):**
```javascript
console.log('🔍 URL Detection - Full URL:', window.location.href);
console.log('🔍 URL Detection - Search params:', window.location.search);
console.log('🔍 URL Detection - Ref code found:', refCode);
```

**Also added:**
```javascript
} else {
  console.log('ℹ️ No referral code found in URL');
}
```

Now when you load the page, you'll see exactly what's happening.

---

## Next Steps

1. **Try on localhost first:**
   ```
   http://localhost:3000?ref=TEST10
   ```

2. **Check console logs** - tell me what you see

3. **If working on localhost, try production:**
   ```
   https://www.sheetcutters.com?ref=TEST10
   ```

4. **Share console logs** if still not working

---

## Expected Console Output (Success)

```
🔍 URL Detection - Full URL: https://www.sheetcutters.com?ref=TEST10
🔍 URL Detection - Search params: ?ref=TEST10
🔍 URL Detection - Ref code found: TEST10
🔗 Affiliate referral detected: TEST10
📢 Showing toast: Referral code "TEST10" will be applied at checkout!
```

## Expected Console Output (Failure)

```
🔍 URL Detection - Full URL: https://www.sheetcutters.com
🔍 URL Detection - Search params: 
🔍 URL Detection - Ref code found: null
ℹ️ No referral code found in URL
```

If you see the failure output, the URL parameters were lost somewhere.

---

**Let me know what the console logs show!** 🔍
