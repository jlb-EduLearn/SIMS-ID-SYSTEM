#!/usr/bin/env node
/**
 * Avoid mixed production/dev .next cache (causes CSS 404 and unstyled UI).
 */
import { existsSync, readdirSync, rmSync } from "fs";
import { spawn } from "child_process";

function needsCleanNext() {
  if (!existsSync(".next")) return false;
  if (existsSync(".next/BUILD_ID")) return true;

  const cssDir = ".next/static/css";
  if (!existsSync(cssDir)) return false;

  const files = readdirSync(cssDir);
  const hasRootHashedCss = files.some(
    (f) => f.endsWith(".css") && f !== "app"
  );
  const devLayoutCss = ".next/static/css/app/layout.css";
  if (hasRootHashedCss && !existsSync(devLayoutCss)) return true;

  return false;
}

if (needsCleanNext()) {
  console.log(
    "\n⚠️  Clearing .next (production build cache breaks dev styles).\n"
  );
  rmSync(".next", { recursive: true, force: true });
}

const child = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["next", "dev", "-p", "3000", "-H", "0.0.0.0"],
  { stdio: "inherit", env: process.env }
);

child.on("exit", (code) => process.exit(code ?? 0));
