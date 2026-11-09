/** Synthetic email domain for station scanner logins (username@scanner.local). */
export const SCANNER_EMAIL_DOMAIN = "scanner.local";

const USERNAME_RE = /^[a-zA-Z0-9._-]{3,64}$/;

export function isScannerEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${SCANNER_EMAIL_DOMAIN}`);
}

/** Turn `age-scanner1` or a full email into the stored login email. */
export function normalizeScannerLogin(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (!value) return value;
  if (value.includes("@")) return value;
  return `${value}@${SCANNER_EMAIL_DOMAIN}`;
}

/** UI label: show username without @scanner.local when applicable. */
export function displayScannerLogin(email: string): string {
  const value = email.trim().toLowerCase();
  if (isScannerEmail(value)) {
    return value.slice(0, -(SCANNER_EMAIL_DOMAIN.length + 1));
  }
  return email;
}

export function isValidScannerUsername(raw: string): boolean {
  const value = raw.trim();
  if (!value) return false;
  if (value.includes("@")) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
  return USERNAME_RE.test(value);
}
