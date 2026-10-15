"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2, Monitor, ScanLine } from "lucide-react";
import {
  DEFAULT_BOARD_APPEARANCE,
  type BoardAppearance,
} from "@/lib/board-settings";

type BoardSchool = {
  name: string;
  code: string;
  logoUrl: string | null;
};

type BoardStudent = {
  id: string;
  studentId: string;
  fullName: string;
  recordType: string;
  gradeLabel: string;
  section: string;
  photoUrl: string | null;
  schoolYearName: string;
  allowed: boolean;
};

type FlashState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; student: BoardStudent; at: number }
  | { kind: "miss"; code: string; at: number };

function InfoBoardPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = String(params.token || "");
  const demoMode = searchParams.get("demo") === "1";
  const [school, setSchool] = useState<BoardSchool | null>(null);
  const [appearance, setAppearance] = useState<BoardAppearance>(
    DEFAULT_BOARD_APPEARANCE
  );
  const [error, setError] = useState("");
  const [flash, setFlash] = useState<FlashState>({ kind: "idle" });
  const [clock, setClock] = useState("");
  const bufferRef = useRef("");
  const lastKeyAt = useRef(0);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanningRef = useRef(false);
  const flashMsRef = useRef(DEFAULT_BOARD_APPEARANCE.flashSeconds * 1000);

  useEffect(() => {
    flashMsRef.current = appearance.flashSeconds * 1000;
  }, [appearance.flashSeconds]);

  const applyScanResult = useCallback(
    (
      data: {
        found?: boolean;
        student?: BoardStudent | null;
        scannedCode?: string;
      },
      fallbackCode: string
    ) => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
      if (data.found && data.student) {
        setFlash({ kind: "ok", student: data.student, at: Date.now() });
      } else {
        setFlash({
          kind: "miss",
          code: data.scannedCode || fallbackCode,
          at: Date.now(),
        });
      }
      flashTimer.current = setTimeout(
        () => setFlash({ kind: "idle" }),
        flashMsRef.current
      );
    },
    []
  );

  useEffect(() => {
    if (!token) return;
    const looksLikePlaceholder =
      /^<?(your-token|secret-token|token|boardtoken)>?$/i.test(token) ||
      token.includes("<") ||
      token.includes("%3C");

    if (looksLikePlaceholder) {
      setError(
        "This URL still has a placeholder token. In SIMS go to Settings → Info board → Copy link."
      );
      return;
    }

    fetch(`/api/board/${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          throw new Error(
            data.error === "Info board not found"
              ? "Info board not found. Open Settings → Info board and use Copy link / Open board."
              : data.error || "Board not found"
          );
        }
        setSchool(data.school);
        if (data.appearance) setAppearance(data.appearance);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Could not load board")
      );
  }, [token]);

  useEffect(() => {
    if (!appearance.showClock) return;
    const tick = () => {
      setClock(
        new Date().toLocaleString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [appearance.showClock]);

  const runScan = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed || !token || scanningRef.current) return;
      scanningRef.current = true;
      setFlash({ kind: "loading" });
      try {
        const res = await fetch(
          `/api/board/${encodeURIComponent(token)}/scan`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: trimmed }),
          }
        );
        const data = await res.json();
        applyScanResult(data, trimmed);
      } catch {
        applyScanResult({ found: false }, trimmed);
      } finally {
        scanningRef.current = false;
      }
    },
    [token, applyScanResult]
  );

  const runDummyScan = useCallback(
    async (scenario: "welcome" | "staff" | "unknown" | "inactive") => {
      if (scanningRef.current) return;
      scanningRef.current = true;
      setFlash({ kind: "loading" });
      try {
        const res = await fetch("/api/dummy/board", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenario }),
        });
        const data = await res.json();
        applyScanResult(data, scenario);
      } catch {
        applyScanResult({ found: false }, scenario);
      } finally {
        scanningRef.current = false;
      }
    },
    [applyScanResult]
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const now = Date.now();
      if (now - lastKeyAt.current > 800) bufferRef.current = "";
      lastKeyAt.current = now;

      if (e.key === "Enter") {
        e.preventDefault();
        const code = bufferRef.current;
        bufferRef.current = "";
        if (code) void runScan(code);
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        bufferRef.current += e.key;
        if (bufferRef.current.length > 128) {
          bufferRef.current = bufferRef.current.slice(-128);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [runScan]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center text-white">
        <div>
          <Monitor className="mx-auto mb-4 h-12 w-12 text-slate-500" />
          <p className="text-xl font-semibold">Info board unavailable</p>
          <p className="mt-2 max-w-md text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-10 w-10 animate-spin text-sky-400" />
      </div>
    );
  }

  const flashing = flash.kind === "ok" || flash.kind === "miss";
  const accent = appearance.accentColor;

  return (
    <div
      className={`relative flex min-h-screen flex-col overflow-hidden text-white transition-colors duration-300 ${
        flash.kind === "ok"
          ? "bg-emerald-950"
          : flash.kind === "miss"
            ? "bg-red-950"
            : "bg-slate-950"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 opacity-40 ${
          flashing
            ? "animate-pulse bg-gradient-to-b from-white/10 to-transparent"
            : ""
        }`}
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-4 md:px-10">
        <div className="flex items-center gap-3">
          {school.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={school.logoUrl}
              alt=""
              className="h-12 w-12 rounded-lg bg-white/10 object-contain md:h-16 md:w-16"
            />
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg md:h-16 md:w-16"
              style={{ backgroundColor: `${accent}33` }}
            >
              <Monitor className="h-7 w-7" style={{ color: accent }} />
            </div>
          )}
          <div>
            <p className="text-lg font-semibold tracking-tight md:text-2xl">
              {school.name}
            </p>
            <p className="text-xs text-white/60 md:text-sm">Entry info board</p>
          </div>
        </div>
        {appearance.showClock && (
          <p className="font-mono text-sm text-white/70 md:text-base">{clock}</p>
        )}
      </header>

      {appearance.announcementOn && appearance.announcement.trim() && (
        <div className="relative z-10 px-4 md:px-10">
          <div
            className="overflow-hidden rounded-lg px-4 py-2.5 text-center text-sm font-medium md:text-base"
            style={{
              backgroundColor: `${accent}22`,
              color: accent,
              border: `1px solid ${accent}55`,
            }}
          >
            <p className="animate-pulse md:animate-none">
              {appearance.announcement}
            </p>
          </div>
        </div>
      )}

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-16">
        {flash.kind === "idle" && (
          <div className="max-w-2xl text-center">
            <ScanLine
              className="mx-auto mb-6 h-20 w-20 animate-pulse md:h-28 md:w-28"
              style={{ color: accent }}
            />
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
              {appearance.headline}
            </h1>
            <p className="mt-4 text-base text-white/60 md:text-xl">
              {appearance.subtitle}
            </p>
          </div>
        )}

        {flash.kind === "loading" && (
          <Loader2
            className="h-16 w-16 animate-spin"
            style={{ color: accent }}
          />
        )}

        {flash.kind === "ok" && (
          <div
            key={flash.at}
            className="flex w-full max-w-5xl flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-300 md:flex-row md:items-center md:justify-center md:gap-12"
          >
            <div className="relative">
              <div className="absolute -inset-2 animate-pulse rounded-3xl bg-emerald-400/40 blur-xl" />
              {flash.student.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={flash.student.photoUrl}
                  alt=""
                  className="relative h-56 w-44 rounded-2xl border-4 border-emerald-300 object-cover shadow-2xl md:h-80 md:w-64"
                />
              ) : (
                <div className="relative flex h-56 w-44 items-center justify-center rounded-2xl border-4 border-emerald-300 bg-emerald-900 text-4xl font-bold md:h-80 md:w-64">
                  {flash.student.fullName.slice(0, 1)}
                </div>
              )}
            </div>
            <div className="text-center md:text-left">
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300 md:text-base">
                {appearance.welcomeText}
              </p>
              <h2 className="text-4xl font-bold leading-tight md:text-6xl">
                {flash.student.fullName}
              </h2>
              <p className="mt-3 text-xl text-white/80 md:text-2xl">
                {flash.student.gradeLabel}
                {flash.student.section ? ` · ${flash.student.section}` : ""}
              </p>
              <p className="mt-2 font-mono text-base text-white/50 md:text-lg">
                {flash.student.studentId}
                {flash.student.recordType === "TEACHER" ? " · Staff" : ""}
              </p>
            </div>
          </div>
        )}

        {flash.kind === "miss" && (
          <div
            key={flash.at}
            className="max-w-xl text-center animate-in fade-in zoom-in-95 duration-300"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-300">
              Not recognized
            </p>
            <h2 className="mt-3 text-4xl font-bold md:text-5xl">
              No match found
            </h2>
            <p className="mt-4 break-all font-mono text-white/50">
              {flash.code}
            </p>
            <p className="mt-6 text-white/60">
              Check card encoding or student record for this school year.
            </p>
          </div>
        )}
      </main>

      {demoMode && (
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 px-4 pb-3">
          <span className="text-xs text-white/40">Dummy API test:</span>
          {(
            [
              ["welcome", "Welcome"],
              ["staff", "Staff"],
              ["unknown", "Unknown"],
              ["inactive", "Inactive"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => void runDummyScan(key)}
              className="rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white/90 hover:bg-white/20"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <footer className="relative z-10 px-6 pb-4 text-center text-xs text-white/35">
        {appearance.footerText}
      </footer>
    </div>
  );
}

export default function InfoBoardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <Loader2 className="h-10 w-10 animate-spin text-sky-400" />
        </div>
      }
    >
      <InfoBoardPageContent />
    </Suspense>
  );
}
