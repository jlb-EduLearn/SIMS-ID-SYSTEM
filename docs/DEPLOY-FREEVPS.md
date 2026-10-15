# Deploy SIMS on [FreeVPS.edu.pl](https://freevps.edu.pl)

Guide for running SIMS on a free student VPS (Ubuntu recommended). You get a public IPv4, SSH as root, and full control—similar to DigitalOcean, but free after `.edu` verification.

**Using Windows Server 2022 instead?** See [DEPLOY-FREEVPS-WINDOWS.md](./DEPLOY-FREEVPS-WINDOWS.md) (RDP, port 3000, PowerShell install script).

## What you need

| Item | Notes |
|------|--------|
| FreeVPS account | Verify with institutional `.edu` / `.ac` email ([signup](https://freevps.edu.pl/)) |
| OS choice | **Ubuntu 22.04 or 24.04** (best for Node + nginx) |
| This project on the server | Git clone, or copy from your Mac with `rsync` (see below) |
| ~15 minutes | First deploy including `npm run build` |

**Specs:** Free tiers vary (often 1–2 vCPU, 512MB–2GB RAM). SIMS builds more reliably with **≥2 GB RAM**; if build fails with “JavaScript heap out of memory”, use the `NODE_OPTIONS` line in the install script.

---

## Part A — Get the VPS

1. Register at [freevps.edu.pl](https://freevps.edu.pl/) and verify your student email.
2. In the panel, create a VPS: **Ubuntu**, region closest to your school.
3. Note the **IPv4 address** and **root password** (or add your SSH key if the panel allows).
4. From your Mac:

   ```bash
   ssh root@YOUR_VPS_IP
   ```

5. Update the server:

   ```bash
   apt update && apt upgrade -y
   ```

---

## Part B — Copy SIMS to the server

### Option 1 — `rsync` from your Mac (no GitHub required)

On your Mac (project folder):

```bash
cd "/Users/jeffreybatucan/Documents/2026/ID SYSTEM"

rsync -avz --progress \
  --exclude node_modules \
  --exclude .next \
  --exclude prisma/dev.db \
  --exclude prisma/dev.db-journal \
  --exclude .env \
  ./ root@YOUR_VPS_IP:/var/www/sims/
```

Then on the VPS:

```bash
mkdir -p /var/www/sims
# (rsync creates files; if you used a subpath, adjust)
```

### Option 2 — GitHub / GitLab

Push the repo from your Mac, then on the VPS:

```bash
apt install -y git
git clone https://github.com/YOU/school-id-system.git /var/www/sims
```

---

## Part C — Configure environment

On the VPS:

```bash
cd /var/www/sims
cp .env.production.example .env
nano .env
```

Set at minimum:

```env
DATABASE_URL="file:./prod.db"
NEXTAUTH_URL="http://YOUR_VPS_IP"
NEXTAUTH_SECRET="paste-output-of-openssl-rand-base64-32"
```

Generate a secret:

```bash
openssl rand -base64 32
```

**Important:** `NEXTAUTH_URL` must match what users type in the browser—`http://` + IP, **no** `:3000` if you use nginx on port 80 (install script below).

---

## Part D — Automated install (nginx + PM2 + build)

On the VPS, from the app directory:

```bash
cd /var/www/sims
chmod +x scripts/vps-install.sh
PUBLIC_URL="http://YOUR_VPS_IP" sudo bash scripts/vps-install.sh
```

Then edit `.env` if you used placeholders, and restart:

```bash
sudo -u sims bash -lc 'cd /var/www/sims && pm2 restart sims'
```

Open **`http://YOUR_VPS_IP`** in a browser.

Default seed login (change after first login):

- **Email:** `admin@demo.org`
- **Password:** `password123`

---

## Part E — Manual install (if you prefer)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx
npm install -g pm2

cd /var/www/sims
export NODE_OPTIONS=--max-old-space-size=2048
npm ci
npm run db:setup
npm run build

sudo -u sims pm2 start npm --name sims -- start
sudo -u sims pm2 save
```

Configure nginx to proxy port 80 → `127.0.0.1:3000` (same block as in `scripts/vps-install.sh`).

---

## HTTPS and custom domain (optional)

If FreeVPS or your school gives you a hostname pointing to the VPS IP:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d sims.yourdomain.edu
```

Update `.env`:

```env
NEXTAUTH_URL="https://sims.yourdomain.edu"
```

Restart: `sudo -u sims pm2 restart sims`

---

## Updates after you change code

From your Mac (rsync again), then on VPS:

```bash
sudo -u sims bash -lc 'cd /var/www/sims && npm ci && npm run build && pm2 restart sims'
```

Database migrations: `npm run db:push` when `schema.prisma` changes.

---

## Uploads and data

- **SQLite** file: `prisma/prod.db` — back it up regularly (`scp` off the server).
- **Photos/logos:** `public/uploads/` — include in backups.
- Do **not** run two copies of the app against one SQLite file.

For heavy multi-school production later, switch `DATABASE_URL` to PostgreSQL and update `provider` in `prisma/schema.prisma`.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Login redirects fail | `NEXTAUTH_URL` must exactly match browser URL (http vs https, no wrong port). |
| 502 Bad Gateway | `pm2 status` — if sims is errored, `pm2 logs sims`. |
| Build OOM | `export NODE_OPTIONS=--max-old-space-size=2048` before `npm run build`. |
| Can’t reach site | `ufw status` — allow `Nginx Full`; check cloud firewall in FreeVPS panel if any. |
| Styles broken | Production uses `npm run build` + `npm start`, not dev mode. |

---

## Security checklist (school demo → real use)

1. Change demo passwords; create real school admin users.
2. Use a strong `NEXTAUTH_SECRET`.
3. Enable HTTPS when you have a domain.
4. SSH keys instead of root password; disable password SSH when comfortable.
5. Keep Ubuntu updated: `apt update && apt upgrade`.

---

## Related

- LAN / tunnel demo: [DEPLOY.md](./DEPLOY.md)
- Hardware agents (local PC): [HARDWARE.md](./HARDWARE.md) — not required on the VPS unless you run the agent there.
