# 🗄️ SQL MIGRATION SCHEMA

**Purpose:** Create PostgreSQL tables to replace KV store  
**Date:** December 4, 2024  
**Status:** Ready to Execute

---

## 📋 Instructions

### **Step 1: Open Supabase SQL Editor**
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Navigate to: **SQL Editor** (left sidebar)
4. Click: **New query**

### **Step 2: Execute This SQL**
Copy and paste the entire SQL below into the editor and click **RUN**

---

## 🔧 SQL Schema (Execute in Supabase)

```sql
-- ============================================================================
-- SHEETCUTTERS.COM - PRODUCTION DATABASE SCHEMA
-- Migration from KV Store to Relational Tables
-- Date: December 4, 2024
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: users
-- Stores user account information and preferences
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

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);

-- ============================================================================
-- TABLE: materials
-- Stores material catalog (metals, non-metals, etc.)
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

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_materials_category ON public.materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_available ON public.materials(available);

-- ============================================================================
-- TABLE: orders
-- Stores main order information (parent for order_items)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  batch_id UUID,
  
  -- Contact Info (for guest orders)
  guest_email TEXT,
  guest_name TEXT,
  guest_phone TEXT,
  
  -- Delivery Address
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
  
  -- Pricing
  subtotal NUMERIC(10, 2) NOT NULL,
  shipping_cost NUMERIC(10, 2) DEFAULT 0,
  discount_amount NUMERIC(10, 2) DEFAULT 0,
  points_used INTEGER DEFAULT 0,
  points_value NUMERIC(10, 2) DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL,
  
  -- Order Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  
  -- Shipping
  shipping_carrier TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  
  -- Affiliate
  affiliate_code TEXT,
  affiliate_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  affiliate_commission NUMERIC(10, 2) DEFAULT 0,
  
  -- Metadata
  notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_batch_id ON public.orders(batch_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_affiliate_code ON public.orders(affiliate_code);

-- ============================================================================
-- TABLE: order_items
-- Stores individual items within an order (DXF cutting jobs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  
  -- File Information
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_size_bytes INTEGER,
  
  -- DXF Data (stored as JSONB for flexibility)
  dxf_data JSONB,
  
  -- Material Specifications
  material_id TEXT REFERENCES public.materials(id) ON DELETE SET NULL,
  material_name TEXT NOT NULL,
  thickness NUMERIC(10, 2) NOT NULL,
  
  -- Dimensions
  perimeter_mm NUMERIC(10, 2),
  area_mm2 NUMERIC(10, 2),
  weight_kg NUMERIC(10, 4),
  
  -- Pricing
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL,
  
  -- Service Type
  service_type TEXT DEFAULT 'dxf' CHECK (service_type IN ('dxf', 'sketch')),
  is_sketch_service BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_material_id ON public.order_items(material_id);

-- ============================================================================
-- TABLE: sketch_orders
-- Stores sketch-to-DXF conversion orders
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sketch_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
  
  -- Sketch File
  sketch_file_path TEXT NOT NULL,
  sketch_file_name TEXT NOT NULL,
  
  -- Converted DXF
  dxf_file_path TEXT,
  dxf_file_name TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Notes
  customer_notes TEXT,
  admin_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_sketch_orders_user_id ON public.sketch_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_sketch_orders_status ON public.sketch_orders(status);

-- ============================================================================
-- TABLE: order_status_history
-- Tracks all status changes for orders (audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON public.order_status_history(created_at DESC);

-- ============================================================================
-- TABLE: loyalty_transactions
-- Tracks points earned and redeemed by users
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired', 'adjusted')),
  points INTEGER NOT NULL,
  description TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON public.loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_order_id ON public.loyalty_transactions(order_id);

-- ============================================================================
-- TABLE: affiliate_usage_logs
-- Tracks when affiliate codes are used
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.affiliate_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  affiliate_code TEXT NOT NULL,
  affiliate_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  commission_amount NUMERIC(10, 2) NOT NULL,
  order_total NUMERIC(10, 2) NOT NULL,
  user_email TEXT,
  user_ip TEXT,
  
  -- Fraud Detection
  is_suspicious BOOLEAN DEFAULT FALSE,
  fraud_score INTEGER DEFAULT 0,
  fraud_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_usage_logs_affiliate_code ON public.affiliate_usage_logs(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_usage_logs_affiliate_user_id ON public.affiliate_usage_logs(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_usage_logs_order_id ON public.affiliate_usage_logs(order_id);

-- ============================================================================
-- FUNCTION: Update updated_at timestamp automatically
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_materials_updated_at ON public.materials;
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.materials
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
-- COMPLETE! ✅
-- ============================================================================

SELECT 'Migration schema created successfully! ✅' AS status;
```

---

## ✅ Verification

After running the SQL, verify tables were created:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'users', 
    'materials', 
    'orders', 
    'order_items',
    'sketch_orders',
    'order_status_history',
    'loyalty_transactions',
    'affiliate_usage_logs'
  )
ORDER BY table_name;

-- Should return 8 rows
```

---

## 📊 Table Relationships

```
users (1) ──────< (many) orders
           └─────< (many) loyalty_transactions

materials (1) ───< (many) order_items

orders (1) ──────< (many) order_items
           ├─────< (many) order_status_history
           ├─────< (many) sketch_orders
           └─────< (many) affiliate_usage_logs

order_items (1) ─< (1) sketch_orders
```

---

## 🔒 Security Notes

- All tables are in `public` schema
- Foreign keys have `ON DELETE CASCADE` or `ON DELETE SET NULL`
- Supabase RLS (Row Level Security) can be enabled later
- User data is linked to `auth.users` table

---

## 📝 Next Steps

After creating tables:
1. ✅ Run data migration script (copies KV → SQL)
2. ✅ Update backend code to use SQL
3. ✅ Test thoroughly
4. ✅ Monitor for errors

---

**Last Updated:** December 4, 2024
