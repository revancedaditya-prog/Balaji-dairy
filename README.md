# Balaji Dairy Management

Milk collection, supplier ledger, payments, rate chart, reports, backup/restore, and role-based user management.

## Requirements

- Node.js 20.19 or newer
- MongoDB Atlas replica set (transactions are used for safe backup restore)

## Local setup

### Backend

```bash
cd backend
cp .env.example .env
npm ci
npm test
npm start
```

Set a unique `JWT_SECRET` with at least 32 characters. Never commit `.env` files.

To create/update the initial owner and rate chart, configure the `SEED_OWNER_*` variables and run:

```bash
npm run seed
```

The seed is non-destructive. Demo suppliers are added only when `SEED_DEMO_DATA=true`.

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm ci
npm run lint
npm test
npm run build
npm run dev
```

`VITE_API_URL` must include the backend `/api` suffix.

## Production configuration

Backend environment variables:

- `NODE_ENV=production`
- `MONGODB_URI`
- `JWT_SECRET` (at least 32 characters)
- `CORS_ORIGINS` (comma-separated exact frontend origins)

Frontend environment variable:

- `VITE_API_URL=https://YOUR-BACKEND-DOMAIN/api`

After changing a Vercel frontend variable, redeploy so Vite can embed it in the build.

## Clients

- `frontend/`: React web application and Capacitor Android wrapper
- `android-app/`: separate native Jetpack Compose client

The two Android clients are independent; choose one as the release client before publishing to avoid maintaining the same workflow twice.
