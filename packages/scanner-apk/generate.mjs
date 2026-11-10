#!/usr/bin/env node
/**
 * Rebuild SIMS Scanner Android APK/AAB via PWABuilder CloudAPK.
 * Usage: node packages/scanner-apk/generate.mjs
 */
import { mkdir, writeFile, copyFile, rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOST = process.env.SCANNER_HOST || "https://sims-id-system-drab.vercel.app";
const OUT = __dirname;

const options = {
  packageId: "com.edulearn.simsscanner",
  name: "SIMS Scanner",
  launcherName: "SIMS Scan",
  appVersion: "1.0.0",
  appVersionCode: 1,
  host: HOST,
  pwaUrl: `${HOST}/scanner`,
  startUrl: "/scanner",
  webManifestUrl: `${HOST}/scanner-manifest.webmanifest`,
  iconUrl: `${HOST}/SIMS-white-colored-blue.png`,
  maskableIconUrl: null,
  monochromeIconUrl: null,
  backgroundColor: "#0b1220",
  themeColor: "#0b1220",
  navigationColor: "#0b1220",
  navigationColorDark: "#0b1220",
  navigationDividerColor: "#0b1220",
  navigationDividerColorDark: "#0b1220",
  display: "standalone",
  orientation: "default",
  language: "en-US",
  shortcuts: [],
  signingMode: "new",
  signing: {
    file: null,
    alias: "sims",
    fullName: "SIMS Scanner",
    organization: "EduLearn",
    organizationalUnit: "SIMS",
    countryCode: "PH",
  },
  includeSourceCode: false,
  isChromeOSOnly: false,
  enableNotifications: false,
  enableSiteSettingsShortcut: true,
  fallbackType: "customtabs",
  features: {
    locationDelegation: { enabled: false },
    playBilling: { enabled: false },
  },
  minSdkVersion: 24,
  targetSdkVersion: 34,
  splashScreenFadeOutDuration: 300,
  additionalTrustedOrigins: [],
  isMetaQuest: false,
  fullScopeUrl: `${HOST}/`,
};

async function main() {
  console.log("==> Requesting package from PWABuilder CloudAPK…");
  const res = await fetch(
    "https://pwabuilder-cloudapk.azurewebsites.net/generateAppPackage",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    }
  );
  if (!res.ok || !res.body) {
    const text = await res.text();
    throw new Error(`CloudAPK failed (${res.status}): ${text.slice(0, 400)}`);
  }

  const zipPath = path.join(OUT, "sims-scanner-android-raw.zip");
  await pipeline(res.body, createWriteStream(zipPath));
  console.log(`==> Downloaded ${zipPath}`);

  const tmp = path.join(OUT, ".tmp-extract");
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  execFileSync("unzip", ["-o", zipPath, "-d", tmp], { stdio: "inherit" });

  await mkdir(path.join(OUT, "dist"), { recursive: true });
  await mkdir(path.join(OUT, "secrets"), { recursive: true });

  const apkSrc = path.join(tmp, "SIMS Scanner.apk");
  const aabSrc = path.join(tmp, "SIMS Scanner.aab");
  await copyFile(apkSrc, path.join(OUT, "dist", "sims-scanner.apk"));
  await copyFile(aabSrc, path.join(OUT, "dist", "sims-scanner.aab"));
  await copyFile(
    path.join(tmp, "assetlinks.json"),
    path.join(OUT, "dist", "assetlinks.json")
  );

  const repoRoot = path.resolve(OUT, "../..");
  await mkdir(path.join(repoRoot, "public/downloads"), { recursive: true });
  await mkdir(path.join(repoRoot, "public/.well-known"), { recursive: true });
  await copyFile(
    path.join(OUT, "dist", "sims-scanner.apk"),
    path.join(repoRoot, "public/downloads/sims-scanner.apk")
  );
  await copyFile(
    path.join(tmp, "assetlinks.json"),
    path.join(repoRoot, "public/.well-known/assetlinks.json")
  );

  await copyFile(
    path.join(tmp, "signing.keystore"),
    path.join(OUT, "secrets", "signing.keystore")
  );
  await copyFile(
    path.join(tmp, "signing-key-info.txt"),
    path.join(OUT, "secrets", "signing-key-info.txt")
  );

  execFileSync(
    "zip",
    [
      "-9",
      path.join(OUT, "sims-scanner-android.zip"),
      "sims-scanner.apk",
      "sims-scanner.aab",
      "assetlinks.json",
    ],
    { cwd: path.join(OUT, "dist"), stdio: "inherit" }
  );

  await rm(tmp, { recursive: true, force: true });
  await rm(zipPath, { force: true });
  console.log("==> Done. APK at packages/scanner-apk/dist/sims-scanner.apk");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
