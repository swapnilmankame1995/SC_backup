# ⚡ QUICK REFERENCE - MIGRATION

## 🔍 Check Current Mode

```typescript
// File: /supabase/functions/server/index.tsx (Line ~20)
const USE_SQL_TABLES = false; // Currently using KV Store ✅
```

---

## 🔄 Switch Modes

### To Use KV Store (Rollback):
```typescript
const USE_SQL_TABLES = false;
```

### To Use SQL Tables (After Migration):
```typescript
const USE_SQL_TABLES = true;
```

---

## 📚 Key Documents

| Document | Purpose |
|----------|---------|
| `/README_MIGRATION.md` | **START HERE** - Overview & options |
| `/MIGRATION_STEPS.md` | Step-by-step migration guide |
| `/MIGRATION_ROLLBACK_GUIDE.md` | How to roll back if needed |
| `/SQL_MIGRATION_SCHEMA.md` | SQL to create tables |
| `/MIGRATION_STATUS.md` | Detailed current status |

---

## 🎯 Your 3 Options

### A) Gradual Migration (Safest) ⭐
- I update routes slowly over multiple sessions
- Low risk, well-tested
- **Say:** "Let's do gradual migration"

### B) Complete Now (Fastest)
- Full migration in one 2-3 hour session
- Requires immediate testing
- **Say:** "Let's complete migration now"

### C) Pause (No Rush)
- Keep using KV store
- Come back later
- **Say:** "Let's pause for now"

---

## 🛡️ Safety Guarantees

✅ KV data is NEVER deleted  
✅ Rollback takes 30 seconds  
✅ App works normally RIGHT NOW  
✅ You control the timeline  
✅ Migration can pause anytime  

---

## 🆘 Emergency Rollback

**If app breaks after migration:**

1. Open: `/supabase/functions/server/index.tsx`
2. Line 20: `const USE_SQL_TABLES = true;`
3. Change to: `const USE_SQL_TABLES = false;`
4. Save
5. ✅ Done! App works again

---

## 📞 What to Say

**Ready to start?**
- "Let's do gradual migration"
- "Let's complete migration now"
- "Let's pause for now"

**Have questions?**
- Just ask anything!

---

**Current Status:** ✅ App working on KV Store  
**Migration:** ⏸️ Ready when you are  
**Risk:** 🟢 Very Low (rollback available)
