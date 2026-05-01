# 🔧 TROUBLESHOOTING GUIDE

**For:** Safe Scalability Fix Implementation  
**Last Updated:** March 16, 2026

---

## 🎯 HOW TO USE THIS GUIDE

1. Find your error message or symptom
2. Follow the diagnostic steps
3. Apply the fix
4. Verify it worked
5. If still broken, contact me with details

---

## 📁 PHASE 1 ISSUES (Database Setup)

### **Issue 1.1: "Table order_counters already exists"**

**Error Message:**
```
ERROR: relation "order_counters" already exists
```

**Diagnosis:**
Table was created in a previous attempt.

**Fix:**
```sql
-- Check current state
SELECT * FROM public.order_counters;

-- If it looks correct, skip Step 1.2 and continue to Step 1.3
-- If it's wrong, drop and recreate:
DROP TABLE IF EXISTS public.order_counters CASCADE;
-- Then re-run Step 1.2
```

---

### **Issue 1.2: "Function increment_order_counter already exists"**

**Error Message:**
```
ERROR: function increment_order_counter(integer) already exists
```

**Fix:**
```sql
-- Drop and recreate
DROP FUNCTION IF EXISTS public.increment_order_counter(INTEGER);
-- Then re-run Step 1.3
```

---

### **Issue 1.3: "Permission denied for schema public"**

**Error Message:**
```
ERROR: permission denied for schema public
```

**Diagnosis:**
You're not using the right Supabase role.

**Fix:**
1. Go to Supabase Dashboard
2. Ensure you're logged in as project owner
3. Use SQL Editor (not API client)
4. Try again

---

### **Issue 1.4: "No rows returned from order_counters"**

**Symptom:**
After Step 1.2, `SELECT * FROM order_counters` returns empty.

**Fix:**
```sql
-- Manually insert row for current year
INSERT INTO public.order_counters (year, counter)
VALUES (2026, 0)
ON CONFLICT (year) DO NOTHING;

-- Verify
SELECT * FROM public.order_counters;
```

---

### **Issue 1.5: "Index already exists"**

**Error Message:**
```
ERROR: relation "idx_delivery_info_user_id" already exists
```

**Fix:**
This is NOT an error - it means the index exists. **Skip this index and continue.**

---

### **Issue 1.6: "Cannot sync counter - no orders exist"**

**Symptom:**
Step 1.4 sets counter to 0 when you know you have orders.

**Diagnosis:**
Your order numbers might not match the pattern `SC-2026-*`.

**Fix:**
```sql
-- Check your actual order number format
SELECT DISTINCT order_number 
FROM public.orders 
ORDER BY order_number DESC 
LIMIT 10;

-- If format is different (e.g., SC-2025-*, SC-2024-*), adjust Step 1.4:
-- Replace '2026' with your actual year
```

---

## 📁 PHASE 2 ISSUES (Code Deployment)

### **Issue 2.1: "Error: supabase is not defined"**

**Error Message (in Edge Function logs):**
```
ReferenceError: supabase is not defined
```

**Diagnosis:**
You're missing the Supabase client initialization.

**Fix:**
The `supabase` variable should already exist at the top of `/supabase/functions/server/index.tsx` (line 202-205):
```typescript
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
```

If it's missing, DON'T ADD IT - there's a bigger problem. Revert changes and contact me.

---

### **Issue 2.2: "function increment_order_counter does not exist"**

**Error Message (in Edge Function logs):**
```
error: function public.increment_order_counter(integer) does not exist
```

**Diagnosis:**
Phase 1 Step 1.3 didn't complete successfully.

**Fix:**
1. Go back to Phase 1
2. Re-run Step 1.3 (create function)
3. Verify with:
   ```sql
   SELECT public.increment_order_counter(2026);
   ```
4. If it works, redeploy Edge Function

---

### **Issue 2.3: "All orders using KV fallback"**

**Symptom:**
Logs show `⚠️ FALLBACK: Using KV store counter` for every order.

**Diagnosis:**
PostgreSQL counter is failing silently.

**Fix:**
```sql
-- Test the function directly
SELECT public.increment_order_counter(2026);

-- If this returns NULL or error, check:
SELECT * FROM public.order_counters WHERE year = 2026;

-- If no row exists:
INSERT INTO public.order_counters (year, counter)
VALUES (2026, 0)
ON CONFLICT (year) DO NOTHING;
```

---

### **Issue 2.4: "Order creation fails completely"**

**Error Message (in Edge Function logs):**
```
Error: Order creation failed
```

**Immediate Action:**
**ROLLBACK NOW!**

1. Revert code to original `generateOrderNumber`
2. Redeploy Edge Function
3. Contact me with full error logs

---

### **Issue 2.5: "Counter increments but order not created"**

**Symptom:**
Counter in `order_counters` increases, but no order in `orders` table.

**Diagnosis:**
Issue is AFTER order number generation (not our code).

**Fix:**
Check Edge Function logs for the actual error (likely database constraint violation).

