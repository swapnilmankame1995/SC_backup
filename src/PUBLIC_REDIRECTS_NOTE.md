# ⚠️ PUBLIC _REDIRECTS FILE ISSUE

## Problem
Figma Make treats `/public/_redirects` (without extension) as a **directory** instead of a **file**, causing it to auto-generate `.tsx` files inside it after every reload.

## Root Cause
Figma Make's file system doesn't properly handle extension-less files in the `/public` directory.

## Solution Options

### ✅ **Option 1: Use Vercel/Netlify Config Files (RECOMMENDED)**

The `/vercel.json` and `/netlify.toml` files already exist and work perfectly. These handle SPA routing without needing `_redirects`:

- **Vercel:** Uses `/vercel.json` automatically
- **Netlify:** Uses `/netlify.toml` automatically

**No action needed** - Your hosting platform will handle routing correctly.

---

### ⚠️ **Option 2: Manual Workaround (If Using Netlify)**

If you're using Netlify and it specifically requires a `_redirects` file:

1. **After deploying to Netlify:**
   - Go to your Netlify dashboard
   - Navigate to: **Site Settings** → **Build & Deploy** → **Post Processing**
   - Add redirect rule: `/* /index.html 200`

2. **OR rename the file manually:**
   - Download `/public/_redirects.txt` (created as workaround)
   - Rename locally to `_redirects` (remove `.txt`)
   - Upload directly to Netlify via their dashboard or CLI

---

### 🚫 **Do NOT Create `/public/_redirects` in Figma Make**

Figma Make will treat it as a directory and auto-generate files. Stick with:
- `/vercel.json` (for Vercel)
- `/netlify.toml` (for Netlify)
- Manual redirect rules in hosting dashboard

---

## Current Files (Working)

✅ `/vercel.json` - Handles SPA routing for Vercel  
✅ `/netlify.toml` - Handles SPA routing for Netlify  
✅ `/public/_redirects.txt` - Backup file (rename if needed)  

---

## What to Do

**If using Vercel:**  
→ Nothing! `/vercel.json` handles everything automatically.

**If using Netlify:**  
→ Nothing! `/netlify.toml` handles everything automatically.

**If using other hosting:**  
→ Configure SPA routing in your hosting platform's dashboard.

---

## Summary

The `_redirects` folder auto-generation issue was caused by Figma Make interpreting extension-less files as directories. 

**You don't need to manually create `_redirects`** - your existing config files (`vercel.json`, `netlify.toml`) already solve the 404 routing issue perfectly.

---

**Last Updated:** December 4, 2024  
**Status:** ✅ Workaround Implemented  
**Action Required:** None (use existing config files)
