"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { Scanner, useDevices } from "@yudiel/react-qr-scanner";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  LogOut,
  ScanLine,
  School,
  Wifi,
  WifiOff,
  RefreshCw,
  SwitchCamera,
  CloudUpload,
} from "lucide-react";
import { displayScannerLogin } from "@/lib/scanner-auth";
import {
  SCANNER_POPUP_MS,
  formatCooldownRemaining,
} from "@/lib/scanner-cooldown";
import {
  enqueuePendingScan,
  listPendingScans,
  loadScannerMeta,
  lookupDirectoryPerson,
  pendingCount,
  recordLocalAccepted,
  removePendingScan,
  replaceDirectory,
  saveScannerMeta,
  wasRecentlyAcceptedLocally,
  type CachedSchool,
  type DirectoryPerson,
} from "@/lib/scanner-offline-store";

type ScanPerson = {
  id: string;
  studentId: string;
  fullName: string;
  gradeLabel?: string | null;
  grade?: string | null;
  section?: string | null;
  photoUrl?: string | null;
  allowed?: boolean;
  isStaff?: boolean;
};

type PopupState = {
  kind: "success" | "already" | "miss" | "queued";
  message: string;
  student: ScanPerson | null;
  offline?: boolean;
};

type Facing = "environment" | "user";

const CAMERA_FACING_KEY = "sims-scanner-facing";
const CAMERA_DEVICE_KEY = "sims-scanner-device";

function personFromDirectory(p: DirectoryPerson): ScanPerson {
  return {
    id: p.id,
    studentId: p.studentId,
    fullName: p.fullName,
    gradeLabel: p.gradeLabel,
    section: p.section,
    photoUrl: p.photoUrl,
    allowed: p.allowed,
    isStaff: p.isStaff,
  };
}

