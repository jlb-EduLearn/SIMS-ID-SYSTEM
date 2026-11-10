import { API_BASE } from "../config";
import type { Person, School } from "./offline";

async function parse(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API_BASE}/api/scanner/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return parse(res) as Promise<{
    token: string;
    stationName: string;
    login: string;
    school: School;
  }>;
}

export async function fetchContext(token: string) {
  const res = await fetch(`${API_BASE}/api/scanner/context`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parse(res) as Promise<{
    school: School;
    stationName: string;
    login: string;
  }>;
}

export async function fetchDirectory(token: string) {
  const res = await fetch(`${API_BASE}/api/scanner/directory`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parse(res) as Promise<{ people: Person[]; count: number }>;
}

export async function postScan(
  token: string,
  input: { code: string; scannedAt: number; clientId: string }
) {
  const res = await fetch(`${API_BASE}/api/scanner/scan`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return parse(res);
}

export async function syncScans(
  token: string,
  scans: { id: string; code: string; scannedAt: number }[]
) {
  const res = await fetch(`${API_BASE}/api/scanner/sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ scans }),
  });
  return parse(res) as Promise<{ results: Array<Record<string, unknown>> }>;
}
