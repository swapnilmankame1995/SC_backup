# Analytics Quick Reference

Quick reference for SheetCutters analytics implementation.

## API Endpoints

### Track Session
```
POST /make-server-8927474f/track/session
Authorization: Bearer {ANON_KEY}
Content-Type: application/json

{
  "sessionId": "unique-session-id",
  "page": "/",
  "userAgent": "Mozilla/5.0...",
  "referrer": "https://example.com"
}
```

### Get Admin Stats
```
GET /make-server-8927474f/admin/stats
Authorization: Bearer {USER_ACCESS_TOKEN}

Response:
{
  "success": true,
  "stats": {
    "totalUsers": 150,
    "totalOrders": 320,
    "totalRevenue": 125000,
    "averageOrderValue": 390.63,
    "totalSessions": 1580,
    "chartData": [
      {
        "month": "Jul",
        "year": 2024,
        "orders": 45,
        "revenue": 18500,
        "newUsers": 23,
        "sessions": 245
      }
    ]
  }
}
```

### Get Analytics Data
```
GET /make-server-8927474f/admin/analytics?range=week
Authorization: Bearer {USER_ACCESS_TOKEN}

Query Parameters:
- range: day | week | month | 6months

Response:
{
  "success": true,
  "analytics": {
    "sessions": 420,
    "sessionData": [...],
    "ordersByState": {
      "Maharashtra": 45,
      "Karnataka": 32,
      "Tamil Nadu": 28
    }
  }
}
```

## KV Store Data Structures

### Session Entry
```
Key: session:2024-12-01T10:30:45.123Z:1733053845-abc123

Value:
{
  "sessionId": "1733053845-abc123",
  "page": "/material",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  "referrer": "https://google.com/search?q=laser+cutting",
  "timestamp": "2024-12-01T10:30:45.123Z"
}
```

### Order with State Info
```
Key: order:ORD-20241201-001

Value:
{
  "orderId": "ORD-20241201-001",
  "userId": "user-123",
  "items": [...],
  "price": 5600,
  "shippingAddress": {
    "name": "John Doe",
    "address": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",  // <- Used for state analytics
    "pincode": "400001"
  },
  "createdAt": "2024-12-01T10:30:45.123Z"
}
```

## Frontend Session Tracking Code

### Basic Implementation
```tsx
// utils/sessionTracking.ts
import { apiCall } from './api';

export function getSessionId(): string {
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    localStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
}

export async function trackSession(page?: string): Promise<void> {
  try {
    await apiCall('/track/session', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: getSessionId(),
        page: page || window.location.pathname,
        userAgent: navigator.userAgent,
        referrer: document.referrer
      })
    });
  } catch (error) {
    console.error('Failed to track session:', error);
  }
}
```

### Usage in App.tsx
```tsx
import { useEffect } from 'react';
import { trackSession } from './utils/sessionTracking';

function App() {
  useEffect(() => {
    // Track session once on app load
    trackSession();
  }, []);

  return (
    // Your app content
  );
}
```

### Track Page Changes (for SPAs)
```tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackSession } from './utils/sessionTracking';

function usePageTracking() {
  const location = useLocation();
  
  useEffect(() => {
    // Track each page change
    trackSession(location.pathname);
  }, [location]);
}
```

## SQL Queries for Analytics

### Count Sessions by Day
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as sessions
FROM kv_store_8927474f
WHERE key LIKE 'session:%'
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;
```

### Orders by State
```sql
SELECT 
  value->'shippingAddress'->>'state' as state,
  COUNT(*) as order_count,
  SUM((value->>'price')::numeric) as total_revenue
FROM kv_store_8927474f
WHERE key LIKE 'order:%'
  AND value->'shippingAddress'->>'state' IS NOT NULL
GROUP BY state
ORDER BY order_count DESC;
```

### Sessions in Last 7 Days
```sql
SELECT COUNT(*) as sessions
FROM kv_store_8927474f
WHERE key LIKE 'session:%'
  AND created_at > NOW() - INTERVAL '7 days';
