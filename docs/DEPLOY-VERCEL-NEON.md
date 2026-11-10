# Deploy SIMS on Vercel + Neon + GitHub

## Stack

| Piece | Service |
|-------|---------|
| App hosting | [Vercel](https://vercel.com) (from GitHub) |
| Database | [Neon](https://neon.tech) PostgreSQL |
| Photos / logos | Cloudinary (already in the app) |
| Source | GitHub `main` |

SQLite is **not** used in production. Prisma is configured for PostgreSQL.

## 1. Neon database

1. Create a project (e.g. `sims-id-system`).
2. Copy two connection strings from the Neon console:
   - **Pooled** → `DATABASE_URL` (has `-pooler` in the host; good for Vercel serverless)
   - **Direct** → `DIRECT_URL` (no pooler; used for `prisma db push` / migrations)
3. Both strings should include `sslmode=require`.

Locally you can put the same values in `.env` (keep SQLite only if you maintain a separate branch — this repo expects Postgres).

## 2. GitHub

Push `main` to your GitHub repo (already: `jlb-EduLearn/SIMS-ID-SYSTEM`).

## 3. Vercel project

1. [vercel.com/new](https://vercel.com/new) → Import the GitHub repo.
2. Framework: **Next.js** (auto-detected).
3. Build command (also in `vercel.json`):

   ```bash
   prisma generate && prisma db push --skip-generate && next build
   ```

4. Add environment variables:

   | Key | Value |
   |-----|--------|
   | `DATABASE_URL` | Neon **pooled** connection string |
   | `DIRECT_URL` | Neon **direct** connection string |
   | `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
   | `NEXTAUTH_URL` | `https://sims-id-system-drab.vercel.app` (update if you add a custom domain) |
   | `CLOUDINARY_CLOUD_NAME` | your cloud name |
   | `CLOUDINARY_API_KEY` | your API key |
   | `CLOUDINARY_API_SECRET` | your API secret |
   | `CLOUDINARY_FOLDER` | `assets/SIMS` |

5. Deploy. After the first successful deploy, open the site and seed once if the DB is empty:

   ```bash
   # with Neon URLs in .env
   npx tsx prisma/seed.ts
   ```

   Or use demo login only after seeding: `admin@demo.org` / `password123`.

## 4. After deploy

- Dashboard: `/login`
- Scanner station: `/scanner`
- Set `NEXTAUTH_URL` exactly to the URL users open (no trailing slash).
- Re-deploy from GitHub when `main` changes (Vercel auto-deploys).

## Notes

- `prisma db push` on each build keeps the schema in sync on free/small projects. For heavier production later, switch to `prisma migrate deploy`.
- Free Neon/Vercel tiers may sleep or have limits — fine for demos and small schools.
- Render SQLite docs remain for the old host path; prefer this guide for cloud hosting.
