# Deploy SIMS to Render

## Why data disappeared before

On the **Free** plan, Render gives the app temporary disk. Every redeploy/restart can wipe `prod.db`, then the start script sees an empty database and seeds demo data again — so users, students, and templates look “deleted.”

## Keep your data (required)

Use a **persistent disk** (Starter plan or higher):

1. Attach a disk mounted at `/var/data` (see `render.yaml`)
2. Set `DATABASE_URL` to `file:/var/data/prod.db`
3. Redeploy once

After that, redeploys keep the same SQLite file. Seed runs **only** when the database has zero users.

Photos/logos already stay on Cloudinary when those env vars are set.

## Live settings

- **Build command:** `npm install && npx prisma generate && npm run build`
- **Start command:** `node scripts/start-render.mjs`
- **Node:** 20.x
- **Disk:** `/var/data` (1 GB+)
- **Plan:** Starter (or higher) for the disk

## Environment variables

| Key | Value |
|-----|--------|
| `DATABASE_URL` | `file:/var/data/prod.db` |
| `NEXTAUTH_SECRET` | random secret (Render can generate) |
| `NEXTAUTH_URL` | your Render URL, e.g. `https://sims-id-system.onrender.com` |
| `CLOUDINARY_CLOUD_NAME` | your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | your Cloudinary API key |
| `CLOUDINARY_API_SECRET` | your Cloudinary API secret |
| `CLOUDINARY_FOLDER` | `assets/SIMS` |

`start-render.mjs` also falls back to `RENDER_EXTERNAL_URL` if `NEXTAUTH_URL` is unset.

## Demo login (only after a fresh empty DB seed)

- Email: `admin@demo.org`
- Password: `password123`
- Scanner page: `/scanner` (create Scanner users under School Users)

## Notes

- Free instances sleep after inactivity and **cannot keep SQLite across deploys**.
- After enabling the disk, recreate your real school data once — it will then persist.
