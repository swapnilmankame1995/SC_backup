# 🚨 SUPABASE MANUAL SETUP REQUIRED

## ⚠️ CRITICAL: SQL Tables Missing

Your migration code references **7 tables** that are NOT in the existing SQL schema!

---

## 📋 MISSING TABLES

The migration code uses these tables that need to be created:

| Table Name | Used By | Status |
|------------|---------|--------|
| ✅ users | User management | EXISTS in schema |
| ✅ materials | Material catalog | EXISTS in schema |
| ✅ orders | Order management | EXISTS in schema |
| ❌ **delivery_info** | User delivery addresses | **MISSING** |
| ❌ **file_uploads** | File upload tracking | **MISSING** |
| ❌ **discount_codes** | Discount management | **MISSING** |
| ❌ **affiliates** | Affiliate program | **MISSING** |
| ❌ **affiliate_usage** | Affiliate tracking | **MISSING** |
| ❌ **settings** | App configuration | **MISSING** |
| ❌ **sessions** | Analytics tracking | **MISSING** |

---

## 🔧 ACTION REQUIRED

You need to **manually execute SQL** in Supabase to create these 7 missing tables.

### **Step 1: Open Supabase SQL Editor**

1. Go to: https://supabase.com/dashboard
2. Select your Sheetcutters project
3. Click **SQL Editor** in left sidebar
4. Click **New query**

### **Step 2: Execute Complete Schema**

Copy the COMPLETE SQL schema below (includes ALL tables) and click **RUN**.

---

## 📝 COMPLETE SQL SCHEMA (ALL TABLES)

```sql
-- ============================================================================
-- SHEETCUTTERS.COM - COMPLETE PRODUCTION DATABASE SCHEMA
-- Includes ALL tables required for migration
-- Date: December 5, 2024
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: users (✅ Already in original schema)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
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
  total_spent NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);

-- ============================================================================
-- TABLE: materials (✅ Already in original schema)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Metals', 'Non-Metals')),
  price_per_mm NUMERIC(10, 4) NOT NULL,
  thicknesses NUMERIC[] NOT NULL,
  density INTEGER NOT NULL,
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materials_category ON public.materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_available ON public.materials(available);

-- ============================================================================
-- TABLE: delivery_info (❌ NEW - REQUIRED)
-- Stores user delivery addresses (separate from user table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.delivery_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(auth_user_id) ON DELETE CASCADE,
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
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_info_user_id ON public.delivery_info(user_id);

-- ============================================================================
-- TABLE: file_uploads (❌ NEW - REQUIRED)
-- Tracks DXF/SVG file uploads from users and guests
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.file_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_path TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name TEXT,
  file_size BIGINT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  associated_with_order BOOLEAN DEFAULT FALSE,
  order_id UUID
);

CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id ON public.file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_file_path ON public.file_uploads(file_path);
CREATE INDEX IF NOT EXISTS idx_file_uploads_uploaded_at ON public.file_uploads(uploaded_at);

-- ============================================================================
-- TABLE: discount_codes (❌ NEW - REQUIRED)
-- Stores discount codes and coupons
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.discount_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10, 2) NOT NULL,
  min_order_amount NUMERIC(10, 2) DEFAULT 0,
  max_discount_amount NUMERIC(10, 2),
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  affiliate_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON public.discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_affiliate_id ON public.discount_codes(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_discount_codes_is_active ON public.discount_codes(is_active);

-- ============================================================================
-- TABLE: affiliates (❌ NEW - REQUIRED)
-- Stores affiliate program participants
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.affiliates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  commission_percentage NUMERIC(5, 2) DEFAULT 10.00,
  payment_details JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  total_sales NUMERIC(10, 2) DEFAULT 0,
  total_commission NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliates_email ON public.affiliates(email);
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON public.affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_is_active ON public.affiliates(is_active);

-- ============================================================================
-- TABLE: affiliate_usage (❌ NEW - REQUIRED)
-- Tracks individual affiliate code usage (for fraud detection)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.affiliate_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  affiliate_name TEXT,
  discount_code TEXT,
  user_id UUID,
  user_email TEXT,
  order_id UUID,
  order_number TEXT,
  order_value NUMERIC(10, 2),
  commission NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_usage_affiliate_id ON public.affiliate_usage(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_usage_user_email ON public.affiliate_usage(user_email);
CREATE INDEX IF NOT EXISTS idx_affiliate_usage_order_id ON public.affiliate_usage(order_id);

-- ============================================================================
-- TABLE: settings (❌ NEW - REQUIRED)
-- Stores app configuration (key-value pairs as JSONB)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settings_key ON public.settings(key);

-- ============================================================================
-- TABLE: sessions (❌ NEW - REQUIRED)
-- Tracks user sessions for analytics
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  page TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON public.sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.sessions(created_at);

-- ============================================================================
-- TABLE: orders (✅ Already in original schema - ENHANCED)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID,
  
  -- Material & Specs (for single-item orders)
  material_id TEXT,
  material_name TEXT,
  thickness NUMERIC(10, 2),
  quantity INTEGER DEFAULT 1,
  
  -- File paths
  file_path TEXT,
  sketch_file_paths TEXT[],
  
  -- Pricing
  price NUMERIC(10, 2) NOT NULL,
  shipping_cost NUMERIC(10, 2) DEFAULT 0,
  discount_code TEXT,
  discount_amount NUMERIC(10, 2) DEFAULT 0,
  points_used INTEGER DEFAULT 0,
  
  -- Delivery (can be JSONB for flexibility)
  delivery_info JSONB,
  
  -- Status
  status TEXT DEFAULT 'pending',
  delivery_status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  
  -- Tracking
  tracking_number TEXT,
  shipping_partner TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- ============================================================================
-- FUNCTION: Auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_materials_updated_at ON public.materials;
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_delivery_info_updated_at ON public.delivery_info;
CREATE TRIGGER update_delivery_info_updated_at BEFORE UPDATE ON public.delivery_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_discount_codes_updated_at ON public.discount_codes;
CREATE TRIGGER update_discount_codes_updated_at BEFORE UPDATE ON public.discount_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_affiliates_updated_at ON public.affiliates;
CREATE TRIGGER update_affiliates_updated_at BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DEFAULT DATA: Insert default materials
-- ============================================================================
INSERT INTO public.materials (id, name, category, price_per_mm, thicknesses, density, available)
VALUES
  ('mild-steel', 'Mild Steel', 'Metals', 0.10, ARRAY[1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12], 7850, TRUE),
  ('stainless-steel', 'Stainless Steel', 'Metals', 0.15, ARRAY[1, 1.5, 2, 3, 4, 5, 6, 8, 10], 8000, TRUE),
  ('aluminum', 'Aluminum', 'Metals', 0.12, ARRAY[1, 1.5, 2, 3, 4, 5, 6, 8, 10], 2700, TRUE),
  ('acrylic', 'Acrylic', 'Non-Metals', 0.08, ARRAY[3, 4, 5, 6, 8, 10, 12], 1190, TRUE),
  ('mdf', 'MDF', 'Non-Metals', 0.06, ARRAY[3, 4, 5, 6, 8, 10, 12, 18], 750, TRUE),
  ('pvc', 'PVC', 'Non-Metals', 0.07, ARRAY[3, 4, 5, 6, 8, 10], 1400, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICATION: Check all tables exist
-- ============================================================================
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('users', 'materials', 'delivery_info', 'file_uploads', 
                        'discount_codes', 'affiliates', 'affiliate_usage', 
                        'settings', 'sessions', 'orders') 
    THEN '✅ REQUIRED'
    ELSE '⚠️  OPTIONAL'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================================================
-- ✅ COMPLETE! All 10 required tables created
-- ============================================================================
SELECT 'Migration schema created successfully! ✅' AS status;
```

