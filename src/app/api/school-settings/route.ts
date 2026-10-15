import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess, requireSchoolContext } from "@/lib/api-auth";
import { schoolLogoSchema } from "@/lib/validations";

function canEditSchool(role: string) {
  return role === "ADMIN" || role === "SCHOOL_ADMIN";
}

export async function GET() {
  const { session, schoolId, error } = await requireSchoolContext();
  if (error) return error;

  const school = await prisma.school.findUnique({
    where: { id: schoolId! },
    select: { id: true, name: true, code: true, logoUrl: true },
  });

  if (!school) return apiError("School not found", 404);

  return apiSuccess({
    school,
    canEdit: canEditSchool(session!.user.role),
  });
}

export async function PATCH(req: NextRequest) {
  const { session, schoolId, error } = await requireSchoolContext();
  if (error) return error;

  if (!canEditSchool(session!.user.role)) {
    return apiError("Only admins can change the school logo.", 403);
  }

  const parsed = schoolLogoSchema.safeParse(await req.json());
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message || "Invalid logo");
  }

  const school = await prisma.school.update({
    where: { id: schoolId! },
    data: { logoUrl: parsed.data.logoUrl },
    select: { id: true, name: true, code: true, logoUrl: true },
  });

  return apiSuccess({ school });
}
