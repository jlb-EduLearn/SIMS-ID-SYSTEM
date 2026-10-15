import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess, requireFullContext } from "@/lib/api-auth";
import { copyStaffToSchoolYear } from "@/lib/copy-staff-to-year";

export async function POST(req: NextRequest) {
  const { schoolId, schoolYearId, error } = await requireFullContext();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const targetId =
    typeof body.targetSchoolYearId === "string"
      ? body.targetSchoolYearId
      : schoolYearId!;
  const explicitSource =
    typeof body.sourceSchoolYearId === "string"
      ? body.sourceSchoolYearId
      : "";

  const targetYear = await prisma.schoolYear.findFirst({
    where: { id: targetId, schoolId: schoolId!, isActive: true },
  });
  if (!targetYear) return apiError("Target school year not found", 404);

  const sourceYear = explicitSource
    ? await prisma.schoolYear.findFirst({
        where: {
          id: explicitSource,
          schoolId: schoolId!,
          isActive: true,
        },
      })
    : await prisma.schoolYear.findFirst({
        where: {
          schoolId: schoolId!,
          isActive: true,
          id: { not: targetId },
        },
        orderBy: { name: "desc" },
      });

  if (!sourceYear) {
    return apiError("No prior school year to copy employees from");
  }

  const staffCopy = await copyStaffToSchoolYear(
    schoolId!,
    sourceYear.id,
    targetYear.id
  );

  return apiSuccess({
    sourceSchoolYearName: sourceYear.name,
    targetSchoolYearName: targetYear.name,
    staffCopy,
  });
}
