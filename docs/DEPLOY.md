# Sharing SIMS (local network & internet)

## 1. Same Wi‑Fi / office LAN (easiest)

Others on your network open the app using your Mac’s IP, not `localhost`.

1. Find your IP (System Settings → Network, or `ipconfig getifaddr en0`).
2. In `.env`, set (use your real IP):

   ```env
   NEXTAUTH_URL="http://192.168.0.108:3000"
   ```

3. Run:

   ```bash
   npm run dev:lan
   ```

4. On other devices: `http://192.168.0.108:3000` (same IP as in `NEXTAUTH_URL`).

5. Allow incoming connections if macOS asks, or check Firewall for Node.

For a more stable demo (after `npm run build`):

```bash
npm run build
npm run start:lan
```

---

## 2. Internet (temporary demo / remote staff)

Use a **tunnel** so you do not open router ports. Your laptop must stay on and running the app.

**Cloudflare Tunnel (free):**

```bash
brew install cloudflared   # if needed
npm run dev:lan
# new terminal:
cloudflared tunnel --url http://localhost:3000
```

Copy the `https://….trycloudflare.com` URL, set in `.env`:

```env
NEXTAUTH_URL="https://YOUR-TRYCLOUDFLARE-URL"
```

Restart the app. Share that HTTPS link.

**ngrok:** `ngrok http 3000` — same idea: set `NEXTAUTH_URL` to the ngrok URL and restart.

---

## 3. Real production (school always online)

**Student VPS (free):** [FreeVPS.edu.pl — Linux](./DEPLOY-FREEVPS.md) or [Windows Server 2022](./DEPLOY-FREEVPS-WINDOWS.md).

**Paid VPS (reliable):** [Contabo + Windows Server](./DEPLOY-CONTABO-WINDOWS.md) — good if you want RDP and no “out of stock” issues.

**Microsoft Azure (free trial / credits):** [DEPLOY-AZURE.md](./DEPLOY-AZURE.md) — VM (easiest) or App Service.

Use a **VPS** or **PaaS** (Railway, Render, Fly.io, DigitalOcean, etc.):

- `npm run build` && `npm run start` (or platform build command).
- **PostgreSQL** for `DATABASE_URL` (SQLite is fine for one machine only).
- Strong `NEXTAUTH_SECRET` (random, not the dev default).
- `NEXTAUTH_URL` = your public `https://your-domain.com`.
- HTTPS via the host or nginx + Let’s Encrypt.
- Uploads/logos: persistent disk or object storage if you add file hosting later.

---

## Auth note

Login (NextAuth) **requires** `NEXTAUTH_URL` to match exactly what users type in the browser (including `http` vs `https` and port).

## Database note

Current dev setup uses SQLite (`file:./dev.db`). Only one server process should use it. For many users or cloud hosting, migrate to PostgreSQL and run `prisma db push`.
