import keywords from "@/lib/hardware/device-keywords.json";
import { SIMS_HARDWARE_DEVICES } from "@/lib/hardware/device-catalog";

export type MatchedSku = (typeof SIMS_HARDWARE_DEVICES)[number]["sku"];

export function matchHardwareByName(rawName: string): {
  sku: MatchedSku | null;
  catalogName: string | null;
} {
  const hay = rawName.toLowerCase();
  for (const row of keywords) {
    if (row.keywords.some((k) => hay.includes(k.toLowerCase()))) {
      const catalog = SIMS_HARDWARE_DEVICES.find((d) => d.sku === row.sku);
      return {
        sku: row.sku as MatchedSku,
        catalogName: catalog?.name ?? row.sku,
      };
    }
  }
  return { sku: null, catalogName: null };
}

export type DetectedHardwareItem = {
  id: string;
  source: "usb" | "printer" | "webusb" | "webhid" | "platform" | "network";
  rawName: string;
  matchedSku: MatchedSku | null;
  matchedLabel: string | null;
  connected: boolean;
  detail?: string;
};
