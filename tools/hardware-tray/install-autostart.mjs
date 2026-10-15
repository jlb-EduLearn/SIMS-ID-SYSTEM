import { mkdirSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(__dirname, "package.json"));
const remove = process.argv.includes("--remove");

function resolveElectronBinary() {
  return require("electron");
}

function trayWorkingDir() {
  return __dirname;
}

function installMac() {
  const label = "com.sims.hardware-tray";
  const plistPath = join(homedir(), "Library/LaunchAgents", `${label}.plist`);
  const electronBin = resolveElectronBinary();
  const cwd = trayWorkingDir();

  if (remove) {
    try {
      execFileSync("launchctl", ["unload", plistPath], { stdio: "ignore" });
    } catch {
      /* not loaded */
    }
    if (existsSync(plistPath)) unlinkSync(plistPath);
    console.log("Removed macOS login item:", plistPath);
    return;
  }

  mkdirSync(dirname(plistPath), { recursive: true });
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${electronBin}</string>
    <string>.</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${cwd}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
  <key>StandardOutPath</key>
  <string>${join(homedir(), "Library/Logs/sims-hardware-tray.log")}</string>
  <key>StandardErrorPath</key>
  <string>${join(homedir(), "Library/Logs/sims-hardware-tray.err.log")}</string>
</dict>
</plist>`;
  writeFileSync(plistPath, plist, "utf8");
  try {
    execFileSync("launchctl", ["unload", plistPath], { stdio: "ignore" });
  } catch {
    /* first install */
  }
  execFileSync("launchctl", ["load", plistPath]);
  console.log("Installed macOS login item. Tray app starts at sign-in.");
  console.log("Plist:", plistPath);
}

function installWindows() {
  const electronBin = resolveElectronBinary();
  const cwd = trayWorkingDir();
  const startupDir = join(
    process.env.APPDATA || join(homedir(), "AppData/Roaming"),
    "Microsoft",
    "Windows",
    "Start Menu",
    "Programs",
    "Startup"
  );
  const vbsPath = join(startupDir, "SIMS-Hardware-Tray.vbs");

  if (remove) {
    if (existsSync(vbsPath)) unlinkSync(vbsPath);
    console.log("Removed Windows startup shortcut:", vbsPath);
    return;
  }

  mkdirSync(startupDir, { recursive: true });
  const escapedElectron = electronBin.replace(/"/g, '""');
  const escapedCwd = cwd.replace(/"/g, '""');
  const vbs = `Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = "${escapedCwd}"
shell.Run """${escapedElectron}"" .", 0, False
`;
  writeFileSync(vbsPath, vbs, "utf8");
  console.log("Installed Windows startup item (hidden tray at login).");
  console.log("Script:", vbsPath);
}

function main() {
  if (!existsSync(join(__dirname, "node_modules/electron"))) {
    console.error("Run once: npm install --prefix tools/hardware-tray");
    process.exit(1);
  }

  if (process.platform === "darwin") {
    installMac();
  } else if (process.platform === "win32") {
    installWindows();
  } else {
    console.error("Auto-start installer supports macOS and Windows only.");
    console.error("On Linux, run: npm run hardware-tray");
    process.exit(1);
  }
}

main();
