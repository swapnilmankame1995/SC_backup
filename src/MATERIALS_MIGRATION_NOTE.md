# Materials Database Update Required

## Issue Fixed
✅ Materials delete functionality now works - changed from soft delete to hard delete

## Database Schema Update Needed

To support the improved pricing structure, you need to add a new column to your materials table.

### Add this column in Supabase SQL Editor:

```sql
-- Add pricing_json column to store flexible pricing structure
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS pricing_json TEXT;
```

### What this does:
- Stores the new pricing format as JSON: `[{ thickness: 1, pricePerMm: 0.10 }, { thickness: 2, pricePerMm: 0.12 }]`
- Allows different prices for different thicknesses (the old format only allowed one price for all thicknesses)
- Backwards compatible - if this column is empty, the system will use the old format

### Steps:
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run the SQL command above
4. Your materials will continue to work with both old and new formats

### Current Behavior:
- **Without this column:** Materials work but use single price per mm for all thicknesses
- **With this column:** Materials can have different prices for different thicknesses (more flexible!)

---

## What Was Fixed

### Before:
- Clicking delete showed "Material deleted successfully" but material stayed in the list
- This was because the system was doing a "soft delete" (marking as unavailable) instead of actually removing it

### After:
- Delete now removes the material completely from the database
- Material immediately disappears from the admin panel
- Clean, expected behavior

---

## No Action Required If:
- You're happy with single pricing per material (one price for all thicknesses)
- Materials are working fine for you
- The delete function now works correctly, which was the main issue!

The `pricing_json` column is optional and provides enhanced functionality but isn't required for basic operations.
