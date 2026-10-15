import {
  matchHardwareByName,
  type DetectedHardwareItem,
  type MatchedSku,
} from "@/lib/hardware/device-match";
import { SIMS_HARDWARE_DEVICES } from "@/lib/hardware/device-catalog";

const AGENT_URL = "http://127.0.0.1:9477/v1/scan";

export function detectHostPlatform(): "windows" | "mac" | "linux" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator.platform || "").toLowerCase();
  if (platform.includes("win") || ua.includes("windows")) return "windows";
  if (platform.includes("mac") || ua.includes("macintosh")) return "mac";
  if (platform.includes("linux") || ua.includes("linux")) return "linux";
  return "other";
}

type AgentScanResponse = {
  platform: string;
  agentVersion: string;
  devices: Array<{
    id: string;
    source: DetectedHardwareItem["source"];
    rawName: string;
    detail?: string;
  }>;
};

async function scanLocalAgent(timeoutMs = 2500): Promise<{
  ok: boolean;
  devices: DetectedHardwareItem[];
  platform?: string;
  error?: string;
}> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(AGENT_URL, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) {
      return { ok: false, devices: [], error: `Agent returned ${res.status}` };
    }
    const data = (await res.json()) as AgentScanResponse;
    const devices = data.devices.map((d) => {
      const match = matchHardwareByName(d.rawName);
      return {
        id: d.id,
        source: d.source,
        rawName: d.rawName,
        matchedSku: match.sku,
        matchedLabel: match.catalogName,
        connected: true,
        detail: d.detail,
      };
    });
    return { ok: true, devices, platform: data.platform };
  } catch {
    return {
      ok: false,
      devices: [],
      error: "SIMS Hardware Agent not running on this computer",
    };
  }
}

async function scanWebUsb(): Promise<DetectedHardwareItem[]> {
  const nav = navigator as Navigator & {
    usb?: {
      getDevices: () => Promise<
        Array<{ vendorId: number; productId: number; productName?: string }>
      >;
    };
  };
  if (!nav.usb) return [];
  try {
    const devices = await nav.usb.getDevices();
    return devices.map((d, i) => {
      const rawName =
        d.productName ||
        `USB device ${d.vendorId.toString(16)}:${d.productId.toString(16)}`;
      const match = matchHardwareByName(rawName);
      return {
        id: `webusb-${i}-${d.vendorId}-${d.productId}`,
        source: "webusb" as const,
        rawName,
        matchedSku: match.sku,
        matchedLabel: match.catalogName,
        connected: true,
        detail: `VID ${d.vendorId.toString(16)} PID ${d.productId.toString(16)}`,
      };
    });
  } catch {
    return [];
  }
}

async function scanWebHid(): Promise<DetectedHardwareItem[]> {
  const nav = navigator as Navigator & {
    hid?: {
      getDevices: () => Promise<
        Array<{ productName?: string; vendorId?: number; productId?: number }>
      >;
    };
  };
  if (!nav.hid) return [];
  try {
    const devices = await nav.hid.getDevices();
    return devices.map((d, i) => {
      const rawName = d.productName || "HID device";
      const match = matchHardwareByName(rawName);
      return {
        id: `webhid-${i}`,
        source: "webhid" as const,
        rawName,
        matchedSku: match.sku,
        matchedLabel: match.catalogName,
        connected: true,
      };
    });
  } catch {
    return [];
  }
}

export async function requestWebUsbAccess(): Promise<boolean> {
  const nav = navigator as Navigator & {
    usb?: { requestDevice: (opts: { filters: [] }) => Promise<unknown> };
  };
  if (!nav.usb) return false;
  try {
    await nav.usb.requestDevice({ filters: [] });
    return true;
  } catch {
    return false;
  }
}

export async function requestWebHidAccess(): Promise<boolean> {
  const nav = navigator as Navigator & {
    hid?: { requestDevice: (opts: { filters: [] }) => Promise<unknown> };
  };
  if (!nav.hid) return false;
  try {
    await nav.hid.requestDevice({ filters: [] });
    return true;
  } catch {
    return false;
  }
}

function mergeDetected(items: DetectedHardwareItem[]): DetectedHardwareItem[] {
  const byKey = new Map<string, DetectedHardwareItem>();
  for (const item of items) {
    const key = `${item.matchedSku || ""}:${item.rawName.toLowerCase()}`;
    if (!byKey.has(key)) byKey.set(key, item);
  }
  return [...byKey.values()];
}

/** Summary of catalog SKUs not seen in scan (network-mounted devices). */
export function catalogNotDetected(
  detected: DetectedHardwareItem[]
): Array<{ sku: MatchedSku; name: string; note: string }> {
  const found = new Set(
    detected.map((d) => d.matchedSku).filter(Boolean) as MatchedSku[]
  );
  const networkOnly: MatchedSku[] = ["FS10", "ACS11-M2", "FRS10", "MDS10", "RDS-20", "CDS-10"];
  return SIMS_HARDWARE_DEVICES.filter(
    (d) => networkOnly.includes(d.sku as MatchedSku) && !found.has(d.sku as MatchedSku)
  ).map((d) => ({
    sku: d.sku as MatchedSku,
    name: d.name,
    note:
      d.sku === "CDS-10"
        ? "Consumable media — not a USB device"
        : "Typically on LAN / gate wiring — configure IP in settings",
  }));
}

export type HardwareScanResult = {
  hostPlatform: ReturnType<typeof detectHostPlatform>;
  agentAvailable: boolean;
  agentError?: string;
  devices: DetectedHardwareItem[];
  notDetectedOnUsb: ReturnType<typeof catalogNotDetected>;
};

export async function runHardwareScan(): Promise<HardwareScanResult> {
  const hostPlatform = detectHostPlatform();
  const [agent, webUsb, webHid] = await Promise.all([
    scanLocalAgent(),
    scanWebUsb(),
    scanWebHid(),
  ]);

  const platformRow: DetectedHardwareItem = {
    id: "host-platform",
    source: "platform",
    rawName:
      hostPlatform === "windows"
        ? "Windows"
        : hostPlatform === "mac"
          ? "macOS"
          : hostPlatform === "linux"
            ? "Linux"
            : "Unknown OS",
    matchedSku: null,
    matchedLabel: null,
    connected: true,
    detail: agent.platform || undefined,
  };

  const devices = mergeDetected([
    platformRow,
    ...agent.devices,
    ...webUsb,
    ...webHid,
  ]);

  return {
    hostPlatform,
    agentAvailable: agent.ok,
    agentError: agent.ok ? undefined : agent.error,
    devices,
    notDetectedOnUsb: catalogNotDetected(devices),
  };
}
