import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFullContext, apiError } from "@/lib/api-auth";
import { buildStudentsCsv, prismaStudentToCsvSource } from "@/lib/student-csv";
import { buildStudentsXlsx } from "@/lib/student-csv-xlsx";
import { buildStudentsPdf } from "@/lib/student-csv-pdf";
import type { StudentCategory } from "@/lib/categories";

const MAX_EXPORT = 10_000;

export async function GET(req: NextRequest) {
  const { schoolId, schoolYearId, session, error } = await requireFullContext();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const grade = searchParams.get("grade") || "";
  const section = searchParams.get("section") || "";
  const category = searchParams.get("category") || "";
  const recordType = searchParams.get("recordType") || "";
  const format = (searchParams.get("format") || "xlsx").toLowerCase();
  if (!["xlsx", "csv", "pdf"].includes(format)) {
    return apiError("Invalid format. Use xlsx, csv, or pdf.", 400);
  }

  const where = {
    schoolId: schoolId!,
    schoolYearId: schoolYearId!,
    isActive: true,
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { studentId: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { course: { contains: search, mode: "insensitive" } },
            { department: { contains: search, mode: "insensitive" } },
            { position: { contains: search, mode: "insensitive" } },
            { emergencyFirstName: { contains: search, mode: "insensitive" } },
            { emergencyLastName: { contains: search, mode: "insensitive" } },
            { emergencyPhone: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(recordType ? { recordType: recordType as "STUDENT" | "TEACHER" } : {}),
    ...(grade ? { grade } : {}),
    ...(section ? { section } : {}),
    ...(category ? { category: category as StudentCategory } : {}),
  };

  const total = await prisma.student.count({ where });
  if (total > MAX_EXPORT) {
    return apiError(
      `Too many records (${total}). Narrow filters or export at most ${MAX_EXPORT} at a time.`,
      400
    );
  }

  const students = await prisma.student.findMany({
    where,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const rows = students.map((s) => prismaStudentToCsvSource(s));

  const yearName =
    session!.user.currentSchoolYearName?.replace(/[^\w.-]+/g, "-") || "year";
  const kind = recordType === "TEACHER" ? "teachers" : "students";

  const schoolName = session!.user.currentSchoolYearName
    ? `${session!.user.currentSchoolName ?? "School"} · ${session!.user.currentSchoolYearName}`
    : session!.user.currentSchoolName ?? "School";
  const recordLabel = recordType === "TEACHER" ? "Teachers" : "Students";

  if (format === "csv") {
    const csv = buildStudentsCsv(rows);
    const filename = `${kind}-${yearName}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (format === "pdf") {
    const pdf = buildStudentsPdf(rows, {
      title: `${recordLabel} export`,
      subtitle: schoolName,
    });
    const filename = `${kind}-${yearName}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const xlsx = buildStudentsXlsx(rows);
  const filename = `${kind}-${yearName}.xlsx`;
  return new NextResponse(new Uint8Array(xlsx), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
