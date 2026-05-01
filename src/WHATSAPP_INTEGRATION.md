# 📱 WhatsApp Integration Flow

## Overview
The WhatsApp number is a configurable support contact that appears throughout your application. Admins can update it from the Admin Panel, and it's stored in the database for consistency across all components.

---

## 🔄 Complete Data Flow

### **1. Storage (Database)**
**Location:** `settings` table in Supabase (migrated from `kv_store_8927474f`)  
**Key:** `support_settings`  
**Structure:**
```json
{
  "whatsappNumber": "918217553454",
  "supportEmail": "support@sheetcutters.com",
  "supportHours": "9 AM - 6 PM IST"
}
```

**Important:** Direct frontend writes are blocked by RLS policies. All updates go through the server API.

---

### **2. Server API Endpoints**
**File:** `/supabase/functions/server/index.tsx`

**Endpoints:**
- `GET /make-server-8927474f/settings/support` - Load settings (no auth required)
- `POST /make-server-8927474f/settings/support` - Update settings (admin only)

**Server Flow:**
```typescript
// GET - Load settings
app.get('/make-server-8927474f/settings/support', async (c) => {
  // Fetches from settings table using service role key
  // Returns default if not found
});

// POST - Update settings (admin only)
app.post('/make-server-8927474f/settings/support', async (c) => {
  // Verifies admin user
  // Updates settings table
  // Returns updated settings
});
```

---

### **3. Context Provider (Global State)**
**File:** `/contexts/SupportContext.tsx`

**Default Values:**
```typescript
const defaultSettings: SupportSettings = {
  whatsappNumber: '918217553454', // Default with country code
  supportEmail: 'support@sheetcutters.com',
  supportHours: '9 AM - 6 PM IST',
};
```

**Key Functions:**
- `loadSettings()` - Calls API endpoint `/settings/support`
- `updateSettings()` - Calls API endpoint with POST
- `useSupport()` - Hook to access settings in any component

**API Integration:**
```typescript
const loadSettings = async () => {
  const result = await apiCall('/settings/support', { method: 'GET' }, false);
  // No direct database access - uses server API
};

const updateSettings = async (newSettings) => {
  const result = await apiCall('/settings/support', {
    method: 'POST',
    body: JSON.stringify(newSettings),
  });
  // Server handles auth & RLS
};
```

---

### **4. Admin Panel (Update Interface)**
**File:** `/components/AdminPanel.tsx`

**Admin Flow:**
1. Admin navigates to **Settings** section
2. WhatsApp number field loads current value from context
3. Admin edits the number
4. Clicks **"Save Number"** button
5. `handleSaveWhatsAppNumber()` is called:

```typescript
const handleSaveWhatsAppNumber = async () => {
  setIsSavingSupport(true);
  try {
    await updateSupportSettings({ whatsappNumber });
    toast.success('WhatsApp number updated successfully');
  } catch (error: any) {
    console.error('Save WhatsApp number error:', error);
    toast.error('Failed to update WhatsApp number');
  } finally {
    setIsSavingSupport(false);
  }
};
```

**UI Location:**
- Admin Panel → Settings Tab
- Input field with "Save Number" button
- Shows loading state while saving

---

### **5. Frontend Components (Display & Click)**

#### **A. WhatsApp Floating Button**
**File:** `/components/WhatsAppFloatingButton.tsx`

**Displays:** Floating green button in bottom-right corner  
**Visibility:** Shows on all screens EXCEPT landing page  
**Action:** Opens WhatsApp chat when clicked

```typescript
const handleClick = () => {
  const url = `https://wa.me/${settings.whatsappNumber}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};
```

**Rendering in App:**
```tsx
{currentScreen !== 'landing' && <WhatsAppFloatingButton />}
```

---

#### **B. WhatsApp Contact Link**
**File:** `/components/WhatsAppContactLink.tsx`

**Displays:** Text link with icon  
**Location:** Multiple screens at bottom
**Action:** Opens WhatsApp chat when clicked

**Used In:**
- `/components/UploadScreen.tsx`
- `/components/MaterialScreen.tsx`
- `/components/ThicknessScreen.tsx`
- `/components/SummaryScreen.tsx`
- `/components/FinalScreen.tsx`

**Example Usage:**
```tsx
<div className="text-center mt-4">
  <WhatsAppContactLink />
