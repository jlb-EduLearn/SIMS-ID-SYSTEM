import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { matchHardwareByName } from "./match.mjs";

const execFileAsync = promisify(execFile);

function id(source, name, index) {
  return `${source}-${index}-${name}`.replace(/\s+/g, "_").slice(0, 120);
}

async function scanDarwinUsb() {
  try {
    const { stdout } = await execFileAsync("system_profiler", [
      "SPUSBDataType",
      "-json",
    ]);
    const json = JSON.parse(stdout);
    const items = [];
    function walk(node, depth = 0) {
      if (!node || depth > 12) return;
      if (Array.isArray(node)) {
        node.forEach((n) => walk(n, depth + 1));
        return;
      }
      if (typeof node === "object") {
        const name =
          node._name ||
          node.product_name ||
          node.manufacturer ||
          node.device_title;
        if (name && typeof name === "string" && name.length > 1) {
          items.push(name);
        }
        for (const v of Object.values(node)) walk(v, depth + 1);
      }
    }
    walk(json);
    return [...new Set(items)].map((rawName, i) => ({
      id: id("usb", rawName, i),
      source: "usb",
      rawName,
      detail: matchHardwareByName(rawName).sku || undefined,
    }));
  } catch {
    return [];
  }
}

async function scanDarwinPrinters() {
  try {
    const { stdout } = await execFileAsync("lpstat", ["-p"]);
    return stdout
      .split("\n")
      .map((line) => line.match(/^printer\s+(\S+)/))
      .filter(Boolean)
      .map((m, i) => ({
        id: id("printer", m[1], i),
        source: "printer",
        rawName: m[1],
        detail: matchHardwareByName(m[1]).sku || undefined,
      }));
  } catch {
    return [];
  }
}

async function scanWinUsbAndPrinters() {
  const ps = `
$usb = Get-CimInstance Win32_PnPEntity | Where-Object {
  $_.Present -eq $true -and ($_.PNPClass -eq 'USB' -or $_.Name -match 'USB')
} | Select-Object -ExpandProperty Name
$printers = Get-CimInstance Win32_Printer | Select-Object -ExpandProperty Name
[PSCustomObject]@{ usb = @($usb); printers = @($printers) } | ConvertTo-Json -Compress
`;
  try {
    const { stdout } = await execFileAsync(
      "powershell",
      ["-NoProfile", "-Command", ps],
      { maxBuffer: 4 * 1024 * 1024 }
    );
    const data = JSON.parse(stdout.trim() || "{}");
    const usb = Array.isArray(data.usb) ? data.usb : data.usb ? [data.usb] : [];
    const printers = Array.isArray(data.printers)
      ? data.printers
      : data.printers
        ? [data.printers]
        : [];
    const usbItems = usb.filter(Boolean).map((rawName, i) => ({
      id: id("usb", rawName, i),
      source: "usb",
      rawName,
      detail: matchHardwareByName(rawName).sku || undefined,
    }));
    const printerItems = printers.filter(Boolean).map((rawName, i) => ({
      id: id("printer", rawName, i),
      source: "printer",
      rawName,
      detail: matchHardwareByName(rawName).sku || undefined,
    }));
    return [...usbItems, ...printerItems];
  } catch {
    return [];
  }
}

export async function scanConnectedDevices() {
  const platform = process.platform;
  let devices = [];
  if (platform === "darwin") {
    const [usb, printers] = await Promise.all([
      scanDarwinUsb(),
      scanDarwinPrinters(),
    ]);
    devices = [...usb, ...printers];
  } else if (platform === "win32") {
    devices = await scanWinUsbAndPrinters();
  }
  return {
    platform:
      platform === "darwin"
        ? "macOS"
        : platform === "win32"
          ? "Windows"
          : platform,
    devices,
  };
}
