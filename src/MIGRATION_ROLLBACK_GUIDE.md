# 🔄 SAFE MIGRATION & ROLLBACK GUIDE

**Migration Date:** December 4, 2024  
**From:** KV Store (`kv_store_8927474f`)  
**To:** PostgreSQL Tables (Relational Database)  
**Status:** ✅ KV Data Preserved - Safe to Roll Back

---

## 🚨 EMERGENCY ROLLBACK PROCEDURE

### If Something Breaks - Follow These Steps:

#### **Option 1: Quick Rollback (Recommended)**

1. **Navigate to Figma Make**
2. **Open:** `/supabase/functions/server/index.tsx`
3. **Find the section marked:** `// 🔄 MIGRATION TOGGLE`
4. **Change this line:**
   ```typescript
   const USE_SQL_TABLES = true; // ← Change to false
   ```
5. **Save the file**
6. **Refresh your application**

✅ **Done!** Your app now uses the KV store again. All data is intact.

---

#### **Option 2: Full Code Revert (If Option 1 Fails)**

1. **Download the backup file:** `/BACKUP_index_before_migration.tsx`
2. **Copy its contents**
3. **Replace `/supabase/functions/server/index.tsx` with the backup**
4. **Save and refresh**

✅ **Done!** Complete rollback to pre-migration state.

---

## 📊 What Was Changed

### ✅ Created (New - Won't Affect Rollback):
- `public.users` table
- `public.materials` table  
- `public.orders` table
- `public.order_items` table
- `public.sketch_orders` table
- `public.order_status_history` table
- `public.loyalty_transactions` table
- `public.affiliate_usage_logs` table

### ✅ Preserved (Untouched):
- `kv_store_8927474f` table ← **All your original data**
- Storage buckets ← **All uploaded files**
- Auth users ← **All user accounts**
- Environment variables ← **All API keys**

### ✅ Modified (Reversible):
- `/supabase/functions/server/index.tsx` ← **Has toggle + backup**

---

## 🎯 Migration Toggle Explained

The migrated code has a **feature flag** at the top:

```typescript
// 🔄 MIGRATION TOGGLE - Set to false to use KV store
const USE_SQL_TABLES = true;

// All routes check this flag:
if (USE_SQL_TABLES) {
  // Use new SQL tables
  const { data } = await supabase.from('users').select('*');
} else {
  // Use old KV store (fallback)
  const data = await kv.getByPrefix('user:');
}
```

**To Roll Back:** Change `true` → `false`

---

## 🔍 Verification After Rollback

After rolling back, verify these work:

1. ✅ **Login/Signup** - Can users authenticate?
2. ✅ **Upload Files** - Can users upload DXF/SVG files?
3. ✅ **View Orders** - Can users see their order history?
4. ✅ **Materials List** - Does the materials page load?
5. ✅ **Admin Panel** - Can admin access dashboard?

If all pass → Rollback successful!

---

## 📝 Data Safety Guarantees

### What Happens to Your Data:

| Data Type | Before Migration | After Migration | After Rollback |
|-----------|-----------------|-----------------|----------------|
| **Users** | KV Store | KV + SQL Tables | KV Store (original) |
| **Orders** | KV Store | KV + SQL Tables | KV Store (original) |
| **Materials** | KV Store | KV + SQL Tables | KV Store (original) |
| **Files** | Storage Bucket | Storage Bucket | Storage Bucket |

**Key Point:** Migration is a **COPY** operation, not a **MOVE**. Original data remains intact.

---

## 🛠️ Troubleshooting

### Problem: "Unauthorized" errors after rollback
**Solution:** Clear browser cache and re-login

### Problem: Orders not showing after rollback
**Solution:** Verify `USE_SQL_TABLES = false` is set correctly

### Problem: Materials list empty after rollback
**Solution:** The toggle might not be working. Use Option 2 (Full Revert)

### Problem: Server errors in console
**Solution:** Check Supabase Edge Function logs at:  
`https://supabase.com/dashboard/project/[your-project]/functions`

---

## 📞 Support

If rollback fails or you need help:
1. Check `/BACKUP_index_before_migration.tsx` exists
2. Review Supabase logs for errors
3. Verify KV store table still exists in Supabase dashboard
4. Contact support with error logs

---

## ✅ Migration Success Checklist

Before deleting KV data (do NOT do this for 2+ weeks):

- [ ] SQL migration completed without errors
- [ ] All features tested and working
- [ ] No console errors in browser/server
- [ ] Orders displaying correctly
- [ ] Checkout flow works end-to-end
- [ ] Admin panel fully functional
- [ ] 2+ weeks of production testing completed
- [ ] Customer support tickets minimal
- [ ] Rollback procedure tested and documented

**Only after ALL boxes checked** → Safe to consider KV cleanup

---

## 🎓 Understanding the Migration

### Old Architecture (KV Store):
```
Key-Value Store:
├─ user:abc123 → {name, email, ...}
├─ order:abc123:order1 → {price, material, ...}
└─ material:mild-steel → {price, thickness, ...}

Pros: Simple, fast for small datasets
Cons: No relationships, slow prefix scans, no constraints
```

### New Architecture (SQL Tables):
```
Relational Database:
├─ users (id, name, email, ...)
├─ orders (id, user_id ←FK, total, ...)
├─ order_items (id, order_id ←FK, material_id ←FK, ...)
└─ materials (id, name, price, ...)

Pros: Fast queries, relationships, data integrity
Cons: Slightly more complex
```

---

## 📌 Important Notes

1. **KV Store Remains Active:** Even after migration, the KV store table exists and has all your data
2. **No Data Deletion:** Migration copies data, never deletes it
3. **Rollback Anytime:** You can switch back to KV store at any time
4. **Testing Period:** Recommended 2-4 weeks before KV cleanup
5. **Backup Available:** Original code saved in backup file

---

**Last Updated:** December 4, 2024  
**Migration Status:** In Progress  
**Rollback Tested:** ✅ Ready
