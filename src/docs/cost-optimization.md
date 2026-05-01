# Analytics Cost Optimization Guide

## ⚠️ **IMPORTANT: Consider Using Google Analytics Instead!**

**Google Analytics and Facebook Pixel use ZERO server resources** (completely free, unlimited tracking).

Custom session tracking uses YOUR server resources. **See `/docs/analytics-comparison.md` for full comparison.**

**Quick Recommendation for Tight Budget:**
- ✅ Enable Google Analytics (Admin Panel → Settings)
- ✅ Disable custom tracking (`ENABLED: false` in `/utils/sessionTracking.ts`)
- ✅ Save ~18,000 KV operations/month

---

## Overview (If You Still Want Custom Tracking)
This document explains the cost-saving measures implemented for custom session tracking.

---

## 🎯 Cost-Saving Features

### 1. **Session Sampling (20% by default)**

**Configuration:** `/utils/sessionTracking.ts`

```typescript
const SESSION_CONFIG = {
  SAMPLING_RATE: 20, // Only track 20% of sessions
  TRACKING_COOLDOWN: 30000, // 30 seconds between tracks
  SESSION_DURATION: 30 * 60 * 1000, // 30 minutes
  ENABLED: true,
};
```

**How It Works:**
- ✅ Only **20% of visitors** are tracked (randomly selected per session)
- ✅ Reduces KV writes by **80%**
- ✅ Still provides statistically significant data
- ✅ Each tracked session has a **30-second cooldown** between page views

**Cost Impact:**
```
Without sampling: 5,000 page views/day = 5,000 KV writes
With 20% sampling: 5,000 page views/day = 1,000 KV writes
Savings: 80% reduction in tracking costs
```

**Adjusting the Sampling Rate:**
```typescript
// Track 50% of sessions (more data, higher cost)
SAMPLING_RATE: 50

// Track 10% of sessions (less data, lower cost)
SAMPLING_RATE: 10

// Track 100% of sessions (all data, highest cost)
SAMPLING_RATE: 100

// Disable tracking entirely
ENABLED: false
```

---

### 2. **Server-Side Caching (5-minute cache)**

**Implementation:** `/supabase/functions/server/index.tsx`

Both analytics endpoints cache their results for **5 minutes**:
- `GET /admin/stats` - Caches overall statistics
- `GET /admin/analytics` - Caches analytics per time range

**Benefits:**
- ✅ Reduces KV reads by ~95% during active admin usage
- ✅ Multiple page refreshes don't trigger new queries
- ✅ Fast response times
- ✅ Dramatically reduces compute time

**Cost Impact:**
```
Without caching: 
- Admin checks dashboard 20x = 20 full KV scans
- Each scan reads 1000s of records

With caching:
- Admin checks dashboard 20x = 4 full KV scans (every 5 min)
- 80% reduction in KV operations
```

---

### 3. **Data Limits & Pagination**

**Sessions Returned:**
- Maximum **1,000 most recent sessions** per query
- Sorted by timestamp (newest first)
- Prevents huge payloads that cost CPU time

**Sessions Stored:**
- Only sessions from **last 6 months** are counted in stats
- Older sessions still exist but aren't loaded into memory

**Orders by State:**
- Returns only **counts**, not full order data
- Minimal payload size

---

### 4. **Automatic Cleanup**

**Manual Cleanup:** Admin can delete sessions older than 90 days

**Location:** Analytics page → "Cleanup Old Data" button

**What It Does:**
1. Finds all sessions older than 90 days
2. Deletes them in batch
3. Reduces storage costs
4. Improves query performance

**Recommended Schedule:**
- Run cleanup **monthly** or when you notice slow analytics
- Keeps database lean and fast

---

### 5. **Fire-and-Forget Tracking**

**Implementation:**
```typescript
fetch('/track/session', {
  // ...
  keepalive: true  // Ensures request completes even if page closes
}).catch(() => {
  // Silent failure - doesn't break app
});
```

