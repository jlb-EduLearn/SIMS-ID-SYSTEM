import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess, requireSchoolContext } from "@/lib/api-auth";
import type { StudentCategory } from "@/lib/categories";
import { pickProfileFromDb } from "@/lib/student-db-map";

type RouteParams = { params: Promise<{ id: string }> };

async function getSourceStudent(id: string, schoolId: string) {
  const source = await prisma.student.findFirst({
    where: { id, schoolId, isActive: true },
  });

  if (!source) return null;
  return source;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = await requireSchoolContext();
  if (error) return error;

  const { id } = await params;
  const source = await getSourceStudent(id, schoolId!);
  if (!source) return apiError("Student not found", 404);

  const enrollments = await prisma.student.findMany({
    where: {
      schoolId: schoolId!,
      studentId: source.studentId,
      recordType: source.recordType,
      isActive: true,
    },
    include: {
      schoolYear: { select: { id: true, name: true, isCurrent: true } },
    },
    orderBy: { schoolYear: { name: "desc" } },
  });

  return apiSuccess({ enrollments });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = await requireSchoolContext();
  if (error) return error;

  const { id } = await params;
  const source = await getSourceStudent(id, schoolId!);
  if (!source) return apiError("Student not found", 404);
  if (source.recordType !== "STUDENT") {
    return apiError("Enrollment updates are only for student records");
  }

  const body = await req.json();
  const schoolYearId = String(body.schoolYearId || "");
  const category = (body.category || source.category) as StudentCategory;
  const grade = body.grade ? String(body.grade) : null;
  const section = body.section ? String(body.section) : null;
  const customGradeName = body.customGradeName
    ? String(body.customGradeName)
    : null;
  const course = body.course ? String(body.course) : null;

  if (!schoolYearId) return apiError("School year is required");
  if (category === "TERTIARY") {
    if (!customGradeName || !course) {
      return apiError("Year level and course are required for tertiary");
    }
  } else if (!grade) {
    return apiError("Grade level is required");
  }

  const schoolYear = await prisma.schoolYear.findFirst({
    where: { id: schoolYearId, schoolId: schoolId!, isActive: true },
  });
  if (!schoolYear) return apiError("School year not found", 404);

  const existing = await prisma.student.findUnique({
    where: {
      schoolId_schoolYearId_studentId: {
        schoolId: schoolId!,
        schoolYearId,
        studentId: source.studentId,
      },
    },
  });

  const enrollmentData = {
    category,
    grade: category === "TERTIARY" ? null : grade,
    customGradeName: category === "TERTIARY" ? customGradeName : null,
    course: category === "TERTIARY" ? course : null,
    section,
  };

  const enrollment = existing
    ? await prisma.student.update({
        where: { id: existing.id },
        data: { ...enrollmentData, isActive: true },
      })
    : await prisma.student.create({
        data: {
          schoolId: schoolId!,
          schoolYearId,
          ...pickProfileFromDb(source),
          ...enrollmentData,
        } as Parameters<typeof prisma.student.create>[0]["data"],
      });

  return apiSuccess(enrollment);
}
