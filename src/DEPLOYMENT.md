# SheetCutters.com Deployment Guide

This comprehensive guide will walk you through deploying the SheetCutters.com laser cutting service application to production.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Supabase Project Setup](#supabase-project-setup)
3. [Database Configuration](#database-configuration)
4. [Storage Buckets Setup](#storage-buckets-setup)
5. [Edge Functions Deployment](#edge-functions-deployment)
6. [Authentication Configuration](#authentication-configuration)
7. [Email Service Setup](#email-service-setup)
8. [Frontend Deployment](#frontend-deployment)
9. [Environment Variables](#environment-variables)
10. [Analytics Setup](#analytics-setup)
11. [Post-Deployment Checklist](#post-deployment-checklist)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

- [ ] Node.js (v18 or higher) installed
- [ ] npm or yarn package manager
- [ ] A Supabase account (free tier available at [supabase.com](https://supabase.com))
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Git installed
- [ ] A domain name (optional, but recommended for production)

---

## Supabase Project Setup

### Step 1: Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in the project details:
   - **Name**: `sheetcutters-prod` (or your preferred name)
   - **Database Password**: Generate a strong password and save it securely
   - **Region**: Choose the region closest to your users
   - **Pricing Plan**: Select based on your needs (Free tier works for getting started)
4. Click "Create new project" and wait for provisioning (1-2 minutes)

### Step 2: Get Your Project Credentials

Once your project is ready:

1. Go to **Project Settings** → **API**
2. Note down the following (you'll need these later):
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **Project ID**: `xxxxxxxxxxxxx` (from the URL)
   - **anon/public key**: `eyJhbGc...` (starts with eyJ)
   - **service_role key**: `eyJhbGc...` (KEEP THIS SECRET!)

3. Go to **Project Settings** → **Database**
4. Note down:
   - **Connection string** (Direct connection)

---

## Database Configuration

### Step 3: Create the Key-Value Store Table

The application uses a single KV store table for all data. Create it using the SQL Editor:

1. Go to **SQL Editor** in your Supabase dashboard
2. Click "New Query"
3. Paste the following SQL:

```sql
-- Create the key-value store table
CREATE TABLE IF NOT EXISTS kv_store_8927474f (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index for faster prefix searches
CREATE INDEX IF NOT EXISTS idx_kv_store_key_prefix ON kv_store_8927474f (key text_pattern_ops);

-- Create an index for updated_at for cleanup operations
CREATE INDEX IF NOT EXISTS idx_kv_store_updated_at ON kv_store_8927474f (updated_at);

-- Enable Row Level Security (RLS)
ALTER TABLE kv_store_8927474f ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows service role to do everything
CREATE POLICY "Service role has full access" ON kv_store_8927474f
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

4. Click "Run" to execute the SQL
5. Verify the table was created by going to **Table Editor** and checking for `kv_store_8927474f`

---

## Storage Buckets Setup

### Step 4: Configure Storage for File Uploads

The application needs a private storage bucket for DXF files and sketch uploads:

1. Go to **Storage** in your Supabase dashboard
2. Click "Create a new bucket"
3. Configure the bucket:
   - **Name**: `make-8927474f-files`
   - **Public bucket**: **UNCHECK** (keep it private)
   - **File size limit**: Set to `50 MB` (or higher based on your needs)
   - **Allowed MIME types**: Leave empty to allow all types
4. Click "Create bucket"

**Note**: The Edge Function will automatically verify this bucket exists on startup and create it if missing, but creating it manually ensures proper permissions from the start.

---

## Edge Functions Deployment

### Step 5: Link Your Project to Supabase CLI

1. Open your terminal in the project root directory
2. Login to Supabase CLI:
   ```bash
   supabase login
   ```
3. Link your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_ID
   ```
   Replace `YOUR_PROJECT_ID` with your actual project ID (from Step 2)

### Step 6: Deploy Edge Functions

1. Deploy the main server function:
   ```bash
   supabase functions deploy make-server-8927474f --no-verify-jwt
   ```

2. Wait for deployment to complete. You should see:
   ```
   Deployed Function make-server-8927474f on project xxxxxxxxxxxxx
   ```

### Step 7: Set Edge Function Secrets

The Edge Function needs access to your Supabase credentials:

```bash
# Set the Supabase URL
supabase secrets set SUPABASE_URL="https://xxxxxxxxxxxxx.supabase.co"

# Set the anon key
supabase secrets set SUPABASE_ANON_KEY="your-anon-key-here"

# Set the service role key (KEEP THIS SECRET!)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# Set the database URL (from Step 2)
supabase secrets set SUPABASE_DB_URL="your-database-connection-string"
```

**Important**: Replace the placeholder values with your actual credentials from Step 2.

### Step 8: Verify Edge Function Deployment

Test that your Edge Function is running:

```bash
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-8927474f/health
```

You should receive a response like:
```json
{"status":"ok","timestamp":"2024-..."}
```

---

## Authentication Configuration

### Step 9: Configure Auth Settings

1. Go to **Authentication** → **Providers** in your Supabase dashboard

2. **Email Provider** (Required):
   - Enable "Email" provider
   - **Confirm email**: Toggle OFF for development, ON for production
   - **Secure email change**: Toggle ON
   - **Secure password change**: Toggle ON

3. **Google OAuth** (Optional - if you want Google sign-in):
   - Enable "Google" provider
   - Follow the setup guide: https://supabase.com/docs/guides/auth/social-login/auth-google
   - Add your Google Client ID and Client Secret
   - Add authorized redirect URIs:
     - `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
     - `http://localhost:5173/auth/callback` (for local dev)

4. **URL Configuration**:
   - Go to **Authentication** → **URL Configuration**
   - Set **Site URL**: `https://yourdomain.com` (your production domain)
   - Add **Redirect URLs**:
     - `https://yourdomain.com/*`
     - `http://localhost:5173/*` (for local development)

5. **Email Templates**:
   - Go to **Authentication** → **Email Templates**
   - Customize the email templates:
     - **Confirm signup**
     - **Reset password**
     - **Magic Link**
   - Add your branding and adjust the styling

---

## Email Service Setup

### Step 10: Configure Email Delivery

For production email delivery, you need to configure SMTP or use Supabase's email service:

#### Option A: Use Supabase Email (Development Only)
- Supabase provides email service out of the box
- Limited to 3 emails per hour per user
- Good for testing, NOT recommended for production

#### Option B: Configure Custom SMTP (Recommended for Production)

1. Go to **Project Settings** → **Auth** → **SMTP Settings**
2. Enable "Enable Custom SMTP"
3. Configure your SMTP provider (e.g., SendGrid, AWS SES, Mailgun):
   - **Sender email**: `noreply@yourdomain.com`
   - **Sender name**: `SheetCutters`
   - **Host**: Your SMTP host (e.g., `smtp.sendgrid.net`)
   - **Port**: Usually `587` (TLS) or `465` (SSL)
   - **Username**: Your SMTP username
   - **Password**: Your SMTP password

4. Test the configuration by sending a test email

**Popular SMTP Providers:**
- **SendGrid**: Free tier with 100 emails/day
- **AWS SES**: Pay-as-you-go, very affordable
- **Mailgun**: Free tier with 5,000 emails/month
- **Resend**: Modern API, generous free tier

---

## Frontend Deployment

### Step 11: Update Frontend Configuration

1. Open `/utils/supabase/info.tsx`
2. Update the production values:

```tsx
// Production values (replace with your actual values)
export const projectId = 'YOUR_PROJECT_ID';
export const publicAnonKey = 'YOUR_ANON_KEY';
```

### Step 12: Build the Frontend

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

This creates an optimized production build in the `dist` folder.

### Step 13: Deploy to Hosting Platform

#### Option A: Deploy to Vercel (Recommended)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Follow the prompts:
   - Link to existing project or create new
   - Set up environment variables (if needed)
   - Deploy!

4. Set up custom domain in Vercel dashboard

#### Option B: Deploy to Netlify

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Deploy:
   ```bash
   netlify deploy --prod
   ```

3. Set build command: `npm run build`
4. Set publish directory: `dist`

#### Option C: Deploy to AWS S3 + CloudFront

1. Create an S3 bucket:
   ```bash
   aws s3 mb s3://sheetcutters-prod
   ```

2. Upload build files:
   ```bash
   aws s3 sync dist/ s3://sheetcutters-prod --delete
   ```

3. Configure CloudFront distribution for the S3 bucket
4. Set up custom domain with Route53

#### Option D: Deploy to Any Static Host

You can deploy the `dist` folder to any static hosting service:
- GitHub Pages
- Cloudflare Pages
- Firebase Hosting
- DigitalOcean App Platform

---

## Environment Variables

### Frontend Environment Variables

If your hosting platform supports environment variables at build time, you can use:

```bash
# .env.production
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Then update your code to use these:

```tsx
// utils/supabase/info.tsx
export const projectId = import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'YOUR_PROJECT_ID';
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';
```

### Backend Environment Variables (Already Set)

These were set in Step 7:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

---

## Analytics Setup

### Step 14: Configure Analytics and Session Tracking

SheetCutters includes a comprehensive analytics system to track sessions, orders by state, and key business metrics.

**📊 See the detailed guide**: [ANALYTICS_SETUP.md](./ANALYTICS_SETUP.md)

#### Quick Setup:

1. **Analytics is already deployed** with your Edge Functions (from Step 6)
   - Session tracking endpoint: `/track/session`
   - Admin stats endpoint: `/admin/stats`
   - Analytics data endpoint: `/admin/analytics`

2. **Verify analytics routes work**:
   ```bash
   # Test session tracking
   curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-8927474f/track/session \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -d '{"sessionId":"test-123","page":"/"}'
   ```

3. **View analytics in Admin Panel**:
   - Login as admin
   - **Dashboard tab**: View Sessions card (shows total sessions with trend)
   - **Analytics tab**: 
     - Sessions graph with Day/Week/Month/6 Months filters
     - Orders by State pie chart
     - Material distribution and conversion metrics

4. **(Optional) Implement automatic session tracking**:
   - See [ANALYTICS_SETUP.md](./ANALYTICS_SETUP.md) for frontend tracking code
   - Tracks user sessions automatically on page load
   - Stores in KV store with timestamp

#### What Analytics Provides:

- **Dashboard Metrics**:
  - Total Revenue (with trend)
  - Total Orders (with trend)
  - **Sessions** (with trend, in brand red color)
  - Total Users (with trend)
  - Average Order Value

- **Analytics Panel**:
  - **Sessions Analytics**: Line chart with time range filtering
  - **Orders by State**: Pie chart showing geographic distribution
  - Material Distribution
  - Sessions & Conversions metrics

#### Data Structure:

Sessions are stored as:
```
Key: session:2024-12-01T10:30:45.123Z:unique-session-id
Value: {
  "sessionId": "unique-session-id",
  "page": "/",
  "userAgent": "...",
  "referrer": "...",
  "timestamp": "2024-12-01T10:30:45.123Z"
}
```

Orders by state are automatically calculated from existing order data (no additional setup needed).

#### Testing:

1. Create test sessions (via API or frontend tracking)
2. Place test orders with different states
3. Check Dashboard → Sessions card shows count
4. Check Analytics → Sessions graph displays data
5. Check Analytics → Orders by State shows distribution

For complete setup instructions, troubleshooting, and advanced features, see **[ANALYTICS_SETUP.md](./ANALYTICS_SETUP.md)**.

---

## Post-Deployment Checklist

### Step 15: Create Admin User

1. Sign up through your deployed application
2. Get your user ID from the authentication logs
3. Run this SQL in Supabase SQL Editor:

```sql
-- Set user as admin
UPDATE kv_store_8927474f
SET value = jsonb_set(value, '{isAdmin}', 'true')
WHERE key LIKE 'user:%' AND value->>'email' = 'your-admin-email@example.com';
```

Or use the Supabase dashboard:
1. Go to **Table Editor** → `kv_store_8927474f`
2. Find your user record (key starts with `user:`)
3. Edit the JSON value and add `"isAdmin": true`

### Step 16: Test Core Functionality

- [ ] User registration and login
- [ ] Password reset flow
- [ ] File upload (DXF files)
- [ ] Sketch service upload
- [ ] Price calculation
- [ ] Add to cart functionality
- [ ] Checkout process
- [ ] Order creation
- [ ] Email notifications (confirmation, password reset)
- [ ] Admin panel access
- [ ] Order management in admin panel
- [ ] File downloads in admin panel
- [ ] User management
- [ ] Discount code creation and usage
- [ ] **Analytics dashboard (Sessions card, charts)**
- [ ] **Session tracking (if implemented)**
- [ ] **Orders by State chart**

### Step 17: Configure Materials and Pricing

1. Login as admin
2. Go to Admin Panel → Materials
3. Add your materials with pricing:
   - Material name (e.g., "Mild Steel", "Stainless Steel")
   - Thickness options (e.g., 2mm, 3mm, 5mm)
   - Base price per mm² of cutting
   - Curve pricing multiplier

### Step 18: Create Discount Codes (Optional)

1. Go to Admin Panel → Discounts
2. Create promotional codes:
   - Code name (e.g., "LAUNCH50")
   - Discount type (percentage or fixed)
   - Discount value
   - Expiry date
   - Usage limits

### Step 19: Set Up Monitoring

1. **Supabase Logs**:
   - Go to **Logs** → **Edge Functions**
   - Monitor for errors and warnings

2. **Storage Usage**:
   - Go to **Storage** → check bucket size
   - Set up alerts for storage limits

3. **Database Usage**:
   - Go to **Database** → check table size
   - Monitor query performance

4. **Built-in Analytics**:
   - Admin Panel → Dashboard → view Sessions card
   - Admin Panel → Analytics → detailed session and state data
   - Monitor trends and conversions

5. **External Analytics** (Optional):
   - Integrate Google Analytics or Plausible
   - Track user flows and conversions
   - Complement built-in analytics

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Unauthorized" errors when calling API

**Solution**:
1. Verify Edge Function secrets are set correctly:
   ```bash
   supabase secrets list
   ```
2. Check that the anon key matches in both frontend and backend
3. Verify JWT verification is disabled: `--no-verify-jwt`

#### Issue: File uploads fail

**Solution**:
1. Check storage bucket exists and is named `make-8927474f-files`
2. Verify bucket is private (not public)
3. Check file size limits in bucket settings
4. Check browser console for CORS errors

#### Issue: Emails not sending

**Solution**:
1. Verify SMTP settings are correct
2. Check sender email is verified with your SMTP provider
3. Check Supabase logs for email errors
4. Test with a simple password reset flow

#### Issue: Admin panel not accessible

**Solution**:
1. Verify user has `isAdmin: true` in the database
2. Check browser console for authentication errors
3. Clear browser cache and cookies
4. Try logging out and back in

#### Issue: Sketch files not appearing in orders

**Solution**:
1. This was recently fixed - redeploy Edge Functions:
   ```bash
   supabase functions deploy make-server-8927474f --no-verify-jwt
   ```
2. For existing orders, the data is already saved incorrectly
3. New orders should work properly

#### Issue: CORS errors in browser console

**Solution**:
1. Verify Site URL and Redirect URLs in Auth settings
2. Add your domain to allowed origins
3. Check Edge Function CORS headers are set correctly

#### Issue: Database connection errors

**Solution**:
1. Check `SUPABASE_DB_URL` secret is set correctly
2. Verify database password hasn't changed
3. Check database is not paused (free tier)
4. Review connection pooling settings

#### Issue: Orders not showing in admin panel

**Solution**:
1. Check orders are being created in the database:
   ```sql
   SELECT * FROM kv_store_8927474f WHERE key LIKE 'order:%' ORDER BY created_at DESC LIMIT 10;
   ```
2. Verify order data structure matches expected format
3. Check browser console for errors

---

## Maintenance and Updates

### Regular Maintenance Tasks

**Weekly:**
- Check Supabase logs for errors
- Monitor storage usage
- Review order volumes

**Monthly:**
- Update discount codes
- Review pricing and materials
- Check user feedback
- Update dependencies:
  ```bash
  npm update
  npm audit fix
  ```

**Quarterly:**
- Database cleanup (old cancelled orders)
- Review and optimize queries
- Update Supabase CLI and redeploy functions
- Security audit

### Updating the Application

1. Pull latest changes from Git
2. Test locally
3. Update dependencies if needed
4. Build and test:
   ```bash
   npm install
   npm run build
   npm run preview
   ```
5. Deploy Edge Functions:
   ```bash
   supabase functions deploy make-server-8927474f --no-verify-jwt
   ```
6. Deploy frontend to your hosting platform
7. Test in production
8. Monitor logs for issues

### Database Backups

Supabase automatically backs up your database, but you can also:

1. Manual backup:
   - Go to **Database** → **Backups**
   - Click "Create backup"

2. Automated backups (Pro plan):
   - Daily backups retained for 7 days
   - Point-in-time recovery

3. Export data manually:
   ```sql
   -- Export all orders
   SELECT * FROM kv_store_8927474f WHERE key LIKE 'order:%';
   ```

---

## Security Best Practices

1. **Never commit secrets to Git**:
   - Keep `.env` files in `.gitignore`
   - Use environment variables for all sensitive data

2. **Use HTTPS everywhere**:
   - Enforce HTTPS on your domain
   - Use secure cookies

3. **Keep dependencies updated**:
   ```bash
   npm audit
   npm update
   ```

4. **Monitor for suspicious activity**:
   - Review auth logs regularly
   - Set up alerts for failed login attempts
   - Monitor file uploads for abuse

5. **Implement rate limiting**:
   - Supabase provides built-in rate limiting
   - Configure limits in Auth settings

6. **Regular security audits**:
   - Review RLS policies
   - Check admin user list
   - Audit storage bucket permissions

---

## Performance Optimization

1. **Enable Caching**:
   - Use CDN for static assets
   - Cache API responses where appropriate
   - Enable browser caching

2. **Optimize Images**:
   - Compress uploaded images
   - Use appropriate image formats
   - Implement lazy loading

3. **Database Optimization**:
   - Add indexes for frequently queried fields
   - Clean up old data regularly
   - Monitor query performance in Supabase

4. **Edge Function Optimization**:
   - Keep functions lightweight
   - Use connection pooling
   - Implement caching strategies

---

## Support and Resources

- **Supabase Documentation**: https://supabase.com/docs
- **Supabase Discord**: https://discord.supabase.com
- **Supabase Status**: https://status.supabase.com
- **GitHub Issues**: Create issues for bugs and feature requests

---

## Conclusion

You now have a fully deployed SheetCutters.com application! 

**Next Steps:**
1. Complete the post-deployment checklist
2. Create your admin account
3. Configure materials and pricing
4. Test all functionality thoroughly
5. Set up monitoring and alerts
6. Announce your launch! 🚀

For questions or issues, refer to the troubleshooting section or reach out to the development team.

---

**Last Updated**: November 2024
**Version**: 1.0