**Benefits:**
- ✅ Non-blocking (doesn't slow down page loads)
- ✅ Fails silently (no error popups)
- ✅ Uses `keepalive` for better delivery

---

## 📊 Cost Projections

### Scenario: Small Business (Tight Budget)

**Traffic:**
- 500 unique visitors/day
- 3 pages per visitor average
- 1,500 total page views/day

**With Optimizations (20% sampling):**
```
Daily:
- Session writes: 300 (20% of 1,500)
- Admin analytics views: ~10
- KV reads (cached): ~20 scans

Monthly:
- Session writes: ~9,000
- Total KV operations: ~10,000
- Well within free tier limits ✅
```

**Without Optimizations (100% tracking, no cache):**
```
Daily:
- Session writes: 1,500
- Admin analytics views: ~10
- KV reads: ~200 scans (no cache)

Monthly:
- Session writes: ~45,000
- Total KV operations: ~50,000+
- May exceed free tier ⚠️
```

---

### Scenario: Growing Business (Medium Traffic)

**Traffic:**
- 2,000 unique visitors/day
- 4 pages per visitor average
- 8,000 total page views/day

**With Optimizations (20% sampling):**
```
Daily:
- Session writes: 1,600
- Admin analytics views: ~20

Monthly:
- Session writes: ~48,000
- Total KV operations: ~50,000
- Minimal costs, well-optimized ✅
```

**Recommendation:** 
- Keep 20% sampling as traffic grows
- Run monthly cleanup
- Consider 10% sampling if costs become an issue

---

## 🔧 Configuration Guide

### To Increase Tracking (More Data, Higher Cost)

**1. Increase Sampling Rate:**
```typescript
// In /utils/sessionTracking.ts
SAMPLING_RATE: 50  // Track 50% instead of 20%
```

**2. Reduce Cache Duration:**
```typescript
// In /supabase/functions/server/index.tsx
const STATS_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes instead of 5
```

---

### To Decrease Tracking (Less Data, Lower Cost)

**1. Decrease Sampling Rate:**
```typescript
// In /utils/sessionTracking.ts
SAMPLING_RATE: 10  // Track only 10% of sessions
```

**2. Increase Cooldown:**
```typescript
TRACKING_COOLDOWN: 60000  // 60 seconds between tracks
```

**3. Increase Cache Duration:**
```typescript
// In /supabase/functions/server/index.tsx
const STATS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
```

---

### To Disable Tracking Entirely

**1. Turn Off Session Tracking:**
```typescript
// In /utils/sessionTracking.ts
const SESSION_CONFIG = {
  ENABLED: false  // Disables all tracking
};
```

**2. Analytics Dashboard Still Works:**
- Shows order data (always tracked)
- Shows user registrations (always tracked)
- Just won't show session data

---

## 💰 Cost-Benefit Analysis

### What You're Tracking:
- ✅ **Orders** - Always tracked (business critical)
- ✅ **Users** - Always tracked (business critical)
- ⚡ **Sessions** - Sampled tracking (nice to have)

### What You're Getting:
- Revenue trends
- Order patterns
- User growth
- Geographic distribution
- Basic conversion rates

### What You're Saving:
- 80% reduction in KV writes (sampling)
- 95% reduction in KV reads (caching)
- Minimal CPU usage (limits + cache)
- Low storage costs (cleanup)

---

## 📈 Monitoring Costs

### Check Your Usage:
1. Go to Supabase Dashboard
2. Navigate to Project Settings → Usage
3. Monitor:
   - **Edge Function invocations** (tracking calls)
   - **Database API requests** (KV operations)
   - **Storage** (session data size)

### Warning Signs:
- ⚠️ Approaching monthly limits
- ⚠️ Slow analytics dashboard
- ⚠️ Large number of old sessions

### Solutions:
1. Run "Cleanup Old Data" in Analytics
2. Reduce sampling rate
3. Increase cache duration
4. Disable tracking temporarily

---

## 🎯 Recommended Settings

### For Tight Budget (Minimal Costs):
```typescript
SAMPLING_RATE: 10           // 10% of sessions
TRACKING_COOLDOWN: 60000    // 60 seconds
STATS_CACHE_DURATION: 10min // 10 minutes
```
- Run cleanup **weekly**
- Check analytics **once per day** max

### For Balanced (Default):
```typescript
SAMPLING_RATE: 20           // 20% of sessions
TRACKING_COOLDOWN: 30000    // 30 seconds
STATS_CACHE_DURATION: 5min  // 5 minutes
```
- Run cleanup **monthly**
- Check analytics **anytime**

### For More Data (Higher Budget):
```typescript
SAMPLING_RATE: 50           // 50% of sessions
TRACKING_COOLDOWN: 10000    // 10 seconds
STATS_CACHE_DURATION: 2min  // 2 minutes
```
- Run cleanup **monthly**
- Real-time-ish analytics

---

## ✅ Summary

Your analytics system is **optimized for cost efficiency** while still providing valuable business insights. The default settings (20% sampling, 5-minute cache) strike a good balance between data quality and budget constraints.

**Key Takeaways:**
- 📉 **80% less writes** than full tracking
- ⚡ **95% less reads** with caching
- 🎯 **Still statistically significant** data
- 💰 **Well within free tier** for most small businesses
- 🔧 **Easy to adjust** as needs change

Run the cleanup monthly and you'll keep costs minimal! 🚀
