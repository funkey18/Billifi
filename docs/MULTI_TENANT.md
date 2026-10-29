# Multi-tenant live deployment

This fork stores **all organisation data in SQLite** (`data/gst_multitenant.db`) with **hard tenant isolation**. JSON folders under `data/bills` etc. are no longer the source of truth.

## What changed

- **Tenants** — each signup creates an organisation (`tenants` table) and an owner user.
- **Auth** — register / login with email + password (bcrypt). JWT in httpOnly cookie + `Authorization: Bearer`.
- **API** — every `/api/*` data route (except public auth/health) requires a valid session and only reads/writes that tenant’s rows.
- **Public pages** — `/`, `/features`, `/about`, `/login`, `/register`.
- **App** — `/app` after login (same GST features as before).

## Run locally

```bash
npm install
npm run build
node server.js
```

Open http://localhost:47371

1. Create a workspace on **Register**
2. Use the app at **/app**

## Production env

Copy `.env.example` → `.env` and set:

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Long random secret (required) |
| `ALLOWED_ORIGINS` | Your https:// domain(s), comma-separated |
| `DATABASE_PATH` | Optional custom DB file path |
| `BACKUP_FOLDER` | Optional absolute folder for DB snapshots |

## Security checklist

- [ ] Set a strong `JWT_SECRET`
- [ ] Serve only over HTTPS
- [ ] Set `ALLOWED_ORIGINS` to your real domain
- [ ] Keep regular backups of `data/gst_multitenant.db`
- [ ] Do not share one login across unrelated companies — create one tenant each

## Backup

Daily snapshots under `data/backups/YYYY-MM-DD/` include:

- `gst_multitenant.db` — full database copy
- `<tenant-slug>.json` — per-tenant export

## Node version

Requires **Node.js 22.5+** (built-in `node:sqlite`).
