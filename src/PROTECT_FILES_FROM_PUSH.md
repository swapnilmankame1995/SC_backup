# 🔒 Protecting Files from Figma Make Push

## ⚠️ The Core Problem

**Figma Make does a FULL SYNC when pushing to GitHub.**

This means:
- ✅ Files in Figma Make → Pushed to GitHub
- ❌ Files in GitHub but NOT in Figma Make → **DELETED**

**There is NO WAY to prevent Figma Make from deleting files during push.**

---

## 🚫 What DOESN'T Work

### ❌ `.gitignore`
```bash
# This won't help
/public/*.png
/public/favicon.png
```
**Why:** Figma Make doesn't use `.gitignore` for its push logic. It syncs the entire project state.

### ❌ GitHub Protected Branches
**Why:** Figma Make has write access to your repo. Branch protection only blocks pull requests, not direct pushes.

### ❌ Git Hooks (pre-commit, pre-push)
**Why:** These run locally on your machine, not on Figma Make's servers.

### ❌ Manual File Upload to GitHub
**Why:** Next Figma Make push will delete them.

---

## ✅ What DOES Work

### **Solution 1: Store Files in Figma Make (Recommended)**

**For text-based files (SVG, HTML, CSS, JS, JSON, TXT):**
- ✅ Create them in Figma Make
- ✅ They'll persist across pushes
- ✅ Full version control

**Examples:**
- `/public/favicon.svg` ✅
- `/public/manifest.json` ✅
- `/public/robots.txt` ✅
- `/components/SEO.tsx` ✅

---

### **Solution 2: External Hosting for Binary Files (Recommended)**

**For binary files (PNG, JPG, ICO, PDF, etc.):**
- ✅ Upload to CDN (Cloudinary, Imgur, AWS S3)
- ✅ Reference URL in your code
- ✅ URL persists in code, file stays external

**Example:**
```typescript
// /components/SEO.tsx
const FAVICON_URL = 'https://res.cloudinary.com/YOUR_CLOUD/image/upload/.../favicon.png';
addLinkTag('icon', FAVICON_URL, 'image/png');
```

