import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  apiError,
  apiSuccess,
  formatPrismaClientError,
} from "@/lib/api-auth";
import { getDisplayGrade, type StudentCategory } from "@/lib/categories";
import { requireScannerApi } from "@/lib/scanner-api-auth";
import { scannerOptions, withScannerCors } from "@/lib/scanner-cors";

export function OPTIONS(req: NextRequest) {
  return scannerOptions(req);
}

export async function GET(req: NextRequest) {
  try {
    const { session, schoolId, schoolYearId, error } =
      await requireScannerApi(req);
    if (error) return withScannerCors(req, error);

    const yearId =
      schoolYearId ||
      session?.user.currentSchoolYearId ||
      (
        await prisma.schoolYear.findFirst({
          where: { schoolId: schoolId!, isActive: true, isCurrent: true },
          select: { id: true },
        })
      )?.id;

    if (!yearId) {
      return withScannerCors(
        req,
        apiError("No active school year for this school.", 400)
      );
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

    return withScannerCors(
      req,
      apiSuccess({
        schoolYearId: yearId,
        syncedAt: new Date().toISOString(),
        count: people.length,
        people,
      })
    );
  } catch (e) {
    console.error("[scanner directory]", e);
    return withScannerCors(req, apiError(formatPrismaClientError(e), 500));
  }
}
