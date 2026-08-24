# JotForm Tracker

Track every JotForm you've viewed: title, URL, notes, tags, and status.

## Local development (SQLite)

```bash
npm install
npm start
```

Opens at http://localhost:4173. Uses `server.js` + a local `jotforms.db` SQLite file — no setup required.

## Deploying to Vercel (Postgres)

The `api/` folder contains serverless functions that use `@vercel/postgres` instead of SQLite (Vercel functions have no persistent disk).

1. Push this repo to GitHub.
2. Go to https://vercel.com/new and import the repo.
3. After the project is created, open the project's **Storage** tab and add a **Postgres** database (free tier is fine) — Vercel automatically injects the required `POSTGRES_*` env vars into the project.
4. Redeploy (Vercel usually triggers this automatically after attaching storage). The `forms` table is created automatically on first request.
5. Your tracker is live at the assigned `*.vercel.app` URL. Update the bookmarklet from that page (it auto-detects its own origin).

No manual schema migration needed — `lib/schema.js` runs `CREATE TABLE IF NOT EXISTS` on first request.
