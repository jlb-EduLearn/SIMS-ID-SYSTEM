import { createHmac, timingSafeEqual } from "crypto";

export type ScannerTokenPayload = {
  sub: string;
  email: string;
  name: string;
  role: "SCANNER";
  organizationId: string;
  organizationName: string;
  currentSchoolId: string;
  currentSchoolName: string | null;
  currentSchoolYearId: string | null;
  currentSchoolYearName: string | null;
  exp: number;
};

function secret() {
  return process.env.NEXTAUTH_SECRET || "sims-scanner-dev-secret";
}

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromB64url(input: string) {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signScannerToken(
  payload: Omit<ScannerTokenPayload, "exp" | "role">,
  ttlSeconds = 60 * 60 * 24 * 30
): string {
  const body: ScannerTokenPayload = {
    ...payload,
    role: "SCANNER",
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const mid = b64url(JSON.stringify(body));
  const data = `${header}.${mid}`;
  const sig = createHmac("sha256", secret()).update(data).digest();
  return `${data}.${b64url(sig)}`;
}

export function verifyScannerToken(token: string): ScannerTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, mid, sig] = parts;
  const data = `${header}.${mid}`;
  const expected = createHmac("sha256", secret()).update(data).digest();
  const actual = fromB64url(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  try {
    const payload = JSON.parse(fromB64url(mid).toString("utf8")) as ScannerTokenPayload;
    if (payload.role !== "SCANNER") return null;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.sub || !payload.currentSchoolId) return null;
    return payload;
  } catch {
    return null;
  }
}
