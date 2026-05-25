# Deployment Guide - NL-Manager

## Local Development Setup

### Prerequisites
- Node.js 18+ and pnpm
- MySQL 8.0+ or TiDB
- Manus OAuth credentials

### Step 1: Environment Configuration

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Update `.env.local` with your values:
```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/nl_manager

# Authentication
JWT_SECRET=your-super-secret-key-here

# Manus OAuth (get from https://manus.im/dashboard)
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://oauth.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# Optional: Manus APIs
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your-api-key
```

### Step 2: Database Setup

1. Create database:
```bash
mysql -u root -p -e "CREATE DATABASE nl_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

2. Run migrations:
```bash
pnpm db:push
```

### Step 3: Start Development Server

```bash
pnpm install
pnpm dev
```

Server will run on `http://localhost:3000`

---

## Production Deployment (Vercel)

### Prerequisites
- Vercel account
- GitHub repository connected
- MySQL/TiDB database (e.g., PlanetScale, AWS RDS)

### Step 1: Database Setup

1. Create a MySQL database on your hosting provider
2. Note the connection string (DATABASE_URL)
3. Run migrations in production:
```bash
DATABASE_URL="your-prod-url" pnpm db:push
```

### Step 2: Environment Variables

Set these in Vercel dashboard under **Settings → Environment Variables**:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `mysql://...` | Production database URL |
| `JWT_SECRET` | Random 32+ char string | Use `openssl rand -base64 32` |
| `VITE_APP_ID` | Your Manus app ID | From Manus dashboard |
| `OAUTH_SERVER_URL` | `https://oauth.manus.im` | Fixed value |
| `VITE_OAUTH_PORTAL_URL` | `https://portal.manus.im` | Fixed value |
| `BUILT_IN_FORGE_API_URL` | `https://api.manus.im` | Optional |
| `BUILT_IN_FORGE_API_KEY` | Your API key | Optional |
| `NODE_ENV` | `production` | Fixed value |

### Step 3: Build Configuration

Vercel should auto-detect the build command. If not, set:
- **Build Command:** `pnpm build`
- **Output Directory:** `dist`
- **Install Command:** `pnpm install`

### Step 4: Deploy

Push to GitHub and Vercel will auto-deploy:
```bash
git push origin main
```

Monitor deployment in Vercel dashboard.

---

## Troubleshooting

### Issue: "Missing required environment variables"
**Solution:** Check that all required env vars are set in `.env.local` (dev) or Vercel dashboard (prod)

### Issue: "Database connection failed"
**Solution:** 
1. Verify DATABASE_URL format: `mysql://user:password@host:port/database`
2. Test connection: `mysql -u user -p -h host -P port -D database`
3. Check firewall/security groups allow connection

### Issue: "OAuth callback not working"
**Solution:**
1. Verify `VITE_APP_ID` and `OAUTH_SERVER_URL` are correct
2. Check OAuth redirect URI in Manus dashboard includes your domain
3. Clear browser cookies and try again

### Issue: "tRPC endpoint not found (404)"
**Solution:**
1. Check server is running: `http://localhost:3000/api/trpc` should return error (not 404)
2. Verify build output includes `dist/index.js`
3. Check `NODE_ENV=production` is set

---

## Monitoring & Maintenance

### Database Backups
- Set up automated backups with your database provider
- Test restore procedures regularly

### Logs
- Development: Check terminal output
- Production (Vercel): View in Vercel dashboard → Deployments → Logs

### Performance
- Monitor database query performance
- Use Vercel Analytics for frontend metrics
- Check tRPC procedure execution times

---

## Scaling Considerations

### Database
- Use read replicas for high-traffic scenarios
- Implement query caching with Redis if needed
- Monitor connection pool limits

### Frontend Assets
- Images/videos should use S3 (see README.md)
- Enable CDN caching in Vercel

### API Rate Limiting
- Consider adding rate limiting middleware if needed
- Monitor OAuth token refresh rates