</div>
```

---

### **6. Backend/Server Usage**
**File:** `/supabase/functions/server/invoice-routes-fixed.tsx`

**Usage:** Includes WhatsApp number in invoice emails

```typescript
const emailHtml = `
  <p>Dear ${invoice.customer.name},</p>
  <p>Your invoice ${invoice.invoiceNumber} for order ${invoice.orderNumber} is ready.</p>
  <p>Total Amount: ₹${invoice.totalAmount.toFixed(2)}</p>
  <p>Download your invoice from your dashboard or contact us for assistance.</p>
  <p>WhatsApp: +${supportSettings.whatsappNumber}</p>
`;
```

---

## 📊 Component Hierarchy

```
App.tsx
├── SupportProvider (wraps entire app)
│   └── Provides: { settings, updateSettings, isLoading }
│
├── WhatsAppFloatingButton (shows on all non-landing screens)
│   └── Uses: settings.whatsappNumber
│
└── Screen Components
    ├── UploadScreen
    ├── MaterialScreen
    ├── ThicknessScreen
    ├── SummaryScreen
    └── FinalScreen
        └── Each contains: <WhatsAppContactLink />
            └── Uses: settings.whatsappNumber

AdminPanel (Settings Tab)
└── Updates: whatsappNumber via updateSupportSettings()
```

---

## 🔧 How It Works: Step by Step

### **On App Load:**
1. ✅ `SupportProvider` mounts in `App.tsx`
2. ✅ `loadSettings()` is called automatically
3. ✅ Fetches from database: `kv_store_8927474f.support_settings`
4. ✅ If found, loads saved number
5. ✅ If NOT found, uses default: `918123629917`
6. ✅ Sets `isLoading = false`
7. ✅ All components can now access via `useSupport()`

### **When User Clicks WhatsApp:**
1. ✅ User clicks floating button or text link
2. ✅ `handleClick()` is triggered
3. ✅ Constructs URL: `https://wa.me/918123629917`
4. ✅ Opens in new tab/window
5. ✅ WhatsApp Web/App opens with pre-filled chat

### **When Admin Updates Number:**
1. ✅ Admin logs into Admin Panel
2. ✅ Navigates to **Settings** tab
3. ✅ Edits WhatsApp number field
4. ✅ Clicks **"Save Number"**
5. ✅ `handleSaveWhatsAppNumber()` is called
6. ✅ `updateSupportSettings({ whatsappNumber })` is executed
7. ✅ Updates database: `kv_store_8927474f.support_settings`
8. ✅ Updates context state immediately
9. ✅ ALL components reactively update with new number
10. ✅ Success toast shows: "WhatsApp number updated successfully"

---

## 🎯 Key Files Reference

| File | Purpose |
|------|---------|
| `/contexts/SupportContext.tsx` | Global state management, database sync |
| `/components/AdminPanel.tsx` | Admin interface to update number |
| `/components/WhatsAppFloatingButton.tsx` | Floating button UI component |
| `/components/WhatsAppContactLink.tsx` | Text link UI component |
| `/App.tsx` | Wraps app with SupportProvider, shows floating button |

---

## 💾 Database Schema

**Table:** `kv_store_8927474f`

| Column | Type | Value |
|--------|------|-------|
| `key` | text | `'support_settings'` |
| `value` | text | `'{"whatsappNumber":"918123629917","supportEmail":"support@sheetcutters.com","supportHours":"9 AM - 6 PM IST"}'` |

---

## 🚀 How to Update WhatsApp Number

### **Method 1: Via Admin Panel (Recommended)**
1. Log into Admin Panel (requires admin authentication)
2. Click **Settings** in sidebar
3. Find "Support Settings" section
4. Enter new WhatsApp number (with country code)
   - Format: `918123629917` (no + or spaces)
   - India: `91` prefix
5. Click **"Save Number"**
6. ✅ Done! Updates everywhere instantly