Common causes:
- Missing user record
- Invalid foreign key
- Duplicate UUID (unlikely)

---

## 📁 PHASE 3 ISSUES (Monitoring)

### **Issue 3.1: "Duplicate order numbers found!"**

**SQL Check Result:**
```
 order_number | count 
--------------+-------
 SC-2026-0145 |     2
```

**CRITICAL! Take immediate action:**

1. **Stop all deployments**
2. **Check counter state:**
   ```sql
   SELECT * FROM public.order_counters WHERE year = 2026;
   ```
3. **Check when duplicates occurred:**
   ```sql
   SELECT order_number, id, created_at
   FROM public.orders
   WHERE order_number = 'SC-2026-0145'
   ORDER BY created_at;
   ```
4. **Check logs** - were both using PostgreSQL or KV?
5. **Contact me immediately** with results

**Temporary workaround:**
Manually fix duplicate order numbers:
```sql
-- Find duplicates
WITH duplicates AS (
  SELECT order_number, id, created_at,
         ROW_NUMBER() OVER (PARTITION BY order_number ORDER BY created_at) as rn
  FROM public.orders
  WHERE order_number IN (
    SELECT order_number FROM public.orders
    GROUP BY order_number HAVING COUNT(*) > 1
  )
)
-- Update second occurrence to add suffix
UPDATE public.orders
SET order_number = order_number || '-DUP'
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
```

---

### **Issue 3.2: "Counter value jumped unexpectedly"**

**Symptom:**
Counter went from 145 to 245 (gap of 100).

**Diagnosis:**
Check if KV fallback was used (it has a separate counter).

**Fix:**
This is actually OK if:
- Orders were created successfully
- No duplicates exist
- Gap is from KV fallback counter being higher

**No action needed** unless duplicates exist.

---

### **Issue 3.3: "Orders from yesterday have weird numbers"**

**Symptom:**
Today's orders: SC-2026-0000450  
Yesterday's orders: SC-2026-0000200  

**Diagnosis:**
Counter was reset or rolled back.

**Fix:**
```sql
-- Check counter history
SELECT * FROM public.order_counters WHERE year = 2026;

-- If counter is behind latest order, resync:
WITH max_order AS (
  SELECT MAX(CAST(SUBSTRING(order_number FROM '\d{7}$') AS INTEGER)) as max_num
  FROM public.orders
  WHERE order_number LIKE 'SC-2026-%'
)
UPDATE public.order_counters
SET counter = (SELECT max_num FROM max_order)
WHERE year = 2026;
```

---

## 📁 DEPLOYMENT ISSUES

### **Issue D.1: "Edge Function deployment failed"**

**Error Message:**
```
Error: Failed to deploy function
```

**Fix:**
1. Check syntax errors in code
2. Try deploying via Supabase Dashboard instead of CLI
3. Verify you have deploy permissions

---

### **Issue D.2: "Function deployed but not executing"**

**Symptom:**
Deployment succeeds but orders still use old logic.

**Fix:**
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Check Edge Function version in Supabase Dashboard
4. Verify deployment timestamp matches your change

---

### **Issue D.3: "Environment variables missing"**

**Error Message:**
```
Error: SUPABASE_URL is undefined
```

**Fix:**
1. Go to Supabase Dashboard → Edge Functions → server → Settings
2. Verify environment variables are set:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - SUPABASE_ANON_KEY
3. Redeploy if you made changes

---

## 📁 GENERAL DEBUGGING

### **Debug Tool 1: Check System Health**

```sql
-- Overall system health check
SELECT 
  'order_counters' as component,
  CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'MISSING' END as status
FROM public.order_counters
WHERE year = 2026

UNION ALL

SELECT 
  'increment_function',
  CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'MISSING' END
FROM pg_proc
WHERE proname = 'increment_order_counter'

UNION ALL

SELECT 
  'recent_orders',
  CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'NO ORDERS' END
FROM public.orders
WHERE created_at > NOW() - INTERVAL '24 hours';
```

---

### **Debug Tool 2: Trace Last Order**

```sql
-- Get details of most recent order
SELECT 
  id,
  order_number,
  user_id,
  created_at,
  delivery_status,
  payment_status
FROM public.orders
ORDER BY created_at DESC
LIMIT 1;

-- Compare with counter
SELECT 
  year,
  counter,
  'SC-' || year || '-' || LPAD(counter::TEXT, 7, '0') as should_be_next,
  updated_at
FROM public.order_counters
WHERE year = 2026;
```

---

### **Debug Tool 3: Find Gaps in Order Numbers**

