/** Live SIMS API host used by the native tablet app. */
export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ||
  "https://sims-id-system-drab.vercel.app";

export const SCANNER_POPUP_MS = 5_000;
export const SCANNER_COOLDOWN_MS = 5 * 60 * 1000;
