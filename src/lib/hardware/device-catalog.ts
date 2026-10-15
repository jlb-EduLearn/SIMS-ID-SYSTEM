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
    sku: "MDS10",
    name: "Walk-through metal detector",
    role: "Security screening arch",
    simsIntegration: "Standalone; optional future event logging if vendor provides API.",
  },
] as const;

export type PrinterProfileId = "ENTRUST_SIGMA_PRS10" | "GENERIC_CR80_300DPI";

export const PRINTER_PROFILES: Record<
  PrinterProfileId,
  { label: string; dpi: number; cardSize: string; notes: string }
> = {
  ENTRUST_SIGMA_PRS10: {
    label: "Entrust Sigma PRS10-600 (PRS10-600)",
    dpi: 300,
    cardSize: "CR-80 / ID-1 (85.6 × 53.98 mm)",
    notes: "USB or Ethernet duplex; print SIMS templates at 1011×638 px (landscape).",
  },
  GENERIC_CR80_300DPI: {
    label: "Generic CR-80 @ 300 dpi",
    dpi: 300,
    cardSize: "CR-80",
    notes: "Any dye-sub printer accepting ID-1 card stock.",
  },
};
