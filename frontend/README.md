# frontend/

React (Vite + JavaScript) web app that will let users explore harvest
predictions produced by the FastAPI backend.

```
frontend/
├── src/
│   ├── components/   # Reusable UI components
│   ├── pages/         # Top-level route/page components
│   ├── services/      # API client code (calls to the backend)
│   └── assets/        # Images, icons, static assets
├── public/            # Static files served as-is
├── package.json
├── vite.config.js
├── vercel.json         # Vercel deployment config
└── .env.example
```

## Status

Structure and config only — no pages or components yet. Vite scaffolding
(`npm create vite`) and the actual app entry point will be added in a
later phase.

## Local development (once scaffolded)

```bash
cd frontend
npm install
npm run dev
```

## Deployment

Deployed to [Vercel](https://vercel.com) using `vercel.json`.
