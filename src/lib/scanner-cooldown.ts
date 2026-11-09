/** Minimum time between accepted scans for the same person at a school. */
export const SCANNER_COOLDOWN_MS = 5 * 60 * 1000;

/** How long the scanner station shows the student popup before returning to the logo. */
export const SCANNER_POPUP_MS = 5_000;

export function formatCooldownRemaining(ms: number): string {
  const totalSec = Math.max(1, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins <= 0) return `${secs}s`;
  if (secs === 0) return `${mins} min`;
  return `${mins}m ${secs}s`;
}
