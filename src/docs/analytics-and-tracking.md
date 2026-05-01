# Analytics & Session Tracking Implementation

## Overview
This document describes the analytics and session tracking features that have been implemented for Sheetcutters.com.

## Features Implemented

### 1. Real-Time Analytics Dashboard

**Location:** `/components/admin/Analytics.tsx`

**Data Sources:**
- `/admin/stats` - Overall statistics (revenue, orders, users, sessions)
- `/admin/analytics?range={timeRange}` - Detailed analytics with time filtering

**Features:**
- ✅ Real-time data from backend (no more mock data)
- ✅ Revenue & Orders chart (last 6 months)
- ✅ Sessions analytics with time range filters:
  - Day (hourly breakdown)
  - Week (daily breakdown)
  - Month (weekly breakdown)
  - 6 Months (monthly breakdown)
- ✅ Orders by State pie chart
- ✅ Key metrics cards:
  - Gross Sales
  - Total Orders
  - Average Order Value
  - Conversion Rate
- ✅ Detailed metrics:
  - Total Users
  - Total Sessions
  - Total Revenue
  - Conversion Rate
- ✅ Refresh button to reload data
- ✅ Loading states
- ✅ Error handling

### 2. Session Tracking

**Location:** `/utils/sessionTracking.ts`

**How It Works:**
1. **Session ID Generation:**
   - Unique ID created on first visit: `timestamp-random`
   - Stored in `sessionStorage` (per-tab, clears on tab close)
   - Expires after 30 minutes of inactivity

2. **Automatic Tracking:**
   - ✅ Initial page load
   - ✅ Route changes (SPA navigation)
   - ✅ Browser back/forward buttons
   - ✅ Tab visibility changes (user returns to tab)

3. **Data Collected:**
   - Session ID (unique identifier)
   - Current page path
   - User agent (browser info)
   - Referrer (where they came from)
   - Timestamp (server-side)

4. **Backend Storage:**
   - Endpoint: `POST /track/session`
   - Stored in KV: `session:{timestamp}:{sessionId}`
   - Used for analytics calculations

**Initialization:**
```typescript
// In App.tsx
import { initializeSessionTracking } from './utils/sessionTracking';

useEffect(() => {
  Analytics.initialize();
  initializeSessionTracking(); // ✅ Starts tracking
}, []);
```

### 3. Backend Endpoints

#### `/admin/stats` (GET)
Returns overall statistics:
```json
{
  "success": true,
  "stats": {
    "totalUsers": 150,
    "totalOrders": 423,
    "totalRevenue": 285000,
    "averageOrderValue": 674,
    "totalSessions": 3542,
    "chartData": [
      {
        "month": "Jan",
        "year": 2025,
        "orders": 45,
        "revenue": 30000,
        "newUsers": 12,
        "sessions": 450
      }
      // ... more months
    ]
  }
}
```

#### `/admin/analytics?range={timeRange}` (GET)
Returns detailed analytics with filtering:
- `range`: `day` | `week` | `month` | `6months`

```json
{
  "success": true,
  "analytics": {
    "sessions": 1250,
    "sessionData": [
      {
        "sessionId": "12345-abc",
        "page": "/",
        "userAgent": "Mozilla/5.0...",
        "referrer": "https://google.com",
        "timestamp": "2025-12-02T10:30:00Z"
      }
      // ... more sessions
    ],
    "ordersByState": {
      "Maharashtra": 120,
      "Karnataka": 98,
      "Tamil Nadu": 76
      // ... more states
    }
  }
}
```

#### `/track/session` (POST)
Tracks a session event:
```json
{
  "sessionId": "12345-abc",
  "page": "/materials",
  "userAgent": "Mozilla/5.0...",
  "referrer": "https://google.com"
}
```

## Benefits

1. **Real Analytics** - No more mock data, see actual business metrics
2. **User Behavior Tracking** - Understand how users navigate the site
3. **Performance Metrics** - Track conversion rates and engagement
4. **Geographic Insights** - See which states generate most orders
5. **Trend Analysis** - Identify growth patterns over time

## Privacy & Performance

- ✅ **No Personal Data** - Only anonymous session IDs
- ✅ **Silent Failures** - Tracking errors don't break the app
- ✅ **Lightweight** - Minimal performance impact
- ✅ **Session-Based** - Data clears when user closes tab
- ✅ **Server-Side Storage** - Secure data storage in KV

## Future Enhancements

Possible future improvements:
- [ ] Event tracking (button clicks, form submissions)
- [ ] Funnel analysis (conversion steps)
- [ ] A/B testing support
- [ ] Real-time dashboard updates
- [ ] Export analytics reports
- [ ] Custom date range selection
- [ ] User journey visualization
