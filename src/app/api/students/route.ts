import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireFullContext,
  apiSuccess,
  apiError,
  verifyResourceSchool,
} from "@/lib/api-auth";
import { studentSchema } from "@/lib/validations";
import { cardIssuedAtPatch, studentInputToDb } from "@/lib/student-db-map";
import type { StudentCategory } from "@/lib/categories";

export async function GET(req: NextRequest) {
  const { schoolId, schoolYearId, error } = await requireFullContext();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(
    500,
    Math.max(1, parseInt(searchParams.get("limit") || "20"))
  );
  const requestedSchoolYearId = searchParams.get("schoolYearId") || "";
  const excludeEnrolledInCurrent =
    searchParams.get("excludeEnrolledInCurrent") === "1";
  const search = searchParams.get("search") || "";
  const grade = searchParams.get("grade") || "";
  const section = searchParams.get("section") || "";
  const department = searchParams.get("department") || "";
  const category = searchParams.get("category") || "";
  const recordType = searchParams.get("recordType") || "";
  const isTeachingParam = searchParams.get("isTeaching");
  const isTeachingFilter =
    isTeachingParam === "true"
      ? true
      : isTeachingParam === "false"
        ? false
        : null;
  const unassignedOnly = searchParams.get("unassigned") === "1";

  let targetSchoolYearId = schoolYearId!;
  if (requestedSchoolYearId) {
    const year = await prisma.schoolYear.findFirst({
      where: {
        id: requestedSchoolYearId,
        schoolId: schoolId!,
        isActive: true,
      },
    });
    if (!year) return apiError("School year not found", 404);
    targetSchoolYearId = year.id;
  }

  let excludeStudentIds: string[] = [];
  if (
    excludeEnrolledInCurrent &&
    targetSchoolYearId !== schoolYearId
  ) {
    const already = await prisma.student.findMany({
      where: {
        schoolId: schoolId!,
        schoolYearId: schoolYearId!,
        recordType: "STUDENT",
        isActive: true,
      },
      select: { studentId: true },
    });
    excludeStudentIds = already.map((s) => s.studentId);
  }

  const contains = (value: string) => ({
    contains: value,
    mode: "insensitive" as const,
  });
  const searchOr = search
    ? [
        { firstName: contains(search) },
        { lastName: contains(search) },
        { studentId: contains(search) },
        { employeeNumber: contains(search) },
        { email: contains(search) },
        { course: contains(search) },
        { department: contains(search) },
        { position: contains(search) },
        { designation: contains(search) },
        { emergencyFirstName: contains(search) },
        { emergencyLastName: contains(search) },
        { emergencyPhone: contains(search) },
      ]
    : null;

  const where = {
    schoolId: schoolId!,
    schoolYearId: targetSchoolYearId,
    isActive: true,
    ...(excludeStudentIds.length
      ? { studentId: { notIn: excludeStudentIds } }
      : {}),
    ...(recordType ? { recordType: recordType as "STUDENT" | "TEACHER" } : {}),
    ...(grade ? { grade } : {}),
    ...(section ? { section } : {}),
    ...(department ? { department } : {}),
    ...(isTeachingFilter !== null ? { isTeaching: isTeachingFilter } : {}),
    ...(category ? { category: category as StudentCategory } : {}),
    ...(unassignedOnly && searchOr
      ? {
          AND: [
            { OR: [{ section: null }, { section: "" }] },
            { OR: searchOr },
          ],
        }
      : unassignedOnly
        ? { OR: [{ section: null }, { section: "" }] }
        : searchOr
          ? { OR: searchOr }
          : {}),
  };

  const baseWhere = {
    schoolId: schoolId!,
    schoolYearId: schoolYearId!,
    isActive: true,
    ...(recordType ? { recordType: recordType as "STUDENT" | "TEACHER" } : {}),
  };

  const [students, total, grades, sections, departments, categories] =
    await Promise.all([
      prisma.student.findMany({
        where,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { printLogEntries: true } },
        },
      }),
      prisma.student.count({ where }),
      prisma.student.findMany({
        where: { ...baseWhere, grade: { not: null } },
        select: { grade: true },
        distinct: ["grade"],
      }),
      prisma.student.findMany({
        where: { ...baseWhere, section: { not: null } },
        select: { section: true },
        distinct: ["section"],
      }),
      prisma.student.findMany({
        where: { ...baseWhere, department: { not: null } },
        select: { department: true },
        distinct: ["department"],
      }),
      prisma.student.groupBy({
        by: ["category"],
        where: baseWhere,
        _count: true,
      }),
    ]);

  return apiSuccess({
    students: students.map(({ _count, ...student }) => ({
      ...student,
      printCount: _count.printLogEntries,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    filters: {
      grades: grades.map((g) => g.grade).filter(Boolean).sort(),
      sections: sections.map((s) => s.section).filter(Boolean).sort(),
      departments: departments
        .map((d) => d.department)
        .filter(Boolean)
        .sort(),
      categories: categories.map((c) => ({
        category: c.category,
        count: c._count,
      })),
    },
  });
}

export async function POST(req: NextRequest) {
  const { schoolId, schoolYearId, error } = await requireFullContext();
  if (error) return error;

  const body = await req.json();
  const parsed = studentSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message || "Invalid data");
  }

  const data = parsed.data;

  const existing = await prisma.student.findUnique({
    where: {
      schoolId_schoolYearId_studentId: {
        schoolId: schoolId!,
        schoolYearId: schoolYearId!,
        studentId: data.studentId,
      },
    },
  });

  if (existing) {
    return apiError(
      "A record with this ID already exists for this school year"
    );
  }

  try {
    const db = studentInputToDb(data);
    const student = await prisma.student.create({
      data: {
        schoolId: schoolId!,
        schoolYearId: schoolYearId!,
        ...db,
        ...cardIssuedAtPatch({}, db),
      },
    });
    return apiSuccess(student, 201);
  } catch (e) {
    console.error("Student create failed:", e);
    const message =
      e instanceof Error ? e.message : "Failed to create record";
    return apiError(
      message.includes("Unknown argument")
        ? "Server database client is out of date. Stop the dev server, run npx prisma generate, then start npm run dev again."
        : "Failed to create record. Please try again.",
      500
    );
  }
}
