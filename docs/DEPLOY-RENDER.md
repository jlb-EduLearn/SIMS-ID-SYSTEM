# Deploy SIMS to Render (Free)

## Live settings

- **Build command:** `npm install && npx prisma generate && npm run build`
- **Start command:** `node scripts/start-render.mjs`
- **Node:** 20.x

## Environment variables

| Key | Value |
|-----|--------|
| `DATABASE_URL` | `file:./prod.db` |
| `NEXTAUTH_SECRET` | random secret (Render can generate) |
| `NEXTAUTH_URL` | your Render URL, e.g. `https://sims-id-system-xxxx.onrender.com` |

`start-render.mjs` also falls back to `RENDER_EXTERNAL_URL` if `NEXTAUTH_URL` is unset.

## Demo login

- Email: `admin@demo.org`
- Password: `password123`

## Notes

- Free instances sleep after inactivity (first request can be slow).
- SQLite on free disk is wiped on some redeploys; the start script re-seeds when empty.
