# Sheetcutters Analytics Documentation

## 📚 **Documentation Overview**

This folder contains complete documentation for the analytics systems in Sheetcutters.com.

---

## 🚀 **Start Here**

### **New to Analytics?**
👉 **[ANALYTICS-QUICK-START.md](./ANALYTICS-QUICK-START.md)** - 5-minute setup guide

**Quick Summary:**
- Enable Google Analytics (FREE, unlimited)
- Optionally enable Facebook Pixel (for ads)
- Disable custom tracking to save server costs
- **Total cost: $0, zero server resources used**

---

## 📖 **All Documentation**

### **1. Quick Start Guide** ⚡
**File:** `ANALYTICS-QUICK-START.md`  
**Read this if:** You want to get analytics running fast (5 minutes)

**What's inside:**
- Step-by-step Google Analytics setup
- Step-by-step Facebook Pixel setup
- Verification checklist
- Troubleshooting tips

---

### **2. Session Tracking Toggle** 🔄
**File:** `SESSION-TRACKING-TOGGLE.md`  
**Read this if:** You want to enable/disable custom session tracking

**What's inside:**
- Current status (currently DISABLED)
- Why it's disabled (save costs)
- How to re-enable if needed
- Configuration options
- What still works when disabled

---

### **3. Analytics Comparison** 📊
**File:** `analytics-comparison.md`  
**Read this if:** You want to understand which analytics system to use

**What's inside:**
- Google Analytics vs Facebook Pixel vs Custom Tracking
- Cost comparison (spoiler: GA/FB are FREE)
- Feature comparison
- Recommendation for tight budgets
- Migration guide

---

### **4. System Documentation** 🔧
**File:** `analytics-and-tracking.md`  
**Read this if:** You want technical details on how everything works

**What's inside:**
- How custom session tracking works
- Backend endpoints documentation
- Data structures
- API reference
- Privacy notes

---

### **5. Cost Optimization** 💰
**File:** `cost-optimization.md`  
**Read this if:** You're on a tight budget and want to minimize costs

**What's inside:**
- Custom tracking optimizations (sampling, caching)
- How to adjust settings
- Cost projections
- Cleanup procedures
- Configuration guide

---

## 🎯 **Quick Decisions**

### **"I'm on a tight budget"**
👉 Read: `ANALYTICS-QUICK-START.md` and `SESSION-TRACKING-TOGGLE.md`  
✅ Enable Google Analytics (free)  
✅ Custom tracking already disabled (saves ~18,000 KV ops/month)  
💰 Zero analytics costs!

---

### **"I'm running Facebook/Instagram ads"**
👉 Read: `ANALYTICS-QUICK-START.md`  
✅ Enable Google Analytics (free)  
✅ Enable Facebook Pixel (free)  
📊 Track ROI on your ads

---

### **"I need custom tracking for some reason"**
👉 Read: `SESSION-TRACKING-TOGGLE.md` and `cost-optimization.md`  
⚙️ Re-enable custom tracking (currently disabled)  
🔧 Optimize with sampling (20% default)  
💰 Will use server resources (~18,000 KV ops/month)

---

### **"I want to understand everything"**
Read in this order:
1. `ANALYTICS-QUICK-START.md` - Get it working
2. `analytics-comparison.md` - Understand options
3. `analytics-and-tracking.md` - Learn technical details
4. `cost-optimization.md` - Optimize if needed

---

## 💰 **Cost Summary**

| System | Server Resources | Monthly Cost | Tracking Limit | Current Status |
|--------|-----------------|--------------|----------------|----------------|
| **Google Analytics** | **0** | **$0** | **Unlimited** | ⚙️ Configure in admin |
| **Facebook Pixel** | **0** | **$0** | **Unlimited** | ⚙️ Configure in admin |
| **Custom Tracking** | Uses your quota | Varies | Sampled (20% default) | ✅ **DISABLED** |

**Current Setup:** Custom tracking is disabled to save costs. Use Google Analytics + Facebook Pixel instead (both FREE, unlimited).

