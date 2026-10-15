#!/usr/bin/env bash
# Create sims-deploy.zip for upload to FreeVPS (Windows RDP or Mac scp).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/sims-deploy.zip"
cd "$ROOT"
rm -f "$OUT"
zip -r "$OUT" . \
  -x "node_modules/*" \
  -x "node_modules/**" \
  -x "tools/hardware-tray/node_modules/*" \
  -x "tools/hardware-tray/node_modules/**" \
  -x ".next/*" \
  -x ".next/**" \
  -x "prisma/dev.db*" \
  -x "prisma/prod.db*" \
  -x ".env" \
  -x "sims-deploy.zip" \
  -x ".git/*" \
  -x ".git/**"
echo "Created $OUT ($(du -h "$OUT" | cut -f1))"
echo "Windows: copy to C:\\sims and extract."
echo "Linux:   unzip -d /var/www/sims sims-deploy.zip"
