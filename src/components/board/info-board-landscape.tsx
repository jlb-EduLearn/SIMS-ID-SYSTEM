"use client";

import { useEffect, useRef, useState } from "react";
import {
  Cloud,
  CloudRain,
  CloudSun,
  Loader2,
  Megaphone,
  ScanLine,
  Sun,
  UserRound,
  Wind,
} from "lucide-react";
import {
  type BoardAppearance,
  type BoardClockParts,
} from "@/lib/board-settings";
import { boardTone } from "@/lib/board-theme";
import type { BoardWeatherSnapshot } from "@/lib/board-weather";

type BoardTone = ReturnType<typeof boardTone>;

export type BoardPerson = {
  id: string;
  studentId: string;
  fullName: string;
  recordType: string;
  gradeLabel: string;
  section: string;
  photoUrl: string | null;
  schoolYearName: string;
  allowed: boolean;
  isStaff?: boolean;
};

export type BoardEntryHistoryItem = {
  id: string;
  enteredAt: string;
  person: BoardPerson;
};

type BoardSchool = {
  name: string;
  code: string;
  logoUrl: string | null;
};

function WeatherIcon({
  icon,
  className,
}: {
  icon: BoardWeatherSnapshot["icon"];
  className?: string;
}) {
  const cn = className || "h-8 w-8";
  switch (icon) {
    case "clear":
      return <Sun className={cn} />;
    case "rain":
      return <CloudRain className={cn} />;
    case "storm":
      return <Wind className={cn} />;
    case "fog":
      return <Cloud className={cn} />;
    default:
      return <CloudSun className={cn} />;
  }
}

function Panel({
  children,
  className = "",
  accentTop,
  ringClass,
}: {
  children: React.ReactNode;
  className?: string;
  accentTop?: boolean;
  ringClass?: string;
}) {
  return (
    <div
      className={`board-panel overflow-hidden ${accentTop ? "board-panel-accent-top" : ""} ${ringClass || ""} ${className}`}
    >
      {children}
    </div>
  );
}

function SectionLabel({
  icon: Icon,
  label,
  accent,
  tone,
  trailing,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  accent: string;
  tone: BoardTone;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${accent}18`, color: accent }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <span
        className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${tone.label}`}
      >
        {label}
      </span>
      {trailing ? <div className="ml-auto">{trailing}</div> : null}
    </div>
  );
}