### **Method 2: Direct Database Edit (Advanced)**
1. Go to Supabase Dashboard
2. Navigate to Table Editor
3. Open `kv_store_8927474f` table
4. Find row where `key = 'support_settings'`
5. Edit the `value` JSON:
   ```json
   {
     "whatsappNumber": "YOUR_NEW_NUMBER",
     "supportEmail": "support@sheetcutters.com",
     "supportHours": "9 AM - 6 PM IST"
   }
   ```
6. Save
7. Refresh your app to see changes

### **Method 3: Change Default (Code)**
Edit `/contexts/SupportContext.tsx`:
```typescript
const defaultSettings: SupportSettings = {
  whatsappNumber: 'YOUR_NEW_DEFAULT', // Change here
  supportEmail: 'support@sheetcutters.com',
  supportHours: '9 AM - 6 PM IST',
};
```

---

## 🔍 Where WhatsApp Number Appears

### **Frontend (User-Facing):**
1. ✅ **Floating Button** - Bottom-right on all screens (except landing)
2. ✅ **Upload Screen** - Bottom contact link
3. ✅ **Material Selection** - Bottom contact link
4. ✅ **Thickness Selection** - Bottom contact link
5. ✅ **Summary/Cart** - Bottom contact link
6. ✅ **Order Confirmation** - Bottom contact link

### **Backend (Server/Emails):**
1. ✅ **Invoice Emails** - Included in email body
2. ✅ **Server-side notifications** - Available via context

---

## 📱 WhatsApp URL Format

**Standard Format:**
```
https://wa.me/918123629917
```

**With Pre-filled Message (Optional):**
```
https://wa.me/918123629917?text=Hello%20Sheetcutters!
```

**Number Format:**
- ✅ Include country code (91 for India)
- ✅ Remove all spaces, dashes, parentheses
- ✅ Remove the + symbol
- ❌ Don't use: +91 81236 29917
- ✅ Do use: 918123629917

---

## 🛡️ Error Handling

**If Database Load Fails:**
- Falls back to default: `918217553454`
- Console logs error for debugging
- App continues to work with default

**If Save Fails:**
- Shows error toast: "Failed to update WhatsApp number"
- Console logs detailed error
- Original number remains unchanged

**If Components Load Before Settings:**
- `isLoading` flag prevents rendering
- Returns `null` until settings loaded
- Prevents React suspense errors

---

## 🔒 Security & RLS (Row-Level Security)

**Problem:** Direct frontend writes to database tables are blocked by RLS policies.

**Solution:** All updates go through authenticated server endpoints.

**Error Example (Old Approach):**
```
❌ Error: new row violates row-level security policy for table "kv_store_8927474f"
```

**Fixed Architecture:**
```
Frontend (SupportContext)
    ↓ apiCall()
Server Endpoint (with service role key)
    ↓ bypasses RLS
Database (settings table)
```

**Why This Works:**
- Frontend uses `publicAnonKey` (limited permissions)
- Server uses `serviceRoleKey` (full permissions)
- Admin verification happens server-side
- RLS policies enforced at database level

---

## 🔧 Reactive Updates

When admin updates the number:
1. Context state updates immediately
2. All components using `useSupport()` re-render
3. Floating button updates
4. All contact links update
5. No page refresh needed ✨

---

## 📝 Current Default

**WhatsApp Number:** `918123629917`  
**Format:** India (+91) followed by 10-digit number  
**Opens To:** WhatsApp chat with Sheetcutters support

---

## 🎨 UI Components

### **Floating Button**
- **Position:** Fixed bottom-right
- **Color:** Green (#25D366 - WhatsApp brand)
- **Icon:** MessageCircle (lucide-react)
- **Hover:** Scales up slightly
- **Mobile:** Adjusts position for mobile screens

### **Contact Link**
- **Style:** Blue text with icon
- **Icon:** MessageCircle (optional via prop)
- **Hover:** Underline effect
- **Text:** "Need help? Contact us on WhatsApp"

---

**Last Updated:** December 15, 2024  
**Current Version:** 2.0.1  
**Default WhatsApp:** 918123629917