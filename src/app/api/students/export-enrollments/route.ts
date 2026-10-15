import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFullContext, apiError } from "@/lib/api-auth";
import { buildEnrollmentsCsv } from "@/lib/student-csv";
import type { StudentCategory } from "@/lib/categories";

const MAX_EXPORT = 50_000;

export async function GET(req: NextRequest) {
  const { schoolId, session, error } = await requireFullContext();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const recordType = searchParams.get("recordType") || "STUDENT";
  if (recordType !== "STUDENT") {
    return apiError("Enrollment export is for students only");
  }

  const enrollments = await prisma.student.findMany({
    where: {
      schoolId: schoolId!,
      recordType: "STUDENT",
      isActive: true,
    },
    include: {
      schoolYear: { select: { name: true } },
    },
    orderBy: [
      { studentId: "asc" },
      { schoolYear: { name: "desc" } },
    ],
  });

  if (enrollments.length > MAX_EXPORT) {
    return apiError(
      `Too many enrollment rows (${enrollments.length}). Contact support to export in bulk.`,
      400
    );
  }

  const rows = enrollments.map((e) => ({
    studentId: e.studentId,
    schoolYear: e.schoolYear.name,
    category: e.category as StudentCategory,
    grade: e.grade || "",
    customGradeName: e.customGradeName || "",
    course: e.course || "",
    section: e.section || "",
  }));

  const csv = buildEnrollmentsCsv(rows);
  const filename = `enrollment-history-${session!.user.currentSchoolYearName?.replace(/[^\w.-]+/g, "-") || "export"}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
