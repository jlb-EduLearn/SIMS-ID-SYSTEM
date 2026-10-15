# Deploy SIMS on Contabo (Windows Server)

SIMS (Next.js + Node + SQLite) runs fine on **Contabo Windows VPS**. You use **Remote Desktop** like a normal Windows PC—good if you prefer Windows over SSH/Linux.

## What to order (recommended)

| Choice | Why |
|--------|-----|
| **Cloud VPS 4 + Windows Server** | **4 vCPU, 8 GB RAM** — enough for `npm run build` and daily school use. |
| **OS** | **Windows Server 2022** (or latest offered in panel). |
| **Region** | Closest to your users (e.g. **Singapore** for PH, **US** or **EU** if most staff are there). |
| **Storage** | Default 100 GB SSD is plenty for SIMS + uploads. |

Smaller RAM plans can fail during `npm run build`. Avoid the smallest tier unless you build on your Mac and copy `.next` (not recommended).

**Cost:** Contabo charges **VPS + Windows license** monthly (see [Contabo Windows VPS pricing](https://contabo.com/en/windows-servers-vps/)). Linux-only VPS is cheaper; Windows is worth it if RDP/GUI is what you want.

**Not allowed on Contabo VPS:** crypto mining (see their terms). Normal school web app is fine.

---

## Setup overview

1. Order VPS → wait for email with **IP**, **Administrator password**, panel login.
2. **Contabo control panel** → Firewall → allow **3389** (RDP) and **3000** (SIMS), or **80/443** later if you add IIS/reverse proxy.
3. Mac **Microsoft Remote Desktop** → connect to `YOUR_IP`.
4. Copy **`sims-deploy.zip`** to `C:\sims` (from Mac: `npm run pack:vps` in project folder).
5. Configure `.env` and run install script (same as FreeVPS Windows).

---

## On the server (PowerShell as Administrator)

```powershell
cd C:\sims
copy .env.production.example .env
notepad .env
```

```env
DATABASE_URL="file:./prod.db"
NEXTAUTH_URL="http://YOUR_CONTABO_IP:3000"
NEXTAUTH_SECRET="paste-from-openssl-or-powershell-random"
```

Generate secret (PowerShell):

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Install and start:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\vps-install-windows.ps1
pm2 restart sims
```

Open in a browser: **`http://YOUR_CONTABO_IP:3000`**

Default seed login: `admin@demo.org` / `password123` — **change immediately**.

---

## Contabo-specific tips

- **Snapshots:** Take one in the panel after SIMS works (easy rollback).
- **Firewall:** Contabo network firewall + Windows Firewall both need **TCP 3000** open for public access.
- **HTTPS:** Add a domain → point A record to VPS IP → use IIS + win-acme, or Caddy on Windows; set `NEXTAUTH_URL=https://your-domain`.
- **Backups:** Copy `C:\sims\prisma\prod.db` and `C:\sims\public\uploads` off the server regularly.
- **Updates:** `cd C:\sims` → upload new zip or git pull → `npm ci` → `npm run build` → `pm2 restart sims`.

---

## Linux on Contabo (optional, cheaper)

Same VPS size, **Ubuntu 22.04**, no Windows license fee → use [DEPLOY-FREEVPS.md](./DEPLOY-FREEVPS.md) steps with `scripts/vps-install.sh` (Contabo = any VPS).

---

## Mac: prepare upload package

```bash
cd "/Users/jeffreybatucan/Documents/2026/ID SYSTEM"
npm run pack:vps
```

Upload `sims-deploy.zip` via RDP to the Contabo server.

Related: [DEPLOY-FREEVPS-WINDOWS.md](./DEPLOY-FREEVPS-WINDOWS.md) (same Windows commands).
