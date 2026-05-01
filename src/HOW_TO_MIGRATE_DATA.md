# 🚀 HOW TO MIGRATE YOUR DATA (STEP-BY-STEP)

## ✅ **SUPABASE IS FULLY CONFIGURED!**

Great news! All 10 required SQL tables exist in your Supabase database. You're ready to migrate!

---

## 📋 **MIGRATION INSTRUCTIONS**

### **Method 1: Using Admin Dashboard (EASIEST)**

**Step 1:** Open your Sheetcutters app

**Step 2:** Sign in with your admin account

**Step 3:** Click **Admin Panel** (lock icon in header)

**Step 4:** You'll see the **Dashboard** with a new "Data Migration" section at the bottom

**Step 5:** Click the **"Migrate Data"** button

**Step 6:** Wait for the migration to complete (usually 10-30 seconds)

**Step 7:** Review the migration report showing:
- ✅ Users migrated
- ✅ Materials migrated
- ✅ Orders migrated
- ✅ Order items migrated
- ❌ Any errors (if applicable)

---

### **Method 2: Using API Endpoint (Alternative)**

If you prefer to use the API directly:

```bash
# Using curl
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-8927474f/admin/migrate-kv-to-sql \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'

# Using fetch in browser console
fetch('/api/make-server-8927474f/admin/migrate-kv-to-sql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({})
}).then(r => r.json()).then(console.log);
```

---

## 📊 **WHAT THE MIGRATION DOES**

### **Data Copied:**

1. **Users Table**
   - All user accounts from KV Store
   - Email, name, phone, address
   - Loyalty points, total spent
   - Admin status

2. **Materials Table**
   - All materials (Mild Steel, Stainless Steel, etc.)
   - Pricing per thickness
   - Category, density, availability

3. **Orders Table**
   - All orders (single & batch)
   - Order numbers, pricing
   - Delivery information
   - Status tracking

4. **Order Items Table**
   - Individual items from each order
   - DXF data, file paths
   - Material specs, quantities
   - Pricing breakdown

### **Preserves:**
- ✅ All relationships (user → orders, orders → items)
- ✅ Batch grouping (multi-item orders)
- ✅ Affiliate tracking
- ✅ Timestamps (created, updated, shipped)
- ✅ Guest order information

---

## 🔒 **SAFETY FEATURES**

### **1. Non-Destructive**
- KV Store data remains **100% intact**
- Migration only **copies** data, never deletes

### **2. Duplicate-Safe**
- Uses UPSERT (insert or update)
- Safe to run multiple times
- Won't create duplicates

### **3. Instant Rollback**
- If anything goes wrong, just keep `USE_SQL_TABLES = false`
- App continues using KV Store
- No downtime, no data loss

---

## ✅ **EXPECTED RESULTS**

### **Successful Migration:**

```json
{
  "success": true,
  "details": {
    "users": { "migrated": 150, "skipped": 2 },
    "materials": { "migrated": 6, "skipped": 0 },
    "orders": { "migrated": 300, "skipped": 0 },
    "orderItems": { "migrated": 450, "skipped": 0 }
  },
  "errors": []
}
```

**What this means:**
- ✅ 150 users copied to SQL
- ✅ 2 users skipped (likely email mapping entries)
- ✅ 6 materials copied
- ✅ 300 orders copied
- ✅ 450 individual items copied
- ✅ Zero errors

---

## ⚠️ **POSSIBLE ERRORS & SOLUTIONS**

### **Error: "duplicate key value violates unique constraint"**
**Cause:** Data already exists in SQL tables  
**Solution:** Safe to ignore - means data is already migrated  
**Action:** No action needed, migration is idempotent

### **Error: "foreign key violation"**
**Cause:** Missing user reference  
**Solution:** Migration creates orders without user_id for guest orders  
**Action:** No action needed, this is expected behavior

### **Error: "table does not exist"**
**Cause:** SQL tables not created  
**Solution:** Run SQL schema from `/SUPABASE_SETUP_REQUIRED.md`  
**Action:** Create missing tables, then retry migration

---

## 📈 **AFTER MIGRATION**

### **Step 1: Verify Data**

Run these queries in Supabase SQL Editor to confirm data copied:

```sql
-- Check user count
SELECT COUNT(*) as total_users FROM public.users;

-- Check order count
SELECT COUNT(*) as total_orders FROM public.orders;

-- Check materials
SELECT id, name, category FROM public.materials ORDER BY category, name;

-- Check recent orders
SELECT order_number, total_amount, status, created_at 
FROM public.orders 
ORDER BY created_at DESC 
LIMIT 10;
```

