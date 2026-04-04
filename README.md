# SmartFoot Retail 👟

A full-stack retail management system for footwear shops. Built with React + Express + SQLite.

## Features

- **Dashboard** — KPI cards, sales trend, brand mix, payment breakdown
- **Inventory** — Add/edit/delete products, low-stock alerts, search & filter
- **Billing / POS** — Product search, cart, discounts, invoice generation
- **Analytics** — Revenue trends, top products, size demand, profit margins
- **Invoices** — Full invoice history, void support, print-ready
- **Settings** — Shop profile, staff management

## Quick Start

```bash
# Install all dependencies + build frontend
npm run build

# Start server (serves both API + frontend)
npm start
```

Open http://localhost:5000

**Demo login:** Phone `9876543210` · Password `demo1234`

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Vite, Recharts, Zustand |
| Backend | Node.js, Express 4, JWT auth |
| Database | SQLite via sql.js (zero native deps) |
| Styling | Custom CSS (no UI framework) |

## Project Structure

```
smartfoot/
├── backend/
│   ├── src/
│   │   ├── server.js          # Express app entry
│   │   ├── database.js        # SQLite + seeding
│   │   ├── middleware/auth.js # JWT middleware
│   │   └── routes/
│   │       ├── auth.js
│   │       ├── inventory.js
│   │       ├── billing.js
│   │       ├── analytics.js
│   │       └── shop.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/             # Route-level components
│   │   ├── components/        # Sidebar, AppLayout
│   │   ├── services/api.ts    # Axios API client
│   │   ├── store/authStore.ts # Zustand auth state
│   │   └── utils/index.ts     # Formatters, helpers
│   └── package.json
├── render.yaml                # Render.com deploy config
├── railway.json               # Railway.app deploy config
├── Procfile                   # Heroku/Render Procfile
└── DEPLOY.md                  # Full deployment guide
```

## Deployment

See [DEPLOY.md](./DEPLOY.md) for full instructions including:
- Render.com (free tier, recommended)
- Railway.app
- VPS / self-hosted with PM2 + Nginx
- Separate Vercel (frontend) + Render (backend)
