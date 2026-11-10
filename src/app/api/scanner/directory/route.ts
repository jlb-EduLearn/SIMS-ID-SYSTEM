import { prisma } from "@/lib/db";
import {
  apiError,
  apiSuccess,
  formatPrismaClientError,
  requireSchoolContext,
} from "@/lib/api-auth";
import { getDisplayGrade, type StudentCategory } from "@/lib/categories";

function isScannerRole(role: string) {
  return role === "SCANNER";
}

export async function GET() {
  try {
    const { session, schoolId, schoolYearId, error } =
      await requireSchoolContext();
    if (error) return error;

    if (!isScannerRole(session!.user.role)) {
      return apiError("Scanner login required.", 403);
    }

    const yearId =
      schoolYearId ||
      (
        await prisma.schoolYear.findFirst({
          where: { schoolId: schoolId!, isActive: true, isCurrent: true },
          select: { id: true },
        })
      )?.id;

    if (!yearId) {
      return apiError("No active school year for this school.", 400);
    }

    const rows = await prisma.student.findMany({
      where: {
        schoolId: schoolId!,
        schoolYearId: yearId,
        isActive: true,
      },
      select: {
        id: true,
        studentId: true,
        firstName: true,
        middleName: true,
        lastName: true,
        suffix: true,
        recordType: true,
        category: true,
        grade: true,
        customGradeName: true,
        course: true,
        section: true,
        department: true,
        position: true,
        designation: true,
        photoUrl: true,
        isActive: true,
        cardUid: true,
        wiegandCardNumber: true,
        studentNumber: true,
        employeeNumber: true,
      },
      take: 12000,
    });

    const people = rows.map((student) => {
      const name = [student.firstName, student.middleName, student.lastName]
        .filter(Boolean)
        .join(" ");
      const fullName = student.suffix?.trim()
        ? `${name} ${student.suffix.trim()}`
        : name;
      const isStaff = student.recordType === "TEACHER";
      const gradeLabel = isStaff
        ? student.position?.trim() ||
          student.designation?.trim() ||
          student.department?.trim() ||
          "Staff"
        : getDisplayGrade({
            category: student.category as StudentCategory,
            grade: student.grade,
            customGradeName: student.customGradeName,
            course: student.course,
          });
      const section = isStaff
        ? [student.department, student.section].filter(Boolean).join(" · ")
        : student.section || "";

      const lookupKeys = [
        student.studentId,
        student.studentNumber,
        student.employeeNumber,
        student.cardUid,
        student.wiegandCardNumber,
      ]
        .filter(Boolean)
        .map((v) => String(v).trim());

      return {
        id: student.id,
        studentId: student.studentId,
        fullName,
        gradeLabel,
        section,
        photoUrl: student.photoUrl,
        allowed: student.isActive,
        isStaff,
        recordType: student.recordType,
        lookupKeys,
      };
    });

    return apiSuccess({
      schoolYearId: yearId,
      syncedAt: new Date().toISOString(),
      count: people.length,
      people,
    });
  } catch (e) {
    console.error("[scanner directory]", e);
    return apiError(formatPrismaClientError(e), 500);
  }
}
