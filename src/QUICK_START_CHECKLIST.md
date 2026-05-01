# 🚀 Quick Start Checklist for Deploying SheetCutters.com

Use this checklist to track your deployment progress. Check off items as you complete them.

---

## Phase 1: Setup (1-2 hours)

### Install Required Software
- [ ] Install Node.js from https://nodejs.org/ (download LTS version)
- [ ] Install Git from https://git-scm.com/downloads
- [ ] Install VS Code from https://code.visualstudio.com/ (optional)
- [ ] Install GitHub Desktop from https://desktop.github.com/ (optional, easier for beginners)

### Verify Installations
Open terminal/command prompt and type these commands:
- [ ] `node --version` (should show v18 or higher)
- [ ] `npm --version` (should show 8 or higher)
- [ ] `git --version` (should show 2.x or higher)

---

## Phase 2: Export & Version Control (30 minutes)

### Export from Figma Make
- [ ] Click "Export" or "Download" in Figma Make
- [ ] Extract the downloaded ZIP file
- [ ] Note the location of extracted folder

### Create GitHub Account & Repository
- [ ] Sign up at https://github.com/signup
- [ ] Create new repository named `sheetcutters-webapp`
- [ ] Set it to "Private"
- [ ] Add README (check the box)

### Upload Code to GitHub
Using GitHub Desktop (easier):
- [ ] Clone your repository to your computer
- [ ] Copy all Figma Make files into the cloned folder
- [ ] Commit with message: "Initial commit from Figma Make"
- [ ] Push to GitHub

OR using terminal:
```bash
cd /path/to/extracted/figma-make-files
git init
git add .
git commit -m "Initial commit from Figma Make"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/sheetcutters-webapp.git
git push -u origin main
```

---

## Phase 3: Database Setup (45 minutes)

### Create Supabase Project
- [ ] Go to https://supabase.com/ and sign up
- [ ] Click "New Project"
- [ ] Name: "SheetCutters"
- [ ] Choose region: "Mumbai" (or closest to you)
- [ ] Create a STRONG database password (save it!)
- [ ] Wait 2-3 minutes for setup

### Save Credentials
Go to Settings → API and copy these (SAVE THEM SECURELY):
- [ ] Project URL: `https://xxxxx.supabase.co`
- [ ] `anon public` API key
- [ ] `service_role` secret key (keep this SECRET!)

### Create Database Tables
- [ ] Go to SQL Editor in Supabase
- [ ] Copy the SQL from DEPLOYMENT_GUIDE.md (Section 3, Step 4)
- [ ] Paste and click "Run"
- [ ] Verify: Should see "Success. No rows returned"

### Set Up Storage Buckets
- [ ] Go to Storage → Create bucket: `design-files` (Private)
- [ ] Create bucket: `sketch-files` (Private)
- [ ] Add upload policies (see DEPLOYMENT_GUIDE.md)

### Add Sample Data
- [ ] Go back to SQL Editor
- [ ] Run the materials INSERT statement from DEPLOYMENT_GUIDE.md
- [ ] Verify: Go to Table Editor → `materials` → should see 10 rows

---

## Phase 4: Deploy Frontend (30 minutes)

### Create Vercel Account
- [ ] Go to https://vercel.com/signup
- [ ] Sign up with GitHub (easiest)

### Import Project
- [ ] Click "Add New..." → "Project"
- [ ] Select `sheetcutters-webapp` repository
- [ ] Click "Import"

### Configure Build
Verify these settings:
- [ ] Framework Preset: Vite
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`
- [ ] Install Command: `npm install`

### Add Environment Variables
Click "Environment Variables" and add:
- [ ] `VITE_SUPABASE_URL` = your Supabase project URL
- [ ] `VITE_SUPABASE_ANON_KEY` = your anon key from Supabase

### Deploy!
- [ ] Click "Deploy"
- [ ] Wait 2-3 minutes
- [ ] Copy the deployment URL (e.g., `https://sheetcutters-webapp.vercel.app`)

