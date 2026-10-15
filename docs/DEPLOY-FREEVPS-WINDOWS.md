# Deploy SIMS on FreeVPS — Windows Server 2022

Yes, you can run SIMS on **Windows Server 2022** from FreeVPS (RDP). Node.js, Next.js, Prisma, and SQLite all work on Windows. Linux is a bit lighter on RAM; on Windows, use **≥2 GB RAM** if possible.

**Linux guide:** [DEPLOY-FREEVPS.md](./DEPLOY-FREEVPS.md)

---

## 1. Create the VPS

1. [FreeVPS.edu.pl](https://freevps.edu.pl/) → verify student email.
2. Deploy instance → choose **Windows Server 2022** (not only “Windows RDP” lab image if you need Server).
3. Note **public IP**, **username** (often `Administrator`), and **password**.
4. Connect from Mac/PC:
   - **Microsoft Remote Desktop** → `YOUR_VPS_IP`
   - Or Windows: `mstsc`

Allow **RDP (3389)** in the FreeVPS panel firewall if the site does not connect.

---

## 2. Copy the project to the server

### Option A — ZIP from your Mac

On Mac:

```bash
cd "/Users/jeffreybatucan/Documents/2026/ID SYSTEM"
zip -r sims.zip . \
  -x "node_modules/*" -x ".next/*" -x "prisma/dev.db*" -x ".env"
```

Upload `sims.zip` via RDP (copy/paste or shared drive), extract to **`C:\sims`**.

### Option B — Git (if the repo is on GitHub)

In PowerShell on the server:

```powershell
winget install Git.Git --accept-package-agreements
git clone https://github.com/YOU/school-id-system.git C:\sims
```

---

## 3. Configure `.env`

In PowerShell:

```powershell
cd C:\sims
copy .env.production.example .env
notepad .env
```

For **direct access on port 3000** (simplest on Windows):

```env
DATABASE_URL="file:./prod.db"
NEXTAUTH_URL="http://YOUR_VPS_IP:3000"
NEXTAUTH_SECRET="paste-long-random-secret"
```

Generate a secret (PowerShell):

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Important:** `NEXTAUTH_URL` must match the browser exactly, including **`:3000`**.

---

## 4. Install and run (automated)

Open **PowerShell as Administrator**:

```powershell
cd C:\sims
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\vps-install-windows.ps1
```

Edit `.env` if needed, then:

```powershell
pm2 restart sims
```

Browse to **`http://YOUR_VPS_IP:3000`**.

Seed login: `admin@demo.org` / `password123` — change after deploy.

---

## 5. Manual steps (if you prefer)

```powershell
winget install OpenJS.NodeJS.LTS --accept-package-agreements
cd C:\sims
$env:NODE_OPTIONS="--max-old-space-size=2048"
npm ci
npm run db:setup
npm run build
npm install -g pm2
pm2 start npm --name sims -- start
pm2 save
```

Firewall:

```powershell
New-NetFirewallRule -DisplayName "SIMS" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

Also open **port 3000** in the FreeVPS control panel if traffic still does not reach the app.

---

## 6. Start SIMS after reboot

```powershell
npm install -g pm2-windows-startup
pm2-startup install
pm2 save
```

---

## 7. HTTPS and port 80 (optional, advanced)

On Windows, putting the app on **port 80 without `:3000`** usually means **IIS** with URL Rewrite + Application Request Routing (ARR) as a reverse proxy to `http://127.0.0.1:3000`, or a tool like **Caddy for Windows**.

Then set:

```env
NEXTAUTH_URL="http://YOUR_VPS_IP"
```

(or `https://your-domain` with a certificate)

For a school demo, **`http://IP:3000`** is enough.

---

## Troubleshooting

| Issue | What to try |
|--------|-------------|
| Login loops / auth errors | Fix `NEXTAUTH_URL` to match browser URL exactly. |
| Site unreachable | Windows Firewall + FreeVPS panel: allow **3000** (and **3389** for RDP). |
| `npm run build` fails / out of memory | `$env:NODE_OPTIONS="--max-old-space-size=2048"`; use a VPS with more RAM. |
| `node` not found after winget | Sign out of RDP and sign back in; open a new PowerShell. |
| PM2 not found | Close PowerShell, reopen as Admin; or use full path from `npm root -g`. |

---

## Backups

- Database: `C:\sims\prisma\prod.db`
- Uploads: `C:\sims\public\uploads`

Copy these off the server regularly.

---

## Linux vs Windows on FreeVPS

| | Linux (Ubuntu) | Windows Server 2022 |
|--|----------------|---------------------|
| Access | SSH | RDP |
| Public URL | `http://IP` (nginx :80) | `http://IP:3000` (typical) |
| RAM use | Lower idle usage | Higher (OS + GUI) |
| Best for | Always-on production | .NET shops, GUI comfort, school lab |

Both are supported for SIMS.
