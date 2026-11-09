"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2, Monitor } from "lucide-react";
import {
  DEFAULT_BOARD_APPEARANCE,
  formatBoardClock,
  type BoardAppearance,
  type BoardClockParts,
} from "@/lib/board-settings";
import type { BoardWeatherSnapshot } from "@/lib/board-weather";
import {
  InfoBoardLandscape,
  type BoardEntryHistoryItem,
  type BoardPerson,
} from "@/components/board/info-board-landscape";

type BoardSchool = {
  name: string;
  code: string;
  logoUrl: string | null;
};

type FlashState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; student: BoardPerson; at: number }
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
  const [weather, setWeather] = useState<BoardWeatherSnapshot | null>(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState<FlashState>({ kind: "idle" });
  const [entryHistory, setEntryHistory] = useState<BoardEntryHistoryItem[]>(
    []
  );
  const [dateLine, setDateLine] = useState("");
  const [clock, setClock] = useState<BoardClockParts>({
    hour: "12",
    minute: "00",
    second: "00",
    dayPeriod: "AM",
    compact: "12:00:00 AM",
  });
  const bufferRef = useRef("");
  const lastKeyAt = useRef(0);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanningRef = useRef(false);
  const flashMsRef = useRef(DEFAULT_BOARD_APPEARANCE.flashSeconds * 1000);
  const knownServerEntryIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    flashMsRef.current = appearance.flashSeconds * 1000;
  }, [appearance.flashSeconds]);

  const loadBoard = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`/api/board/${encodeURIComponent(token)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Board not found");
    setSchool(data.school);
    if (data.appearance) setAppearance(data.appearance);
  }, [token]);

  const loadWeather = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(
        `/api/board/${encodeURIComponent(token)}/weather`
      );
      const data = await res.json();
      if (res.ok && data.weather) setWeather(data.weather);
    } catch {
      /* optional */
    }
  }, [token]);

  const applyScanResult = useCallback(
    (
      data: {
        found?: boolean;
        student?: BoardPerson | null;
        scannedCode?: string;
      },
      fallbackCode: string
    ) => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
      if (data.found && data.student) {
        const at = Date.now();
        setEntryHistory((prev) =>
          [
            {
              id: `local-${at}`,
              enteredAt: new Date(at).toISOString(),
              person: data.student!,
            },
            ...prev,
          ].slice(0, 50)
        );
        setFlash({ kind: "ok", student: data.student, at });
      } else {
        setFlash({
          kind: "miss",
          code: data.scannedCode || fallbackCode,
          at: Date.now(),
        });
      }
      flashTimer.current = setTimeout(() => {
        setFlash({ kind: "idle" });
      }, flashMsRef.current);
    },
    []
  );

  const loadRecentEntries = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(
        `/api/board/${encodeURIComponent(token)}/recent-entries`
      );
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.entries)) return;
      const serverEntries = data.entries as BoardEntryHistoryItem[];

      const previousIds = knownServerEntryIds.current;
      const nextIds = new Set(serverEntries.map((e) => e.id));
      if (previousIds === null) {
        knownServerEntryIds.current = nextIds;
      } else {
        const newest = serverEntries.find((e) => !previousIds.has(e.id));
        knownServerEntryIds.current = nextIds;
        if (newest && !scanningRef.current) {
          applyScanResult(
            { found: true, student: newest.person },
            newest.person.studentId
          );
        }
      }

      setEntryHistory((prev) => {
        const locals = prev.filter((e) => e.id.startsWith("local-"));
        const onServer = new Set(serverEntries.map((e) => e.person.id));
        const keptLocals = locals.filter((e) => !onServer.has(e.person.id));
        return [...keptLocals, ...serverEntries].slice(0, 50);
      });
    } catch {
      /* optional */
    }
  }, [token, applyScanResult]);

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

    loadBoard().catch((e) =>
      setError(e instanceof Error ? e.message : "Could not load board")
    );
    loadWeather();
    void loadRecentEntries();

    // Poll recent entries often so remote QR station scans flash quickly.
    const entriesId = setInterval(() => {
      void loadRecentEntries();
    }, 3_000);
    const refreshId = setInterval(() => {
      loadBoard().catch(() => {});
      loadWeather();
    }, 60_000);
    const weatherId = setInterval(loadWeather, 15 * 60_000);

    return () => {
      clearInterval(entriesId);
      clearInterval(refreshId);
      clearInterval(weatherId);
    };
  }, [token, loadBoard, loadWeather, loadRecentEntries]);

  useEffect(() => {
    if (!appearance.showClock && !appearance.showDate) return;
    const tz = appearance.timezone || undefined;
    const tick = () => {
      const now = new Date();
      if (appearance.showDate) {
        setDateLine(
          now.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone: tz,
          })
        );
      }
      if (appearance.showClock) {
        setClock(formatBoardClock(now, tz));
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [appearance.showClock, appearance.showDate, appearance.timezone]);

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
      <div className="flex h-[100dvh] w-[100dvw] items-center justify-center bg-slate-950 px-6 text-center text-white">
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
      <div className="flex h-[100dvh] w-[100dvw] items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-10 w-10 animate-spin text-sky-400" />
      </div>
    );
  }

  const accent = appearance.accentColor;
  const flashKind =
    flash.kind === "idle"
      ? "idle"
      : flash.kind === "loading"
        ? "loading"
        : flash.kind === "ok"
          ? "ok"
          : "miss";

  return (
    <>
      <InfoBoardLandscape
        school={school}
        appearance={appearance}
        weather={weather}
        dateLine={dateLine}
        clock={clock}
        flashKind={flashKind}
        flashPerson={flash.kind === "ok" ? flash.student : null}
        entryHistory={entryHistory}
        missCode={flash.kind === "miss" ? flash.code : undefined}
        flashAt={flash.kind === "ok" ? flash.at : undefined}
        accent={accent}
      />
      {demoMode && (
        <div className="fixed bottom-3 left-1/2 z-50 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-full border border-white/20 bg-black/60 px-4 py-2 backdrop-blur-md">
          <span className="text-xs text-white/50">Demo:</span>
          {(
            [
              ["welcome", "Student"],
              ["staff", "Staff"],
              ["unknown", "Unknown"],
              ["inactive", "Inactive"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => void runDummyScan(key)}
              className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export default function InfoBoardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] w-[100dvw] items-center justify-center bg-slate-950 text-white">
          <Loader2 className="h-10 w-10 animate-spin text-sky-400" />
        </div>
      }
    >
      <InfoBoardPageContent />
    </Suspense>
  );
}
