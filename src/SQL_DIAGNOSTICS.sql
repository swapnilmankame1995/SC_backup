-- =============================================
-- SQL DIAGNOSTICS FOR WHATSAPP NUMBER BUG
-- =============================================
-- Run these queries in your Supabase SQL Editor
-- to diagnose why the WhatsApp number isn't saving

-- =============================================
-- 1. CHECK IF SETTINGS TABLE EXISTS
-- =============================================
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public'
  AND table_name = 'settings'
) AS settings_table_exists;

-- Expected: true
-- If false: The table doesn't exist (see fix below)


-- =============================================
-- 2. CHECK CURRENT SUPPORT SETTINGS IN SQL
-- =============================================
SELECT 
  key,
  value,
  created_at,
  updated_at
FROM settings 
WHERE key = 'support_settings';

-- Expected: One row with support_settings
-- If no rows: The record doesn't exist (will be created on first save)
-- Check the value -> whatsappNumber field


-- =============================================
-- 3. CHECK CURRENT SUPPORT SETTINGS IN KV
-- =============================================
SELECT 
  key,
  value,
  created_at,
  updated_at
FROM kv_store_8927474f 
WHERE key = 'support_settings';

-- Expected: One row with support_settings
-- Compare the whatsappNumber with SQL version


-- =============================================
-- 4. CHECK IF VALUES ARE DIFFERENT
-- =============================================
SELECT 
  'SQL' AS source,
  value->>'whatsappNumber' AS whatsapp_number,
  updated_at
FROM settings 
WHERE key = 'support_settings'

UNION ALL

SELECT 
  'KV' AS source,
  value->>'whatsappNumber' AS whatsapp_number,
  updated_at
FROM kv_store_8927474f 
WHERE key = 'support_settings';

-- Expected: Both should show the same number
-- If different: KV has the new number, SQL has the old one


-- =============================================
-- 5. CHECK RLS POLICIES ON SETTINGS TABLE
-- =============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'settings';

-- Check if there are restrictive RLS policies
-- If empty: RLS is enabled but no policies (blocks all access!)
-- If restrictive: Policy might be blocking admin updates


-- =============================================
-- 6. CHECK IF RLS IS ENABLED
-- =============================================
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'settings';

-- rowsecurity = true means RLS is enabled
-- If enabled with no permissive policies, all access is blocked


-- =============================================
-- 7. CHECK SETTINGS TABLE STRUCTURE
-- =============================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'settings'
ORDER BY ordinal_position;

-- Verify table has: key (text), value (jsonb), created_at, updated_at


-- =============================================
-- FIX 1: CREATE SETTINGS TABLE (IF MISSING)
-- =============================================
-- Only run if settings table doesn't exist

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for service role
CREATE POLICY "Allow service role full access" ON settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Insert default support settings
INSERT INTO settings (key, value, created_at, updated_at)
VALUES (
  'support_settings',
  '{"whatsappNumber": "918217553454", "supportEmail": "support@sheetcutters.com", "supportHours": "9 AM - 6 PM IST"}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (key) DO NOTHING;


-- =============================================
-- FIX 2: SYNC KV TO SQL (IF VALUES DIFFER)
-- =============================================
-- Run this to copy the correct WhatsApp number from KV to SQL

UPDATE settings
SET 
  value = (
    SELECT value FROM kv_store_8927474f WHERE key = 'support_settings'
  ),
  updated_at = NOW()
WHERE key = 'support_settings';

-- Verify the sync worked
SELECT value->>'whatsappNumber' AS synced_number 
FROM settings 
WHERE key = 'support_settings';


-- =============================================
-- FIX 3: DROP RESTRICTIVE RLS POLICIES
-- =============================================
-- Only run if RLS policies are blocking access

-- Drop all existing policies on settings
DROP POLICY IF EXISTS "settings_policy" ON settings;
DROP POLICY IF EXISTS "settings_read_policy" ON settings;
DROP POLICY IF EXISTS "settings_write_policy" ON settings;

-- Create new permissive policy for service role
CREATE POLICY "Allow service role full access" ON settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);


-- =============================================
-- FIX 4: CREATE ADMIN-SPECIFIC POLICY
-- =============================================
-- More secure than service role bypass
-- Only admins can read/write settings

CREATE POLICY "Allow admin users full access" ON settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_user_id = auth.uid()
    AND users.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_user_id = auth.uid()
    AND users.is_admin = true
  )
);


-- =============================================
-- VERIFICATION: CHECK IF EVERYTHING WORKS
-- =============================================

-- 1. Table exists?
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'settings'
) AS table_exists;

-- 2. Record exists?
SELECT COUNT(*) AS record_count 
FROM settings 
WHERE key = 'support_settings';

-- 3. Current value?
SELECT 
  value->>'whatsappNumber' AS current_whatsapp,
  value->>'supportEmail' AS current_email,
  updated_at
FROM settings 
WHERE key = 'support_settings';

-- 4. RLS enabled?
SELECT rowsecurity AS rls_enabled 
FROM pg_tables 
WHERE tablename = 'settings';

-- 5. Policies exist?
SELECT COUNT(*) AS policy_count 
FROM pg_policies 
WHERE tablename = 'settings';


-- =============================================
-- MANUAL TEST: TRY UPDATING THE VALUE
-- =============================================
-- This simulates what the server does

UPDATE settings
SET 
  value = jsonb_set(
    value, 
    '{whatsappNumber}', 
    '"919876543210"'
  ),
  updated_at = NOW()
WHERE key = 'support_settings';

-- If this fails with RLS error, the policies need to be fixed
-- If this succeeds, the server should work too


-- =============================================
-- CLEANUP: REMOVE TEST DATA (OPTIONAL)
-- =============================================
-- Restore original value if you ran the manual test

UPDATE settings
SET 
  value = jsonb_set(
    value, 
    '{whatsappNumber}', 
    '"918217553454"'
  ),
  updated_at = NOW()
WHERE key = 'support_settings';
