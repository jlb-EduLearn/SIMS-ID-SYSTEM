"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, ScanLine, School } from "lucide-react";
import { displayScannerLogin } from "@/lib/scanner-auth";

type ScannerSchool = {
  id: string;
  name: string;
  code: string;
  logoUrl: string | null;
  address: string | null;
};

type ScanPerson = {
  id: string;
  studentId: string;
  fullName: string;
  category?: string | null;
  grade?: string | null;
  section?: string | null;
  photoUrl?: string | null;
  recordType?: string | null;
  allowed?: boolean;
};

type LastScan = {
  found: boolean;
  message: string;
  code: string;
  student: ScanPerson | null;
  at: number;
};

export function ScannerStation() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [school, setSchool] = useState<ScannerSchool | null>(null);
  const [stationName, setStationName] = useState("");
  const [login, setLogin] = useState("");
  const [lastScan, setLastScan] = useState<LastScan | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const lastCodeRef = useRef<string>("");
  const lastAtRef = useRef(0);

  const loadContext = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/scanner/context");
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not load scanner station.");
      return;
    }

    setSchool(data.school);
    setStationName(data.stationName || "");
    setLogin(data.login || "");
  }, []);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const postScan = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    const now = Date.now();
    if (
      trimmed === lastCodeRef.current &&
      now - lastAtRef.current < 2500
    ) {
      return;
    }
    lastCodeRef.current = trimmed;
    lastAtRef.current = now;

    setBusy(true);
    const res = await fetch("/api/scanner/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: trimmed }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setLastScan({
        found: false,
        message: data.error || "Scan failed",
        code: trimmed,
        student: null,
        at: Date.now(),
      });
      return;
    }

    setLastScan({
      found: Boolean(data.found),
      message: data.message || (data.found ? "Welcome" : "Not found"),
      code: trimmed,
      student: data.student || null,
      at: Date.now(),
    });
  }, []);

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

  return (
    <div className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-2">
      <section className="relative flex flex-col border-b border-white/10 lg:border-b-0 lg:border-r">
        <header className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-2 text-sky-200">
            <ScanLine className="h-5 w-5" />
            <div>
              <p className="text-sm font-semibold tracking-wide text-white">
                QR Scanner
              </p>
              <p className="text-xs text-slate-400">
                {displayScannerLogin(login)} · {stationName}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-slate-300 hover:bg-white/10 hover:text-white"
            onClick={() => signOut({ callbackUrl: "/scanner" })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </header>

        <div className="relative mx-5 mb-5 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
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
            styles={{
              container: { width: "100%", height: "100%" },
              video: { objectFit: "cover" },
            }}
            components={{ finder: true, torch: true }}
          />
          {cameraError && (
            <div className="absolute inset-x-0 bottom-0 bg-rose-950/80 px-4 py-3 text-sm text-rose-100">
              {cameraError}. Allow camera access, then refresh.
            </div>
          )}
          {busy && (
            <div className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-sky-200">
              Sending to info board…
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          <div
            className={`rounded-xl border px-4 py-3 ${
              lastScan?.found
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                : lastScan
                  ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
                  : "border-white/10 bg-white/5 text-slate-300"
            }`}
          >
            {!lastScan ? (
              <p className="text-sm">Point the camera at a student ID QR code.</p>
            ) : lastScan.found && lastScan.student ? (
              <div className="flex items-center gap-3">
                {lastScan.student.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={lastScan.student.photoUrl}
                    alt=""
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white/10 text-lg font-semibold">
                    {lastScan.student.fullName.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-white">
                    {lastScan.student.fullName}
                  </p>
                  <p className="truncate text-sm opacity-90">
                    {lastScan.student.studentId}
                    {lastScan.student.grade ? ` · ${lastScan.student.grade}` : ""}
                    {lastScan.student.section
                      ? ` · Sec ${lastScan.student.section}`
                      : ""}
                  </p>
                  <p className="text-xs opacity-80">{lastScan.message} · sent to info board</p>
                </div>
              </div>
            ) : (
              <p className="text-sm">
                {lastScan.message}
                {lastScan.code ? ` (${lastScan.code})` : ""}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="relative flex flex-col items-center justify-center gap-8 bg-[radial-gradient(circle_at_70%_30%,#1d4ed8_0%,#0b1220_50%)] p-8 text-center">
        <div className="absolute inset-0 bg-[linear-gradient(160deg,transparent_40%,rgba(14,165,233,0.12))]" />
        <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-sky-200">
            <School className="h-10 w-10" />
          </div>

          <div className="w-full overflow-hidden rounded-3xl border border-white/15 bg-white/95 p-8 shadow-2xl">
            {school.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={school.logoUrl}
                alt={`${school.name} logo`}
                className="mx-auto max-h-56 w-auto object-contain"
              />
            ) : (
              <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-slate-700">
                <School className="h-12 w-12 text-slate-400" />
                <p className="text-sm">No school logo uploaded yet</p>
              </div>
            )}
          </div>

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
            <p className="pt-2 text-xs text-slate-400">
              Successful scans appear on this school&apos;s lobby info board.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
