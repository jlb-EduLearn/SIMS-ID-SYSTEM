import { normalizeScanCode } from "@/lib/scan-code";
import { SCANNER_COOLDOWN_MS } from "@/lib/scanner-cooldown";

const DB_NAME = "sims-scanner-v1";
const DB_VERSION = 1;

export type CachedSchool = {
  id: string;
  name: string;
  code: string;
  logoUrl: string | null;
  address: string | null;
};

export type DirectoryPerson = {
  id: string;
  studentId: string;
  fullName: string;
  gradeLabel: string;
  section: string;
  photoUrl: string | null;
  allowed: boolean;
  isStaff: boolean;
  recordType: string;
  lookupKeys: string[];
};

export type PendingScan = {
  id: string;
  code: string;
  scannedAt: number;
  status: "pending" | "syncing" | "failed";
  lastError?: string;
};

export type LocalAcceptedScan = {
  studentId: string;
  scannedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta");
      }
      if (!db.objectStoreNames.contains("directory")) {
        db.createObjectStore("directory", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("pending")) {
        db.createObjectStore("pending", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("accepted")) {
        const store = db.createObjectStore("accepted", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("byStudent", "studentId", { unique: false });
        store.createIndex("byTime", "scannedAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("IndexedDB tx failed"));
    tx.onabort = () => reject(tx.error || new Error("IndexedDB tx aborted"));
  });
}

export async function saveScannerMeta(input: {
  school: CachedSchool;
  stationName: string;
  login: string;
  directorySyncedAt: number;
}): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("meta", "readwrite");
  const store = tx.objectStore("meta");
  store.put(input.school, "school");
  store.put(input.stationName, "stationName");
  store.put(input.login, "login");
  store.put(input.directorySyncedAt, "directorySyncedAt");
  await txDone(tx);
  db.close();
}

export async function loadScannerMeta(): Promise<{
  school: CachedSchool | null;
  stationName: string;
  login: string;
  directorySyncedAt: number | null;
}> {
  const db = await openDb();
  const tx = db.transaction("meta", "readonly");
  const store = tx.objectStore("meta");
  const school = await idbGet<CachedSchool | null>(store, "school");
  const stationName = (await idbGet<string>(store, "stationName")) || "";
  const login = (await idbGet<string>(store, "login")) || "";
  const directorySyncedAt =
    (await idbGet<number | null>(store, "directorySyncedAt")) ?? null;
  await txDone(tx);
  db.close();
  return { school, stationName, login, directorySyncedAt };
}

function idbGet<T>(store: IDBObjectStore, key: IDBValidKey): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function replaceDirectory(people: DirectoryPerson[]): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("directory", "readwrite");
  const store = tx.objectStore("directory");
  store.clear();
  for (const person of people) store.put(person);
  await txDone(tx);
  db.close();
}

export async function lookupDirectoryPerson(
  code: string
): Promise<DirectoryPerson | null> {
  const key = normalizeScanCode(code).toUpperCase();
  if (!key) return null;
  const db = await openDb();
  const tx = db.transaction("directory", "readonly");
  const store = tx.objectStore("directory");
  const all = await new Promise<DirectoryPerson[]>((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as DirectoryPerson[]) || []);
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
  db.close();
  return (
    all.find((p) =>
      p.lookupKeys.some((k) => String(k).trim().toUpperCase() === key)
    ) || null
  );
}

export async function enqueuePendingScan(code: string, scannedAt = Date.now()) {
  const item: PendingScan = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `scan-${scannedAt}-${Math.random().toString(36).slice(2)}`,
    code,
    scannedAt,
    status: "pending",
  };
  const db = await openDb();
  const tx = db.transaction("pending", "readwrite");
  tx.objectStore("pending").put(item);
  await txDone(tx);
  db.close();
  return item;
}

export async function listPendingScans(): Promise<PendingScan[]> {
  const db = await openDb();
  const tx = db.transaction("pending", "readonly");
  const items = await new Promise<PendingScan[]>((resolve, reject) => {
    const req = tx.objectStore("pending").getAll();
    req.onsuccess = () => resolve((req.result as PendingScan[]) || []);
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
  db.close();
  return items.sort((a, b) => a.scannedAt - b.scannedAt);
}

export async function removePendingScan(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("pending", "readwrite");
  tx.objectStore("pending").delete(id);
  await txDone(tx);
  db.close();
}

export async function markPendingFailed(
  id: string,
  lastError: string
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("pending", "readwrite");
  const store = tx.objectStore("pending");
  const existing = await idbGet<PendingScan>(store, id);
  if (existing) {
    store.put({ ...existing, status: "failed", lastError });
  }
  await txDone(tx);
  db.close();
}

export async function recordLocalAccepted(
  studentId: string,
  scannedAt = Date.now()
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("accepted", "readwrite");
  tx.objectStore("accepted").add({ studentId, scannedAt } satisfies LocalAcceptedScan);
  await txDone(tx);
  db.close();
}

export async function wasRecentlyAcceptedLocally(
  studentId: string,
  at = Date.now()
): Promise<{ blocked: boolean; remainingMs: number }> {
  const since = at - SCANNER_COOLDOWN_MS;
  const db = await openDb();
  const tx = db.transaction("accepted", "readonly");
  const index = tx.objectStore("accepted").index("byStudent");
  const rows = await new Promise<LocalAcceptedScan[]>((resolve, reject) => {
    const req = index.getAll(studentId);
    req.onsuccess = () => resolve((req.result as LocalAcceptedScan[]) || []);
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
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

export async function pendingCount(): Promise<number> {
  const items = await listPendingScans();
  return items.length;
}