**Benefits:**
- ✅ File never gets deleted (it's not in GitHub)
- ✅ URL is in code (persists across pushes)
- ✅ Fast CDN delivery
- ✅ Easy to update (just upload new version to CDN)

**Popular CDNs:**
1. **Cloudinary** - Free tier, great for images
2. **Imgur** - Free, simple image hosting
3. **AWS S3** - Enterprise solution
4. **GitHub Releases** - Attach binaries to releases
5. **Netlify** - If deploying there

---

### **Solution 3: Separate Repository for Assets (Advanced)**

**Setup:**
1. Create a second GitHub repo: `sheetcutters-assets`
2. Upload all binary files there
3. Reference them via GitHub raw URLs in your code

**Example:**
```typescript
const FAVICON_URL = 'https://raw.githubusercontent.com/yourname/sheetcutters-assets/main/favicon.png';
```

**Benefits:**
- ✅ Files never deleted by Figma Make (different repo)
- ✅ Version control for assets
- ✅ Free hosting

**Drawbacks:**
- ⚠️ More complex setup
- ⚠️ Slower than CDN
- ⚠️ Need to manage two repos

---

## 🎯 Recommended Workflow

### **For Your Favicon Issue:**

**Current files you have:**
```
/public/favicon.svg          ✅ In Figma Make → Safe
/public/favicon-simple.svg   ✅ In Figma Make → Safe
/public/manifest.json        ✅ In Figma Make → Safe
```

**Files you're manually adding to GitHub:**
```
/public/favicon.png          ❌ NOT in Figma Make → Gets deleted
/public/favicon-192.png      ❌ NOT in Figma Make → Gets deleted
/public/favicon-512.png      ❌ NOT in Figma Make → Gets deleted
```

**Solution:**

**Option A - Use Cloudinary (Best):**
```typescript
// /components/SEO.tsx
const FAVICON_PNG_48 = 'https://res.cloudinary.com/.../favicon-48.png';
const FAVICON_PNG_192 = 'https://res.cloudinary.com/.../favicon-192.png';

addLinkTag('icon', FAVICON_PNG_48, 'image/png', '48x48');
addLinkTag('icon', FAVICON_PNG_192, 'image/png', '192x192');
```

**Option B - Use SVG only (Current):**
```typescript
// /components/SEO.tsx
const FAVICON_SVG = '/favicon.svg';
addLinkTag('icon', FAVICON_SVG, 'image/svg+xml');
```

---

## 📦 What Can Be Stored in Figma Make

### ✅ **Supported (Will Persist):**

**Code Files:**
- `.tsx`, `.ts`, `.jsx`, `.js`
- `.css`, `.scss`, `.sass`
- `.html`

**Config Files:**
- `.json`
- `.toml`
- `.yaml`, `.yml`
- `.md` (Markdown)
- `.txt`

**Vector Graphics:**
- `.svg` (text-based XML)

**Data Files:**
- `.csv` (text-based)
- `.xml`
- `.geojson`

### ❌ **Not Supported (Will Be Deleted):**

**Images:**
- `.png`
- `.jpg`, `.jpeg`
- `.gif`
- `.webp`
- `.ico`

**Documents:**
- `.pdf`
- `.doc`, `.docx`

**Fonts:**
- `.ttf`, `.otf`, `.woff`, `.woff2`

**Archives:**
- `.zip`, `.tar`, `.gz`

**Video/Audio:**
- `.mp4`, `.webm`, `.mp3`, `.wav`

---

## 🔧 Workaround: Base64 Encoding (Not Recommended)

**Technically possible but not recommended:**

You could encode binary files as Base64 strings in a `.ts` file:

```typescript
// /utils/favicon-base64.ts
export const faviconPNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...';
```

**Problems:**
- ❌ Huge file sizes (Base64 is 33% larger)
- ❌ Slow to load
- ❌ Hard to maintain
- ❌ Not recommended for production

---

## 🎯 Best Practices

### **1. Code in Figma Make**
All `.tsx`, `.ts`, `.css`, `.json` files → Create in Figma Make

### **2. Binary Assets on CDN**
All `.png`, `.jpg`, `.ico`, `.pdf` files → Upload to Cloudinary/Imgur

### **3. Reference URLs in Code**
```typescript
const LOGO_URL = 'https://cdn.example.com/logo.png';
const FAVICON_URL = 'https://cdn.example.com/favicon.png';
```

### **4. Never Manually Edit GitHub Repo**
If you need to add files, add them in Figma Make, not GitHub directly.

---

## ✅ Your Specific Solution

**Since you manually edited `/components/SEO.tsx` and `/public/favicon.svg` in GitHub:**

### **Problem:**
Next Figma Make push will **overwrite** those changes.

### **Solution:**

1. **Copy your changes** from GitHub
2. **Paste them into Figma Make** (using this conversation)
3. **Let Figma Make push** the updated files
4. **For PNG files:**
   - Upload to Cloudinary
   - Reference URL in `/components/SEO.tsx`

**Let me know if you want me to help update the files in Figma Make right now!**

---

## 📋 Quick Reference

| File Type | Where to Store | How to Use |
|-----------|----------------|------------|
| `.tsx`, `.ts`, `.js` | ✅ Figma Make | Direct file |
| `.css`, `.scss` | ✅ Figma Make | Direct file |
| `.json`, `.txt`, `.md` | ✅ Figma Make | Direct file |
| `.svg` | ✅ Figma Make | Direct file |
| `.png`, `.jpg`, `.ico` | ❌ CDN (Cloudinary) | URL in code |
| `.pdf`, `.zip` | ❌ CDN or separate repo | URL in code |

---

## 🚀 Next Steps

**To fix your current situation:**

1. **Tell me what changes you made** to `/components/SEO.tsx` and `/public/favicon.svg` in GitHub
2. **I'll apply those changes** in Figma Make
3. **For PNG files**, I'll help you set up Cloudinary URLs
4. **Then push from Figma Make** and everything will work

Would you like me to help you with this now?