```

### Monthly Revenue and Orders
```sql
SELECT 
  TO_CHAR(created_at, 'YYYY-MM') as month,
  COUNT(*) as orders,
  SUM((value->>'price')::numeric) as revenue
FROM kv_store_8927474f
WHERE key LIKE 'order:%'
GROUP BY month
ORDER BY month DESC;
```

## Analytics Dashboard Components

### Dashboard Stats Card (Sessions)
```tsx
<StatCard
  title="Sessions"
  value={stats.totalSessions.toString()}
  trendValue={sessionTrend.value}
  isTrendPositive={sessionTrend.isPositive}
  icon={Activity}
  color="from-[#dc0000] to-red-600"
  dataKey="sessions"
/>
```

### Sessions Analytics Graph
```tsx
<Card className="p-6 bg-[#1a1a1a] border-gray-800">
  <div className="flex items-center justify-between mb-6">
    <h3 className="text-white">Sessions Analytics</h3>
    <div className="flex gap-2">
      <Button onClick={() => setTimeRange('day')}>Day</Button>
      <Button onClick={() => setTimeRange('week')}>Week</Button>
      <Button onClick={() => setTimeRange('month')}>Month</Button>
      <Button onClick={() => setTimeRange('6months')}>6 Months</Button>
    </div>
  </div>
  <LineChart data={getSessionsData()}>
    <Line dataKey="sessions" stroke="#dc0000" />
  </LineChart>
</Card>
```

### Orders by State Pie Chart
```tsx
<PieChart>
  <Pie
    data={ordersByState}
    cx="50%"
    cy="50%"
    label={({ state, percent }) => `${state}: ${(percent * 100).toFixed(0)}%`}
    dataKey="orders"
  >
    {ordersByState.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={entry.color} />
    ))}
  </Pie>
</PieChart>
```

## Testing Commands

### Test Session Tracking
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

### Test Admin Stats (requires admin auth)
```bash
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-8927474f/admin/stats \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Create Test Session in Database
```sql
INSERT INTO kv_store_8927474f (key, value)
VALUES (
  'session:2024-12-01T10:30:00.000Z:test-123',
  '{
    "sessionId": "test-123",
    "page": "/",
    "userAgent": "Test",
    "referrer": "",
    "timestamp": "2024-12-01T10:30:00.000Z"
  }'::jsonb
);
```

## Maintenance

### Clean Up Old Sessions (90+ days)
```sql
DELETE FROM kv_store_8927474f
WHERE key LIKE 'session:%'
  AND created_at < NOW() - INTERVAL '90 days';
```

### Archive Sessions to CSV
```sql
COPY (
  SELECT 
    key,
    value->>'sessionId' as session_id,
    value->>'page' as page,
    value->>'timestamp' as timestamp,
    created_at
  FROM kv_store_8927474f
  WHERE key LIKE 'session:%'
    AND created_at < NOW() - INTERVAL '90 days'
) TO '/tmp/archived_sessions.csv' WITH CSV HEADER;
```

## Monitoring

### Check Analytics Health
```sql
-- Sessions created today
SELECT COUNT(*) FROM kv_store_8927474f 
WHERE key LIKE 'session:%' 
AND created_at > CURRENT_DATE;

-- Orders by state (top 5)
SELECT 
  value->'shippingAddress'->>'state' as state,
  COUNT(*) as orders
FROM kv_store_8927474f
WHERE key LIKE 'order:%'
GROUP BY state
ORDER BY orders DESC
LIMIT 5;

-- Recent sessions (last 10)
SELECT 
  value->>'sessionId',
  value->>'page',
  value->>'timestamp'
FROM kv_store_8927474f
WHERE key LIKE 'session:%'
ORDER BY created_at DESC
LIMIT 10;
```

---

**For full documentation, see [ANALYTICS_SETUP.md](./ANALYTICS_SETUP.md)**
