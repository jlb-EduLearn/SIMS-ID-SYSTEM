#!/usr/bin/env node
/**
 * Render free-tier start script:
 * - Uses Render's PORT and RENDER_EXTERNAL_URL
 * - Ensures SQLite schema exists
 * - Seeds demo data only when the DB has no users
 */
import { spawn, spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./prod.db";
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
    console.log("==> Seeding demo data...");
    const seed = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    });
    if (seed.status !== 0) {
      process.exit(seed.status ?? 1);
    }
  } else {
    console.log(`==> Database already has ${userCount} user(s); skipping seed.`);
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
