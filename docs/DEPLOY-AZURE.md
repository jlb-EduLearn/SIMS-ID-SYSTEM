# Deploy SIMS on Microsoft Azure (free trial / credits)

**Yes**, you can run SIMS on Azure. The app is **Node.js + Next.js** — Azure supports that on **VMs** and **App Service**.

SIMS today uses **SQLite** (one file). That works well on a **VM** with a persistent disk. On **App Service**, SQLite is only OK for a **short demo** (single instance, no scale-out); for a real trial you’ll outgrow it → use **Azure Database for PostgreSQL**.

---

## What you need in Azure

| Variable | Example |
|----------|---------|
| `NEXTAUTH_URL` | `https://your-app.azurewebsites.net` or `http://YOUR_VM_IP:3000` |
| `NEXTAUTH_SECRET` | Long random string |
| `DATABASE_URL` | `file:./prod.db` (VM) or Postgres connection string (App Service) |
| `PORT` | App Service sets this automatically; VM uses `3000` |

Generate a secret (Mac):

```bash
openssl rand -base64 32
```

---

## Option A — Azure VM (recommended for Azure trial + your project)

Same idea as Contabo/FreeVPS: one machine, full control, **SQLite OK**.

1. [Create an Azure free account](https://azure.microsoft.com/free/) (trial credits / eligible free services — check current Azure terms in your region).
2. Portal → **Virtual machines** → **Create**.
3. **Image:** **Windows Server 2022** (RDP) or **Ubuntu 22.04** (SSH).
4. **Size:** at least **2 vCPU, 4–8 GB RAM** (e.g. **Standard B2s** or **B2ms**) so `npm run build` succeeds.
5. **Networking:** allow **3389** (Windows RDP) or **22** (SSH); later **3000** (app) or **80/443** (nginx).
6. Copy SIMS to the VM (`sims-deploy.zip` from `npm run pack:vps` on your Mac).

**Windows VM:** follow [DEPLOY-CONTABO-WINDOWS.md](./DEPLOY-CONTABO-WINDOWS.md) (same PowerShell steps).

**Linux VM:** follow [DEPLOY-FREEVPS.md](./DEPLOY-FREEVPS.md) (`scripts/vps-install.sh`).

**Azure-specific:** set `NEXTAUTH_URL` to `http://PUBLIC_IP:3000` (Windows) or `http://PUBLIC_IP` (Linux + nginx). Optional: **DNS name** on the VM’s public IP in Azure → use that in `NEXTAUTH_URL`.

---

## Option B — Azure App Service (managed, no RDP)

Good if you want a URL like `https://sims.azurewebsites.net` without managing a server.

### B1 — Quick trial (SQLite, limitations)

1. Portal → **App Service** → **Create** → **Publish: Code** → **Runtime: Node 20 LTS**.
2. **Operating System:** **Linux** (better for Node on Azure).
3. **Plan:** Basic B1 or whatever your trial includes.
4. Deploy code (GitHub Actions, ZIP deploy, or Azure CLI).

**Build settings (typical):**

- Build command: `npm ci && npm run build && npx prisma generate && npx prisma db push`
- Start command: `npm start` or `node node_modules/next/dist/bin/next start -p $PORT`

In **Configuration → Application settings**, add:

- `NEXTAUTH_URL` = `https://<your-app-name>.azurewebsites.net`
- `NEXTAUTH_SECRET` = (your secret)
- `DATABASE_URL` = `file:./prod.db`
- `WEBSITES_PORT` = `3000` (if needed)

**Caveats:** redeploys and scaling can affect SQLite; uploads under `public/uploads` may not persist unless you add **Azure Files** mount. Use for **demo only**.

### B2 — Better on Azure (PostgreSQL)

1. Create **Azure Database for PostgreSQL** (Flexible Server) in the same region.
2. Change `prisma/schema.prisma` `provider` to `postgresql` and set `DATABASE_URL` to Azure’s connection string (SSL).
3. Run `prisma db push` / migrations during deploy.
4. For **uploads**, keep using local disk for trial or move to **Azure Blob Storage** later.

*(PostgreSQL schema switch is a small project change — do this when you commit to App Service long term.)*

---

## Option C — Static + serverless

SIMS is **not** a static site (login, API, Prisma, uploads). **Azure Static Web Apps alone** is not a fit unless you split frontend/backend. Stick with **VM** or **App Service**.

---

## Cost / trial tips

- Trial **credits expire**; set a **budget alert** in Azure Cost Management.
- **Stop/deallocate** the VM when not demoing to save compute (Windows license rules still apply on some SKUs).
- Delete resource groups when the trial ends if you’re done testing.

---

## Checklist after deploy

1. Open `NEXTAUTH_URL` in a browser → login page loads with styles.
2. Log in (seed: `admin@demo.org` / `password123` → change password).
3. Upload a photo / import CSV → confirms disk writes work.
4. If auth redirects fail → `NEXTAUTH_URL` must match the browser URL exactly (`https` vs `http`, no wrong port).

---

## Related docs

- [DEPLOY.md](./DEPLOY.md) — general production notes  
- [DEPLOY-CONTABO-WINDOWS.md](./DEPLOY-CONTABO-WINDOWS.md) — Windows VM steps (same on Azure VM)  
- [DEPLOY-FREEVPS.md](./DEPLOY-FREEVPS.md) — Linux VM + nginx  

**Summary:** For Azure **trial**, the path of least pain is **Option A — Linux or Windows VM** with existing install scripts. Use **App Service + PostgreSQL** when you want a managed URL and are ready to move off SQLite.
