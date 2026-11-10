/** Normalize scanner / QR payload to a lookup key (safe for client + server). */
export function normalizeScanCode(raw: string): string {
  let code = raw.trim();
  if (!code) return "";

  try {
    if (code.startsWith("http://") || code.startsWith("https://")) {
      const url = new URL(code);
      const fromQuery =
        url.searchParams.get("id") ||
        url.searchParams.get("studentId") ||
        url.searchParams.get("card");
      if (fromQuery) return fromQuery.trim();
      const pathId = url.pathname.split("/").filter(Boolean).pop();
      if (pathId) return decodeURIComponent(pathId).trim();
    }
  } catch {
    /* plain code */
  }

  return code.replace(/\s+/g, "");
}
