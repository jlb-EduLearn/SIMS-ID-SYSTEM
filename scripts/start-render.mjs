#!/usr/bin/env node
/**
 * Render start script:
 * - Uses Render's PORT and RENDER_EXTERNAL_URL
 * - Ensures SQLite folder exists (persistent disk at /var/data)
 * - Ensures SQLite schema exists
 * - Seeds demo data only when the DB has no users
 */
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

function ensureSqliteDir(databaseUrl) {
  if (!databaseUrl?.startsWith("file:")) return;
  let filePath = databaseUrl.slice("file:".length);
  // Prisma accepts file:/absolute and file:./relative
  if (filePath.startsWith("//")) filePath = filePath.slice(1);
  const dir = dirname(filePath);
  if (dir && dir !== ".") {
    mkdirSync(dir, { recursive: true });
    console.log(`==> SQLite directory ready: ${dir}`);
  }
}

if (!process.env.DATABASE_URL) {
  // Prefer persistent disk when present; otherwise local file for demos.
  process.env.DATABASE_URL = "file:/var/data/prod.db";
}

try {
  ensureSqliteDir(process.env.DATABASE_URL);
} catch (err) {
  // Free instances have no /var/data disk — fall back so the app still boots.
  console.warn(
    `==> Could not prepare ${process.env.DATABASE_URL} (${err instanceof Error ? err.message : err}). Falling back to file:./prod.db`
  );
  process.env.DATABASE_URL = "file:./prod.db";
  ensureSqliteDir(process.env.DATABASE_URL);
}

if (!process.env.NEXTAUTH_URL && process.env.RENDER_EXTERNAL_URL) {
  process.env.NEXTAUTH_URL = process.env.RENDER_EXTERNAL_URL.replace(/\/$/, "");
}

if (!process.env.NEXTAUTH_SECRET) {
  console.warn(
    "NEXTAUTH_SECRET is missing; set it in Render Environment for production security."
  );
  process.env.NEXTAUTH_SECRET = "sims-render-demo-secret-change-me";
}

console.log(`==> DATABASE_URL=${process.env.DATABASE_URL}`);
console.log("==> Preparing database...");
const push = spawnSync("npx", ["prisma", "db", "push", "--skip-generate"], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});
if (push.status !== 0) {
  process.exit(push.status ?? 1);
}

const prisma = new PrismaClient();
try {
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    console.log("==> Empty database — seeding demo data once...");
    const seed = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    });
    if (seed.status !== 0) {
      process.exit(seed.status ?? 1);
    }
  } else {
    console.log(
      `==> Keeping existing data (${userCount} user(s)); skipping seed.`
    );
  }
} finally {
  await prisma.$disconnect();
}

const port = process.env.PORT || "3000";
console.log(`==> Starting Next.js on 0.0.0.0:${port}`);
const child = spawn(
  "npx",
  ["next", "start", "-H", "0.0.0.0", "-p", String(port)],
  {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  }
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
