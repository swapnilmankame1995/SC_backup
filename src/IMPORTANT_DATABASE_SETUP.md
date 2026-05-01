# 🚨 CRITICAL: Missing Database Table

## Issue Detected
The `shipping_rates` table is missing from your Supabase database. This is causing checkout failures.

## Required Action: Create the `shipping_rates` Table

You need to manually create this table in your Supabase dashboard:

### Step 1: Go to Supabase SQL Editor
1. Open your Supabase dashboard
2. Navigate to SQL Editor
3. Create a new query

### Step 2: Run This SQL Statement

```sql
-- Create shipping_rates table
CREATE TABLE IF NOT EXISTS public.shipping_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  state TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  min_order_value NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shipping_rates_state ON public.shipping_rates(state);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_active ON public.shipping_rates(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active shipping rates (needed for checkout)
CREATE POLICY "Allow public read access to active shipping rates"
  ON public.shipping_rates
  FOR SELECT
  USING (is_active = true);

-- Allow authenticated users to read all shipping rates
CREATE POLICY "Allow authenticated users to read all shipping rates"
  ON public.shipping_rates
  FOR SELECT
  TO authenticated
  USING (true);

-- Admin policies will be managed through your application logic
```

### Step 3: Verify the Table Was Created
Run this query to confirm:
```sql
SELECT * FROM public.shipping_rates;
```

You should see an empty table with the correct columns.

---

## Optional: Add Default Shipping Rates

After creating the table, you can add some default rates:

```sql
INSERT INTO public.shipping_rates (state, rate, min_order_value, is_active) VALUES
  ('Karnataka', 50, NULL, true),
  ('Maharashtra', 60, NULL, true),
  ('Tamil Nadu', 65, NULL, true),
  ('Delhi', 70, NULL, true),
  ('Telangana', 55, NULL, true);
```

Adjust the rates as needed for your business.

---

## Why This Happened
During the SQL migration from KV Store, the `shipping_rates` table creation was likely missed. The application code expects this table to exist when `USE_SQL_TABLES = true`.

## After Creating the Table
1. The checkout process will work correctly
2. You can manage shipping rates through the Admin panel at `/admin/shipping`
3. State-based shipping calculations will function properly
