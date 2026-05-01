# 🚀 Complete Beginner's Guide to Deploying SheetCutters.com

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Step 1: Export Your Code](#step-1-export-your-code)
3. [Step 2: Set Up GitHub (Version Control)](#step-2-set-up-github)
4. [Step 3: Set Up Supabase (Database)](#step-3-set-up-supabase)
5. [Step 4: Deploy Frontend (Vercel)](#step-4-deploy-frontend)
6. [Step 5: Set Up Custom Domain](#step-5-set-up-custom-domain)
7. [Step 6: Add Monitoring](#step-6-add-monitoring)
8. [Step 7: Payment Integration](#step-7-payment-integration)
9. [Costs Breakdown](#costs-breakdown)

---

## Prerequisites

Before starting, you'll need:
- ✅ A Google account (for GitHub, Vercel)
- ✅ A credit/debit card (for domain purchase, some services need card even if free)
- ✅ 2-3 hours of focused time
- ✅ Your current Figma Make project code

**💰 Total Initial Cost: ~₹800-1200/year** (mostly domain name)

---

## Step 1: Export Your Code

### What is this?
You need to download all your code from Figma Make to your computer.

### Steps:

1. **In Figma Make**, look for an "Export" or "Download" button
   - This will download a `.zip` file with all your code

2. **Extract the ZIP file**
   - Right-click → "Extract All" (Windows) or double-click (Mac)
   - You'll see folders like `/components`, `/supabase`, etc.

3. **Install Required Software:**

   **a) Install Node.js** (JavaScript runtime)
   - Go to: https://nodejs.org/
   - Download the "LTS" version (left button)
   - Run the installer, click "Next" through everything
   - **Verify installation:**
     - Open Terminal (Mac) or Command Prompt (Windows)
     - Type: `node --version`
     - Should show something like `v20.10.0`

   **b) Install Git** (Version control)
   - Go to: https://git-scm.com/downloads
   - Download for your OS
   - Run installer, use default settings
   - **Verify:**
     - Type in terminal: `git --version`
     - Should show something like `git version 2.40.0`

   **c) Install VS Code** (Code editor - optional but recommended)
   - Go to: https://code.visualstudio.com/
   - Download and install
   - This makes editing code easier

---

## Step 2: Set Up GitHub (Version Control)

### What is this?
GitHub stores your code online safely and tracks all changes.

### Steps:

1. **Create GitHub Account**
   - Go to: https://github.com/signup
   - Sign up with your email
   - Choose the free plan

2. **Create a New Repository**
   - Click the "+" in top-right → "New repository"
   - **Repository name:** `sheetcutters-webapp`
   - **Description:** "Laser cutting service web application"
   - Choose "Private" (so code isn't public)
   - ✅ Check "Add a README file"
   - Click "Create repository"

3. **Upload Your Code**

   **Option A: Using GitHub Desktop (Easier for beginners)**
   - Download GitHub Desktop: https://desktop.github.com/
   - Install and sign in with your GitHub account
   - Click "Clone repository" → select `sheetcutters-webapp`
   - Choose where to save on your computer
   - Copy all your extracted Figma Make files into this folder
   - In GitHub Desktop:
     - You'll see all files listed as "changed"
     - In bottom-left, type message: "Initial commit from Figma Make"
     - Click "Commit to main"
     - Click "Push origin" (uploads to GitHub)

   **Option B: Using Terminal (More technical)**
   ```bash
   # Navigate to your extracted code folder
   cd /path/to/your/extracted/code
   
   # Initialize git
   git init
   
   # Add GitHub as remote
   git remote add origin https://github.com/YOUR-USERNAME/sheetcutters-webapp.git
   
   # Add all files
   git add .
   
   # Commit
   git commit -m "Initial commit from Figma Make"
   
   # Push to GitHub
   git branch -M main
   git push -u origin main
   ```

---

## Step 3: Set Up Supabase (Database)

### What is this?
Supabase provides your database, authentication, and file storage.

### Steps:

1. **Create Supabase Account**
   - Go to: https://supabase.com/
   - Click "Start your project"
   - Sign up with GitHub (easiest)

2. **Create New Project**
   - Click "New Project"
   - **Name:** SheetCutters
   - **Database Password:** Create a STRONG password (save it somewhere safe!)
   - **Region:** Choose "Mumbai" (closest to India)
   - **Plan:** Free (for now)
   - Click "Create new project"
   - Wait 2-3 minutes for setup

3. **Get Your Project Credentials**
   - Go to Project Settings (gear icon) → API
   - You'll need these values (SAVE THEM):
     - `Project URL` (looks like: https://xxxxx.supabase.co)
     - `anon public` key (under "Project API keys")
     - `service_role` key (click "Reveal" - keep this SECRET!)

4. **Create Database Tables**

   **Why?** Right now you only have a KV store. For a real e-commerce site, you need proper tables.

   - Go to "SQL Editor" in left sidebar
   - Click "New query"
   - Copy-paste this SQL (creates all needed tables):

   ```sql
   -- Users table (extends Supabase auth)
   CREATE TABLE public.users (
     id UUID PRIMARY KEY REFERENCES auth.users(id),
     email TEXT NOT NULL,
     name TEXT NOT NULL,
     phone TEXT,
     is_admin BOOLEAN DEFAULT false,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Materials catalog
   CREATE TABLE public.materials (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name TEXT NOT NULL,
     category TEXT NOT NULL,
     thickness DECIMAL NOT NULL,
     price_per_sqm DECIMAL NOT NULL,
     available BOOLEAN DEFAULT true,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Orders table
   CREATE TABLE public.orders (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES public.users(id),
     order_number TEXT UNIQUE NOT NULL,
     status TEXT NOT NULL DEFAULT 'pending',
     total_amount DECIMAL NOT NULL,
     shipping_address JSONB,
     payment_status TEXT DEFAULT 'pending',
     notes TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Order items (individual parts in an order)
   CREATE TABLE public.order_items (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
     file_url TEXT NOT NULL,
     file_name TEXT NOT NULL,
     material_id UUID REFERENCES public.materials(id),
     quantity INTEGER NOT NULL DEFAULT 1,
     dimensions JSONB,
     area DECIMAL,
     price DECIMAL NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Sketch orders (when customers send sketches instead of CAD)
   CREATE TABLE public.sketch_orders (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES public.users(id),
     order_number TEXT UNIQUE NOT NULL,
     sketch_file_url TEXT NOT NULL,
     description TEXT,
     status TEXT DEFAULT 'pending',
     quote_amount DECIMAL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Enable Row Level Security
   ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.sketch_orders ENABLE ROW LEVEL SECURITY;

   -- Users can only see their own data
   CREATE POLICY "Users can view own data" ON public.users
     FOR SELECT USING (auth.uid() = id);

   CREATE POLICY "Users can view own orders" ON public.orders
     FOR ALL USING (auth.uid() = user_id);

   CREATE POLICY "Users can view own order items" ON public.order_items
     FOR SELECT USING (
       EXISTS (
         SELECT 1 FROM public.orders 
         WHERE orders.id = order_items.order_id 
         AND orders.user_id = auth.uid()
       )
     );

   -- Admins can see everything (we'll set is_admin manually)
   CREATE POLICY "Admins can view all orders" ON public.orders
     FOR ALL USING (
       EXISTS (
         SELECT 1 FROM public.users 
         WHERE users.id = auth.uid() 
         AND users.is_admin = true
       )
     );

   -- Materials are public (read-only for users)
   CREATE POLICY "Anyone can view materials" ON public.materials
     FOR SELECT USING (true);
   ```

   - Click "Run" (▶️ button)
   - You should see "Success. No rows returned"

5. **Set Up Storage Buckets**
   
   - Go to "Storage" in left sidebar
   - Create these buckets:
     - **Name:** `design-files` (for DXF/SVG uploads)
       - Make it **Private**
     - **Name:** `sketch-files` (for sketch uploads)
       - Make it **Private**
   
   - For each bucket, set policies:
     - Go to "Policies" tab
     - Add policy: "Authenticated users can upload"
     ```sql
     CREATE POLICY "Authenticated users can upload files"
     ON storage.objects FOR INSERT
     TO authenticated
     WITH CHECK (bucket_id = 'design-files');
     ```

6. **Add Sample Materials**
   
   - Go back to SQL Editor
   - Run this to add initial materials:
   ```sql
   INSERT INTO public.materials (name, category, thickness, price_per_sqm) VALUES
   ('Mild Steel', 'Metal', 1.0, 450),
   ('Mild Steel', 'Metal', 2.0, 520),
   ('Mild Steel', 'Metal', 3.0, 680),
   ('Stainless Steel 304', 'Metal', 1.0, 850),
   ('Stainless Steel 304', 'Metal', 2.0, 1200),
   ('Aluminum 6061', 'Metal', 1.5, 750),
   ('Acrylic Clear', 'Plastic', 3.0, 320),
   ('Acrylic Clear', 'Plastic', 5.0, 450),
   ('Plywood', 'Wood', 4.0, 180),
   ('MDF', 'Wood', 6.0, 150);
   ```

---

## Step 4: Deploy Frontend (Vercel)

### What is this?
Vercel hosts your website and makes it accessible on the internet.

### Steps:

1. **Create Vercel Account**
   - Go to: https://vercel.com/signup
   - Click "Continue with GitHub"
   - This connects your GitHub account

2. **Import Your Project**
   - Click "Add New..." → "Project"
   - You'll see your `sheetcutters-webapp` repository
   - Click "Import"

3. **Configure Build Settings**
   
   Vercel will auto-detect it's a React app. Verify these settings:
   
   - **Framework Preset:** Vite (or Create React App)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist` (or `build`)
   - **Install Command:** `npm install`

4. **Add Environment Variables**
   
   Click "Environment Variables" and add these (use values from Supabase Step 3):
   
   ```
   VITE_SUPABASE_URL = https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY = your-anon-key-here
   ```
   
   ⚠️ **NEVER** add the `service_role` key here - it's secret!

5. **Deploy!**
   - Click "Deploy"
   - Wait 2-3 minutes
   - You'll get a URL like: `https://sheetcutters-webapp.vercel.app`

6. **Update Your Code**
   
   You need to update how your app reads environment variables:
   
   - Open your code in VS Code
   - Find `/utils/supabase/info.tsx`
   - Update it to:
   ```typescript
   export const projectId = import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] || '';
   export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
   ```
   
   - Find `/utils/supabase/client.tsx` and verify it uses:
   ```typescript
   import { createClient as createSupabaseClient } from '@supabase/supabase-js';
   
   export const supabase = createSupabaseClient(
     import.meta.env.VITE_SUPABASE_URL,
     import.meta.env.VITE_SUPABASE_ANON_KEY
   );
   ```

   - Commit and push changes:
   ```bash
   git add .
   git commit -m "Update environment variables for Vercel"
   git push
   ```
   
   - Vercel will auto-deploy the update!

---

## Step 5: Set Up Custom Domain

### What is this?
Instead of `sheetcutters-webapp.vercel.app`, you get `www.sheetcutters.com`

### Steps:

1. **Buy a Domain**
   
   **Option A: Namecheap (Recommended for beginners)**
   - Go to: https://www.namecheap.com/
   - Search for "sheetcutters.com"
   - If available, buy it (~₹800-1200/year for .com)
   - Choose cheapest plan, no extras needed
   
   **Option B: GoDaddy India**
   - Go to: https://www.godaddy.com/en-in
   - Similar process

2. **Connect Domain to Vercel**
   
   - In Vercel dashboard, go to your project
   - Click "Settings" → "Domains"
   - Click "Add"
   - Type: `sheetcutters.com`
   - Vercel will show you DNS records to add

3. **Update DNS Settings**
   
   - Go back to Namecheap (or wherever you bought domain)
   - Go to "Domain List" → Click "Manage" on your domain
   - Go to "Advanced DNS"
   - Add records Vercel showed you (usually looks like):
     - Type: `A Record`, Host: `@`, Value: `76.76.21.21`
     - Type: `CNAME`, Host: `www`, Value: `cname.vercel-dns.com`
   
   - Save changes
   - Wait 15-60 minutes for DNS to propagate

4. **Enable HTTPS**
   - Vercel automatically adds SSL certificate
   - Your site will be `https://sheetcutters.com` (secure!)

---

## Step 6: Add Monitoring

### What is this?
Track errors, performance, and user analytics.

### 6A: Error Monitoring (Sentry)

1. **Create Sentry Account**
   - Go to: https://sentry.io/signup/
   - Sign up (free tier is generous)
   - Choose "React" as platform

2. **Install Sentry**
   
   In your project folder terminal:
   ```bash
   npm install @sentry/react
   ```

3. **Configure Sentry**
   
   Create `/src/utils/sentry.ts`:
   ```typescript
   import * as Sentry from "@sentry/react";

   Sentry.init({
     dsn: "your-sentry-dsn-here",
     environment: import.meta.env.MODE,
     tracesSampleRate: 1.0,
   });
   ```
   
   In `/App.tsx`, wrap your app:
   ```typescript
   import * as Sentry from "@sentry/react";
   
   // Wrap your export
   export default Sentry.withProfiler(App);
   ```

4. **Add to Vercel**
   - Add environment variable in Vercel:
     ```
     VITE_SENTRY_DSN = your-sentry-dsn
     ```

### 6B: Analytics (Google Analytics or Vercel Analytics)

**Option 1: Vercel Analytics (Easiest)**
- In Vercel dashboard → Your project → "Analytics" tab
- Click "Enable"
- Done! You get pageviews, performance metrics automatically

**Option 2: Google Analytics (More detailed)**
1. Create Google Analytics account: https://analytics.google.com/
2. Create a property for your website
3. Get your Measurement ID (looks like: `G-XXXXXXXXXX`)
4. Install package:
   ```bash
   npm install react-ga4
   ```
5. Add to your app:
   ```typescript
   import ReactGA from 'react-ga4';
   
   ReactGA.initialize('G-XXXXXXXXXX');
   ```

---

## Step 7: Payment Integration (Razorpay)

### Why Razorpay?
Best for Indian businesses - supports UPI, cards, wallets, EMI.

### Steps:

1. **Create Razorpay Account**
   - Go to: https://razorpay.com/
   - Click "Sign Up"
   - Complete business verification (needs PAN, GST if applicable)
   - Activation takes 1-2 days

2. **Get API Keys**
   - Go to Settings → API Keys
   - Generate Test Keys first (for testing)
   - You'll get:
     - `Key ID` (public)
     - `Key Secret` (keep secret!)

3. **Install Razorpay**
   ```bash
   npm install razorpay
   ```

4. **Add to Environment Variables**
   
   In Vercel:
   ```
   RAZORPAY_KEY_ID = rzp_test_xxxxx
   RAZORPAY_KEY_SECRET = your_secret_key
   ```

5. **Implement Payment Flow**

   Create `/utils/payment.ts`:
   ```typescript
   export async function createOrder(amount: number) {
     const response = await fetch('/api/create-razorpay-order', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ amount: amount * 100 }) // Razorpay uses paise
     });
     return response.json();
   }

   export function openRazorpay(order: any, onSuccess: Function) {
     const options = {
       key: import.meta.env.VITE_RAZORPAY_KEY_ID,
       amount: order.amount,
       currency: "INR",
       name: "SheetCutters",
       description: "Laser Cutting Services",
       order_id: order.id,
       handler: function (response: any) {
         onSuccess(response);
       },
       prefill: {
         name: "Customer Name",
         email: "customer@example.com",
         contact: "9999999999"
       },
       theme: {
         color: "#dc0000"
       }
     };
     
     const rzp = new (window as any).Razorpay(options);
     rzp.open();
   }
   ```

6. **Create API Endpoint**
   
   You'll need to create serverless functions in Vercel:
   
   Create `/api/create-razorpay-order.ts`:
   ```typescript
   import Razorpay from 'razorpay';

   export default async function handler(req: any, res: any) {
     const razorpay = new Razorpay({
       key_id: process.env.RAZORPAY_KEY_ID,
       key_secret: process.env.RAZORPAY_KEY_SECRET,
     });

     const order = await razorpay.orders.create({
       amount: req.body.amount,
       currency: 'INR',
       receipt: `order_${Date.now()}`,
     });

     res.json(order);
   }
   ```

7. **Add Razorpay Checkout Script**
   
   In your `/index.html`:
   ```html
   <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
   ```

---

## 💰 Costs Breakdown

### First Year:
- **Domain name:** ₹800-1200/year (.com)
- **Supabase Free Tier:** ₹0 (up to 500MB DB, 1GB storage)
  - When you outgrow: ~$25/month (~₹2000/month)
- **Vercel Free Tier:** ₹0 (100GB bandwidth)
  - When you outgrow: ~$20/month (~₹1600/month)
- **Sentry Free Tier:** ₹0 (5k errors/month)
- **Razorpay:** ₹0 setup, 2% per transaction

**Total to start: ~₹1000/year**
**When scaling: ~₹4000-5000/month**

---

## ✅ Post-Deployment Checklist

After everything is deployed:

- [ ] Test all features on production URL
- [ ] Try creating account, uploading file, placing order
- [ ] Test payment flow (use Razorpay test mode)
- [ ] Check error monitoring in Sentry
- [ ] Verify analytics tracking
- [ ] Set up email notifications (use Supabase Auth emails)
- [ ] Create privacy policy & terms of service
- [ ] Register business (if taking payments)
- [ ] Get GST registration (mandatory for e-commerce in India)
- [ ] Set up customer support email (support@sheetcutters.com)

---

## 🆘 Common Issues & Solutions

### "npm: command not found"
- Node.js not installed properly
- Solution: Reinstall from nodejs.org

### "Permission denied" on Mac/Linux
- Add `sudo` before command: `sudo npm install`

### "Module not found" errors
- Run: `npm install` in your project folder

### Deployment fails on Vercel
- Check build logs in Vercel dashboard
- Common fix: Update `package.json` scripts:
  ```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
  ```

### Database connection fails
- Check environment variables in Vercel
- Make sure VITE_ prefix is there

### Payment not working
- Are you in Test Mode? (should be for now)
- Check browser console for errors
- Verify API keys in environment variables

---

## 📚 Learning Resources

As a beginner, these will help:

1. **Git/GitHub:**
   - https://www.youtube.com/watch?v=RGOj5yH7evk (Git tutorial)
   
2. **React Basics:**
   - https://react.dev/learn (official React docs)
   
3. **Supabase:**
   - https://supabase.com/docs (official docs with videos)
   
4. **Vercel Deployment:**
   - https://vercel.com/docs (step-by-step guides)

5. **Razorpay Integration:**
   - https://razorpay.com/docs/ (official integration guide)

---

## 🎯 Next Steps After Deployment

1. **Week 1:** Test everything thoroughly
2. **Week 2:** Add more materials to database
3. **Week 3:** Create admin panel for managing orders
4. **Week 4:** Soft launch to friends/family
5. **Month 2:** Collect feedback, iterate
6. **Month 3:** Public launch + marketing

---

## 💬 Getting Help

If you get stuck:

1. **Vercel:** Has live chat support (very helpful!)
2. **Supabase:** Discord community (https://discord.supabase.com/)
3. **Stack Overflow:** Search your error messages
4. **Reddit:** r/webdev, r/reactjs

---

**Good luck with your deployment! 🚀**

Remember: Don't try to do everything at once. Deploy first with basic functionality, then add features iteratively.
