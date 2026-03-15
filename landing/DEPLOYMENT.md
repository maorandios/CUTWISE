# Deploying Landing Page to Railway

## Prerequisites

- Railway account
- GitHub repository with landing page code

## Steps

### 1. Push to GitHub

```bash
cd c:\CUTWISE
git add landing/
git commit -m "Add landing page React app"
git push origin main
```

### 2. Create New Railway Service

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `CUTWISE` repository
5. Railway will detect the Dockerfile

### 3. Configure Service

1. **Root Directory**: Set to `/landing` in service settings
2. **Build Settings**: Railway auto-detects Dockerfile
3. **Port**: 80 (Nginx default)

### 4. Configure Custom Domain

1. In Railway service settings, go to "Domains"
2. Click "Add Custom Domain"
3. Enter: `www.cutwise.pro`
4. Railway will provide DNS records
5. Add these records to your domain registrar:
   - Type: `CNAME`
   - Name: `www`
   - Value: `<your-railway-domain>.up.railway.app`

### 5. Deploy

Railway automatically deploys when you push to GitHub. Monitor the build logs in Railway dashboard.

## Local Testing

```bash
cd landing
npm run dev
```

Opens at `http://localhost:5173`

## Production Build Test

```bash
cd landing
npm run build
npm run preview
```

## Environment Variables

No environment variables needed for landing page.

## Monitoring

- Railway provides automatic health checks
- Monitor logs in Railway dashboard
- Set up alerts for downtime

## Updates

To update the landing page:

1. Make changes in `/landing` directory
2. Test locally with `npm run dev`
3. Commit and push to GitHub
4. Railway automatically rebuilds and deploys
