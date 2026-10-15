# Run in PowerShell as Administrator on Windows Server 2022.
# Example: cd C:\sims; Set-ExecutionPolicy -Scope Process Bypass; .\scripts\vps-install-windows.ps1

$ErrorActionPreference = "Stop"
$AppDir = if ($env:SIMS_APP_DIR) { $env:SIMS_APP_DIR } else { "C:\sims" }
$NodeMajor = "20"

function Ensure-Node {
  if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "Node already installed: $(node -v)"
    return
  }
  Write-Host "==> Installing Node.js $NodeMajor LTS (winget)..."
  winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
    [System.Environment]::GetEnvironmentVariable("Path", "User")
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node not found after install. Log off RDP, sign in again, and re-run this script."
  }
}

if (-not (Test-Path "$AppDir\package.json")) {
  throw "Copy the SIMS project to $AppDir first (package.json missing)."
}

Ensure-Node

Write-Host "==> PM2"
npm install -g pm2
if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
  $npmGlobal = npm root -g
  $env:Path += ";$npmGlobal\..\"
}

if (-not (Test-Path "$AppDir\.env")) {
  if (Test-Path "$AppDir\.env.production.example") {
    Copy-Item "$AppDir\.env.production.example" "$AppDir\.env"
    Write-Host "Created .env — set NEXTAUTH_URL and NEXTAUTH_SECRET before going live."
  } else {
    throw "Create $AppDir\.env (see .env.production.example)"
  }
}

Write-Host "==> Build"
Set-Location $AppDir
$env:NODE_OPTIONS = "--max-old-space-size=2048"
npm ci
npm run db:setup
npm run build

Write-Host "==> PM2 start"
pm2 delete sims 2>$null
pm2 start npm --name sims -- start
pm2 save

Write-Host ""
Write-Host "==> Firewall (allow TCP 3000)"
New-NetFirewallRule -DisplayName "SIMS Next.js" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -ErrorAction SilentlyContinue | Out-Null

Write-Host ""
Write-Host "Done. Set in $AppDir\.env:"
Write-Host '  NEXTAUTH_URL="http://YOUR_VPS_IP:3000"'
Write-Host "Then: pm2 restart sims"
Write-Host "Open http://YOUR_VPS_IP:3000 in a browser."
Write-Host ""
Write-Host "Optional: run 'npm install -g pm2-windows-startup' and 'pm2-startup install' so SIMS starts after reboot."
