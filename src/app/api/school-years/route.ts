import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSchoolContext,
  apiSuccess,
  apiError,
} from "@/lib/api-auth";
import { schoolYearSchema } from "@/lib/validations";
import { copyStaffToSchoolYear } from "@/lib/copy-staff-to-year";

export async function GET() {
  const { session, schoolId, error } = await requireSchoolContext();
  if (error) return error;

  const schoolYears = await prisma.schoolYear.findMany({
    where: { schoolId: schoolId!, isActive: true },
    orderBy: { name: "desc" },
  });
  const counts = await prisma.student.groupBy({
    by: ["schoolYearId"],
    where: {
      schoolId: schoolId!,
      isActive: true,
      schoolYearId: { in: schoolYears.map((year) => year.id) },
    },
    _count: true,
  });
  const countMap = new Map(
    counts.map((count) => [count.schoolYearId, count._count])
  );

  return apiSuccess({
    schoolYears: schoolYears.map((year) => ({
      ...year,
      _count: { students: countMap.get(year.id) || 0 },
    })),
    currentSchoolYearId: session!.user.currentSchoolYearId,
  });
}

export async function POST(req: NextRequest) {
  const { session, schoolId, error } = await requireSchoolContext();
  if (error) return error;

  const body = await req.json();

  // Select existing school year
  if (body.schoolYearId) {
    const year = await prisma.schoolYear.findFirst({
      where: { id: body.schoolYearId, schoolId: schoolId!, isActive: true },
    });
    if (!year) return apiError("School year not found", 404);
    return apiSuccess({
      schoolYearId: year.id,
      schoolYearName: year.name,
    });
  }

  // Create new school year
  const parsed = schoolYearSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message || "Invalid data");
  }

  const existing = await prisma.schoolYear.findUnique({
    where: {
      schoolId_name: { schoolId: schoolId!, name: parsed.data.name },
    },
  });

  if (existing) {
    return apiError("This school year already exists");
  }

  const schoolYear = await prisma.schoolYear.create({
    data: {
      schoolId: schoolId!,
      name: parsed.data.name,
      isCurrent: body.isCurrent ?? false,
    },
  });

  if (body.isCurrent) {
    await prisma.schoolYear.updateMany({
      where: { schoolId: schoolId!, id: { not: schoolYear.id } },
      data: { isCurrent: false },
    });
  }

  let staffCopy = { created: 0, updated: 0, total: 0 };
  const explicitSource =
    typeof body.copyStaffFromSchoolYearId === "string"
      ? body.copyStaffFromSchoolYearId
      : "";
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
          id: { not: schoolYear.id },
        },
        orderBy: { name: "desc" },
      });

  if (sourceYear) {
    staffCopy = await copyStaffToSchoolYear(
      schoolId!,
      sourceYear.id,
      schoolYear.id
    );
  }

  return apiSuccess({ ...schoolYear, staffCopy }, 201);
}
