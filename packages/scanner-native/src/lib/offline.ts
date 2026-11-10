import { SCANNER_COOLDOWN_MS } from "../config";

const DB_NAME = "sims-native-scanner-v1";
const DB_VERSION = 1;

export type School = {
  id: string;
  name: string;
  code: string;
  logoUrl: string | null;
  address: string | null;
};

export type Person = {
  id: string;
  studentId: string;
  fullName: string;
  gradeLabel: string;
  section: string;
  photoUrl: string | null;
  allowed: boolean;
  isStaff: boolean;
  lookupKeys: string[];
};

export type PendingScan = {
  id: string;
  code: string;
  scannedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
      if (!db.objectStoreNames.contains("directory")) {
        db.createObjectStore("directory", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("pending")) {
        db.createObjectStore("pending", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("accepted")) {
        const s = db.createObjectStore("accepted", {
          keyPath: "id",
          autoIncrement: true,
        });
        s.createIndex("byStudent", "studentId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function get<T>(store: IDBObjectStore, key: IDBValidKey) {
  return new Promise<T | null>((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error);
  });
}

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
    /* ignore */
  }
  return code.replace(/\s+/g, "");
}

export async function saveSession(input: {
  token: string;
  school: School;
  stationName: string;
  login: string;
}) {
  const db = await openDb();
  const tx = db.transaction("meta", "readwrite");
  const store = tx.objectStore("meta");
  store.put(input.token, "token");
  store.put(input.school, "school");
  store.put(input.stationName, "stationName");
  store.put(input.login, "login");
  await done(tx);
  db.close();
}

export async function clearSession() {
  const db = await openDb();
  const tx = db.transaction("meta", "readwrite");
  tx.objectStore("meta").clear();
  await done(tx);
  db.close();
}

export async function loadSession() {
  const db = await openDb();
  const tx = db.transaction("meta", "readonly");
  const store = tx.objectStore("meta");
  const token = await get<string>(store, "token");
  const school = await get<School>(store, "school");
  const stationName = (await get<string>(store, "stationName")) || "";
  const login = (await get<string>(store, "login")) || "";
  await done(tx);
  db.close();
  return { token, school, stationName, login };
}

export async function replaceDirectory(people: Person[]) {
  const db = await openDb();
  const tx = db.transaction("directory", "readwrite");
  const store = tx.objectStore("directory");
  store.clear();
  for (const p of people) store.put(p);
  await done(tx);
  db.close();
}

export async function lookupPerson(code: string): Promise<Person | null> {
  const key = normalizeScanCode(code).toUpperCase();
  if (!key) return null;
  const db = await openDb();
  const tx = db.transaction("directory", "readonly");
  const all = await new Promise<Person[]>((resolve, reject) => {
    const req = tx.objectStore("directory").getAll();
    req.onsuccess = () => resolve((req.result as Person[]) || []);
    req.onerror = () => reject(req.error);
  });
  await done(tx);
  db.close();
  return (
    all.find((p) =>
      p.lookupKeys.some((k) => String(k).trim().toUpperCase() === key)
    ) || null
  );
}

export async function enqueue(code: string, scannedAt = Date.now()) {
  const item: PendingScan = {
    id: crypto.randomUUID(),
    code,
    scannedAt,
  };
  const db = await openDb();
  const tx = db.transaction("pending", "readwrite");
  tx.objectStore("pending").put(item);
  await done(tx);
  db.close();
  return item;
}

export async function listPending() {
  const db = await openDb();
  const tx = db.transaction("pending", "readonly");
  const items = await new Promise<PendingScan[]>((resolve, reject) => {
    const req = tx.objectStore("pending").getAll();
    req.onsuccess = () => resolve((req.result as PendingScan[]) || []);
    req.onerror = () => reject(req.error);
  });
  await done(tx);
  db.close();
  return items.sort((a, b) => a.scannedAt - b.scannedAt);
}

export async function removePending(id: string) {
  const db = await openDb();
  const tx = db.transaction("pending", "readwrite");
  tx.objectStore("pending").delete(id);
  await done(tx);
  db.close();
}

export async function recordAccepted(studentId: string, scannedAt = Date.now()) {
  const db = await openDb();
  const tx = db.transaction("accepted", "readwrite");
  tx.objectStore("accepted").add({ studentId, scannedAt });
  await done(tx);
  db.close();
}

export async function wasAcceptedRecently(studentId: string, at = Date.now()) {
  const since = at - SCANNER_COOLDOWN_MS;
  const db = await openDb();
  const tx = db.transaction("accepted", "readonly");
  const index = tx.objectStore("accepted").index("byStudent");
  const rows = await new Promise<{ studentId: string; scannedAt: number }[]>(
    (resolve, reject) => {
      const req = index.getAll(studentId);
      req.onsuccess = () => resolve((req.result as { studentId: string; scannedAt: number }[]) || []);
      req.onerror = () => reject(req.error);
    }
  );
  await done(tx);
  db.close();
  const recent = rows
    .filter((r) => r.scannedAt >= since)
    .sort((a, b) => b.scannedAt - a.scannedAt)[0];
  if (!recent) return { blocked: false, remainingMs: 0 };
  return {
    blocked: true,
    remainingMs: Math.max(0, SCANNER_COOLDOWN_MS - (at - recent.scannedAt)),
  };
}

export function formatCooldown(ms: number) {
  const totalSec = Math.max(1, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins <= 0) return `${secs}s`;
  if (secs === 0) return `${mins} min`;
  return `${mins}m ${secs}s`;
}
