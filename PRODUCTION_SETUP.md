# Production Setup Guide

This guide covers the steps needed to configure the application for production deployment.

## 1. Supabase Configuration

### Email Authentication Redirect URLs

The email verification links need to redirect to your production URL instead of localhost.

**Steps:**

1. Go to [Supabase Dashboard](https://app.supabase.com/project/sokzvznufhmlscccyebf)
2. Navigate to **Authentication** → **URL Configuration**
3. Update the following settings:

   **Site URL:**
   ```
   https://your-production-domain.railway.app
   ```
   Or if using custom domain:
   ```
   https://app.cutwise.app
   ```

   **Redirect URLs (add all of these):**
   ```
   https://your-production-domain.railway.app/*
   https://your-production-domain.railway.app
   https://app.cutwise.app/*
   https://app.cutwise.app
   http://localhost:5180/*  (for local development)
   ```

4. Click **Save**

### Email Templates

In **Authentication** → **Email Templates**, ensure the confirmation email uses:
```
{{ .ConfirmationURL }}
```
This will automatically use the Site URL you configured above.

## 2. Railway Environment Variables

Ensure these environment variables are set in your Railway project:

### Frontend Variables (built into the app at build time):
```
VITE_SUPABASE_URL=https://sokzvznufhmlscccyebf.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id
```

### Backend Variables:
```
SUPABASE_URL=https://sokzvznufhmlscccyebf.supabase.co
SUPABASE_SERVICE_KEY=your_service_key_here
SUPABASE_JWT_SECRET=your_jwt_secret_here
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox  (or "live" for production)
RAILWAY_ENVIRONMENT=production
```

**Important:** The `RAILWAY_ENVIRONMENT` variable is automatically set by Railway and is used to enable production CORS settings.

## 3. PayPal Configuration

### For Sandbox Testing:
- Use the sandbox credentials from PayPal Developer Dashboard
- Set `PAYPAL_MODE=sandbox`

### For Production:
1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Switch to **Live** mode
3. Create a new Live App
4. Get the Live Client ID and Secret
5. Update Railway environment variables:
   ```
   PAYPAL_CLIENT_ID=your_live_client_id
   PAYPAL_CLIENT_SECRET=your_live_client_secret
   PAYPAL_MODE=live
   ```

## 4. Domain Configuration

### Current Setup:
- Railway provides a default domain: `your-app-name.up.railway.app`
- Both frontend and backend run on the same domain (backend serves frontend static files)

### Custom Domain (Optional):
If you want to use `app.cutwise.app`:

1. In Railway dashboard, go to **Settings** → **Domains**
2. Click **Add Custom Domain**
3. Enter `app.cutwise.app`
4. Add the CNAME record to your DNS provider as instructed by Railway
5. Update Supabase redirect URLs to include the custom domain

## 5. Testing Production Deployment

After configuration:

1. **Test Email Verification:**
   - Sign up with a new email
   - Check that verification link redirects to production URL (not localhost)
   - Verify that user lands on the dashboard after clicking the link

2. **Test Payment Flow:**
   - Try purchasing credits
   - Verify PayPal redirects work correctly
   - Check that credits are added after successful payment

3. **Test PDF Exports:**
   - Upload a project
   - Generate BOM and Cutting Plan PDFs
   - Verify company details are correct in the PDFs

## 6. Troubleshooting

### Email links still go to localhost:
- Double-check Supabase Site URL setting
- Clear browser cache
- Try in incognito mode

### PayPal payment fails:
- Check that `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are set in Railway
- Verify `PAYPAL_MODE` matches your credentials (sandbox vs live)
- Check Railway logs for authentication errors

### CORS errors:
- Ensure `RAILWAY_ENVIRONMENT` is set (Railway sets this automatically)
- Check that frontend is being served from the same domain as backend

## 7. Build Process

The Dockerfile handles the complete build:
1. Installs Python dependencies
2. Installs Playwright for PDF generation
3. Installs Node.js and builds the frontend
4. Serves both frontend (static files) and backend (API) from the same process

Railway automatically rebuilds when you push to the `main` branch.
