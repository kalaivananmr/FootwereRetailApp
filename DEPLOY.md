# SmartFoot Retail — Deployment Guide

## Demo Credentials
- **Phone:** 9876543210
- **Password:** demo1234

---

## Option 1: Render.com (Recommended — Free Tier)

Render hosts the backend + frontend as a single service with a persistent disk for the SQLite database.

### Steps

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/smartfoot-retail.git
   git push -u origin main
   ```

2. **Create Render account** at https://render.com

3. **New Web Service → Connect GitHub repo**

4. **Configure:**
   | Field | Value |
   |-------|-------|
   | Build Command | `npm install --prefix backend && npm install --prefix frontend && npm run build --prefix frontend` |
   | Start Command | `node backend/src/server.js` |
   | Node version | 18 |

5. **Environment Variables (Render dashboard → Environment):**
   ```
   NODE_ENV=production
   PORT=10000
   JWT_SECRET=<click "Generate" for a random value>
   DB_PATH=/var/data/smartfoot.db
   ```

6. **Add a Disk (Render dashboard → Disks):**
   - Name: `smartfoot-data`
   - Mount Path: `/var/data`
   - Size: 1 GB

7. **Deploy** — Render will build and start automatically.

8. Your app will be live at `https://smartfoot-retail.onrender.com`

> **Note:** Free tier spins down after 15 min of inactivity. First request after sleep takes ~30s. Upgrade to Starter ($7/mo) for always-on.

---

## Option 2: Railway.app

Railway gives $5 free credit/month and keeps services always-on.

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Deploy:
   ```bash
   cd smartfoot-retail
   railway init
   railway up
   ```
4. Set environment variables in Railway dashboard:
   ```
   NODE_ENV=production
   JWT_SECRET=your_random_secret_here
   DB_PATH=/app/data/smartfoot.db
   ```
5. Add a volume mount at `/app/data` for database persistence.

---

## Option 3: Local / Self-Hosted (VPS, DigitalOcean, etc.)

### Prerequisites
- Node.js 18+
- PM2 (process manager): `npm install -g pm2`

### Steps

```bash
# 1. Clone / upload files to server
git clone https://github.com/YOUR_USERNAME/smartfoot-retail.git
cd smartfoot-retail

# 2. Install dependencies and build frontend
npm run build

# 3. Create production .env
cat > backend/.env << 'ENV'
NODE_ENV=production
PORT=5000
JWT_SECRET=your_very_long_random_secret_here_change_this
DB_PATH=/home/ubuntu/smartfoot-data/smartfoot.db
ENV

mkdir -p /home/ubuntu/smartfoot-data

# 4. Start with PM2
pm2 start backend/src/server.js --name smartfoot
pm2 save
pm2 startup

# 5. (Optional) Nginx reverse proxy
sudo apt install nginx
```

**Nginx config** (`/etc/nginx/sites-available/smartfoot`):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/smartfoot /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Add SSL with Certbot: `sudo certbot --nginx -d your-domain.com`

---

## Option 4: Separate Frontend (Vercel) + Backend (Render)

For best performance, host frontend on Vercel CDN and backend on Render.

### Backend on Render
Follow Option 1 above. Note your backend URL (e.g. `https://smartfoot-api.onrender.com`).

### Frontend on Vercel

1. Create `frontend/.env.production`:
   ```
   VITE_API_URL=https://smartfoot-api.onrender.com/api
   ```

2. Rebuild frontend:
   ```bash
   cd frontend && npm run build
   ```

3. Deploy to Vercel:
   ```bash
   npm install -g vercel
   cd frontend
   vercel --prod
   ```

4. Set environment variable in Vercel dashboard:
   ```
   VITE_API_URL=https://smartfoot-api.onrender.com/api
   ```

5. Update backend CORS (in `backend/.env`):
   ```
   CORS_ORIGIN=https://your-app.vercel.app
   ```

---

## Local Development

```bash
# Terminal 1 — Backend
cd backend
npm install
node src/server.js
# API running at http://localhost:5000

# Terminal 2 — Frontend (with hot reload)
cd frontend
npm install
npm run dev
# App running at http://localhost:3000
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with phone + password |
| POST | `/api/auth/register` | Register new shop |
| GET | `/api/inventory` | List products (search, brand, low_stock) |
| POST | `/api/inventory` | Add product (auto-merges duplicates) |
| PUT | `/api/inventory/:id` | Update product |
| DELETE | `/api/inventory/:id` | Delete product |
| GET | `/api/billing` | List invoices |
| POST | `/api/billing` | Create invoice (deducts stock) |
| DELETE | `/api/billing/:id` | Void invoice (restores stock) |
| GET | `/api/analytics/summary?period=month` | KPI summary |
| GET | `/api/analytics/trend?period=month` | Sales trend |
| GET | `/api/analytics/top-products` | Top selling products |
| GET | `/api/analytics/brands` | Revenue by brand |
| GET | `/api/analytics/sizes` | Size demand |
| GET | `/api/analytics/payments` | Payment mode breakdown |
| GET | `/api/analytics/dead-stock` | Unsold inventory |
| GET | `/api/shop` | Shop profile |
| PUT | `/api/shop` | Update shop profile |

All routes except `/api/auth/login` and `/api/auth/register` require `Authorization: Bearer <token>` header.

---

## Data Model

The app uses SQLite (via sql.js). The database file is at `DB_PATH`.

**Tables:** `shops`, `users`, `products`, `invoices`, `invoice_items`

On first startup, 90 days of demo data is automatically seeded.

---

## Resetting Demo Data

To wipe and re-seed:
```bash
rm /path/to/smartfoot.db
# Restart the server — it will auto-seed fresh data
```

---

## Security Checklist for Production

- [ ] Change `JWT_SECRET` to a long random string (32+ chars)
- [ ] Set `CORS_ORIGIN` to your exact frontend domain
- [ ] Use HTTPS (Render provides this automatically)
- [ ] Set up regular database backups (download the `.db` file)
- [ ] Change default demo password after first login
