export type BoardAppearance = {
  headline: string;
  subtitle: string;
  announcement: string;
  announcementOn: boolean;
  welcomeText: string;
  footerText: string;
  accentColor: string;
  showClock: boolean;
  flashSeconds: number;
};

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
  flashSeconds: 7,
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
  boardFlashSeconds?: number | null;
};

export function normalizeAccentColor(value: string | null | undefined): string {
  let v = (value || "").trim();
  if (!v) return DEFAULT_BOARD_APPEARANCE.accentColor;
  if (!v.startsWith("#")) v = `#${v}`;
  // Expand #rgb → #rrggbb
  if (/^#[0-9A-Fa-f]{3}$/.test(v)) {
    const [, r, g, b] = v;
    v = `#${r}${r}${g}${g}${b}${b}`;
  }
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v.toLowerCase();
  return DEFAULT_BOARD_APPEARANCE.accentColor;
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
    flashSeconds:
      typeof flash === "number" && flash >= 3 && flash <= 30
        ? flash
        : DEFAULT_BOARD_APPEARANCE.flashSeconds,
  };
}
