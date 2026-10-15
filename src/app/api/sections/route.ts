import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess, requireFullContext } from "@/lib/api-auth";
import { gradeSectionSchema } from "@/lib/validations";
import type { StudentCategory } from "@/lib/categories";

export async function GET(req: NextRequest) {
  const { schoolId, schoolYearId, error } = await requireFullContext();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || "";
  const grade = searchParams.get("grade") || "";
  const requestedSchoolYearId = searchParams.get("schoolYearId") || "";
  const targetSchoolYearId = requestedSchoolYearId || schoolYearId!;

  if (requestedSchoolYearId) {
    const targetYear = await prisma.schoolYear.findFirst({
      where: {
        id: requestedSchoolYearId,
        schoolId: schoolId!,
        isActive: true,
      },
    });
    if (!targetYear) return apiError("School year not found", 404);
  }

  const sections = await prisma.gradeSection.findMany({
    where: {
      schoolId: schoolId!,
      schoolYearId: targetSchoolYearId,
      isActive: true,
      ...(category ? { category: category as StudentCategory } : {}),
      ...(grade ? { grade } : {}),
    },
    orderBy: [{ grade: "asc" }, { name: "asc" }],
  });

  return apiSuccess({ sections });
}

export async function POST(req: NextRequest) {
  const { schoolId, schoolYearId, error } = await requireFullContext();
  if (error) return error;

  const body = await req.json();
  const parsed = gradeSectionSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message || "Invalid data");
  }

  const data = parsed.data;
  const existing = await prisma.gradeSection.findUnique({
    where: {
      schoolId_schoolYearId_grade_name: {
        schoolId: schoolId!,
        schoolYearId: schoolYearId!,
        grade: data.grade,
        name: data.name,
      },
    },
  });

  if (existing?.isActive) {
    return apiError("This section already exists for the selected grade");
  }

  const section = existing
    ? await prisma.gradeSection.update({
        where: { id: existing.id },
        data: { category: data.category, isActive: true },
      })
    : await prisma.gradeSection.create({
        data: {
          schoolId: schoolId!,
          schoolYearId: schoolYearId!,
          category: data.category,
          grade: data.grade,
          name: data.name,
        },
      });

  return apiSuccess(section, 201);
}

export async function DELETE(req: NextRequest) {
  const { schoolId, schoolYearId, error } = await requireFullContext();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return apiError("Section ID is required");

  const existing = await prisma.gradeSection.findUnique({ where: { id } });
  if (
    !existing ||
    existing.schoolId !== schoolId ||
    existing.schoolYearId !== schoolYearId
  ) {
    return apiError("Section not found", 404);
  }

  await prisma.gradeSection.update({
    where: { id },
    data: { isActive: false },
  });

  return apiSuccess({ success: true });
}
