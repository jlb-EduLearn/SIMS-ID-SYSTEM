"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, ScanLine, School } from "lucide-react";
import { displayScannerLogin } from "@/lib/scanner-auth";
import { SCANNER_POPUP_MS } from "@/lib/scanner-cooldown";

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
  gradeLabel?: string | null;
  section?: string | null;
  photoUrl?: string | null;
  recordType?: string | null;
  allowed?: boolean;
  isStaff?: boolean;
};

type PopupState = {
  kind: "success" | "already" | "miss";
  message: string;
  student: ScanPerson | null;
  code: string;
};

export function ScannerStation() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [school, setSchool] = useState<ScannerSchool | null>(null);
  const [stationName, setStationName] = useState("");
  const [login, setLogin] = useState("");
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const lastCodeRef = useRef<string>("");
  const lastAtRef = useRef(0);
  const popupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      if (popupTimer.current) clearTimeout(popupTimer.current);
    };
  }, []);

  const showPopup = useCallback((next: PopupState) => {
    if (popupTimer.current) clearTimeout(popupTimer.current);
    setPopup(next);
    popupTimer.current = setTimeout(() => {
      setPopup(null);
    }, SCANNER_POPUP_MS);
  }, []);

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
      const res = await fetch("/api/scanner/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      setBusy(false);

      if (!res.ok) {
        showPopup({
          kind: "miss",
          message: data.error || "Scan failed",
          student: null,
          code: trimmed,
        });
        return;
      }

      if (data.alreadyScanned) {
        showPopup({
          kind: "already",
          message: data.message || "Already scanned",
          student: data.student || null,
          code: trimmed,
        });
        return;
      }

      if (data.found && data.student) {
        showPopup({
          kind: "success",
          message: data.message || "Welcome",
          student: data.student,
          code: trimmed,
        });
        return;
      }

      showPopup({
        kind: "miss",
        message: data.message || "No matching student or card",
        student: null,
        code: trimmed,
      });
    },
    [busy, popup, showPopup]
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
    <div className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-2">
      <section className="relative flex flex-col border-b border-white/10 lg:border-b-0 lg:border-r">
        <header className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-2 text-sky-200">
            <ScanLine className="h-5 w-5" />
            <div>
              <p className="text-sm font-semibold tracking-wide text-white">
                QR Scanner Station
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
            paused={Boolean(popup) || busy}
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
              Checking scan…
            </div>
          )}
        </div>

        <p className="px-5 pb-5 text-sm text-slate-400">
          Point the camera at a student ID QR code. Each ID can be accepted once
          every 5 minutes.
        </p>
      </section>

      <section className="relative flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_70%_30%,#1d4ed8_0%,#0b1220_50%)] p-8 text-center">
        <div className="absolute inset-0 bg-[linear-gradient(160deg,transparent_40%,rgba(14,165,233,0.12))]" />

        <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-6">
          {!popup && (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-sky-200">
              <School className="h-10 w-10" />
            </div>
          )}

          {/* Same panel: school logo idle, student photo + details for 5s after scan */}
          <div
            className={`w-full overflow-hidden rounded-3xl border bg-white/95 p-8 shadow-2xl transition-all duration-300 ${
              popup?.kind === "success"
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
                  className="mx-auto max-h-56 w-auto object-contain"
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
                    popup.kind === "success"
                      ? "text-emerald-600"
                      : popup.kind === "already"
                        ? "text-amber-600"
                        : "text-rose-600"
                  }`}
                >
                  {popup.kind === "success"
                    ? "Scan accepted"
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
                        className="mx-auto h-52 w-52 rounded-2xl object-cover shadow-lg ring-4 ring-slate-100"
                      />
                    ) : (
                      <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-2xl bg-slate-100 text-5xl font-semibold text-slate-500">
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
                    popup.kind === "success"
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
            </div>
          ) : (
            <p className="text-sm text-sky-100/80">
              Returning to school logo in 5 seconds…
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
