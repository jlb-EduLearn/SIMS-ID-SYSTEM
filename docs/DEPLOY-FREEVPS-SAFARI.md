# FreeVPS in Safari — SIMS deploy checklist

Use this while **FreeVPS.edu.pl** is open in Safari. I can’t control your Safari tab from here; follow these steps in order.

## A. FreeVPS account & server (Safari)

1. Open **https://freevps.edu.pl/solutions/login**
   - No account? **Create account** → use your **`.edu` / `.ac`** email → verify inbox.
2. **Login** → top menu **Store** → **Browse All** or **Free VPS**.
3. Order **Academic / Free VPS** plan (100% discount at checkout if shown).
4. Choose **Windows Server 2022** (or Ubuntu 22.04 for Linux guide).
5. After deploy, note in the client area:
   - **Public IPv4**
   - **Administrator password** (Windows) or root password (Linux)

If you see **“NO Stock Left”**, try again later or pick another region/OS in Store.

## B. Prepare SIMS on your Mac

```bash
cd "/Users/jeffreybatucan/Documents/2026/ID SYSTEM"
npm run pack:vps
```

Upload **`sims-deploy.zip`** (~few MB) to the VPS:

- **Windows:** RDP → copy zip to `C:\` → Extract to `C:\sims`
- **Linux:** `scp sims-deploy.zip root@YOUR_IP:/var/www/` then unzip

## C. Windows Server 2022 (RDP)

1. Mac **Microsoft Remote Desktop** → PC `YOUR_VPS_IP` → user `Administrator`.
2. PowerShell **Run as administrator**:

```powershell
cd C:\sims
copy .env.production.example .env
notepad .env
```

Set:

```env
NEXTAUTH_URL="http://YOUR_VPS_IP:3000"
NEXTAUTH_SECRET="long-random-secret"
```

3. Install & run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\vps-install-windows.ps1
pm2 restart sims
```

4. FreeVPS firewall + Windows: allow **TCP 3000**.
5. Safari on Mac: **http://YOUR_VPS_IP:3000**

Full detail: [DEPLOY-FREEVPS-WINDOWS.md](./DEPLOY-FREEVPS-WINDOWS.md)

## D. Ubuntu (optional, often easier for Next.js)

SSH from Mac Terminal:

```bash
ssh root@YOUR_VPS_IP
cd /var/www/sims
cp .env.production.example .env
nano .env   # NEXTAUTH_URL=http://YOUR_VPS_IP
sudo bash scripts/vps-install.sh
```

Safari: **http://YOUR_VPS_IP** (port 80, no `:3000`).

Full detail: [DEPLOY-FREEVPS.md](./DEPLOY-FREEVPS.md)

## E. After it works

- Log in → change demo password.
- Back up `prisma/prod.db` and `public/uploads/`.

---

**Tell me where you are:** logged in / server IP / Windows vs Ubuntu — and we can do the next command together.
