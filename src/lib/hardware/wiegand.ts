export type WiegandFormat = "26" | "34";

/** Parse hex UID from CDS-10 / reader dumps (e.g. `04A1B2C3D4`). */
export function parseCardUid(raw: string): string | null {
  const cleaned = raw.replace(/\s+/g, "").toUpperCase();
  if (!cleaned) return null;
  if (/^[0-9A-F]+$/.test(cleaned) && cleaned.length >= 4) return cleaned;
  if (/^\d+$/.test(cleaned)) {
    const n = BigInt(cleaned);
    return n.toString(16).toUpperCase().padStart(8, "0");
  }
  return null;
}

/** Wiegand-26: 8-bit facility + 16-bit card (common ACS boards). */
export function wiegand26FromDecimal(cardDecimal: number): {
  facility: number;
  card: number;
} {
  const facility = (cardDecimal >> 16) & 0xff;
  const card = cardDecimal & 0xffff;
  return { facility, card };
}

export function decimalFromWiegand26(facility: number, card: number): number {
  return ((facility & 0xff) << 16) | (card & 0xffff);
}

/** Derive a default Wiegand card number from student ID when none assigned. */
export function suggestCardNumberFromStudentId(studentId: string): string {
  const digits = studentId.replace(/\D/g, "");
  if (digits.length >= 1 && digits.length <= 9) return digits;
  let hash = 0;
  for (let i = 0; i < studentId.length; i++) {
    hash = (hash * 31 + studentId.charCodeAt(i)) >>> 0;
  }
  return String(hash % 99999999 || 1);
}

export function formatWiegandDisplay(
  facility: string | null | undefined,
  card: string | null | undefined,
  format: WiegandFormat = "26"
): string {
  if (!card?.trim()) return "—";
  if (facility?.trim()) return `${facility},${card} (${format}-bit)`;
  return `${card} (${format}-bit)`;
}
