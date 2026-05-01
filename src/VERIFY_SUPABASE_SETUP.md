# 🔍 SUPABASE CONFIGURATION VERIFICATION GUIDE

## ⚠️ IMPORTANT: I Cannot Access Your Database

As an AI, I **cannot directly query your Supabase database**. You need to manually verify the setup by following these steps.

---

## 📋 VERIFICATION STEPS

### **Step 1: Check if Tables Exist**

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your Sheetcutters project
3. Click **SQL Editor** (left sidebar)
4. Run this query:

```sql
-- Check which tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### **Expected Result:**

You should see **AT LEAST** these 10 tables:

✅ **REQUIRED TABLES:**
- [ ] `affiliates`
- [ ] `affiliate_usage`
- [ ] `delivery_info`
- [ ] `discount_codes`
- [ ] `file_uploads`
- [ ] `materials`
- [ ] `orders`
- [ ] `sessions`
- [ ] `settings`
- [ ] `users`

**Plus these optional tables from the original schema:**
- [ ] `order_items` (optional but recommended)
- [ ] `sketch_orders` (optional)
- [ ] `order_status_history` (optional)
- [ ] `loyalty_transactions` (optional)

---

### **Step 2: Verify Critical Tables with Data**

Run these queries to check table structure:

```sql
-- Check users table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check discount_codes table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'discount_codes' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check file_uploads table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'file_uploads' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check orders table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check materials table (should have 6 default materials)
SELECT id, name, category, available 
FROM public.materials 
ORDER BY category, name;
```

---

### **Step 3: Check Foreign Keys**

```sql
-- Verify foreign key relationships
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
```

**Expected foreign keys:**
- `delivery_info.user_id` → `auth.users.id`
- `discount_codes.affiliate_id` → `users.id`
- `affiliates.user_id` → `users.id`
- `affiliate_usage.affiliate_id` → `affiliates.id`
- `file_uploads.user_id` → `auth.users.id`
- `users.auth_user_id` → `auth.users.id`

---

### **Step 4: Verify Indexes**

```sql
-- Check if indexes were created
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'materials', 'delivery_info', 'file_uploads',
    'discount_codes', 'affiliates', 'affiliate_usage', 
    'settings', 'sessions', 'orders'
  )
ORDER BY tablename, indexname;
```

---

## ✅ VERIFICATION CHECKLIST

### **Minimum Required Configuration:**

- [ ] **Table Count:** At least 10 tables exist
- [ ] **users table:** Has `auth_user_id`, `email`, `is_admin` columns
- [ ] **discount_codes table:** Has `code`, `discount_type`, `discount_value` columns
- [ ] **file_uploads table:** Has `file_path`, `user_id`, `uploaded_at` columns
- [ ] **affiliates table:** Has `email`, `commission_percentage` columns
- [ ] **affiliate_usage table:** Has `affiliate_id`, `user_email` columns
- [ ] **settings table:** Has `key`, `value` (JSONB) columns
- [ ] **sessions table:** Has `session_id`, `page`, `created_at` columns
- [ ] **delivery_info table:** Has `user_id`, `address`, `city` columns
- [ ] **orders table:** Has `order_number`, `user_id`, `price` columns
- [ ] **materials table:** Has 6 default materials inserted

### **Advanced Configuration:**

- [ ] Foreign keys created correctly
- [ ] Indexes created on key columns
- [ ] `updated_at` triggers working
- [ ] UUID extension enabled

---

## 🚨 IF TABLES ARE MISSING

### **Scenario 1: No Tables Exist**
**Action:** You need to run the complete SQL schema from `/SUPABASE_SETUP_REQUIRED.md`

### **Scenario 2: Some Tables Exist (Old Schema)**
**Problem:** You might have run the old schema that only had `users`, `materials`, `orders`, `order_items`.

**Solution:** Run this additional SQL to add missing tables:

```sql
-- Add missing tables to existing schema
-- Run this if you only have users, materials, orders, order_items

-- ============================================================================
-- TABLE: delivery_info
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.delivery_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
-- TABLE: file_uploads
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

-- ============================================================================
-- TABLE: discount_codes
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

-- ============================================================================
-- TABLE: affiliates
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

-- ============================================================================
-- TABLE: affiliate_usage
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

-- ============================================================================
-- TABLE: settings
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
-- TABLE: sessions
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

-- Verification
SELECT 'Missing tables added successfully! ✅' AS status;
```

### **Scenario 3: All Tables Exist**
**Great!** Proceed to data migration.

---

## 📊 REPORT YOUR RESULTS

After running the verification queries, please tell me:

1. **How many tables exist?** (from Step 1 query)
2. **Do all 10 required tables exist?** (Yes/No)
3. **Any error messages?** (if any)

Based on your answers, I'll tell you exactly what to do next!

---

## 🎯 QUICK STATUS CHECK

Run this single query to get a complete status:

```sql
-- Complete status check
WITH required_tables AS (
  SELECT unnest(ARRAY[
    'users', 'materials', 'delivery_info', 'file_uploads',
    'discount_codes', 'affiliates', 'affiliate_usage', 
    'settings', 'sessions', 'orders'
  ]) AS table_name
),
existing_tables AS (
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
)
SELECT 
  rt.table_name,
  CASE 
    WHEN et.table_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status
FROM required_tables rt
LEFT JOIN existing_tables et ON rt.table_name = et.table_name
ORDER BY rt.table_name;
```

**This will show you exactly which tables are missing!**

---

## 🚀 WHAT HAPPENS AFTER VERIFICATION?

### **If All Tables Exist:**
1. ✅ You're ready for data migration
2. ✅ Run: `POST /admin/migrate-kv-to-sql` (I'll help with this)
3. ✅ Switch `USE_SQL_TABLES = true`

### **If Tables Missing:**
1. ❌ Run the complete SQL schema from `/SUPABASE_SETUP_REQUIRED.md`
2. ✅ Verify again
3. ✅ Then proceed to data migration

---

## 📞 NEXT STEPS

**Please run the verification queries and tell me:**
- How many tables you have
- Which tables are missing (if any)
- Any errors you encounter

Then I'll guide you on exactly what to do next!

---

**Remember:** I cannot see your database - you must run these queries and report back! 🙏