### Test Deployment
- [ ] Open the Vercel URL in browser
- [ ] Try signing up for an account
- [ ] Try uploading a file
- [ ] Check for any errors in browser console

---

## Phase 5: Custom Domain (45 minutes)

### Buy Domain
- [ ] Go to https://www.namecheap.com/ or https://www.godaddy.com/en-in
- [ ] Search for "sheetcutters.com"
- [ ] Purchase domain (~₹800-1200/year)
- [ ] Skip all upsells/extras

### Connect to Vercel
- [ ] In Vercel → Your project → Settings → Domains
- [ ] Add domain: `sheetcutters.com`
- [ ] Vercel will show you DNS records to add

### Update DNS
- [ ] Go to your domain registrar (Namecheap/GoDaddy)
- [ ] Find "DNS Settings" or "Manage DNS"
- [ ] Add the records Vercel showed you:
  - [ ] A Record: `@` → `76.76.21.21`
  - [ ] CNAME: `www` → `cname.vercel-dns.com`
- [ ] Save changes
- [ ] Wait 15-60 minutes for DNS to propagate

### Verify
- [ ] Try accessing `https://sheetcutters.com`
- [ ] Should show your site with HTTPS (🔒)
- [ ] Both `sheetcutters.com` and `www.sheetcutters.com` should work

---

## Phase 6: Monitoring (30 minutes)

### Set Up Error Tracking (Sentry)
- [ ] Sign up at https://sentry.io/signup/
- [ ] Create project, select "React"
- [ ] Get your DSN (looks like: `https://xxxxx@sentry.io/xxxxx`)
- [ ] In your code, run: `npm install @sentry/react`
- [ ] Add Sentry DSN to Vercel environment variables
- [ ] Commit and push changes

### Enable Analytics
Option 1 (Easiest):
- [ ] In Vercel dashboard → Analytics tab
- [ ] Click "Enable"
- [ ] Done!

Option 2 (More detailed):
- [ ] Create Google Analytics account
- [ ] Get Measurement ID (G-XXXXXXXXXX)
- [ ] Install: `npm install react-ga4`
- [ ] Add GA initialization code
- [ ] Add Measurement ID to environment variables

---

## Phase 7: Payment Integration (1-2 days)

### Razorpay Account
- [ ] Go to https://razorpay.com/ and sign up
- [ ] Complete business verification (needs PAN)
- [ ] Upload required documents
- [ ] Wait for approval (1-2 business days)

### Get API Keys
- [ ] Once approved, go to Settings → API Keys
- [ ] Generate Test Mode keys first
- [ ] Save Key ID and Key Secret

### Integrate in Code
- [ ] Install Razorpay: `npm install razorpay`
- [ ] Add payment utility code (see DEPLOYMENT_GUIDE.md)
- [ ] Add Razorpay keys to Vercel environment variables
- [ ] Test payment flow in Test Mode

### Go Live
- [ ] Switch to Live Mode in Razorpay
- [ ] Generate Live API keys
- [ ] Update environment variables
- [ ] Test with small real transaction

---

## Phase 8: Final Checks (1 hour)

### Functionality Testing
- [ ] Sign up new account works
- [ ] Login works
- [ ] File upload works (DXF/SVG)
- [ ] Material selection works
- [ ] Quote calculation is accurate
- [ ] Add to cart works
- [ ] Checkout flow works
- [ ] Payment works (test mode)
- [ ] Order confirmation displays

### Security Checks
- [ ] HTTPS is enabled (🔒 in browser)
- [ ] service_role key is NOT in frontend code
- [ ] Environment variables are set correctly
- [ ] Password requirements work
- [ ] Rate limiting works (try 6 wrong logins)

### Performance Checks
- [ ] Site loads in <3 seconds
- [ ] Images load properly
- [ ] No console errors
- [ ] Mobile responsive design works
- [ ] Works in Chrome, Firefox, Safari

