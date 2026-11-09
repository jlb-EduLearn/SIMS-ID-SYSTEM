"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Radar, Usb, Printer, Check } from "lucide-react";
import {
  runHardwareScan,
  requestWebHidAccess,
  requestWebUsbAccess,
  type HardwareScanResult,
} from "@/lib/hardware/client-scan";
import type { PrinterProfileId } from "@/lib/hardware/device-catalog";
import {
  isLikelyIdCardPrinter,
  listDetectedPrinters,
  resolvePrinterProfileFromName,
} from "@/lib/hardware/printer-match";

export type PrinterDetectionPayload = {
  profile: PrinterProfileId;
  printerName: string;
};

export function HardwareDetectionPanel({
  onPrinterDetected,
  selectedPrinterName,
}: {
  onPrinterDetected?: (payload: PrinterDetectionPayload) => void;
  selectedPrinterName?: string | null;
}) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<HardwareScanResult | null>(null);

  function applyDetectedPrinter(rawName: string) {
    if (!onPrinterDetected) return;
    const { profileId } = resolvePrinterProfileFromName(rawName);
    onPrinterDetected({ profile: profileId, printerName: rawName });
  }

  async function scan() {
    setScanning(true);
    try {
      const r = await runHardwareScan();
      setResult(r);

      const installed = listDetectedPrinters(r.devices);
      if (installed.length === 0 || !onPrinterDetected) return;

      const preferred =
        installed.find((p) => isLikelyIdCardPrinter(p.rawName)) ?? installed[0];
      applyDetectedPrinter(preferred.rawName);
    } finally {
      setScanning(false);
    }
  }

  const matched = result?.devices.filter((d) => d.matchedSku) ?? [];
  const installedPrinters = result
    ? listDetectedPrinters(result.devices)
    : [];
  const other =
    result?.devices.filter(
      (d) =>
        !d.matchedSku &&
        d.source !== "platform" &&
        d.source !== "printer"
    ) ?? [];

  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Radar className="h-4 w-4" />
            Detect connected hardware
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Finds USB encoders and{" "}
            <strong className="font-medium text-foreground">
              installed printers
            </strong>{" "}
            (Entrust Sigma, Magicard, Evolis, etc.). Run{" "}
            <code className="rounded bg-muted px-1">npm run hardware-tray</code>{" "}
            on the issuing PC.
          </p>
        </div>
        <Button type="button" size="sm" onClick={scan} disabled={scanning}>
          {scanning ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Radar className="mr-2 h-4 w-4" />
          )}
          Scan this computer
        </Button>
      </div>

      {selectedPrinterName && (
        <p className="text-xs text-muted-foreground">
          Selected printer:{" "}
          <span className="font-medium text-foreground">
            {selectedPrinterName}
          </span>
        </p>
      )}

      {result && !result.agentAvailable && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-medium">Local agent not detected</p>
          <p className="mt-1 text-xs opacity-90">
            {result.agentError}. One-time setup:{" "}
            <code className="rounded bg-black/10 px-1">npm run hardware-tray:setup</code>
            , then{" "}
            <code className="rounded bg-black/10 px-1">npm run hardware-tray</code>{" "}
            or{" "}
            <code className="rounded bg-black/10 px-1">npm run hardware-tray:install</code>{" "}
            to start at login. Chrome/Edge: use Allow USB below if needed.
          </p>
        </div>
      )}

      {result?.agentAvailable && (
        <p className="text-xs text-muted-foreground">
          Agent active on{" "}
          {result.hostPlatform === "mac"
            ? "macOS"
            : result.hostPlatform === "windows"
              ? "Windows"
              : result.hostPlatform}
          .
        </p>
      )}

      {result && (
        <>
          {installedPrinters.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Installed printers (auto-detect)
              </p>
              <ul className="space-y-2">
                {installedPrinters.map((p) => {
                  const active = selectedPrinterName === p.rawName;
                  return (
                    <li
                      key={p.rawName}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Printer className="h-4 w-4 shrink-0" />
                        <span className="truncate">{p.rawName}</span>
                        <Badge variant="secondary" className="shrink-0">
                          {p.label}
                        </Badge>
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant={active ? "default" : "outline"}
                        onClick={() => applyDetectedPrinter(p.rawName)}
                      >
                        {active ? (
                          <>
                            <Check className="mr-1.5 h-3.5 w-3.5" />
                            Selected
                          </>
                        ) : (
                          "Use this printer"
                        )}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {matched.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Recognized campus hardware
              </p>
              <ul className="space-y-2">
                {matched.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm"
                  >
                    <span>
                      <Badge variant="secondary" className="mr-2">
                        {d.matchedSku}
                      </Badge>
                      {d.rawName}
                    </span>
                    <Badge>{d.source}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {other.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Other USB devices on this PC
              </p>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                {other.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center gap-2 text-muted-foreground"
                  >
                    <Usb className="h-3.5 w-3.5 shrink-0" />
                    {d.rawName}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.notDetectedOnUsb.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Not on USB (normal)
              </p>
              <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                {result.notDetectedOnUsb.map((d) => (
                  <li key={d.sku}>
                    <span className="font-medium text-foreground">{d.sku}</span>{" "}
                    — {d.note}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="flex flex-wrap gap-2 border-t pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            await requestWebUsbAccess();
            await scan();
          }}
        >
          Allow USB device (browser)
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            await requestWebHidAccess();
            await scan();
          }}
        >
          Allow HID device (browser)
        </Button>
      </div>
    </div>
  );
}
