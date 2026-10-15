import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess, requireSchoolContext } from "@/lib/api-auth";
import { ensureBoardToken, newBoardToken } from "@/lib/board";

function canEditSchool(role: string) {
  return role === "ADMIN" || role === "SCHOOL_ADMIN";
}

export async function GET(req: NextRequest) {
  const { session, schoolId, error } = await requireSchoolContext();
  if (error) return error;

  const token = await ensureBoardToken(schoolId!);
  const origin = req.nextUrl.origin;
  return apiSuccess({
    boardToken: token,
    boardUrl: `${origin}/board/${token}`,
    canEdit: canEditSchool(session!.user.role),
  });
}

/** Regenerate board URL (invalidates old link). */
export async function POST() {
  const { session, schoolId, error } = await requireSchoolContext();
  if (error) return error;

  if (!canEditSchool(session!.user.role)) {
    return apiError("Only admins can regenerate the info board link.", 403);
  }

  const token = newBoardToken();
  await prisma.schoolHardwareConfig.upsert({
    where: { schoolId: schoolId! },
    create: { schoolId: schoolId!, boardToken: token },
    update: { boardToken: token },
  });

  return apiSuccess({ boardToken: token });
}
