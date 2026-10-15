import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireFullContext,
  apiSuccess,
  apiError,
  verifyResourceSchool,
} from "@/lib/api-auth";


export async function POST(req: NextRequest) {
  try {
  const { session, schoolId, schoolYearId, error } = await requireFullContext();
  if (error) return error;

  const body = await req.json();
  const { studentIds, templateId } = body;

  if (!templateId || typeof templateId !== "string") {
    return apiError("Template ID is required");
  }

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return apiError("At least one student is required");
  }

  if (studentIds.length > 100) {
    return apiError("Maximum 100 students per print batch");
  }

  const template = await prisma.idTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template || !template.isActive) {
    return apiError("Template not found", 404);
  }

  if (!verifyResourceSchool(template.schoolId, schoolId!)) {
    return apiError("Template access denied", 403);
  }

  const students = await prisma.student.findMany({
    where: {
      id: { in: studentIds },
      schoolId: schoolId!,
      schoolYearId: schoolYearId!,
      isActive: true,
    },
  });

  if (students.length !== studentIds.length) {
    return apiError("Some students were not found or access denied", 403);
  }

  const batch = await prisma.idPrintBatch.create({
    data: {
      schoolId: schoolId!,
      schoolYearId: schoolYearId!,
      templateId: template.id,
      templateName: template.name,
      printedById: session!.user.id,
      studentCount: students.length,
      entries: {
        create: students.map((s) => ({
          studentId: s.id,
          studentNumber: s.studentId,
          studentName: [s.firstName, s.middleName, s.lastName]
            .filter(Boolean)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim(),
          grade: s.grade,
          section: s.section,
        })),
      },
    },
    include: {
      printedBy: { select: { id: true, name: true, email: true } },
      entries: {
        select: { studentId: true, studentNumber: true, studentName: true },
      },
    },
  });

  const counts = await prisma.idPrintLogEntry.groupBy({
    by: ["studentId"],
    where: {
      studentId: { in: students.map((s) => s.id) },
    },
    _count: true,
  });
  const countMap = Object.fromEntries(
    counts.map((c) => [c.studentId, c._count])
  );

  return apiSuccess(
    {
      batch: {
        id: batch.id,
        createdAt: batch.createdAt,
        templateName: batch.templateName,
        studentCount: batch.studentCount,
        printedBy: batch.printedBy,
      },
      printCounts: countMap,
    },
    201
  );
  } catch (e) {
    console.error("POST /api/print/log", e);
    const message =
      e instanceof Error ? e.message : "Failed to record print log";
    return apiError(message, 500);
  }
}