---

## ✅ VERIFICATION QUERY

After running the SQL, verify all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'users',
    'materials', 
    'delivery_info',
    'file_uploads',
    'discount_codes',
    'affiliates',
    'affiliate_usage',
    'settings',
    'sessions',
    'orders'
  )
ORDER BY table_name;
```

**Expected Result:** Should return **10 rows** (all required tables).

---

## 📊 TABLE SUMMARY

| # | Table Name | Purpose | Status |
|---|------------|---------|--------|
| 1 | users | User accounts | ✅ Required |
| 2 | materials | Material catalog | ✅ Required |
| 3 | delivery_info | Delivery addresses | ✅ Required |
| 4 | file_uploads | File tracking | ✅ Required |
| 5 | discount_codes | Discount management | ✅ Required |
| 6 | affiliates | Affiliate program | ✅ Required |
| 7 | affiliate_usage | Affiliate tracking | ✅ Required |
| 8 | settings | App config | ✅ Required |
| 9 | sessions | Analytics | ✅ Required |
| 10 | orders | Order management | ✅ Required |

---

## ⚠️ IMPORTANT NOTES

### **1. This is ONE-TIME SETUP**
- You only need to run this SQL **ONCE**
- The `IF NOT EXISTS` clauses prevent errors if tables already exist
- Safe to run multiple times

### **2. Foreign Keys**
- `delivery_info.user_id` → `users.auth_user_id`
- `discount_codes.affiliate_id` → `users.id`
- `affiliates.user_id` → `users.id`
- `affiliate_usage.affiliate_id` → `affiliates.id`
- `file_uploads.user_id` → `auth.users.id`

### **3. Indexes Created**
All critical fields have indexes for fast queries:
- Email lookups
- User IDs
- Discount codes
- File paths
- Session tracking
- Order numbers

### **4. Auto-Updated Fields**
These tables auto-update `updated_at` on every change:
- users
- materials
- delivery_info
- discount_codes
- affiliates
- settings
- orders

---

## 🚀 NEXT STEPS AFTER SQL EXECUTION

Once you run the SQL:

1. ✅ **Verify tables created** (run verification query above)
2. ✅ **Check materials inserted** (should have 6 default materials)
3. ✅ **Review indexes** (all should be created)
4. ✅ **Test connection** (app should connect)
5. ✅ **Ready to migrate data** (run `/admin/migrate-kv-to-sql`)

---

## 🔒 SECURITY NOTES

- All tables are in `public` schema
- Foreign keys ensure referential integrity
- ON DELETE CASCADE for user data cleanup
- ON DELETE SET NULL for optional relationships
- Supabase RLS can be enabled later for row-level security

---

## ❓ NEED HELP?

If you encounter errors:

1. **Check Supabase project selected** (top-right corner)
2. **Look for error messages** in SQL editor
3. **Verify postgres version** (should be 15+)
4. **Check permissions** (you should be project owner)

---

## 📝 SUMMARY

**YOU MUST RUN THIS SQL BEFORE SWITCHING TO SQL MODE!**

Without these tables, your app will crash when `USE_SQL_TABLES = true`.

**Action Required:**
1. Copy the complete SQL above
2. Open Supabase SQL Editor
3. Paste and click RUN
4. Verify 10 tables created
5. Come back here to continue migration

---

**Status:** ⚠️ **MANUAL ACTION REQUIRED**  
**Estimated Time:** 2 minutes  
**Difficulty:** Easy (copy & paste SQL)  
**Risk:** None (safe to run)
