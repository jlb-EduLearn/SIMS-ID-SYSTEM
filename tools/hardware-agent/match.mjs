import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const keywords = JSON.parse(
  readFileSync(
    join(__dirname, "../../src/lib/hardware/device-keywords.json"),
    "utf8"
  )
);

export function matchHardwareByName(rawName) {
  const hay = String(rawName).toLowerCase();
  for (const row of keywords) {
    if (row.keywords.some((k) => hay.includes(k.toLowerCase()))) {
      return { sku: row.sku, catalogName: row.sku };
    }
  }
  return { sku: null, catalogName: null };
}
