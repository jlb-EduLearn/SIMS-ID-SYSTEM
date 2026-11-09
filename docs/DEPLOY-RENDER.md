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
| `CLOUDINARY_CLOUD_NAME` | your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | your Cloudinary API key |
| `CLOUDINARY_API_SECRET` | your Cloudinary API secret |
| `CLOUDINARY_FOLDER` | `assets/SIMS` |

`start-render.mjs` also falls back to `RENDER_EXTERNAL_URL` if `NEXTAUTH_URL` is unset.

When Cloudinary env vars are set, photo/logo/template uploads go to Cloudinary instead of ephemeral disk.

## Demo login

- Email: `admin@demo.org`
- Password: `password123`

## Notes

- Free instances sleep after inactivity (first request can be slow).
- SQLite on free disk is wiped on some redeploys; the start script re-seeds when empty.
