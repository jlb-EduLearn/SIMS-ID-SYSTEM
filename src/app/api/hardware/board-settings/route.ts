import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  apiError,
  apiSuccess,
  formatPrismaClientError,
  requireSchoolContext,
} from "@/lib/api-auth";
import { ensureBoardToken } from "@/lib/board";
import {
  boardAppearanceFromConfig,
  normalizeAccentColor,
  serializeBoardUpcomingEvents,
} from "@/lib/board-settings";
import { normalizeBoardTheme } from "@/lib/board-theme";

function parseFlashSeconds(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(30, Math.max(3, Math.round(n)));
}

function canEditSchool(role: string) {
  return role === "ADMIN" || role === "SCHOOL_ADMIN" || role === "REGISTRAR";
}

const boardUpcomingEventSchema = z.object({
  title: z.string().min(1).max(120),
  eventDate: z.string().min(1).max(32),
  eventTime: z.string().max(32).optional().nullable(),
  location: z.string().max(120).optional().nullable(),
});

const boardSettingsSchema = z.object({
  headline: z.string().max(120).optional().nullable(),
  subtitle: z.string().max(240).optional().nullable(),
  announcement: z.string().max(500).optional().nullable(),
  announcementOn: z.boolean().optional(),
  welcomeText: z.string().max(80).optional().nullable(),
  footerText: z.string().max(240).optional().nullable(),
  // Accept any string; normalizeAccentColor falls back to default if invalid
  accentColor: z.string().max(32).optional().nullable(),
  showClock: z.boolean().optional(),
  showDate: z.boolean().optional(),
  showWeather: z.boolean().optional(),
  weatherLocation: z.string().max(120).optional().nullable(),
  timezone: z.string().max(64).optional().nullable(),
  flashSeconds: z.preprocess(parseFlashSeconds, z.number().int().min(3).max(30).optional()),
  showEvents: z.boolean().optional(),
  upcomingEvents: z.array(boardUpcomingEventSchema).max(8).optional(),
  theme: z.enum(["light", "dark"]).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { session, schoolId, error } = await requireSchoolContext();
    if (error) return error;

    await ensureBoardToken(schoolId!);
    const config = await prisma.schoolHardwareConfig.findUnique({
      where: { schoolId: schoolId! },
    });

    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") ?? "http";
    const origin = host ? `${proto}://${host}` : req.nextUrl.origin;
    const token = config?.boardToken || "";

    return apiSuccess({
      boardUrl: token ? `${origin}/board/${token}` : "",
      boardDemoUrl: token ? `${origin}/board/${token}?demo=1` : "",
      appearance: boardAppearanceFromConfig(config),
      canEdit: canEditSchool(session!.user.role),
    });
  } catch (e) {
    console.error("[board-settings GET]", e);
    return apiError(formatPrismaClientError(e), 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { session, schoolId, error } = await requireSchoolContext();
    if (error) return error;

    if (!canEditSchool(session!.user.role)) {
      return apiError("Only admins or registrars can edit the info board.", 403);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid request body.", 400);
    }

    const parsed = boardSettingsSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.errors[0];
      const path = issue?.path?.length ? `${issue.path.join(".")}: ` : "";
      return apiError(`${path}${issue?.message || "Invalid settings"}`);
    }

    const d = parsed.data;
    const boardToken = await ensureBoardToken(schoolId!);

    const boardData = {
      boardHeadline: d.headline?.trim() || null,
      boardSubtitle: d.subtitle?.trim() || null,
      boardAnnouncement: d.announcement?.trim() || null,
      boardAnnouncementOn: d.announcementOn ?? true,
      boardUpcomingEvents: serializeBoardUpcomingEvents(d.upcomingEvents ?? []),
      boardShowEvents: d.showEvents ?? true,
      boardWelcomeText: d.welcomeText?.trim() || null,
      boardFooterText: d.footerText?.trim() || null,
      boardAccentColor: normalizeAccentColor(d.accentColor),
      boardShowClock: d.showClock ?? true,
      boardShowDate: d.showDate ?? true,
      boardShowWeather: d.showWeather ?? true,
      boardWeatherLocation: d.weatherLocation?.trim() || null,
      boardTimezone: d.timezone?.trim() || null,
      boardFlashSeconds: d.flashSeconds ?? 5,
      boardTheme: normalizeBoardTheme(d.theme),
    };

    const config = await prisma.schoolHardwareConfig.upsert({
      where: { schoolId: schoolId! },
      create: {
        schoolId: schoolId!,
        boardToken,
        ...boardData,
      },
      update: boardData,
    });

    return apiSuccess({
      appearance: boardAppearanceFromConfig(config),
    });
  } catch (e) {
    console.error("[board-settings PUT]", e);
    return apiError(formatPrismaClientError(e), 500);
  }
}
