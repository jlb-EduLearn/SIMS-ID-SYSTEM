import { normalizeBoardTheme, type BoardTheme } from "@/lib/board-theme";

export type { BoardTheme };

export type BoardUpcomingEvent = {
  title: string;
  /** Prefer YYYY-MM-DD; free text is shown as-is if not parseable */
  eventDate: string;
  eventTime?: string;
  location?: string;
};

export type BoardAppearance = {
  headline: string;
  subtitle: string;
  announcement: string;
  announcementOn: boolean;
  welcomeText: string;
  footerText: string;
  accentColor: string;
  showClock: boolean;
  showDate: boolean;
  showWeather: boolean;
  weatherLocation: string;
  timezone: string;
  flashSeconds: number;
  showEvents: boolean;
  upcomingEvents: BoardUpcomingEvent[];
  theme: BoardTheme;
};

export const MAX_BOARD_UPCOMING_EVENTS = 8;

export const DEFAULT_BOARD_APPEARANCE: BoardAppearance = {
  headline: "Please tap ID or scan QR",
  subtitle: "RFID reader or QR scanner connected to this display",
  announcement: "",
  announcementOn: true,
  welcomeText: "Welcome",
  footerText:
    "Keep this page open on the lobby display · USB QR / RFID wedge scanners type into this screen",
  accentColor: "#38bdf8",
  showClock: true,
  showDate: true,
  showWeather: true,
  weatherLocation: "Cebu, Philippines",
  timezone: "",
  flashSeconds: 5,
  showEvents: true,
  upcomingEvents: [],
  theme: "dark",
};

type BoardConfigSource = {
  boardHeadline?: string | null;
  boardSubtitle?: string | null;
  boardAnnouncement?: string | null;
  boardAnnouncementOn?: boolean | null;
  boardWelcomeText?: string | null;
  boardFooterText?: string | null;
  boardAccentColor?: string | null;
  boardShowClock?: boolean | null;
  boardShowDate?: boolean | null;
  boardShowWeather?: boolean | null;
  boardWeatherLocation?: string | null;
  boardTimezone?: string | null;
  boardFlashSeconds?: number | null;
  boardUpcomingEvents?: string | null;
  boardShowEvents?: boolean | null;
  boardTheme?: string | null;
};

export function normalizeAccentColor(value: string | null | undefined): string {
  let v = (value || "").trim();
  if (!v) return DEFAULT_BOARD_APPEARANCE.accentColor;
  if (!v.startsWith("#")) v = `#${v}`;
  if (/^#[0-9A-Fa-f]{3}$/.test(v)) {
    const [, r, g, b] = v;
    v = `#${r}${r}${g}${g}${b}${b}`;
  }
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v.toLowerCase();
  return DEFAULT_BOARD_APPEARANCE.accentColor;
}

export function parseBoardUpcomingEvents(
  raw: string | null | undefined
): BoardUpcomingEvent[] {
  if (!raw?.trim()) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    const out: BoardUpcomingEvent[] = [];
    for (const item of data) {
      if (!item || typeof item !== "object") continue;
      const title = String((item as BoardUpcomingEvent).title || "").trim();
      const eventDate = String(
        (item as BoardUpcomingEvent).eventDate || ""
      ).trim();
      if (!title || !eventDate) continue;
      out.push({
        title: title.slice(0, 120),
        eventDate: eventDate.slice(0, 32),
        eventTime: (item as BoardUpcomingEvent).eventTime?.trim().slice(0, 32),
        location: (item as BoardUpcomingEvent).location?.trim().slice(0, 120),
      });
      if (out.length >= MAX_BOARD_UPCOMING_EVENTS) break;
    }
    return out;
  } catch {
    return [];
  }
}

export function serializeBoardUpcomingEvents(
  events: BoardUpcomingEvent[]
): string {
  const cleaned = events
    .map((e) => ({
      title: e.title.trim(),
      eventDate: e.eventDate.trim(),
      eventTime: e.eventTime?.trim() || undefined,
      location: e.location?.trim() || undefined,
    }))
    .filter((e) => e.title && e.eventDate)
    .slice(0, MAX_BOARD_UPCOMING_EVENTS);
  return JSON.stringify(cleaned);
}

