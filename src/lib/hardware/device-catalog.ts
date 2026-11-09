/** Supported campus hardware (SIMS compatibility matrix). */
export const SIMS_HARDWARE_DEVICES = [
  {
    sku: "FS10",
    name: "Flap Barrier Gate",
    role: "Physical lane control (paired with access board)",
    simsIntegration: "Triggered by ACS11-M2 after valid card/face; no direct SIMS wire.",
  },
  {
    sku: "ACS11-M2",
    name: "Dual-door network access control board",
    role: "TCP/IP controller, Wiegand 26–40, up to 20k users",
    simsIntegration: "Export card holders from SIMS (WG5000-style CSV); sync to board software.",
  },
  {
    sku: "FRS10",
    name: "Face recognition terminal",
    role: "7\" Linux terminal, RV1109",
    simsIntegration: "Enroll via vendor tool; link person ID to same card number stored in SIMS.",
  },
  {
    sku: "RDS-20",
    name: "Waterproof IC card reader",
    role: "Wiegand 26/34 reader for gates",
    simsIntegration: "Reads CDS-10 cards encoded with numbers from SIMS.",
  },
  {
    sku: "FDS-10",
    name: "Desktop USB card issuer",
    role: "Encode/issue IC cards (USB, Wiegand output)",
    simsIntegration: "Capture card UID/number in SIMS student Access card tab after issue.",
  },
  {
    sku: "CDS-10",
    name: "RFID IC card (CR-80)",
    role: "85 × 54 mm campus ID media",
    simsIntegration: "Matches SIMS CR-80 template size (1011×638 px @ 300 dpi landscape).",
  },
  {
    sku: "PRS10-600",
    name: "Entrust Sigma direct-to-card printer",
    role: "300 dpi dye-sub, CR-80 / ID-1",
    simsIntegration: "Print from browser to Sigma driver; use SIMS Print IDs layout.",
  },
  {
    sku: "Magicard-600",
    name: "Magicard 600 (dual-sided)",
    role: "300 dpi dye-sub, CR-80",
    simsIntegration: "Auto-detected from Windows/macOS printer list; print via system dialog.",
  },
  {
    sku: "Magicard-300",
    name: "Magicard 300",
    role: "300 dpi dye-sub, CR-80",
    simsIntegration: "Auto-detected from installed driver; same SIMS template size.",
  },
  {
    sku: "Magicard-Enduro",
    name: "Magicard Enduro / Enduro+",
    role: "Retransfer CR-80",
    simsIntegration: "Matched by name during hardware scan.",
  },
  {
    sku: "Magicard",
    name: "Magicard ID card printer (other models)",
    role: "Pronto, Rio Pro, Ultima, etc.",
    simsIntegration: "Any Magicard with CR-80 driver — use Generic or Magicard profile.",
  },
  {
    sku: "MDS10",
    name: "Walk-through metal detector",
    role: "Security screening arch",
    simsIntegration: "Standalone; optional future event logging if vendor provides API.",
  },
] as const;

export type PrinterProfileId =
  | "ENTRUST_SIGMA_PRS10"
  | "MAGICARD_600"
  | "MAGICARD_300"
  | "MAGICARD_ENDURO"
  | "MAGICARD_GENERIC"
  | "GENERIC_CR80_300DPI";

export const PRINTER_PROFILES: Record<
  PrinterProfileId,
  { label: string; dpi: number; cardSize: string; notes: string }
> = {
  ENTRUST_SIGMA_PRS10: {
    label: "Entrust Sigma PRS10-600 (Entrust / Datacard)",
    dpi: 300,
    cardSize: "CR-80 / ID-1 (85.6 × 53.98 mm)",
    notes: "USB or Ethernet duplex; print SIMS templates at 1011×638 px (landscape).",
  },
  MAGICARD_600: {
    label: "Magicard 600 / 600 Duo",
    dpi: 300,
    cardSize: "CR-80 / ID-1",
    notes: "Select the Magicard queue in the system print dialog after Print IDs.",
  },
  MAGICARD_300: {
    label: "Magicard 300",
    dpi: 300,
    cardSize: "CR-80 / ID-1",
    notes: "Same template pixel size as other CR-80 printers.",
  },
  MAGICARD_ENDURO: {
    label: "Magicard Enduro / Enduro+",
    dpi: 300,
    cardSize: "CR-80 / ID-1",
    notes: "Retransfer; enable duplex in driver if printing front and back.",
  },
  MAGICARD_GENERIC: {
    label: "Magicard (other model)",
    dpi: 300,
    cardSize: "CR-80 / ID-1",
    notes: "Pronto, Rio Pro, Ultima, etc. — detected by name from your PC.",
  },
  GENERIC_CR80_300DPI: {
    label: "Other CR-80 @ 300 dpi",
    dpi: 300,
    cardSize: "CR-80",
    notes: "Evolis, Fargo, Zebra, or any dye-sub / retransfer ID printer.",
  },
};