```sql
-- Check for missing order numbers (cancelled orders, errors, etc.)
WITH sequence AS (
  SELECT 
    CAST(SUBSTRING(order_number FROM '\d{7}$') AS INTEGER) as seq_num
  FROM public.orders
  WHERE order_number LIKE 'SC-2026-%'
),
gaps AS (
  SELECT 
    seq_num,
    LEAD(seq_num) OVER (ORDER BY seq_num) - seq_num - 1 as gap_size
  FROM sequence
)
SELECT 
  seq_num as after_order,
  gap_size as missing_count,
  seq_num + 1 as first_missing,
  seq_num + gap_size as last_missing
FROM gaps
WHERE gap_size > 0
ORDER BY seq_num DESC
LIMIT 10;
```

---

## 🆘 EMERGENCY PROCEDURES

### **SCENARIO A: Complete System Failure**

**Symptoms:**
- No orders can be created
- All requests failing
- Edge Function crashed

**Emergency Fix:**
```bash
# 1. Rollback code immediately
git checkout HEAD~1 /supabase/functions/server/index.tsx

# 2. Redeploy
supabase functions deploy server

# 3. Verify orders work again
# (place test order)

# 4. Contact me with crash logs
```

---

### **SCENARIO B: Duplicate Orders Being Created**

**Symptoms:**
- Same order number assigned to multiple orders
- Customers confused
- Accounting nightmare

**Emergency Fix:**
```sql
-- 1. Identify all duplicates
SELECT order_number, COUNT(*) as dup_count, 
       STRING_AGG(id::TEXT, ', ') as order_ids
FROM public.orders
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY order_number
HAVING COUNT(*) > 1
ORDER BY dup_count DESC;

-- 2. For each duplicate, rename with suffix
-- (manual process, one by one)
UPDATE public.orders
SET order_number = 'SC-2026-0000145-A'
WHERE id = '<first_duplicate_id>';

UPDATE public.orders
SET order_number = 'SC-2026-0000145-B'
WHERE id = '<second_duplicate_id>';

-- 3. Rollback code to KV-only (contact me first!)
```

---

### **SCENARIO C: Counter Out of Sync**

**Symptoms:**
- Counter value doesn't match actual orders
- Orders created but counter didn't increment

**Emergency Fix:**
```sql
-- Resync counter to highest order number
WITH max_order AS (
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(order_number FROM 'SC-2026-(\d+)') AS INTEGER)),
    0
  ) as max_num
  FROM public.orders
  WHERE order_number LIKE 'SC-2026-%'
)
UPDATE public.order_counters
SET 
  counter = (SELECT max_num FROM max_order),
  updated_at = NOW()
WHERE year = 2026
RETURNING *;
```

---

## 📞 WHEN TO CONTACT FOR HELP

### **Contact Immediately:**
- ❌ Orders failing completely
- ❌ Duplicate order numbers
- ❌ Data corruption
- ❌ System crashes

### **Contact Within 24 Hours:**
- ⚠️ Unexpected gaps in order numbers
- ⚠️ Counter not incrementing
- ⚠️ Logs showing errors (but system working)

### **No Need to Contact:**
- ✅ Small gaps in order numbers (normal)
- ✅ Occasional KV fallback (< 1%)
- ✅ Orders processing normally

---

## 📊 LOG INTERPRETATION GUIDE

### **Good Logs (Normal Operation):**
```
✅ Generated order number via PostgreSQL: SC-2026-0000456 (counter: 456)
✅ [ORDER 0] Order af8e7b3c-1234-... saved successfully
✅ Order confirmation email sent to customer@example.com
```
**Action:** None needed, system working perfectly

---

### **Warning Logs (Monitor Closely):**
```
⚠️ FALLBACK: Using KV store counter due to SQL error: timeout
⚠️ No data returned from increment_order_counter
```
**Action:** 
- Check if database is slow
- Verify `order_counters` table exists
- Monitor frequency (should be < 1% of orders)

---

### **Error Logs (Immediate Action):**
```
❌ Database insert failed: duplicate key value violates unique constraint "orders_order_number_key"
❌ Order creation failed: null value in column "order_number" violates not-null constraint
```
**Action:**
- STOP deployments
- Rollback code
- Contact me with full error

---

## ✅ VERIFICATION AFTER FIX

After applying any fix, run this complete verification:

```sql
-- 1. Check counter health
SELECT * FROM public.order_counters WHERE year = 2026;

-- 2. Check function works
SELECT public.increment_order_counter(2026);

-- 3. Check for duplicates
SELECT order_number, COUNT(*) 
FROM public.orders 
GROUP BY order_number 
HAVING COUNT(*) > 1;

-- 4. Check recent orders
SELECT order_number, created_at, delivery_status
FROM public.orders
ORDER BY created_at DESC
LIMIT 5;
```

All should return expected results before declaring fix successful.

---

## 🎯 PREVENTION TIPS

**To avoid issues:**
1. ✅ Always backup before changes
2. ✅ Test in low-traffic period
3. ✅ Monitor logs for first hour
4. ✅ Keep rollback procedure handy
5. ✅ Document any custom changes

---

**Still stuck? Share:**
1. Exact error message
2. SQL query results
3. Edge Function logs (last 50 lines)
4. Which step you're on

I'll provide specific guidance! 🚀