### **Step 2: Compare Counts**

**In KV Mode (current):**
- Go to Admin Panel → Dashboard
- Note the counts: Users, Orders, Revenue

**In SQL Tables:**
- Run SQL queries above
- Counts should match (±1-2 for in-progress items)

---

## 🚀 **NEXT STEP: SWITCH TO SQL MODE**

Once migration is successful and you've verified the data:

### **Option A: Keep KV Mode (Recommended for Testing)**
- Keep `USE_SQL_TABLES = false` in `/supabase/functions/server/index.tsx`
- App continues using KV Store
- SQL tables are populated but not actively used
- Test SQL mode later when ready

### **Option B: Switch to SQL Mode (Production)**
1. Open `/supabase/functions/server/index.tsx`
2. Find line ~15: `const USE_SQL_TABLES = false;`
3. Change to: `const USE_SQL_TABLES = true;`
4. App will instantly use SQL tables
5. **Can rollback instantly** by changing back to `false`

---

## 📊 **MIGRATION CHECKLIST**

- [x] Supabase tables verified (10 tables exist)
- [x] Default materials loaded (6 materials)
- [ ] Run data migration (click "Migrate Data" button)
- [ ] Review migration report (check for errors)
- [ ] Verify user count matches
- [ ] Verify order count matches
- [ ] Verify materials exist (6 items)
- [ ] Test a few random orders (check details load)
- [ ] Decision: Keep KV mode or switch to SQL?

---

## 🎯 **RECOMMENDED APPROACH**

### **Conservative (Safest):**
1. Run migration now
2. Keep `USE_SQL_TABLES = false` (KV mode)
3. Test SQL mode in development/staging first
4. Switch to SQL after 1-2 days of testing
5. Monitor for 24-48 hours
6. Remove KV code later (optional)

### **Aggressive (Faster):**
1. Run migration now
2. Immediately set `USE_SQL_TABLES = true`
3. Monitor logs closely for 1 hour
4. Rollback if any issues (set to `false`)
5. Production-ready if no issues

---

## 🔍 **MONITORING AFTER MIGRATION**

### **What to Watch:**

1. **Error Logs**
   - Check browser console for errors
   - Check Supabase logs for SQL errors
   - Any "table not found" errors?

2. **Performance**
   - Orders loading fast?
   - Admin dashboard responsive?
   - No timeouts?

3. **Data Integrity**
   - Orders show correct information?
   - User profiles accurate?
   - Prices calculate correctly?

### **Red Flags (Rollback Immediately):**
- ❌ Orders not loading
- ❌ User data missing
- ❌ Checkout failing
- ❌ Admin panel errors
- ❌ SQL timeout errors

### **Green Flags (Migration Successful):**
- ✅ All pages load normally
- ✅ Orders display correctly
- ✅ Checkout works
- ✅ Admin panel functional
- ✅ Faster query performance

---

## 💡 **FAQ**

**Q: Will migration cause downtime?**  
A: No! KV Store continues working during and after migration.

**Q: Can I run migration multiple times?**  
A: Yes! It's safe and idempotent (won't create duplicates).

**Q: What if migration fails?**  
A: No problem - KV Store is untouched. Fix the issue and retry.

**Q: Can I rollback after switching to SQL mode?**  
A: YES! Just change `USE_SQL_TABLES` back to `false` instantly.

**Q: Will I lose KV data?**  
A: No! Migration only copies data, never deletes from KV Store.

**Q: How long does migration take?**  
A: Usually 10-30 seconds for typical data volumes.

**Q: Should I backup first?**  
A: Not necessary - migration is non-destructive. But if you want peace of mind, Supabase has automatic backups.

---

## 🎊 **YOU'RE READY!**

**Current Status:**
- ✅ Supabase fully configured
- ✅ All 10 tables exist
- ✅ Foreign keys working
- ✅ Indexes created
- ✅ Migration code ready
- ✅ Admin dashboard has migration button

**Next Action:**
1. Go to Admin Panel → Dashboard
2. Click "Migrate Data"
3. Wait for success message
4. Review the report

**Estimated Time:** 2 minutes from now to fully migrated data! 🚀

---

**Need help? Let me know the migration results and I'll guide you through the next steps!**
