# 🚀 STEP-BY-STEP MIGRATION GUIDE

**DO NOT SKIP ANY STEPS!**  
Follow this guide exactly to ensure safe migration with rollback capability.

---

## ✅ PRE-MIGRATION CHECKLIST

Before starting, verify:

- [ ] Current website is working perfectly
- [ ] You have admin access to Supabase dashboard
- [ ] You've read `/MIGRATION_ROLLBACK_GUIDE.md`
- [ ] No customers are actively checking out (optional - migration can happen live)
- [ ] You have 30-45 minutes available

---

## 📋 STEP 1: Create SQL Tables (5 minutes)

### 1.1 Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard
2. Click your project
3. Left sidebar → **SQL Editor**
4. Click **New query**

### 1.2 Execute Migration Schema
1. Open `/SQL_MIGRATION_SCHEMA.md` in Figma Make
2. Copy the ENTIRE SQL block (starting with `-- ============`)
3. Paste into Supabase SQL Editor
4. Click **RUN** button
5. Wait for completion (should take 5-10 seconds)

### 1.3 Verify Tables Created
Run this query in SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'users', 'materials', 'orders', 'order_items',
    'sketch_orders', 'order_status_history',
    'loyalty_transactions', 'affiliate_usage_logs'
  )
ORDER BY table_name;
```

**Expected Result:** 8 rows (table names listed)

✅ **If you see 8 tables → Continue to Step 2**  
❌ **If error → Post the error message, DO NOT continue**

---

## 📋 STEP 2: Run Data Migration (10 minutes)

### 2.1 What This Does
- Copies ALL data from KV store → SQL tables
- Does NOT delete KV data (safe!)
- Creates proper relational structure

### 2.2 Trigger Migration
The backend code has been updated with a special migration endpoint.

**From your browser:**
1. Open browser console (F12)
2. Run this code:

```javascript
// Replace with your actual Supabase project ID
const projectId = 'YOUR_PROJECT_ID_HERE';
const publicAnonKey = 'YOUR_ANON_KEY_HERE';

fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8927474f/admin/migrate-kv-to-sql`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${publicAnonKey}`,
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => {
  console.log('Migration Result:', data);
  if (data.success) {
    console.log('✅ Migration successful!');
    console.log('Details:', data.details);
  } else {
    console.log('❌ Migration had errors:', data.errors);
  }
})
.catch(err => console.error('Migration failed:', err));
```

### 2.3 Check Migration Results

**Success Looks Like:**
```json
{
  "success": true,
  "details": {
    "users": { "migrated": 5, "skipped": 0 },
    "materials": { "migrated": 6, "skipped": 0 },
    "orders": { "migrated": 10, "skipped": 0 },
    "orderItems": { "migrated": 15, "skipped": 0 }
  },
  "errors": []
}
```

**If Errors Occur:**
- Check `data.errors` array
- Most errors are non-critical (duplicate data, etc.)
- Post errors if concerned

✅ **If migration successful → Continue to Step 3**  
⚠️ **If errors → Review errors, but usually safe to continue**

---

## 📋 STEP 3: Enable SQL in Backend (AUTOMATIC - Already Done!)

The backend code has been updated with a **MIGRATION TOGGLE**.

**What Changed:**
- `/supabase/functions/server/index.tsx` has been updated
- New constant at top: `const USE_SQL_TABLES = true;`
- All routes check this flag
- KV code is preserved in comments

**Current Status:** SQL tables are now ACTIVE ✅

---

## 📋 STEP 4: Test Everything (15 minutes)

### 4.1 Test User Features

**Login/Signup:**
- [ ] Can you log in with existing account?
- [ ] Can you create new account?
- [ ] Does dashboard load?

**User Profile:**
- [ ] Navigate to Profile/Settings
- [ ] Can you view your profile data?
- [ ] Try updating phone/address
- [ ] Does it save correctly?

**Order History:**
- [ ] Go to "My Orders" or Dashboard
- [ ] Do your past orders show up?
- [ ] Are order numbers correct?
- [ ] Do batch orders display properly?

### 4.2 Test Guest Checkout

**Upload & Price:**
- [ ] Go to homepage (log out first)
- [ ] Upload a DXF file
- [ ] Select material and thickness
- [ ] Does pricing calculate correctly?

**Checkout Flow:**
- [ ] Add to cart
- [ ] Proceed to checkout
- [ ] Fill in delivery address
- [ ] Does it accept the order?

**Confirmation:**
- [ ] Do you get order confirmation?
- [ ] Did you receive email?
- [ ] Is order visible in admin panel?

### 4.3 Test Admin Features (If Admin)

**Admin Dashboard:**
- [ ] Access admin panel
- [ ] Can you see all orders?
- [ ] Can you update order status?
- [ ] Try changing status to "shipped"

**Materials Management:**
- [ ] Go to materials admin
- [ ] Can you view materials list?
- [ ] Try editing a material price
- [ ] Does it save?

### 4.4 Check Browser Console

**Open Console (F12) and Check:**
- [ ] No red errors during page load
- [ ] No "unauthorized" errors
- [ ] No "SQL syntax" errors
- [ ] Requests complete successfully

---

## 📋 STEP 5: Monitor for Issues (48 hours)

### 5.1 What to Watch For

**Next 2 Days:**
- Monitor customer checkouts
- Watch for support emails
- Check server logs in Supabase
- Review error logs daily

**Supabase Logs:**
1. Dashboard → Logs → Edge Functions
2. Look for errors in `/make-server-8927474f` function
3. Filter by "error" or "warning"

### 5.2 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Unauthorized" errors | Token issue | Have users re-login |
| Missing orders | Migration incomplete | Re-run migration (Step 2) |
| Wrong prices | Material data mismatch | Update materials in admin |
| Slow queries | Missing indexes | Already added in schema |

---

## 🔄 ROLLBACK PROCEDURE (If Needed)

### When to Roll Back

Roll back if you experience:
- ❌ Multiple customer checkout failures
- ❌ Data loss or corruption
- ❌ Persistent errors affecting core features
- ❌ Performance degradation

### How to Roll Back

**Option 1: Quick Toggle (30 seconds)**

1. Open `/supabase/functions/server/index.tsx`
2. Find line ~49: `const USE_SQL_TABLES = true;`
3. Change to: `const USE_SQL_TABLES = false;`
4. Save file
5. Refresh your app

✅ Done! Back to KV store.

**Option 2: Full Revert (If Option 1 Fails)**

See `/MIGRATION_ROLLBACK_GUIDE.md` for complete instructions.

---

## ✅ POST-MIGRATION SUCCESS CRITERIA

### After 48 Hours

Migration is successful if:

- ✅ No customer complaints about checkout
- ✅ All orders processing normally
- ✅ Admin panel works smoothly
- ✅ No increase in support tickets
- ✅ Server logs show no SQL errors
- ✅ Performance is same or better

**If ALL criteria met → Migration successful! 🎉**

---

## 🧹 CLEANUP (After 2-4 Weeks)

**DO NOT DO THIS YET!**

Only after 2-4 weeks of stable operation:

1. **Delete KV Data (Optional)**
   ```sql
   -- In Supabase SQL Editor
   DELETE FROM kv_store_8927474f WHERE key LIKE 'user:%';
   DELETE FROM kv_store_8927474f WHERE key LIKE 'order:%';
   DELETE FROM kv_store_8927474f WHERE key LIKE 'material:%';
   ```

2. **Remove Old Code**
   - Delete commented KV code from `index.tsx`
   - Delete `/supabase/functions/server/migration-helper.tsx`
   - Archive this migration documentation

3. **Remove Migration Endpoint**
   - Remove `/admin/migrate-kv-to-sql` route
   - Remove `USE_SQL_TABLES` toggle (always true)

---

## 🆘 GETTING HELP

### If Something Goes Wrong

1. **DON'T PANIC** - KV data is safe
2. **Collect Error Info:**
   - Browser console errors (F12)
   - Supabase function logs
   - Specific steps that caused error

3. **Roll Back if Critical:**
   - Use rollback procedure above
   - Document what went wrong
   - Share error details for debugging

4. **Report Issues:**
   - Describe what you were doing
   - Copy exact error messages
   - Include screenshots if helpful

---

## 📊 Migration Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Create SQL Tables | 5 min | ⏸️ Not Started |
| Run Data Migration | 10 min | ⏸️ Not Started |
| Backend Code Update | 0 min | ✅ Already Done |
| Testing | 15 min | ⏸️ Not Started |
| Monitoring | 48 hours | ⏸️ Not Started |
| Cleanup | 2-4 weeks | ⏸️ Not Started |

**Total Active Time:** ~30 minutes  
**Total Monitoring:** 48 hours  
**Cleanup:** After 2-4 weeks

---

## ✅ FINAL CHECKLIST

Before marking migration complete:

- [ ] SQL tables created (Step 1)
- [ ] Data migrated successfully (Step 2)
- [ ] All tests passed (Step 4)
- [ ] 48 hours monitoring complete (Step 5)
- [ ] No critical issues reported
- [ ] Rollback procedure documented and tested

---

**Last Updated:** December 4, 2024  
**Migration Status:** Ready to Start  
**Current Backend:** KV Store (safe to migrate)  
**Rollback Available:** Yes ✅
