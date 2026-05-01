# SheetCutters Analytics Setup Guide

This guide explains how to set up and configure the analytics system for SheetCutters.com to track sessions, orders by state, and other key metrics in your admin dashboard.

## Table of Contents
1. [Overview](#overview)
2. [Analytics Features](#analytics-features)
3. [Backend Implementation](#backend-implementation)
4. [Session Tracking Setup](#session-tracking-setup)
5. [Data Structure](#data-structure)
6. [Viewing Analytics](#viewing-analytics)
7. [Testing Analytics](#testing-analytics)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The SheetCutters analytics system tracks:
- **Sessions**: User visits and page views
- **Orders by State**: Geographic distribution of orders
- **Revenue trends**: Revenue over time
- **User growth**: New user registrations
- **Order volume**: Orders placed over time

All analytics data is stored in the Supabase KV store and displayed in the Admin Panel.

---

## Analytics Features

### Dashboard Metrics
The admin dashboard displays 5 key metrics:
1. **Total Revenue** - Sum of all order values with trend indicator
2. **Total Orders** - Number of orders placed with trend indicator
3. **Sessions** - Total user sessions tracked with trend indicator (shown in red brand color)
4. **Total Users** - Number of registered users with trend indicator
5. **Average Order Value** - Revenue divided by orders

### Analytics Panel

#### Sessions Analytics Graph
- **Time Range Options**: Day, Week, Month, 6 Months
- **Visualization**: Line chart showing session counts
- **Granularity**:
  - **Day**: Hourly breakdown (3-hour intervals)
  - **Week**: Daily breakdown (Mon-Sun)
  - **Month**: Weekly breakdown (Week 1-4)
  - **6 Months**: Monthly breakdown

#### Orders by State
- **Visualization**: Pie chart showing distribution
- **Top States Tracked**:
  - Maharashtra
  - Karnataka
  - Tamil Nadu
  - Gujarat
  - Delhi
  - Telangana
  - Uttar Pradesh
  - West Bengal
  - Rajasthan
  - Others (combined)

---

## Backend Implementation

### Required Routes

The analytics system uses three backend routes:

#### 1. Admin Stats Route
```
GET /make-server-8927474f/admin/stats
```
Returns dashboard statistics including:
- `totalUsers`
- `totalOrders`
- `totalRevenue`
- `averageOrderValue`
- `totalSessions`
- `chartData` (last 6 months)

#### 2. Session Tracking Route
```
POST /make-server-8927474f/track/session
```
Records user sessions with:
- `sessionId` (required)
- `page` (current page)
- `userAgent` (browser info)
- `referrer` (where user came from)

#### 3. Analytics Data Route
```
GET /make-server-8927474f/admin/analytics?range=week
```
Returns detailed analytics with filtering:
- Query parameter: `range` (day/week/month/6months)
- Returns sessions and orders by state

### Already Implemented ✅

The backend routes are already implemented in `/supabase/functions/server/index.tsx`. You just need to deploy them (see [Deployment](#deployment) section below).

---

## Session Tracking Setup

### Automatic Session Tracking

To enable automatic session tracking, add this to your frontend (e.g., in `App.tsx` or a custom hook):

```tsx
import { useEffect } from 'react';
import { apiCall } from './utils/api';

// Generate or get session ID from localStorage
function getSessionId() {
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    localStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
}

// Track session on app load
useEffect(() => {
  const trackSession = async () => {
    try {
      await apiCall('/track/session', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: getSessionId(),
          page: window.location.pathname,
          userAgent: navigator.userAgent,
          referrer: document.referrer
        })
      });
    } catch (error) {
      console.error('Failed to track session:', error);
    }
  };

  trackSession();
}, []);
```

### Session Tracking Best Practices

1. **Track once per session**: Use localStorage to avoid duplicate tracking
2. **Track on key pages**: Track landing page, checkout, order confirmation
3. **Privacy**: Don't track personally identifiable information
4. **Performance**: Track asynchronously, don't block UI

---

## Data Structure

### Session Data in KV Store

```json
// Key: session:2024-12-01T10:30:45.123Z:1733053845123-abc123
{
  "sessionId": "1733053845123-abc123",
  "page": "/",
  "userAgent": "Mozilla/5.0...",
  "referrer": "https://google.com",
  "timestamp": "2024-12-01T10:30:45.123Z"
}
```

### Order Data with State Info

Orders already include shipping address with state:
```json
{
  "orderId": "ORD-20241201-001",
  "shippingAddress": {
    "state": "Maharashtra",
    "city": "Mumbai",
    "pincode": "400001",
    // ... other fields
  },
  "createdAt": "2024-12-01T10:30:45.123Z"
}
```

The analytics system automatically aggregates orders by state from this data.

---

## Viewing Analytics

### Accessing the Admin Dashboard

1. **Login as Admin**:
   - Navigate to your site
   - Login with admin credentials
   - Click on Admin Panel

2. **Dashboard Tab**:
   - View overview metrics at the top (5 cards)
   - "Sessions" card shows total sessions with trend
   - Performance graph shows revenue and orders over time

3. **Analytics Tab**:
   - Click "Analytics & Reports" in sidebar
   - View detailed metrics at top
   - Sessions Analytics graph with time range filters
   - Sessions & Conversions bar chart
   - Material Distribution pie chart
   - **Orders by State** pie chart (bottom right)

---

## Testing Analytics

### Manual Testing Checklist

#### Test Session Tracking:

1. **Verify Route Works**:
   ```bash
   curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-8927474f/track/session \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -d '{
       "sessionId": "test-session-123",
       "page": "/",
       "userAgent": "Test Browser",
       "referrer": ""
     }'
   ```
   
   Expected response:
   ```json
   {"success": true}
   ```

2. **Check Data in Database**:
   - Go to Supabase Dashboard → Table Editor
   - Open `kv_store_8927474f` table
   - Look for keys starting with `session:`
   - Should see your test session

3. **Verify in Admin Dashboard**:
   - Login as admin
   - Go to Dashboard
   - Sessions card should show count > 0
   - Check Analytics panel for session graphs

#### Test Orders by State:

1. **Create Test Orders**:
   - Place test orders with different states
   - Use various Indian states in shipping address

2. **Verify State Data**:
   - Check orders have `shippingAddress.state` field
   - SQL query to verify:
     ```sql
     SELECT value->'shippingAddress'->>'state' as state, COUNT(*) 
     FROM kv_store_8927474f 
     WHERE key LIKE 'order:%' 
     GROUP BY state;
     ```

3. **View in Analytics Panel**:
   - Go to Admin Panel → Analytics
   - Scroll to "Orders by State" pie chart
   - Should see distribution of your test orders

---

## Deployment

### Step 1: Deploy Updated Backend

The backend changes are already in the code. Deploy them:

```bash
# Login to Supabase CLI
supabase login

# Link your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_ID

# Deploy the Edge Function
supabase functions deploy make-server-8927474f --no-verify-jwt
```

### Step 2: Verify Deployment

Test the new routes:

```bash
# Test session tracking
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-8927474f/track/session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"sessionId":"test-123","page":"/"}'

# Test admin stats (requires admin auth token)
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-8927474f/admin/stats \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Test analytics endpoint
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-8927474f/admin/analytics?range=week \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Step 3: Deploy Frontend

The frontend analytics components are already created. Just deploy:

```bash
# Build the frontend
npm run build

# Deploy to your hosting platform
# (Vercel, Netlify, etc. - see DEPLOYMENT.md)
```

### Step 4: Implement Session Tracking (Optional)

Add the session tracking code from [Session Tracking Setup](#session-tracking-setup) to your `App.tsx` to automatically track user sessions.

---

## Troubleshooting

### Issue: Sessions not showing in dashboard

**Solutions**:
1. Verify Edge Function is deployed:
   ```bash
   supabase functions list
   ```
2. Check session tracking route works (see [Testing](#testing-analytics))
3. Verify sessions are being created in KV store
4. Check browser console for errors
5. Ensure `totalSessions` is included in stats response

### Issue: Orders by State shows no data

**Solutions**:
1. Verify orders have `shippingAddress.state` field
2. Check orders exist in database:
   ```sql
   SELECT * FROM kv_store_8927474f WHERE key LIKE 'order:%' LIMIT 5;
   ```
3. Ensure state names match expected format (e.g., "Maharashtra" not "MH")
4. Check analytics route returns `ordersByState` data
5. Verify admin panel is calling the analytics endpoint

### Issue: "Unauthorized" when viewing analytics

**Solutions**:
1. Verify you're logged in as admin
2. Check user has `isAdmin: true` in database:
   ```sql
   SELECT * FROM kv_store_8927474f WHERE key LIKE 'user:%' AND value->>'isAdmin' = 'true';
   ```
3. Clear browser cache and re-login
4. Check browser console for auth errors

### Issue: Charts showing zero/empty data

**Solutions**:
1. **No historical data**: Analytics require existing orders/sessions
   - Create test data (orders, sessions)
   - Wait for real traffic to accumulate
2. **Date filtering issue**: Check chartData date ranges
3. **API response issue**: Check browser network tab for API responses
4. **Check backend logs**:
   ```bash
   supabase functions logs make-server-8927474f
   ```

### Issue: Session tracking causing performance issues

**Solutions**:
1. Implement session deduplication (track once per session)
2. Use `requestIdleCallback` for non-critical tracking
3. Implement rate limiting on session endpoint
4. Batch session tracking requests
5. Example optimized tracking:
   ```tsx
   useEffect(() => {
     const tracked = sessionStorage.getItem('tracked');
     if (tracked) return; // Already tracked this session
     
     requestIdleCallback(() => {
       trackSession();
       sessionStorage.setItem('tracked', 'true');
     });
   }, []);
   ```

---

## Analytics Data Retention

### Automatic Cleanup (Recommended)

To prevent unlimited data growth, implement periodic cleanup:

```sql
-- Delete sessions older than 90 days
DELETE FROM kv_store_8927474f 
WHERE key LIKE 'session:%' 
AND updated_at < NOW() - INTERVAL '90 days';

-- Or keep only last 10,000 sessions
DELETE FROM kv_store_8927474f 
WHERE key IN (
  SELECT key FROM kv_store_8927474f 
  WHERE key LIKE 'session:%' 
  ORDER BY created_at DESC 
  OFFSET 10000
);
```

Set up a scheduled job in Supabase:
1. Go to Database → SQL Editor
2. Create a new query with cleanup SQL
3. Save as "Cleanup Old Sessions"
4. Run monthly via Supabase cron (Pro plan) or external scheduler

---

## Advanced Analytics Setup

### Real-time Analytics (Optional)

For real-time analytics updates, implement WebSocket or polling:

```tsx
// Polling example (check every 30 seconds)
useEffect(() => {
  const interval = setInterval(() => {
    fetchStats();
  }, 30000);
  
  return () => clearInterval(interval);
}, []);
```

### Export Analytics Data

Export data for external analysis:

```bash
# Export all sessions
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-8927474f/admin/analytics?range=6months \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  > analytics-export.json
```

### Integration with Google Analytics

While the built-in analytics track server-side data, you can also integrate Google Analytics for client-side insights:

1. Add Google Analytics to your site
2. Track custom events for key actions
3. Compare server-side (Supabase) vs client-side (GA) data
4. Use both for comprehensive insights

---

## Production Best Practices

1. **Monitor Performance**:
   - Track API response times
   - Monitor database query performance
   - Set up alerts for errors

2. **Data Privacy**:
   - Don't track PII without consent
   - Comply with GDPR/privacy laws
   - Provide opt-out mechanism

3. **Scalability**:
   - Archive old sessions regularly
   - Use database indexes for faster queries
   - Consider aggregating data for performance

4. **Security**:
   - Only admins can view analytics
   - Protect analytics endpoints with auth
   - Don't expose sensitive data in responses

---

## Summary

✅ **What's Already Done**:
- Backend routes for session tracking and analytics
- Dashboard Sessions card
- Analytics panel with Sessions graph and time filters
- Orders by State pie chart
- All necessary data aggregation logic

🔧 **What You Need to Do**:
1. Deploy the updated Edge Function
2. Verify the new routes work
3. (Optional) Implement automatic session tracking in frontend
4. Test with sample data
5. Monitor and maintain

📊 **Result**:
You'll have a fully functional analytics system showing:
- Real-time session tracking
- Geographic order distribution
- Revenue and user growth trends
- Conversion metrics

---

**Last Updated**: December 2024  
**Version**: 1.0
