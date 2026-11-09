import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireFullContext,
  apiSuccess,
  apiError,
  verifyResourceSchool,
} from "@/lib/api-auth";
import { studentToPrintData } from "@/types/template";

export async function POST(req: NextRequest) {
  const { schoolId, schoolYearId, error } = await requireFullContext();
  if (error) return error;

  const body = await req.json();
  const { studentIds, templateId } = body;

  if (!templateId) {
    return apiError("Template ID is required");
  }

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return apiError("At least one person is required");
  }

  if (studentIds.length > 100) {
    return apiError("Maximum 100 IDs per print batch");
  }

  const [template, school, students] = await Promise.all([
    prisma.idTemplate.findUnique({ where: { id: templateId } }),
    prisma.school.findUnique({ where: { id: schoolId! } }),
    prisma.student.findMany({
      where: {
        id: { in: studentIds },
        schoolId: schoolId!,
        schoolYearId: schoolYearId!,
        isActive: true,
      },
    }),
  ]);

  if (!template || !template.isActive) {
    return apiError("Template not found", 404);
  }

  if (!verifyResourceSchool(template.schoolId, schoolId!)) {
    return apiError("Template access denied", 403);
  }

  if (!school) {
    return apiError("School not found", 404);
  }

  if (students.length !== studentIds.length) {
    return apiError("Some records were not found or access denied", 403);
  }

  const printData = students.map((s) => studentToPrintData(s, school));

  return apiSuccess({
    template: {
      id: template.id,
      name: template.name,
      orientation: template.orientation,
      width: template.width,
      height: template.height,
      frontDesign: template.frontDesign,
      backDesign: template.backDesign,
    },
    students: printData,
    school: {
      name: school.name,
      code: school.code,
      logoUrl: school.logoUrl,
    },
  });
}
