# Sheetcutters.com - Complete Supabase Configuration Guide
**Date: December 5, 2025**  
**Status: Migration Complete - Ready for SQL Mode**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [SQL Table Creation](#sql-table-creation)
4. [Row Level Security (RLS) Policies](#row-level-security-rls-policies)
5. [Migration Process](#migration-process)
6. [Critical Fixes Applied](#critical-fixes-applied)
7. [Data Verification](#data-verification)
8. [Enabling SQL Mode](#enabling-sql-mode)
9. [Rollback Procedure](#rollback-procedure)
10. [Troubleshooting](#troubleshooting)

---

## 1. Overview

Sheetcutters.com uses Supabase for its backend infrastructure, including:
- **PostgreSQL Database** with SQL tables
- **Row Level Security (RLS)** for data protection
- **Supabase Auth** for user authentication
- **Supabase Storage** for DXF/SVG file storage
- **Edge Functions** (Hono server) for API routes

### Migration Status
- ✅ All 106 orders migrated successfully
- ✅ Order items created with proper relationships
- ✅ Materials and thicknesses migrated
- ✅ Users migrated with loyalty points
- ✅ "Sketch" material record created
- ✅ Data verification completed

---

## 2. Database Schema

### Tables Overview

#### 2.1 `users` Table
Stores user account information and loyalty points.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key (auto-increment) |
| `auth_user_id` | UUID | Links to Supabase Auth user |
| `email` | TEXT | User email address |
| `name` | TEXT | Full name |
| `first_name` | TEXT | First name |
| `last_name` | TEXT | Last name |
| `phone` | TEXT | Phone number |
| `address` | TEXT | Street address |
| `apartment` | TEXT | Apartment/suite |
| `city` | TEXT | City |
| `state` | TEXT | State |
| `pin_code` | TEXT | PIN code |
| `country` | TEXT | Country (default: 'India') |
| `gst_number` | TEXT | GST number |
| `is_admin` | BOOLEAN | Admin flag |
| `loyalty_points` | INTEGER | Loyalty points balance |
| `total_spent` | NUMERIC(10,2) | Total amount spent |
| `created_at` | TIMESTAMPTZ | Account creation date |
| `updated_at` | TIMESTAMPTZ | Last update date |

**Constraints:**
- `auth_user_id` - UNIQUE
- `email` - UNIQUE

---

#### 2.2 `materials` Table
Stores laser cutting materials catalog.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key (e.g., 'mild-steel') |
| `name` | TEXT | Display name |
| `category` | TEXT | Material category |
| `price_per_mm` | NUMERIC(10,6) | Price per mm of cutting |
| `thicknesses` | NUMERIC[] | Available thicknesses array |
| `density` | NUMERIC(10,4) | Material density (kg/mm³) |
| `available` | BOOLEAN | Availability flag |
| `created_at` | TIMESTAMPTZ | Record creation date |
| `updated_at` | TIMESTAMPTZ | Last update date |

**Important:** Must include a "sketch" material record for sketch service orders.

---

#### 2.3 `thicknesses` Table
Stores available thicknesses per material (normalized).

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `material_id` | TEXT | Foreign key to materials |
| `thickness` | NUMERIC(10,2) | Thickness value |
| `available` | BOOLEAN | Availability flag |
| `created_at` | TIMESTAMPTZ | Record creation date |

---

#### 2.4 `orders` Table
Stores parent order information (one per checkout).

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `order_number` | TEXT | Unique order number (SC-YYYY-NNNNNNN) |
| `user_id` | BIGINT | Foreign key to users (nullable for guests) |
| `batch_id` | TEXT | Groups multiple items from same checkout |
| `guest_email` | TEXT | Guest checkout email |
| `guest_name` | TEXT | Guest checkout name |
| `guest_phone` | TEXT | Guest checkout phone |
| `delivery_first_name` | TEXT | Delivery first name |
| `delivery_last_name` | TEXT | Delivery last name |
| `delivery_phone` | TEXT | Delivery phone |
| `delivery_address` | TEXT | Delivery street address |
| `delivery_apartment` | TEXT | Delivery apartment/suite |
| `delivery_city` | TEXT | Delivery city |
| `delivery_state` | TEXT | Delivery state |
| `delivery_pin_code` | TEXT | Delivery PIN code |
| `delivery_country` | TEXT | Delivery country |
| `delivery_gst_number` | TEXT | GST number |
| `subtotal` | NUMERIC(10,2) | Order subtotal (before shipping) |
| `shipping_cost` | NUMERIC(10,2) | Shipping cost |
| `points_used` | INTEGER | Loyalty points used |
| `points_value` | NUMERIC(10,2) | Rupee value of points used |
| `total_amount` | NUMERIC(10,2) | **Final total (subtotal + shipping - points)** |
| `status` | TEXT | Order status (pending/confirmed/shipped/delivered) |
| `payment_status` | TEXT | Payment status |
| `shipping_carrier` | TEXT | Shipping carrier name |
| `tracking_number` | TEXT | Tracking number |
| `tracking_url` | TEXT | Tracking URL |
| `affiliate_code` | TEXT | Affiliate code used |
| `created_at` | TIMESTAMPTZ | Order creation date |
| `updated_at` | TIMESTAMPTZ | Last update date |

**Constraints:**
- `order_number` - UNIQUE

**Important:** The field is named `total_amount`, NOT `total_price`!

---

#### 2.5 `order_items` Table
Stores individual items within an order.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `order_id` | BIGINT | Foreign key to orders |
| `file_name` | TEXT | Uploaded file name |
| `file_path` | TEXT | Storage path |
| `dxf_data` | JSONB | DXF analysis data (perimeter, area, weight) |
| `material_id` | TEXT | Foreign key to materials |
| `material_name` | TEXT | Denormalized material name |
| `thickness` | NUMERIC(10,2) | Selected thickness |
| `perimeter_mm` | NUMERIC(10,2) | Perimeter in mm |
| `area_mm2` | NUMERIC(10,2) | Area in mm² |
| `weight_kg` | NUMERIC(10,4) | Weight in kg |
| `quantity` | INTEGER | Quantity ordered |
| `unit_price` | NUMERIC(10,2) | Price per unit |
| `total_price` | NUMERIC(10,2) | Total for this item (unit_price × quantity) |
| `service_type` | TEXT | Service type ('dxf' or 'sketch') |
| `is_sketch_service` | BOOLEAN | Is this a sketch service item |
| `created_at` | TIMESTAMPTZ | Record creation date |
| `updated_at` | TIMESTAMPTZ | Last update date |

---

#### 2.6 `delivery_info` Table
Stores saved delivery addresses for registered users.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `user_id` | TEXT | Foreign key to users.auth_user_id |
| `first_name` | TEXT | First name |
| `last_name` | TEXT | Last name |
| `phone` | TEXT | Phone number |
| `address` | TEXT | Street address |
| `apartment` | TEXT | Apartment/suite |
| `city` | TEXT | City |
| `state` | TEXT | State |
| `pin_code` | TEXT | PIN code |
| `country` | TEXT | Country |
| `gst_number` | TEXT | GST number |
| `created_at` | TIMESTAMPTZ | Record creation date |
| `updated_at` | TIMESTAMPTZ | Last update date |

**Constraints:**
- `user_id` - UNIQUE

---

#### 2.7 `affiliate_codes` Table
Stores affiliate tracking codes.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `code` | TEXT | Unique affiliate code |
| `user_id` | BIGINT | Foreign key to users |
| `commission_rate` | NUMERIC(5,2) | Commission percentage |
| `total_sales` | NUMERIC(10,2) | Total sales generated |
| `total_commission` | NUMERIC(10,2) | Total commission earned |
| `is_active` | BOOLEAN | Active flag |
| `created_at` | TIMESTAMPTZ | Record creation date |
| `updated_at` | TIMESTAMPTZ | Last update date |

**Constraints:**
- `code` - UNIQUE

---

#### 2.8 `affiliate_conversions` Table
Tracks individual affiliate conversions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `affiliate_code_id` | BIGINT | Foreign key to affiliate_codes |
| `order_id` | BIGINT | Foreign key to orders |
| `order_amount` | NUMERIC(10,2) | Order total |
| `commission_amount` | NUMERIC(10,2) | Commission earned |
| `status` | TEXT | Conversion status |
| `created_at` | TIMESTAMPTZ | Record creation date |

---

#### 2.9 `sessions` Table
Tracks user sessions for analytics.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `session_id` | TEXT | Unique session ID |
| `timestamp` | TIMESTAMPTZ | Session timestamp |
| `created_at` | TIMESTAMPTZ | Record creation date |

**Constraints:**
- `session_id` - UNIQUE

---

## 3. SQL Table Creation

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a new query

### Step 2: Create All Tables

Run the following SQL script:

```sql
-- ============================================================================
-- SHEETCUTTERS.COM DATABASE SCHEMA
-- Created: December 5, 2025
-- ============================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  auth_user_id UUID UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  address TEXT,
  apartment TEXT,
  city TEXT,
  state TEXT,
  pin_code TEXT,
  country TEXT DEFAULT 'India',
  gst_number TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  loyalty_points INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MATERIALS TABLE
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price_per_mm NUMERIC(10,6) NOT NULL,
  thicknesses NUMERIC[] NOT NULL,
  density NUMERIC(10,4),
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. THICKNESSES TABLE
CREATE TABLE IF NOT EXISTS thicknesses (
  id BIGSERIAL PRIMARY KEY,
  material_id TEXT REFERENCES materials(id) ON DELETE CASCADE,
  thickness NUMERIC(10,2) NOT NULL,
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  batch_id TEXT,
  guest_email TEXT,
  guest_name TEXT,
  guest_phone TEXT,
  delivery_first_name TEXT,
  delivery_last_name TEXT,
  delivery_phone TEXT,
  delivery_address TEXT,
  delivery_apartment TEXT,
  delivery_city TEXT,
  delivery_state TEXT,
  delivery_pin_code TEXT,
  delivery_country TEXT DEFAULT 'India',
  delivery_gst_number TEXT,
  subtotal NUMERIC(10,2) DEFAULT 0,
  shipping_cost NUMERIC(10,2) DEFAULT 0,
  points_used INTEGER DEFAULT 0,
  points_value NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  shipping_carrier TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  affiliate_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT,
  dxf_data JSONB,
  material_id TEXT REFERENCES materials(id) ON DELETE SET NULL,
  material_name TEXT NOT NULL,
  thickness NUMERIC(10,2) DEFAULT 0,
  perimeter_mm NUMERIC(10,2) DEFAULT 0,
  area_mm2 NUMERIC(10,2) DEFAULT 0,
  weight_kg NUMERIC(10,4) DEFAULT 0,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  service_type TEXT DEFAULT 'dxf',
  is_sketch_service BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. DELIVERY INFO TABLE
CREATE TABLE IF NOT EXISTS delivery_info (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  address TEXT,
  apartment TEXT,
  city TEXT,
  state TEXT,
  pin_code TEXT,
  country TEXT DEFAULT 'India',
  gst_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. AFFILIATE CODES TABLE
CREATE TABLE IF NOT EXISTS affiliate_codes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  commission_rate NUMERIC(5,2) DEFAULT 10.00,
  total_sales NUMERIC(10,2) DEFAULT 0,
  total_commission NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. AFFILIATE CONVERSIONS TABLE
CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id BIGSERIAL PRIMARY KEY,
  affiliate_code_id BIGINT REFERENCES affiliate_codes(id) ON DELETE CASCADE,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  order_amount NUMERIC(10,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SESSIONS TABLE
CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_batch_id ON orders(batch_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_material_id ON order_items(material_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_codes_user_id ON affiliate_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_code_id ON affiliate_conversions(affiliate_code_id);
CREATE INDEX IF NOT EXISTS idx_sessions_timestamp ON sessions(timestamp);

-- 11. CREATE SKETCH MATERIAL (CRITICAL FOR MIGRATION)
INSERT INTO materials (id, name, category, price_per_mm, thicknesses, density, available)
VALUES (
  'sketch',
  'Sketch Service',
  'service',
  0,
  ARRAY[0]::NUMERIC[],
  0,
  true
)
ON CONFLICT (id) DO NOTHING;

-- Success message
SELECT 'All tables created successfully!' AS status;
```

### Step 3: Verify Table Creation

```sql
-- Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected output:
- ✅ affiliate_codes
- ✅ affiliate_conversions
- ✅ delivery_info
- ✅ materials
- ✅ order_items
- ✅ orders
- ✅ sessions
- ✅ thicknesses
- ✅ users

---

## 4. Row Level Security (RLS) Policies

### Step 1: Enable RLS on All Tables

```sql
-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE thicknesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
```

### Step 2: Create Service Role Bypass Policies

**CRITICAL:** The backend uses the `service_role_key` which needs full access.

```sql
-- SERVICE ROLE BYPASS POLICIES (Backend Full Access)

-- Users table
CREATE POLICY "Service role bypass for users" ON users
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Materials table
CREATE POLICY "Service role bypass for materials" ON materials
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Thicknesses table
CREATE POLICY "Service role bypass for thicknesses" ON thicknesses
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Orders table
CREATE POLICY "Service role bypass for orders" ON orders
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Order items table
CREATE POLICY "Service role bypass for order_items" ON order_items
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Delivery info table
CREATE POLICY "Service role bypass for delivery_info" ON delivery_info
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Affiliate codes table
CREATE POLICY "Service role bypass for affiliate_codes" ON affiliate_codes
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Affiliate conversions table
CREATE POLICY "Service role bypass for affiliate_conversions" ON affiliate_conversions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Sessions table
CREATE POLICY "Service role bypass for sessions" ON sessions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
```

### Step 3: Create Public Read Policies

```sql
-- PUBLIC READ POLICIES (Anonymous/Frontend Access)

-- Materials - public can read
CREATE POLICY "Public read access for materials" ON materials
  FOR SELECT USING (available = true);

-- Thicknesses - public can read
CREATE POLICY "Public read access for thicknesses" ON thicknesses
  FOR SELECT USING (available = true);
```

### Step 4: Verify RLS Policies

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## 5. Migration Process

### Migration Architecture

The migration uses a **dual-write, safe rollback** approach:

1. **Existing KV Store** continues to work (backup)
2. **New SQL Tables** receive migrated data
3. **Toggle flag** (`USE_SQL_TABLES`) controls which system is active
4. **Instant rollback** by setting flag to `false`

### Migration Endpoint

Location: `/supabase/functions/server/index.tsx`

```typescript
// Migration toggle - Line 25
const USE_SQL_TABLES = false; // Set to TRUE after verification

// Migration endpoint - Line 153
app.post('/make-server-8927474f/admin/migrate-kv-to-sql', async (c) => {
  // Calls migration helper
  const result = await migrateKVToSQL(supabase);
  return c.json(result);
});
```

### Migration Helper

Location: `/supabase/functions/server/migration-helper.tsx`

**Migration Steps:**
1. ✅ Migrate materials (including "sketch")
2. ✅ Migrate users with loyalty points
3. ✅ Migrate orders (batch and standalone)
4. ✅ Create order items with proper relationships
5. ✅ Calculate totals correctly

### Running the Migration

**From Admin Dashboard:**

1. Log in as admin
2. Navigate to **Dashboard** tab
3. Scroll to **"Data Migration"** section
4. Click **"Migrate Data"** button
5. Wait for completion (shows migrated/skipped counts)

**Expected Output:**
```
✅ Materials: X migrated, 0 skipped
✅ Users: X migrated, 0 skipped
✅ Orders: 106 migrated, 0 skipped
✅ Order Items: X migrated, 0 skipped
```

---

## 6. Critical Fixes Applied

### Fix #1: Missing "sketch" Material Record

**Problem:** Sketch service orders reference a "sketch" material that didn't exist in the materials table, causing migration errors.

**Solution:** Create the "sketch" material before migration:

```sql
INSERT INTO materials (id, name, category, price_per_mm, thicknesses, density, available)
VALUES (
  'sketch',
  'Sketch Service',
  'service',
  0,
  ARRAY[0]::NUMERIC[],
  0,
  true
)
ON CONFLICT (id) DO NOTHING;
```

**Location:** Included in table creation script (Step 11)

---

### Fix #2: Field Name Mismatch (total_amount vs total_price)

**Problem:** 
- Migration code writes `total_amount` 
- Verification code tried to read `total_price`
- Result: Orders showed empty total

**Solution:** Updated verification display to use correct field:

```typescript
// Dashboard.tsx - Line ~560
<div>Total: ₹{order.total_amount || order.total_price || 0}</div>
```

**Files Updated:**
- `/components/admin/Dashboard.tsx`

---

### Fix #3: Order Total Calculation

**Problem:** Need to calculate correct total including shipping and points.

**Solution:** Migration helper calculates:

```typescript
const subtotal = items.reduce((sum, item) => 
  sum + (item.price * (item.quantity || 1)), 0
);
const shippingCost = firstItem.shippingCost || 0;
const pointsValue = firstItem.pointsValue || 0;
const totalAmount = subtotal + shippingCost - pointsValue;
```

**Location:** `/supabase/functions/server/migration-helper.tsx` (Lines 135-139)

---

### Fix #4: Upsert Conflict Handling

**Problem:** Re-running migration would fail due to duplicate keys.

**Solution:** Use upsert with conflict resolution:

```typescript
.upsert({
  order_number: firstItem.orderNumber || `SC-${Date.now()}`,
  // ... other fields
}, { onConflict: 'order_number' })
```

This allows safe re-runs without duplicates.

---

### Fix #5: User ID Lookup for Orders

**Problem:** Orders store `auth_user_id` but SQL needs internal `user_id`.

**Solution:** Lookup user ID during migration:

```typescript
let userId = null;
if (firstItem.userId) {
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', firstItem.userId)
    .single();
  userId = userData?.id || null;
}
```

---

## 7. Data Verification

### Verification Endpoint

Location: `/supabase/functions/server/index.tsx` (Line ~175)

```typescript
app.get('/make-server-8927474f/admin/verify-migration', async (c) => {
  // Returns comparison of KV vs SQL data
});
```

### Running Verification

**From Admin Dashboard:**

1. Log in as admin
2. Navigate to **Dashboard** tab
3. Scroll to **"Data Verification"** section
4. Click red **"Verify Data"** button
5. Review the results

### Verification Checks

#### ✅ Record Counts Comparison

**KV Store:**
- Users: X
- Orders: 106
- Materials: X

**SQL Tables:**
- Users: X
- Orders: 106
- Order Items: X
- Materials: X
- Thicknesses: X

#### ✅ Sample Data Preview

Shows actual records from SQL tables:
- Recent 5 orders with full details
- All materials
- Recent 5 users

#### ✅ Data Integrity Checks

- Orders without order items (should be 0)
- Order items with invalid materials (should be 0)
- Any orphaned records

### Expected Results

```
✅ No data integrity issues found!
✅ All 106 orders present in SQL
✅ All order items created successfully
✅ Materials including "sketch" exist
✅ User data migrated with loyalty points
```

---

## 8. Enabling SQL Mode

### Pre-Enablement Checklist

Before setting `USE_SQL_TABLES = true`, verify:

- [ ] All tables created successfully
- [ ] RLS policies applied
- [ ] Migration completed without errors
- [ ] Verification shows no integrity issues
- [ ] "sketch" material exists
- [ ] Sample data displays correctly
- [ ] Backups of KV store data available

### Step-by-Step Enablement

#### Step 1: Update the Toggle

Edit `/supabase/functions/server/index.tsx`:

```typescript
// Line 25
const USE_SQL_TABLES = true; // ⚠️ Changed from false to TRUE
```

#### Step 2: Test Key Endpoints

After enabling, test these critical flows:

**1. User Profile (GET):**
```bash
GET /make-server-8927474f/user/profile
```
Should return profile from SQL `users` table.

**2. Create Order:**
- Test a new order creation
- Verify it writes to SQL `orders` and `order_items` tables
- Check order appears in admin panel

**3. Admin Stats:**
```bash
GET /make-server-8927474f/admin/stats
```
Should calculate from SQL tables.

**4. Materials List:**
```bash
GET /make-server-8927474f/materials
```
Should return from SQL `materials` table.

#### Step 3: Monitor for Issues

Watch server logs for errors:
```
🗄️  Database Mode: SQL Tables
```

Check for SQL errors in Edge Function logs.

#### Step 4: Test User-Facing Features

- [ ] Sign up new user
- [ ] Login existing user
- [ ] View order history
- [ ] Place new order
- [ ] Admin panel shows correct data

---

## 9. Rollback Procedure

### When to Rollback

Rollback if you encounter:
- ❌ SQL query errors in logs
- ❌ Orders not appearing
- ❌ User data missing
- ❌ Payment failures
- ❌ Any critical functionality broken

### Instant Rollback Steps

#### Step 1: Disable SQL Mode

Edit `/supabase/functions/server/index.tsx`:

```typescript
// Line 25
const USE_SQL_TABLES = false; // ⚠️ Changed back to FALSE
```

#### Step 2: Redeploy Edge Function

The change will take effect immediately upon deploy.

#### Step 3: Verify Rollback

Check logs:
```
🗄️  Database Mode: KV Store
```

#### Step 4: Test Critical Flows

- [ ] User login works
- [ ] Orders display correctly
- [ ] New orders can be created
- [ ] Admin panel accessible

### Data Preservation

**IMPORTANT:** Both KV and SQL data remain intact during rollback. No data is lost.

---

## 10. Troubleshooting

### Issue 1: "relation does not exist" Error

**Error:**
```
relation "public.orders" does not exist
```

**Cause:** Tables not created or created in wrong schema.

**Solution:**
1. Run table creation SQL script again
2. Verify with: `SELECT * FROM pg_tables WHERE schemaname = 'public';`
3. Ensure you're using service role key

---

### Issue 2: RLS Policy Blocking Queries

**Error:**
```
new row violates row-level security policy
```

**Cause:** Service role bypass policy missing.

**Solution:**
```sql
CREATE POLICY "Service role bypass for [table]" ON [table]
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
```

---

### Issue 3: Migration Shows "0 migrated"

**Possible Causes:**

1. **KV Store Empty:**
   - Verify: `await kv.getByPrefix('order:')` returns data
   
2. **Upsert Conflict:**
   - Check if records already exist
   - Migration skips existing records

**Solution:**
- Clear SQL tables and re-run migration
- Check migration error logs

---

### Issue 4: Order Total Shows Empty

**Error:** Total displays as just "₹" with no number.

**Cause:** Using wrong field name (`total_price` instead of `total_amount`).

**Solution:** Fixed in this guide (see Fix #2). Use:
```typescript
order.total_amount || order.total_price || 0
```

---

### Issue 5: Sketch Orders Fail Migration

**Error:**
```
foreign key constraint "order_items_material_id_fkey" violated
```

**Cause:** "sketch" material doesn't exist.

**Solution:** Create sketch material (included in Step 11 of table creation).

---

### Issue 6: Cannot Connect to Supabase

**Error:**
```
Failed to fetch
```

**Possible Causes:**

1. **Wrong Project URL/Key:**
   - Check `/utils/supabase/info.tsx` has correct values
   
2. **RLS Blocking Access:**
   - Verify service role bypass policies exist
   
3. **Network Issue:**
   - Check Supabase project is running

---

## 🎯 Final Checklist

Before marking migration complete:

### Database Setup
- [ ] All 9 tables created
- [ ] All indexes created
- [ ] "sketch" material record exists
- [ ] RLS enabled on all tables
- [ ] Service role bypass policies applied
- [ ] Public read policies for materials

### Migration
- [ ] Migration ran successfully
- [ ] 106 orders migrated
- [ ] Order items created
- [ ] Materials migrated
- [ ] Users migrated with points

### Verification
- [ ] No data integrity issues
- [ ] Record counts match KV store
- [ ] Sample data displays correctly
- [ ] Order totals show properly
- [ ] Verification endpoint works

### Testing
- [ ] Tested with `USE_SQL_TABLES = true`
- [ ] User login works
- [ ] Order creation works
- [ ] Admin stats accurate
- [ ] No errors in logs

### Backup
- [ ] KV Store data preserved
- [ ] Can rollback to KV instantly
- [ ] SQL data backed up

---

## 📞 Support & Maintenance

### Key Files Reference

| File | Purpose |
|------|---------|
| `/supabase/functions/server/index.tsx` | Main server with toggle flag |
| `/supabase/functions/server/migration-helper.tsx` | Migration logic |
| `/components/admin/Dashboard.tsx` | Admin UI for migration/verification |
| `/utils/supabase/info.tsx` | Supabase credentials |

### Database Schema Location

All table definitions and policies are in this guide. For updates:
1. Modify in Supabase SQL Editor
2. Update this guide
3. Test thoroughly before production

### Next Steps After SQL Mode

Once `USE_SQL_TABLES = true` is stable:

1. **Monitor Performance:**
   - Check query speeds
   - Monitor database size
   - Review slow query logs

2. **Optimize Queries:**
   - Add indexes as needed
   - Consider materialized views for reports

3. **Clean Up (Optional):**
   - Archive KV store data
   - Remove migration helper file
   - Remove migration endpoint

4. **Future Enhancements:**
   - Add database backups
   - Set up replication
   - Configure automated testing

---

## 📄 Document History

| Date | Version | Changes |
|------|---------|---------|
| Dec 5, 2025 | 1.0 | Initial guide created after successful migration |

---

**END OF GUIDE**

For questions or issues, refer to the Troubleshooting section or review Supabase logs in the dashboard.
