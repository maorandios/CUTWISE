# Cutwise Landing Page

Marketing landing page for Cutwise, built with React, TypeScript, and Tailwind CSS.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **shadcn/ui** components
- **Shared components** from main app

## Development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`

## Build

```bash
npm run build
```

Outputs to `/dist` folder

## Deployment (Railway)

1. Create new service in Railway
2. Connect to GitHub repository
3. Set root directory: `/landing`
4. Railway auto-detects Dockerfile and builds
5. Configure custom domain: `www.cutwise.pro`

## Structure

```
landing/
├── src/
│   ├── App.tsx                          # Main landing page
│   ├── main.tsx                         # Entry point
│   ├── index.css                        # Global styles
│   ├── components/
│   │   ├── ui/                          # Shared UI components
│   │   ├── WasteOptimizationPreview.tsx # Feature preview
│   │   ├── NestingPreview.tsx           # Feature preview
│   │   ├── BOMPreview.tsx               # Feature preview
│   │   └── ModelViewerPreview.tsx       # Feature preview
│   └── lib/
│       └── utils.ts                     # Utility functions
├── Dockerfile                           # Production build
└── tailwind.config.js                   # Tailwind configuration
```

## Features

- Hero section with CTAs
- Video demo placeholder
- Advantages section
- Feature previews (using actual app components)
- Pricing plans
- FAQ accordion
- Contact form
- Footer

## Links to Main App

All CTAs link to:
- Sign Up: `https://app.cutwise.pro/signup`
- Sign In: `https://app.cutwise.pro/login`
