import { NextRequest, NextResponse } from "next/server";

const ALLOWED = new Set([
  "https://localhost",
  "http://localhost",
  "capacitor://localhost",
  "ionic://localhost",
  "https://sims-id-system-drab.vercel.app",
]);

export function scannerCorsHeaders(req: NextRequest): HeadersInit {
  const origin = req.headers.get("origin") || "";
  const allow = ALLOWED.has(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function withScannerCors(req: NextRequest, res: NextResponse) {
  const headers = scannerCorsHeaders(req);
  for (const [k, v] of Object.entries(headers)) {
    res.headers.set(k, String(v));
  }
  return res;
}

export function scannerOptions(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: scannerCorsHeaders(req) });
}
