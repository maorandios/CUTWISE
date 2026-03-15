# Landing Page Setup Complete

## What Was Built

A separate React app in `/landing` directory that:
- Uses the **exact same components** as your main app
- Matches your app's design system perfectly (colors, fonts, shadows, spacing)
- Reuses all 4 feature preview cards from the login screen
- Completely independent from the main app

## Structure

```
landing/
├── src/
│   ├── App.tsx                          # Landing page (Hero, Features, Pricing, FAQ, Contact)
│   ├── components/
│   │   ├── ui/                          # Shared UI (Button, Card)
│   │   ├── WasteOptimizationPreview.tsx # Copied from main app
│   │   ├── NestingPreview.tsx           # Copied from main app
│   │   ├── BOMPreview.tsx               # Copied from main app
│   │   └── ModelViewerPreview.tsx       # Copied from main app
│   └── lib/
│       └── utils.ts                     # Utility functions
├── Dockerfile                           # Production build
├── tailwind.config.js                   # Same as main app
└── package.json                         # Dependencies
```

## Local Development

```bash
cd landing
npm run dev
```

Opens at: `http://localhost:5173/`

## Production Build

```bash
cd landing
npm run build
```

Creates optimized build in `/dist` folder

## Deployment to Railway

See `DEPLOYMENT.md` for detailed steps.

**Quick version:**
1. Push to GitHub
2. Create new Railway service
3. Set root directory: `/landing`
4. Railway auto-detects Dockerfile
5. Configure custom domain: `www.cutwise.pro`

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (same config as main app)
- shadcn/ui components
- Recharts (for feature previews)

## Sections Included

1. **Header** - Navigation with Sign In/Try Free buttons
2. **Hero** - Main headline with CTAs
3. **Video** - Demo video placeholder
4. **Advantages** - 3 benefit cards
5. **Features** - 4 interactive preview cards (from login screen)
6. **Pricing** - 3 pricing tiers
7. **FAQ** - Accordion with 5 questions
8. **Contact** - Contact form + info
9. **Footer** - Links and copyright

## Links to Main App

All CTAs link to production app:
- Sign Up: `https://app.cutwise.pro/signup`
- Sign In: `https://app.cutwise.pro/login`

## Editing

Since this uses the same components as your main app:
- Edit `src/App.tsx` for content/layout changes
- Components in `src/components/` are copies (won't auto-sync with main app)
- To update a component: copy from `../web/src/components/` again
- Styles automatically match main app via shared Tailwind config