---

## ⚙️ **Where to Configure**

### **Enable Google Analytics / Facebook Pixel:**
1. Go to Admin Panel
2. Click **Settings** → **Analytics Settings**
3. Toggle enabled + enter your IDs
4. Save

### **Custom Tracking Status:**
✅ **Already disabled** in `/utils/sessionTracking.ts`:
```typescript
const SESSION_CONFIG = {
  ENABLED: false,  // ✅ Disabled to save costs
};
```

To re-enable: See `/docs/SESSION-TRACKING-TOGGLE.md`

### **Adjust Custom Tracking (if keeping it):**
Edit `/utils/sessionTracking.ts`:
```typescript
const SESSION_CONFIG = {
  SAMPLING_RATE: 20,     // 1-100 (lower = less cost)
  TRACKING_COOLDOWN: 30000, // milliseconds
  ENABLED: true,
};
```

---

## 🔍 **Accessing Your Analytics**

### **Google Analytics Dashboard:**
- URL: https://analytics.google.com
- Real-time visitors, traffic sources, conversions

### **Facebook Events Manager:**
- URL: https://business.facebook.com/events_manager
- Pixel events, conversions, audience building

### **Your Admin Dashboard:**
- Navigate to: Admin Panel → Analytics
- Shows orders, revenue, users, sessions
- Cleanup button for old data

---

## 📊 **What Gets Tracked**

### **Always Tracked (Business Critical):**
- ✅ Orders (every order saved)
- ✅ Users (every signup saved)
- ✅ Revenue (calculated from orders)
- ✅ Order details (material, quantity, price)

### **Optional (Session Tracking):**
- Page views
- Session duration
- Traffic patterns
- User journeys

**Note:** Google Analytics tracks all of this automatically and for FREE!

---

## ✅ **Recommended Setup**

### **For Most Businesses:**
```
Google Analytics: ✅ ENABLED
Facebook Pixel: ✅ ENABLED (if running ads)
Custom Tracking: ❌ DISABLED
```

**Benefits:**
- Professional analytics
- Zero server costs
- Unlimited tracking
- Industry-standard tools
- Better insights than custom tracking

---

## 🆘 **Getting Help**

### **Google Analytics Issues:**
- Official docs: https://support.google.com/analytics
- Setup guide: https://support.google.com/analytics/answer/9304153

### **Facebook Pixel Issues:**
- Official docs: https://www.facebook.com/business/help/952192354843755
- Pixel Helper: https://chrome.google.com/webstore (search "Facebook Pixel Helper")

### **Custom Tracking Issues:**
- Check `/docs/analytics-and-tracking.md` for technical details
- Review backend logs in Supabase dashboard

---

## 🎉 **Quick Start (30 seconds)**

1. **Enable Google Analytics:**
   - Admin Panel → Settings → Analytics
   - Toggle ON + add your GA4 ID
   - Save

2. **Disable Custom Tracking (save costs):**
   - Edit `/utils/sessionTracking.ts`
   - Set `ENABLED: false`
   - Deploy

3. **Done!** 
   - FREE unlimited analytics
   - Zero server costs
   - Professional insights

---

## 📈 **Next Steps**

After reading the docs and setting up analytics:

1. ✅ Set up conversion goals in Google Analytics
2. ✅ Create custom audiences in Facebook (if using Pixel)
3. ✅ Link Google Analytics to Search Console (for SEO data)
4. ✅ Set up weekly email reports in GA
5. ✅ Monitor your analytics dashboard regularly

---

## 📝 **File Summary**

```
/docs/
├── README.md (this file - start here)
├── ANALYTICS-QUICK-START.md (5-min GA/FB Pixel setup)
├── SESSION-TRACKING-TOGGLE.md (enable/disable custom tracking)
├── analytics-comparison.md (which analytics to use)
├── analytics-and-tracking.md (technical details)
└── cost-optimization.md (optimize costs)
```

---

**Happy tracking! 🚀**
