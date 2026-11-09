import type { PrinterProfileId } from "@/lib/hardware/device-catalog";

/** Heuristic: OS-installed queue looks like an ID card printer. */
export function isLikelyIdCardPrinter(rawName: string): boolean {
  const hay = rawName.toLowerCase();
  return (
    /magicard|entrust|sigma|prs10|datacard|evolis|fargo|zebra|zxp|dice|dsc|id.?card|card.?printer|dye.?sub|retransfer|direct.?to.?card/.test(
      hay
    ) || hay.includes("card")
  );
}

/** Map a system printer / USB name to a SIMS print profile (all CR-80 @ 300 dpi). */
export function resolvePrinterProfileFromName(rawName: string): {
  profileId: PrinterProfileId;
  label: string;
} {
  const hay = rawName.toLowerCase();

  if (/magicard/.test(hay) && /600|mc600|\b600\b/.test(hay)) {
    return { profileId: "MAGICARD_600", label: "Magicard 600" };
  }
  if (/magicard/.test(hay) && /300|mc300|\b300\b/.test(hay)) {
    return { profileId: "MAGICARD_300", label: "Magicard 300" };
  }
  if (/enduro/.test(hay)) {
    return { profileId: "MAGICARD_ENDURO", label: "Magicard Enduro" };
  }
  if (/magicard|pronto|rio pro|ultima/.test(hay)) {
    return { profileId: "MAGICARD_GENERIC", label: "Magicard" };
  }
  if (/prs10|entrust|sigma|datacard/.test(hay)) {
    return {
      profileId: "ENTRUST_SIGMA_PRS10",
      label: "Entrust / Datacard Sigma",
    };
  }
  if (/evolis|fargo|zebra|zxp|dice|dsc|retransfer/.test(hay)) {
    return { profileId: "GENERIC_CR80_300DPI", label: "ID card printer" };
  }
  if (isLikelyIdCardPrinter(rawName)) {
    return { profileId: "GENERIC_CR80_300DPI", label: "Detected card printer" };
  }
  return {
    profileId: "GENERIC_CR80_300DPI",
    label: "System printer",
  };
}

export function listDetectedPrinters(
  devices: Array<{ source: string; rawName: string }>
): Array<{ rawName: string; profileId: PrinterProfileId; label: string }> {
  return devices
    .filter((d) => d.source === "printer")
    .map((d) => {
      const match = resolvePrinterProfileFromName(d.rawName);
      return {
        rawName: d.rawName,
        profileId: match.profileId,
        label: match.label,
      };
    });
}
