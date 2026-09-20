# Balaji Dairy Frontend

React/Vite client for milk collection, supplier ledgers, payments, reports, rate charts, backup/restore, and user management.

## Setup

```bash
cp .env.example .env.local
npm ci
npm run lint
npm test
npm run build
npm run dev
```

Set `VITE_API_URL` to the backend API root, including `/api`:

```env
VITE_API_URL=http://localhost:5001/api
```

For production, configure the same variable in Vercel and redeploy the project. Do not commit `.env` or `.env.local`.

## Android wrapper

This directory also contains a Capacitor Android wrapper in `android/`. Build the web app before syncing it:

```bash
npm run build
npx cap sync android
```