export function ScannerStation() {
  const devices = useDevices();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [school, setSchool] = useState<CachedSchool | null>(null);
  const [stationName, setStationName] = useState("");
  const [login, setLogin] = useState("");
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [directoryCount, setDirectoryCount] = useState(0);
  const [directorySyncedAt, setDirectorySyncedAt] = useState<number | null>(
    null
  );
  const [facing, setFacing] = useState<Facing>("environment");
  const [deviceId, setDeviceId] = useState<string>("");
  const lastCodeRef = useRef<string>("");
  const lastAtRef = useRef(0);
  const popupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncingRef = useRef(false);

  const refreshPending = useCallback(async () => {
    setPending(await pendingCount());
  }, []);

  const cacheDirectory = useCallback(async () => {
    const res = await fetch("/api/scanner/directory");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Directory sync failed");
    await replaceDirectory(data.people || []);
    setDirectoryCount(data.count || 0);
    const syncedAt = Date.now();
    setDirectorySyncedAt(syncedAt);
    return syncedAt;
  }, []);

  const loadContext = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Prefer live context; fall back to IndexedDB when offline.
    try {
      if (navigator.onLine) {
        const res = await fetch("/api/scanner/context");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not load scanner.");

        setSchool(data.school);
        setStationName(data.stationName || "");
        setLogin(data.login || "");

        const syncedAt = await cacheDirectory();
        await saveScannerMeta({
          school: data.school,
          stationName: data.stationName || "",
          login: data.login || "",
          directorySyncedAt: syncedAt,
        });
      } else {
        const meta = await loadScannerMeta();
        if (!meta.school) {
          throw new Error(
            "Offline and no cached school data. Connect once to download the student directory."
          );
        }
        setSchool(meta.school);
        setStationName(meta.stationName);
        setLogin(meta.login);
        setDirectorySyncedAt(meta.directorySyncedAt);
      }
      await refreshPending();
      setLoading(false);
    } catch (e) {
      const meta = await loadScannerMeta().catch(() => null);
      if (meta?.school) {
        setSchool(meta.school);
        setStationName(meta.stationName);
        setLogin(meta.login);
        setDirectorySyncedAt(meta.directorySyncedAt);
        setError(null);
        setLoading(false);
        await refreshPending();
        return;
      }
      setError(e instanceof Error ? e.message : "Could not load scanner station.");
      setLoading(false);
    }
  }, [cacheDirectory, refreshPending]);

  const flushPending = useCallback(async () => {
    if (!navigator.onLine || syncingRef.current) return;
    const items = await listPendingScans();
    if (items.length === 0) {
      await refreshPending();
      return;
    }

    syncingRef.current = true;
    setSyncing(true);
    try {
      const res = await fetch("/api/scanner/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scans: items.map((i) => ({
            id: i.id,
            code: i.code,
            scannedAt: i.scannedAt,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Sync failed");

      const results = Array.isArray(data.results) ? data.results : [];
      for (const result of results) {
        const clientId = result.clientId as string | undefined;
        if (!clientId) continue;
        if (result.error) continue;
        await removePendingScan(clientId);
        if (result.found && !result.alreadyScanned && result.student?.id) {
          await recordLocalAccepted(
            result.student.id,
            result.scannedAt ? new Date(result.scannedAt).getTime() : Date.now()
          );
        }
      }
      await refreshPending();
    } catch {
      /* keep pending for next online attempt */
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      await refreshPending();
    }
  }, [refreshPending]);

  useEffect(() => {
    const storedFacing = localStorage.getItem(CAMERA_FACING_KEY) as Facing | null;
    if (storedFacing === "user" || storedFacing === "environment") {
      setFacing(storedFacing);
    }
    const storedDevice = localStorage.getItem(CAMERA_DEVICE_KEY) || "";
    if (storedDevice) setDeviceId(storedDevice);
  }, []);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  useEffect(() => {
    function onOnline() {
      setOnline(true);
      void loadContext().then(() => flushPending());
    }
    function onOffline() {
      setOnline(false);
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [flushPending, loadContext]);

  useEffect(() => {
    if (!online) return;
    const t = setInterval(() => {
      void flushPending();
    }, 20_000);
    return () => clearInterval(t);
  }, [online, flushPending]);

  useEffect(() => {
    return () => {
      if (popupTimer.current) clearTimeout(popupTimer.current);
    };
  }, []);

  const showPopup = useCallback((next: PopupState) => {
    if (popupTimer.current) clearTimeout(popupTimer.current);
    setPopup(next);
    popupTimer.current = setTimeout(() => setPopup(null), SCANNER_POPUP_MS);
  }, []);

  const setFacingMode = (next: Facing) => {
    setFacing(next);
    setDeviceId("");
    localStorage.setItem(CAMERA_FACING_KEY, next);
    localStorage.removeItem(CAMERA_DEVICE_KEY);
  };

  const cameraConstraints = useMemo(() => {
    if (deviceId) return { deviceId: { exact: deviceId } };
    return { facingMode: facing };
  }, [deviceId, facing]);

  const postScan = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed || busy || popup) return;

      const now = Date.now();
      if (trimmed === lastCodeRef.current && now - lastAtRef.current < 2000) {
        return;
      }
      lastCodeRef.current = trimmed;
      lastAtRef.current = now;
      setBusy(true);

      try {
        if (!navigator.onLine) {
          const person = await lookupDirectoryPerson(trimmed);
          if (person) {
            const cool = await wasRecentlyAcceptedLocally(person.id, now);
            if (cool.blocked) {
              showPopup({
                kind: "already",
                message: `Already scanned — try again in ${formatCooldownRemaining(cool.remainingMs)}`,
                student: personFromDirectory(person),
                offline: true,
              });
              return;
            }
            await enqueuePendingScan(trimmed, now);
            await recordLocalAccepted(person.id, now);
            await refreshPending();
            showPopup({
              kind: "queued",
              message: "Saved offline — will sync when online",
              student: personFromDirectory(person),
              offline: true,
            });
            return;
          }

          await enqueuePendingScan(trimmed, now);
          await refreshPending();
          showPopup({
            kind: "miss",
            message: "No match in offline directory — queued for server check",
            student: null,
            offline: true,
          });
          return;
        }

        // Online path
        const pendingItem = await enqueuePendingScan(trimmed, now);
        const res = await fetch("/api/scanner/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: trimmed,
            scannedAt: now,
            clientId: pendingItem.id,
          }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          // Keep queued for retry
          showPopup({
            kind: "miss",
            message: data.error || "Scan failed — kept in offline queue",
            student: null,
            offline: true,
          });
          await refreshPending();
          return;
        }

        await removePendingScan(pendingItem.id);
        if (data.found && !data.alreadyScanned && data.student?.id) {
          await recordLocalAccepted(data.student.id, now);
        }
        await refreshPending();

        if (data.alreadyScanned) {
          showPopup({
            kind: "already",
            message: data.message || "Already scanned",
            student: data.student || null,
          });
          return;
        }

        if (data.found && data.student) {
          showPopup({
            kind: "success",
            message: data.message || "Welcome",
            student: data.student,
          });
          return;
        }

        showPopup({
          kind: "miss",
          message: data.message || "No matching student or card",
          student: null,
        });
      } finally {
        setBusy(false);
      }
    },
    [busy, popup, refreshPending, showPopup]
  );

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-sky-300" />
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="max-w-md text-rose-200">
          {error || "Scanner station is not available for this account."}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void loadContext()}>
            Retry
          </Button>
          <Button
            variant="outline"
            className="border-white/20 bg-transparent text-white"
            onClick={() => signOut({ callbackUrl: "/scanner" })}
          >
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  const gradeLine =
    popup?.student?.gradeLabel ||
    popup?.student?.grade ||
    (popup?.student?.isStaff ? "Staff" : "");

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0b1220]/95 px-4 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300">
            <ScanLine className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-wide text-white">
              {school.name}
            </p>
            <p className="truncate text-xs text-slate-400">
              {displayScannerLogin(login)} · {stationName}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              online
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-amber-500/15 text-amber-200"
            }`}
          >
            {online ? (
              <Wifi className="h-3.5 w-3.5" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" />
            )}
            {online ? "Online" : "Offline"}
            {pending > 0 ? ` · ${pending} queued` : ""}
          </div>

          <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-0.5">
            <Button
              size="sm"
              variant={facing === "environment" && !deviceId ? "secondary" : "ghost"}
              className="h-8 rounded-md px-3 text-xs"
              onClick={() => setFacingMode("environment")}
            >
              Back cam
            </Button>
            <Button
              size="sm"
              variant={facing === "user" && !deviceId ? "secondary" : "ghost"}
              className="h-8 rounded-md px-3 text-xs"
              onClick={() => setFacingMode("user")}
            >
              Front cam
            </Button>
          </div>

          {devices.length > 1 && (
            <select
              className="h-8 max-w-[10rem] rounded-md border border-white/15 bg-black/40 px-2 text-xs text-white"
              value={deviceId}
              onChange={(e) => {
                const value = e.target.value;
                setDeviceId(value);
                if (value) localStorage.setItem(CAMERA_DEVICE_KEY, value);
                else localStorage.removeItem(CAMERA_DEVICE_KEY);
              }}
            >
              <option value="">Auto camera</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
                </option>
              ))}
            </select>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-slate-300 hover:bg-white/10 hover:text-white"
            disabled={!online || syncing}
            onClick={() => {
              void cacheDirectory()
                .then(async (syncedAt) => {
                  if (school) {
                    await saveScannerMeta({
                      school,
                      stationName,
                      login,
                      directorySyncedAt: syncedAt,
                    });
                  }
                  await flushPending();
                })
                .catch(() => undefined);
            }}
          >
            {syncing ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            Sync
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-slate-300 hover:bg-white/10 hover:text-white"
            onClick={() => signOut({ callbackUrl: "/scanner" })}
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative flex min-h-[45dvh] flex-col border-b border-white/10 p-4 lg:min-h-0 lg:border-b-0 lg:border-r">
          <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/50 shadow-2xl">
            <Scanner
              onScan={(codes) => {
                const value = codes[0]?.rawValue;
                if (value) void postScan(value);
              }}
              onError={(err) => {
                setCameraError(err?.message || "Camera unavailable");
              }}
              formats={["qr_code"]}
              sound
              allowMultiple
              scanDelay={1800}
              paused={Boolean(popup) || busy}
              constraints={cameraConstraints}
              styles={{
                container: { width: "100%", height: "100%" },
                video: { objectFit: "cover" },
              }}
              components={{ finder: true, torch: true }}
            />
            {cameraError && (
              <div className="absolute inset-x-0 bottom-0 bg-rose-950/85 px-4 py-3 text-sm text-rose-100">
                {cameraError}. Allow camera access, then refresh. Use Front/Back
                to switch lenses.
              </div>
            )}
            {busy && (
              <div className="absolute right-3 top-3 rounded-full bg-black/65 px-3 py-1 text-xs text-sky-200">
                Checking scan…
              </div>
            )}
            <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[11px] text-slate-200">
              <SwitchCamera className="h-3.5 w-3.5" />
              {deviceId
                ? "Selected camera"
                : facing === "user"
                  ? "Front camera"
                  : "Back camera"}
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-400">
            Tablet landscape mode: scan on the left, student card on the right.
            Offline scans queue locally and sync when Wi‑Fi returns.
            {directorySyncedAt
              ? ` Directory cached ${new Date(directorySyncedAt).toLocaleString()}${
                  directoryCount ? ` (${directoryCount} people)` : ""
                }.`
              : ""}
          </p>
        </section>

        <section className="relative flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_70%_28%,#1d4ed8_0%,#0b1220_52%)] p-6 text-center lg:p-10">
          <div className="absolute inset-0 bg-[linear-gradient(160deg,transparent_40%,rgba(14,165,233,0.12))]" />

          <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-5">
            {!popup && (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-sky-200">
                <School className="h-8 w-8" />
              </div>
            )}

            <div
              className={`w-full overflow-hidden rounded-3xl border bg-white/95 p-7 shadow-2xl transition-all duration-300 ${
                popup?.kind === "success" || popup?.kind === "queued"
                  ? "border-emerald-400/60"
                  : popup?.kind === "already"
                    ? "border-amber-400/60"
                    : popup?.kind === "miss"
                      ? "border-rose-400/60"
                      : "border-white/15"
              }`}
            >
              {!popup ? (
                school.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={school.logoUrl}
                    alt={`${school.name} logo`}
                    className="mx-auto max-h-52 w-auto object-contain"
                  />
                ) : (
                  <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-slate-700">
                    <School className="h-12 w-12 text-slate-400" />
                    <p className="text-sm">No school logo uploaded yet</p>
                  </div>
                )
              ) : (
                <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
                  <p
                    className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                      popup.kind === "success" || popup.kind === "queued"
                        ? "text-emerald-600"
                        : popup.kind === "already"
                          ? "text-amber-600"
                          : "text-rose-600"
                    }`}
                  >
                    {popup.kind === "success"
                      ? "Scan accepted"
                      : popup.kind === "queued"
                        ? "Saved offline"
                        : popup.kind === "already"
                          ? "Already scanned"
                          : "Not recognized"}
                  </p>

                  {popup.student ? (
                    <>
                      {popup.student.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={popup.student.photoUrl}
                          alt={popup.student.fullName}
                          className="mx-auto h-48 w-48 rounded-2xl object-cover shadow-lg ring-4 ring-slate-100 sm:h-56 sm:w-56"
                        />
                      ) : (
                        <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-2xl bg-slate-100 text-5xl font-semibold text-slate-500 sm:h-56 sm:w-56">
                          {popup.student.fullName.slice(0, 1)}
                        </div>
                      )}
                      <div className="space-y-1 text-slate-900">
                        <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
                          {popup.student.fullName}
                        </p>
                        <p className="text-base text-slate-600">
                          {popup.student.studentId}
                        </p>
                        <p className="text-sm text-slate-500">
                          {[gradeLine, popup.student.section]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="flex min-h-40 items-center justify-center">
                      <p className="text-lg text-slate-700">{popup.message}</p>
                    </div>
                  )}

                  <p
                    className={`text-sm font-medium ${
                      popup.kind === "success" || popup.kind === "queued"
                        ? "text-emerald-700"
                        : popup.kind === "already"
                          ? "text-amber-700"
                          : "text-rose-700"
                    }`}
                  >
                    {popup.message}
                  </p>
                </div>
              )}
            </div>

            {!popup ? (
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {school.name}
                </h2>
                <p className="text-sm uppercase tracking-[0.2em] text-sky-200/80">
                  {school.code}
                </p>
                {school.address && (
                  <p className="mx-auto max-w-md text-sm text-slate-300">
                    {school.address}
                  </p>
                )}
                {pending > 0 && (
                  <p className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-100">
                    <CloudUpload className="h-3.5 w-3.5" />
                    {pending} scan{pending === 1 ? "" : "s"} waiting to sync
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-sky-100/80">
                Returning to school logo in 5 seconds…
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