export function AnnouncementTicker({
  text,
  textClassName = "text-sm font-medium text-white/85 lg:text-[15px]",
}: {
  text: string;
  textClassName?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [durationSec, setDurationSec] = useState(28);
  const [marqueeOffsetPx, setMarqueeOffsetPx] = useState(0);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    const measure = () => {
      setMarqueeOffsetPx(viewport.clientWidth);
      const halfWidth = track.scrollWidth / 2;
      setDurationSec(Math.max(14, Math.min(120, halfWidth / 72)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(viewport);
    ro.observe(track);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div ref={viewportRef} className="min-w-0 flex-1 overflow-hidden">
      <div
        ref={trackRef}
        className={`animate-board-marquee flex w-max whitespace-nowrap ${textClassName}`}
        style={
          {
            "--board-marquee-duration": `${durationSec}s`,
            "--board-marquee-offset": `${marqueeOffsetPx}px`,
          } as React.CSSProperties
        }
      >
        <span className="pr-16">{text}</span>
        <span className="pr-16" aria-hidden>
          {text}
        </span>
      </div>
    </div>
  );
}

function ScanCanvasPanel({
  flashKind,
  appearance,
  accent,
  person,
  missCode,
  flashAt,
  tone,
}: {
  flashKind: "idle" | "loading" | "ok" | "miss";
  appearance: BoardAppearance;
  accent: string;
  person: BoardPerson | null;
  missCode?: string;
  flashAt?: number;
  tone: BoardTone;
}) {
  const isStaff = person?.isStaff || person?.recordType === "TEACHER";
  const ringClass =
    flashKind === "miss"
      ? "ring-2 ring-red-400/35"
      : flashKind === "ok" && person
        ? !person.allowed
          ? "ring-2 ring-amber-400/40"
          : isStaff
            ? "ring-2 ring-violet-400/35"
            : "ring-2 ring-teal-400/35"
        : undefined;

  if (flashKind === "loading") {
    return (
      <Panel accentTop className="flex h-full min-h-[280px] flex-1 flex-col items-center justify-center p-10 lg:min-h-0">
        <Loader2 className="h-14 w-14 animate-spin" style={{ color: accent }} />
        <p className={`mt-5 text-sm font-medium ${tone.label}`}>Looking up ID…</p>
      </Panel>
    );
  }

  if (flashKind === "miss") {
    return (
      <Panel ringClass="ring-2 ring-red-400/35" className="flex h-full min-h-[280px] flex-1 flex-col items-center justify-center p-10 text-center lg:min-h-0">
        <p className="rounded-full bg-red-500/15 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-200">
          Not recognized
        </p>
        <h2 className={`mt-5 text-3xl font-semibold tracking-tight lg:text-4xl ${tone.heading}`}>
          No match found
        </h2>
        {missCode && (
          <p className={`mt-4 max-w-md break-all font-mono text-xs ${tone.faint}`}>
            {missCode}
          </p>
        )}
        <div className="mt-8 w-full max-w-xs">
          <p className={`mb-2 text-xs ${tone.faint}`}>
            Returning in {appearance.flashSeconds}s
          </p>
          <div className={`h-1 overflow-hidden rounded-full ${tone.progressTrack}`}>
            <div
              className="board-countdown-bar h-full origin-left rounded-full bg-red-400/80"
              style={
                {
                  animationDuration: `${appearance.flashSeconds}s`,
                } as React.CSSProperties
              }
            />
          </div>
        </div>
      </Panel>
    );
  }

  if (flashKind === "ok" && person) {
    return (
      <Panel
        accentTop
        ringClass={ringClass}
        className="flex h-full min-h-[280px] flex-1 flex-col lg:min-h-0"
        key={flashAt}
      >
        <div
          className={`relative flex min-h-[44%] flex-1 items-center justify-center px-6 py-6 ${tone.scanPhotoBg}`}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background: `radial-gradient(circle at 50% 30%, ${accent}33, transparent 65%)`,
            }}
          />
          {person.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.photoUrl}
              alt=""
              className={`relative max-h-full max-w-[min(100%,240px)] rounded-2xl object-cover object-top shadow-2xl ring-1 ring-white/20 lg:max-w-[300px] ${
                isStaff
                  ? "outline outline-2 outline-violet-400/50"
                  : "outline outline-2 outline-teal-400/50"
              }`}
              style={{ height: "min(100%, 340px)" }}
            />
          ) : (
            <div
              className={`relative flex h-52 w-40 items-center justify-center rounded-2xl text-5xl font-semibold shadow-2xl ring-1 ring-white/15 lg:h-60 lg:w-48 lg:text-6xl ${
                isStaff
                  ? "bg-violet-950/80 text-violet-100"
                  : "bg-teal-950/80 text-teal-100"
              }`}
            >
              {person.fullName.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="flex flex-col items-center px-8 py-6 text-center">
          <div className="mb-3 flex flex-wrap justify-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                isStaff
                  ? "bg-violet-500/25 text-violet-100"
                  : "bg-teal-500/25 text-teal-100"
              }`}
            >
              {isStaff ? "Staff" : "Student"}
            </span>
            {!person.allowed && (
              <span className="rounded-full bg-amber-500/25 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-100">
                Inactive
              </span>
            )}
          </div>
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.28em]"
            style={{ color: accent }}
          >
            {appearance.welcomeText}
          </p>
          <h2
            className={`mt-2 text-2xl font-semibold leading-tight tracking-tight lg:text-4xl xl:text-[2.75rem] ${tone.heading}`}
          >
            {person.fullName}
          </h2>
          <p className={`mt-3 text-base lg:text-lg ${tone.bodySoft}`}>
            {person.gradeLabel}
            {person.section ? (
              <span className={tone.label}> · {person.section}</span>
            ) : null}
          </p>
          <p className={`mt-2 font-mono text-xs lg:text-sm ${tone.faint}`}>
            ID {person.studentId}
          </p>
        </div>
        <div className={`mt-auto border-t px-8 pb-6 pt-4 ${tone.footerBorder}`}>
          <div className={`h-1 overflow-hidden rounded-full ${tone.progressTrack}`}>
            <div
              className="board-countdown-bar h-full origin-left rounded-full"
              style={
                {
                  backgroundColor: accent,
                  animationDuration: `${appearance.flashSeconds}s`,
                } as React.CSSProperties
              }
            />
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel accentTop className="flex h-full min-h-[280px] flex-1 flex-col items-center justify-center px-8 py-10 text-center lg:min-h-0 lg:px-12">
      <div className="relative mb-10 flex h-32 w-32 items-center justify-center lg:h-40 lg:w-40">
        <div
          className="board-scan-ring absolute inset-0 rounded-full border"
          style={{ borderColor: `${accent}55` }}
        />
        <div
          className="board-scan-ring board-scan-ring-delay absolute inset-2 rounded-full border"
          style={{ borderColor: `${accent}33` }}
        />
        <div
          className="relative flex h-24 w-24 items-center justify-center rounded-full lg:h-28 lg:w-28"
          style={{
            background: `linear-gradient(145deg, ${accent}28, ${accent}08)`,
            boxShadow: `0 0 0 1px ${accent}40, 0 8px 32px ${accent}25`,
          }}
        >
          <ScanLine className="h-12 w-12 lg:h-14 lg:w-14" style={{ color: accent }} />
        </div>
      </div>
      <h1
        className={`max-w-xl text-2xl font-semibold leading-snug tracking-tight lg:text-4xl xl:text-[2.5rem] ${tone.heading}`}
      >
        {appearance.headline}
      </h1>
      <p
        className={`mt-4 max-w-md text-sm leading-relaxed lg:text-base ${tone.label}`}
      >
        {appearance.subtitle}
      </p>
    </Panel>
  );
}

function CenterTimeWeatherPanel({
  appearance,
  accent,
  clock,
  dateLine,
  weather,
  tone,
}: {
  appearance: BoardAppearance;
  accent: string;
  clock: BoardClockParts;
  dateLine: string;
  weather: BoardWeatherSnapshot | null;
  tone: BoardTone;
}) {
  const showClockBlock = appearance.showClock || appearance.showDate;
  const showWeatherBlock = appearance.showWeather && weather;

  if (!showClockBlock && !showWeatherBlock) return null;

  return (
    <Panel
      accentTop
      className="flex h-full min-h-[280px] w-full flex-1 flex-col items-center justify-center px-6 py-10 text-center lg:min-h-0 lg:px-10 lg:py-12"
    >
      <div className="flex w-full max-w-md flex-col items-center justify-center gap-10">
        {showClockBlock && (
          <div className="flex w-full flex-col items-center [&_.ml-auto]:hidden">
            <SectionLabel
              icon={Sun}
              label="Local time"
              accent={accent}
              tone={tone}
            />
            {appearance.showClock && (
              <div className="mt-5 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1">
                <span
                  className="font-mono text-[2.75rem] font-light tabular-nums tracking-tight lg:text-6xl xl:text-7xl"
                  style={{ color: accent }}
                >
                  {clock.hour}:{clock.minute}
                </span>
                <span className={`font-mono text-2xl tabular-nums lg:text-3xl ${tone.ghost}`}>
                  :{clock.second}
                </span>
                <span
                  className={`text-xl font-medium uppercase tracking-wide lg:text-2xl ${tone.label}`}
                >
                  {clock.dayPeriod}
                </span>
              </div>
            )}
            {appearance.showDate && (
              <p
                className={`text-sm font-medium lg:text-base ${tone.label} ${appearance.showClock ? "mt-3" : "mt-5"}`}
              >
                {dateLine}
              </p>
            )}
          </div>
        )}

        {showClockBlock && showWeatherBlock && (
          <div className={`h-px w-full max-w-xs ${tone.divider}`} aria-hidden />
        )}

        {showWeatherBlock && weather && (
          <div className="flex w-full flex-col items-center">
            <SectionLabel
              icon={CloudSun}
              label="Weather"
              accent={accent}
              tone={tone}
            />
            <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl lg:h-[4.5rem] lg:w-[4.5rem]"
                style={{ backgroundColor: `${accent}14`, color: accent }}
              >
                <WeatherIcon icon={weather.icon} className="h-9 w-9" />
              </div>
              <div className="min-w-0 text-center sm:text-left">
                <p
                  className={`text-4xl font-light tabular-nums tracking-tight lg:text-5xl ${tone.heading}`}
                >
                  {weather.temperatureC}
                  <span className={`text-xl ${tone.label}`}>°C</span>
                </p>
                <p className={`mt-0.5 text-sm ${tone.bodySoft}`}>
                  {weather.description}
                </p>
                <p className={`text-xs ${tone.faint}`}>{weather.locationLabel}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

function formatEntryTime(iso: string, timeZone?: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timeZone || undefined,
    });
  } catch {
    return "";
  }
}

function EntryHistoryPanel({
  appearance,
  accent,
  entries,
  highlightPersonId,
  tone,
}: {
  appearance: BoardAppearance;
  accent: string;
  entries: BoardEntryHistoryItem[];
  highlightPersonId?: string | null;
  tone: BoardTone;
}) {
  const tz = appearance.timezone || undefined;

  return (
    <Panel accentTop className="flex h-full min-h-[280px] flex-1 flex-col lg:min-h-0">
      <div className="shrink-0 p-5 lg:p-6">
        <SectionLabel
          icon={UserRound}
          label="Today's entries"
          accent={accent}
          tone={tone}
          trailing={
            entries.length > 0 ? (
              <span className={`text-[10px] tabular-nums ${tone.ghost}`}>
                {entries.length}
              </span>
            ) : null
          }
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 lg:px-4 lg:pb-4">
        {entries.length === 0 ? (
          <div className="flex h-full min-h-[160px] flex-col items-center justify-center px-4 text-center">
            <p className={`text-sm font-medium ${tone.label}`}>No entries yet</p>
            <p className={`mt-2 text-xs leading-relaxed ${tone.ghost}`}>
              Successful scans appear here with photo, grade, and section.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry, index) => {
              const person = entry.person;
              const isStaff =
                person.isStaff || person.recordType === "TEACHER";
              const highlighted =
                highlightPersonId != null && person.id === highlightPersonId;
              return (
                <li
                  key={entry.id}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                    highlighted
                      ? tone.entryRowLive
                      : index === 0 && !highlightPersonId
                        ? tone.entryRowTop
                        : tone.entryRow
                  }`}
                >
                  {person.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={person.photoUrl}
                      alt=""
                      className={`h-12 w-10 shrink-0 rounded-lg object-cover object-top ring-1 ring-white/15 ${
                        isStaff ? "outline outline-1 outline-violet-400/40" : ""
                      }`}
                    />
                  ) : (
                    <div
                      className={`flex h-12 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ring-1 ring-white/10 ${
                        isStaff
                          ? "bg-violet-950/70 text-violet-100"
                          : "bg-teal-950/70 text-teal-100"
                      }`}
                    >
                      {person.fullName.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${tone.body}`}>
                      {person.fullName}
                    </p>
                    <p className={`truncate text-xs ${tone.label}`}>
                      {person.gradeLabel}
                      {person.section ? ` · ${person.section}` : ""}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[10px] tabular-nums ${tone.ghost}`}>
                    {formatEntryTime(entry.enteredAt, tz)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {appearance.footerText ? (
        <p
          className={`mt-auto shrink-0 border-t px-5 py-4 text-[11px] leading-relaxed lg:px-6 ${tone.footerBorder} ${tone.faint}`}
        >
          {appearance.footerText}
        </p>
      ) : null}
    </Panel>
  );
}

export function InfoBoardLandscape({
  school,
  appearance,
  weather,
  dateLine,
  clock,
  flashKind,
  flashPerson,
  entryHistory,
  missCode,
  flashAt,
  accent,
}: {
  school: BoardSchool;
  appearance: BoardAppearance;
  weather: BoardWeatherSnapshot | null;
  dateLine: string;
  clock: BoardClockParts;
  flashKind: "idle" | "loading" | "ok" | "miss";
  flashPerson: BoardPerson | null;
  entryHistory: BoardEntryHistoryItem[];
  missCode?: string;
  flashAt?: number;
  accent: string;
}) {
  const highlightPersonId =
    flashKind === "ok" && flashPerson ? flashPerson.id : null;
  const showAnnouncement =
    appearance.announcementOn && appearance.announcement.trim().length > 0;
  const tone = boardTone(appearance.theme);

  return (
    <div
      className={`relative flex h-[100dvh] w-[100dvw] flex-col overflow-hidden ${tone.root}`}
      data-board-theme={appearance.theme}
      style={
        {
          ["--board-accent" as string]: accent,
          ["--board-accent-soft" as string]: `${accent}22`,
        } as React.CSSProperties
      }
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{ background: tone.canvasBg }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        aria-hidden
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {showAnnouncement && (
        <div
          className={`relative z-10 flex shrink-0 items-center gap-3 border-b px-5 py-3 lg:px-10 lg:py-3.5 ${tone.announcementBar}`}
        >
          <Megaphone className="h-4 w-4 shrink-0" style={{ color: accent }} />
          <span
            className="shrink-0 text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: accent }}
          >
            Announcement
          </span>
          <AnnouncementTicker
            text={appearance.announcement.trim()}
            textClassName={`text-sm font-medium lg:text-[15px] ${tone.marquee}`}
          />
        </div>
      )}

      <header className="relative z-10 flex shrink-0 items-center gap-4 px-5 py-4 lg:px-10 lg:py-5">
        <div className="flex min-w-0 items-center gap-4">
          {school.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={school.logoUrl}
              alt=""
              className={`h-12 w-12 shrink-0 rounded-xl object-contain p-1 ring-1 lg:h-14 lg:w-14 ${tone.logoBox}`}
            />
          ) : (
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold ring-1 lg:h-14 lg:w-14 ${tone.logoBox}`}
              style={{ backgroundColor: `${accent}20`, color: accent }}
            >
              {school.name.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0">
            <p
              className={`truncate text-lg font-semibold tracking-tight lg:text-xl ${tone.heading}`}
            >
              {school.name}
            </p>
            <p
              className={`text-[10px] font-medium uppercase tracking-[0.28em] ${tone.headerSub}`}
            >
              Entry display
            </p>
          </div>
        </div>
      </header>

      <main className="relative z-10 grid min-h-0 flex-1 grid-cols-12 gap-3 px-5 pb-5 lg:gap-5 lg:px-10 lg:pb-8">
        <section className="col-span-12 flex min-h-0 lg:col-span-5">
          <ScanCanvasPanel
            flashKind={flashKind}
            appearance={appearance}
            accent={accent}
            person={flashPerson}
            missCode={missCode}
            flashAt={flashAt}
            tone={tone}
          />
        </section>

        <section className="col-span-12 flex min-h-0 lg:col-span-4">
          <CenterTimeWeatherPanel
            appearance={appearance}
            accent={accent}
            clock={clock}
            dateLine={dateLine}
            weather={weather}
            tone={tone}
          />
        </section>

        <section className="col-span-12 flex min-h-0 lg:col-span-3">
          <EntryHistoryPanel
            appearance={appearance}
            accent={accent}
            entries={entryHistory}
            highlightPersonId={highlightPersonId}
            tone={tone}
          />
        </section>
      </main>
    </div>
  );
}
