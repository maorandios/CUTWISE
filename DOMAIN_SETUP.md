# Domain Setup Guide: app.cutwise.app

This guide walks you through setting up your custom domain `app.cutwise.app` for the Cutwise application.

## Overview

- **Domain:** cutwise.app (purchased from GoDaddy)
- **App Subdomain:** app.cutwise.app
- **Hosting:** Railway

## Step 1: Configure Railway Custom Domain

### 1.1 Add Custom Domain in Railway

1. Go to your Railway dashboard: https://railway.app/dashboard
2. Select your Cutwise project
3. Click on your service (the one running the Dockerfile)
4. Go to **Settings** tab
5. Scroll down to **Domains** section
6. Click **+ Add Domain**
7. Select **Custom Domain**
8. Enter: `app.cutwise.app`
9. Click **Add Domain**

### 1.2 Get Railway DNS Records

Railway will provide you with DNS records. You'll see something like:

**CNAME Record:**
```
Type: CNAME
Name: app
Value: your-service.up.railway.app
```

Or it might provide an **A Record** and **AAAA Record** instead.

**Important:** Copy these DNS records - you'll need them for GoDaddy configuration.

## Step 2: Configure DNS in GoDaddy

### 2.1 Access GoDaddy DNS Management

1. Go to [GoDaddy](https://www.godaddy.com/)
2. Sign in to your account
3. Click on your profile icon → **My Products**
4. Find `cutwise.app` and click **DNS**

### 2.2 Add DNS Records

**If Railway gave you a CNAME record:**

1. Click **Add** button
2. Select **CNAME** from the Type dropdown
3. Fill in:
   - **Name:** `app`
   - **Value:** `your-service.up.railway.app` (from Railway)
   - **TTL:** 600 seconds (or default)
4. Click **Save**

**If Railway gave you A/AAAA records:**

1. Add A Record:
   - Type: **A**
   - Name: `app`
   - Value: `[IPv4 address from Railway]`
   - TTL: 600 seconds

2. Add AAAA Record (if provided):
   - Type: **AAAA**
   - Name: `app`
   - Value: `[IPv6 address from Railway]`
   - TTL: 600 seconds

### 2.3 DNS Propagation

- DNS changes can take 5-60 minutes to propagate
- You can check propagation status at: https://dnschecker.org/
- Enter `app.cutwise.app` and check if it resolves to Railway's IP

## Step 3: Update Supabase Configuration

Once your domain is working, update Supabase to use it:

### 3.1 Update Authentication URLs

1. Go to [Supabase Dashboard](https://app.supabase.com/project/sokzvznufhmlscccyebf)
2. Navigate to **Authentication** → **URL Configuration**
3. Update:

   **Site URL:**
   ```
   https://app.cutwise.app
   ```

   **Redirect URLs (add all):**
   ```
   https://app.cutwise.app/*
   https://app.cutwise.app
   http://localhost:5180/*
   http://localhost:5180
   ```

4. Click **Save**

### 3.2 Update Email Templates

In **Authentication** → **Email Templates**:
- The confirmation email should use `{{ .ConfirmationURL }}`
- This will automatically redirect to `https://app.cutwise.app`

## Step 4: Update PayPal Configuration (Optional)

If you're using PayPal in production mode:

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Go to your Live App settings
3. Update **Return URL** to: `https://app.cutwise.app`

## Step 5: Test Everything

After DNS propagates and Supabase is configured:

### 5.1 Test Domain Access
- Visit `https://app.cutwise.app`
- Verify the app loads correctly
- Check browser console for any CORS errors

### 5.2 Test Authentication
- Sign up with a new email
- Check verification email
- Click the verification link
- Verify it redirects to `https://app.cutwise.app` (not localhost)
- Confirm you land on the dashboard

### 5.3 Test Payment Flow
- Try purchasing credits
- Verify PayPal integration works
- Check credits are added successfully

### 5.4 Test PDF Exports
- Upload an IFC file
- Generate BOM and Cutting Plan PDFs
- Verify company details are correct

## Step 6: Optional - Set up www.cutwise.app for Landing Page

If you want a separate landing page on `www.cutwise.app`:

### Option A: Redirect to App
Add a CNAME or redirect rule in GoDaddy:
- `www.cutwise.app` → `app.cutwise.app`

### Option B: Separate Landing Page
- Deploy a separate static landing page (Vercel, Netlify, etc.)
- Point `www` CNAME to that service

## Troubleshooting

### Domain not resolving:
- Wait for DNS propagation (up to 60 minutes)
- Check DNS with: `nslookup app.cutwise.app`
- Verify CNAME/A record is correct in GoDaddy

### SSL Certificate Issues:
- Railway automatically provisions SSL certificates
- Can take 5-10 minutes after DNS propagates
- Check Railway logs for certificate provisioning status

### Email still redirects to localhost:
- Verify Supabase Site URL is set to `https://app.cutwise.app`
- Clear browser cache and cookies
- Try in incognito mode
- Wait a few minutes for Supabase config to propagate

### CORS Errors:
- Ensure Railway environment variable `RAILWAY_ENVIRONMENT` is set
- Backend CORS is configured to allow all origins in production
- Check Railway logs for any CORS-related errors

## Summary Checklist

- [ ] Add custom domain `app.cutwise.app` in Railway
- [ ] Copy DNS records from Railway
- [ ] Add CNAME/A records in GoDaddy DNS
- [ ] Wait for DNS propagation (check with dnschecker.org)
- [ ] Update Supabase Site URL to `https://app.cutwise.app`
- [ ] Add `https://app.cutwise.app/*` to Supabase Redirect URLs
- [ ] Test domain access
- [ ] Test email verification flow
- [ ] Test payment flow
- [ ] Test PDF exports

## Need Help?

- Railway Docs: https://docs.railway.app/guides/public-networking#custom-domains
- GoDaddy DNS Help: https://www.godaddy.com/help/add-a-cname-record-19236
- Supabase Auth Docs: https://supabase.com/docs/guides/auth/redirect-urls
