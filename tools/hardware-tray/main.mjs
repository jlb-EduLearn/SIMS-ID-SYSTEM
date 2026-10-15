import { app, Tray, Menu, nativeImage, shell } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startHardwareAgent } from "../hardware-agent/server.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('electron').Tray | null} */
let tray = null;
/** @type {{ server: import('node:http').Server; port: number; url: string } | null} */
let agent = null;

function trayIcon() {
  const iconPath = join(__dirname, "tray-icon.png");
  try {
    return nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 });
  } catch {
    const fallback = nativeImage.createFromDataURL(
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAF0lEQVQ4T2NkYGD4z0ABYBw1gGE0DAB3/wJ/Bx9pYQAAAABJRU5ErkJggg=="
    );
    return fallback.resize({ width: 18, height: 18 });
  }
}

function buildMenu() {
  const status = agent
    ? `Running on ${agent.url}`
    : "Starting…";

  return Menu.buildFromTemplate([
    { label: "SIMS Hardware Agent", enabled: false },
    { label: status, enabled: false },
    { type: "separator" },
    {
      label: "Open SIMS settings",
      click: () =>
        shell.openExternal("http://localhost:3000/dashboard/settings"),
    },
    {
      label: "Open SIMS (login)",
      click: () => shell.openExternal("http://localhost:3000/login"),
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => app.quit(),
    },
  ]);
}

function refreshTray() {
  if (!tray) return;
  tray.setToolTip(
    agent
      ? `SIMS Hardware Agent — ${agent.url}`
      : "SIMS Hardware Agent"
  );
  tray.setContextMenu(buildMenu());
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    refreshTray();
  });

  app.whenReady().then(async () => {
    if (process.platform === "darwin" && app.dock) {
      app.dock.hide();
    }

    try {
      agent = await startHardwareAgent();
    } catch (e) {
      console.error("Failed to start hardware agent:", e);
    }

    tray = new Tray(trayIcon());
    tray.setTitle(process.platform === "darwin" ? "SIMS" : "");
    refreshTray();
  });

  app.on("window-all-closed", (e) => {
    e.preventDefault();
  });

  app.on("before-quit", () => {
    agent?.server.close();
  });
}