function eventSortKey(eventDate: string): number {
  const parsed = Date.parse(eventDate);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

/** Today and future events, soonest first. Unparseable dates sort last. */
export function sortUpcomingBoardEvents(
  events: BoardUpcomingEvent[],
  timezone?: string
): BoardUpcomingEvent[] {
  const tz = timezone?.trim() || undefined;
  const todayParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const todayStart = Date.parse(todayParts);

  return [...events]
    .filter((e) => {
      const key = eventSortKey(e.eventDate);
      if (key === Number.MAX_SAFE_INTEGER) return true;
      if (!Number.isFinite(todayStart)) return true;
      return key >= todayStart;
    })
    .sort((a, b) => eventSortKey(a.eventDate) - eventSortKey(b.eventDate));
}

export function formatBoardEventDate(
  eventDate: string,
  timezone?: string
): string {
  const parsed = Date.parse(eventDate);
  if (!Number.isFinite(parsed)) return eventDate;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: timezone?.trim() || undefined,
  }).format(new Date(parsed));
}

export type BoardClockParts = {
  hour: string;
  minute: string;
  second: string;
  dayPeriod: string;
  /** Full string for compact headers */
  compact: string;
};

export function formatBoardClock(
  date: Date,
  timezone?: string
): BoardClockParts {
  const tz = timezone?.trim() || undefined;
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: tz,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const hour = get("hour");
  const minute = get("minute");
  const second = get("second");
  const dayPeriod = get("dayPeriod");
  return {
    hour,
    minute,
    second,
    dayPeriod,
    compact: `${hour}:${minute}:${second} ${dayPeriod}`.trim(),
  };
}

/** Payload for PUT /api/hardware/board-settings (camelCase API fields). */
export function boardSettingsToPayload(form: BoardAppearance) {
  const flash = Number(form.flashSeconds);
  return {
    headline: form.headline,
    subtitle: form.subtitle,
    announcement: form.announcement,
    announcementOn: form.announcementOn,
    welcomeText: form.welcomeText,
    footerText: form.footerText,
    accentColor: normalizeAccentColor(form.accentColor),
    showClock: form.showClock,
    showDate: form.showDate,
    showWeather: form.showWeather,
    weatherLocation: form.weatherLocation,
    timezone: form.timezone,
    flashSeconds: Number.isFinite(flash)
      ? Math.min(30, Math.max(3, Math.round(flash)))
      : DEFAULT_BOARD_APPEARANCE.flashSeconds,
    showEvents: form.showEvents,
    upcomingEvents: form.upcomingEvents,
    theme: normalizeBoardTheme(form.theme),
  };
}

export function boardAppearanceFromConfig(
  config: BoardConfigSource | null | undefined
): BoardAppearance {
  const flash = config?.boardFlashSeconds;
  return {
    headline:
      config?.boardHeadline?.trim() || DEFAULT_BOARD_APPEARANCE.headline,
    subtitle:
      config?.boardSubtitle?.trim() || DEFAULT_BOARD_APPEARANCE.subtitle,
    announcement: config?.boardAnnouncement?.trim() || "",
    announcementOn: config?.boardAnnouncementOn !== false,
    welcomeText:
      config?.boardWelcomeText?.trim() || DEFAULT_BOARD_APPEARANCE.welcomeText,
    footerText:
      config?.boardFooterText?.trim() || DEFAULT_BOARD_APPEARANCE.footerText,
    accentColor: normalizeAccentColor(config?.boardAccentColor),
    showClock: config?.boardShowClock !== false,
    showDate: config?.boardShowDate !== false,
    showWeather: config?.boardShowWeather !== false,
    weatherLocation:
      config?.boardWeatherLocation?.trim() ||
      DEFAULT_BOARD_APPEARANCE.weatherLocation,
    timezone: config?.boardTimezone?.trim() || "",
    flashSeconds:
      typeof flash === "number" && flash >= 3 && flash <= 30
        ? flash
        : DEFAULT_BOARD_APPEARANCE.flashSeconds,
    showEvents: config?.boardShowEvents !== false,
    upcomingEvents: parseBoardUpcomingEvents(config?.boardUpcomingEvents),
    theme: normalizeBoardTheme(config?.boardTheme),
  };
}
