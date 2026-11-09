import { prisma } from "@/lib/db";
import {
  apiError,
  apiSuccess,
  formatPrismaClientError,
  requireSchoolContext,
} from "@/lib/api-auth";
import { ensureBoardToken } from "@/lib/board";

function isScannerRole(role: string) {
  return role === "SCANNER";
}

export async function GET() {
  try {
    const { session, schoolId, error } = await requireSchoolContext();
    if (error) return error;

    if (!isScannerRole(session!.user.role)) {
      return apiError("Scanner login required.", 403);
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId! },
      select: {
        id: true,
        name: true,
        code: true,
        logoUrl: true,
        address: true,
      },
    });

    if (!school) return apiError("School not found.", 404);

    await ensureBoardToken(schoolId!);

    return apiSuccess({
      school,
      stationName: session!.user.name,
      login: session!.user.email,
    });
  } catch (e) {
    console.error("[scanner context]", e);
    return apiError(formatPrismaClientError(e), 500);
  }
}