### Content Checks
- [ ] All text is correct (no placeholder text)
- [ ] Contact email is correct
- [ ] Phone number is correct
- [ ] Pricing is accurate
- [ ] Materials list is complete

---

## Phase 9: Legal & Compliance (2-3 hours)

### Create Policies
- [ ] Write Privacy Policy (or use template)
- [ ] Write Terms & Conditions
- [ ] Write Refund/Return Policy
- [ ] Write Shipping Policy
- [ ] Add these to footer links

### Business Registration
- [ ] Register business (if taking payments)
- [ ] Get GST registration (mandatory for e-commerce in India)
- [ ] Set up business bank account
- [ ] Link bank account to Razorpay

### Email Setup
- [ ] Create business email: support@sheetcutters.com
- [ ] Set up email forwarding to personal email
- [ ] Test sending/receiving emails

---

## Phase 10: Soft Launch (1 week)

### Beta Testing
- [ ] Share with 5-10 friends/family
- [ ] Ask them to place test orders
- [ ] Collect feedback
- [ ] Fix any bugs they find

### Monitor Everything
- [ ] Check Sentry for errors daily
- [ ] Review analytics to see usage
- [ ] Monitor Supabase database size
- [ ] Check server logs

### Iterate
- [ ] Make improvements based on feedback
- [ ] Add missing features
- [ ] Improve unclear UI/UX
- [ ] Optimize slow pages

---

## Phase 11: Public Launch! 🚀

### Pre-Launch
- [ ] Final testing of all features
- [ ] Prepare marketing materials
- [ ] Set up social media accounts
- [ ] Prepare launch announcement

### Launch Day
- [ ] Switch Razorpay to Live Mode
- [ ] Announce on social media
- [ ] Email your network
- [ ] Post in relevant communities

### Post-Launch
- [ ] Monitor errors closely
- [ ] Respond to customer inquiries quickly
- [ ] Track analytics daily
- [ ] Gather customer feedback

---

## Ongoing Maintenance

### Daily
- [ ] Check for new orders
- [ ] Respond to customer support emails
- [ ] Monitor error logs

### Weekly
- [ ] Review analytics
- [ ] Check database storage usage
- [ ] Backup important data

### Monthly
- [ ] Review and pay hosting bills
- [ ] Update materials/pricing if needed
- [ ] Analyze business metrics
- [ ] Plan improvements

---

## 📞 Get Help If Stuck

### Free Resources
- Vercel: https://vercel.com/docs
- Supabase: https://supabase.com/docs
- Razorpay: https://razorpay.com/docs/

### Communities
- Vercel Discord: https://vercel.com/discord
- Supabase Discord: https://discord.supabase.com/
- Stack Overflow: https://stackoverflow.com/

### Paid Support
- Vercel: Has live chat support (very responsive!)
- Freelancers: Fiverr, Upwork for specific tasks

---

## 💰 Budget Tracker

### Initial Setup (One-time)
- [ ] Domain name: ₹800-1200/year
- [ ] Total Year 1: ~₹1000

### Monthly Costs (Once you scale)
- [ ] Supabase: ₹0 (free) → ~₹2000/month (paid)
- [ ] Vercel: ₹0 (free) → ~₹1600/month (paid)
- [ ] Monitoring: ₹0 (free tiers)
- [ ] Razorpay: 2% per transaction

**Start with ₹1000, scale costs as revenue grows!**

---

## ✅ Success Metrics

You're ready to launch when:
- [ ] 10 successful test orders completed
- [ ] Zero errors in Sentry for 48 hours
- [ ] All beta testers give positive feedback
- [ ] Payment flow works flawlessly
- [ ] Mobile experience is smooth
- [ ] You can fulfill orders efficiently

---

**Remember:** Don't try to do everything at once! Complete one phase at a time. Most people complete Phase 1-6 in a weekend.

Good luck! 🚀
