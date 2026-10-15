import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess, requireSchoolContext } from "@/lib/api-auth";
import { ensureBoardToken } from "@/lib/board";
import {
  boardAppearanceFromConfig,
  normalizeAccentColor,
} from "@/lib/board-settings";

function canEditSchool(role: string) {
  return role === "ADMIN" || role === "SCHOOL_ADMIN" || role === "REGISTRAR";
}

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
  flashSeconds: z.coerce.number().int().min(3).max(30).optional(),
});

export async function GET(req: NextRequest) {
  const { session, schoolId, error } = await requireSchoolContext();
  if (error) return error;

  await ensureBoardToken(schoolId!);
  const config = await prisma.schoolHardwareConfig.findUnique({
    where: { schoolId: schoolId! },
  });

  const origin = req.nextUrl.origin;
  const token = config?.boardToken || "";

  return apiSuccess({
    boardUrl: token ? `${origin}/board/${token}` : "",
    boardDemoUrl: token ? `${origin}/board/${token}?demo=1` : "",
    appearance: boardAppearanceFromConfig(config),
    canEdit: canEditSchool(session!.user.role),
  });
}

export async function PUT(req: NextRequest) {
  const { session, schoolId, error } = await requireSchoolContext();
  if (error) return error;

  if (!canEditSchool(session!.user.role)) {
    return apiError("Only admins or registrars can edit the info board.", 403);
  }

  const parsed = boardSettingsSchema.safeParse(await req.json());
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message || "Invalid settings");
  }

  const d = parsed.data;
  await ensureBoardToken(schoolId!);

  const config = await prisma.schoolHardwareConfig.update({
    where: { schoolId: schoolId! },
    data: {
      boardHeadline: d.headline?.trim() || null,
      boardSubtitle: d.subtitle?.trim() || null,
      boardAnnouncement: d.announcement?.trim() || null,
      boardAnnouncementOn: d.announcementOn ?? true,
      boardWelcomeText: d.welcomeText?.trim() || null,
      boardFooterText: d.footerText?.trim() || null,
      boardAccentColor: normalizeAccentColor(d.accentColor),
      boardShowClock: d.showClock ?? true,
      boardFlashSeconds: d.flashSeconds ?? 7,
    },
  });

  return apiSuccess({
    appearance: boardAppearanceFromConfig(config),
  });
}
