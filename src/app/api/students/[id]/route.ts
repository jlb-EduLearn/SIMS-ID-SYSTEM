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

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { schoolId, schoolYearId, error } = await requireFullContext();
  if (error) return error;

  const { id } = await params;

  const student = await prisma.student.findUnique({ where: { id } });

  if (!student || !student.isActive) {
    return apiError("Record not found", 404);
  }

  if (
    !verifyResourceSchool(student.schoolId, schoolId!) ||
    student.schoolYearId !== schoolYearId
  ) {
    return apiError("Access denied", 403);
  }

  return apiSuccess(student);
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { schoolId, schoolYearId, error } = await requireFullContext();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = studentSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message || "Invalid data");
  }

  const existing = await prisma.student.findUnique({ where: { id } });

  if (!existing || !existing.isActive) {
    return apiError("Record not found", 404);
  }

  if (
    !verifyResourceSchool(existing.schoolId, schoolId!) ||
    existing.schoolYearId !== schoolYearId
  ) {
    return apiError("Access denied", 403);
  }

  const data = parsed.data;

  if (data.studentId !== existing.studentId) {
    const duplicate = await prisma.student.findUnique({
      where: {
        schoolId_schoolYearId_studentId: {
          schoolId: schoolId!,
          schoolYearId: schoolYearId!,
          studentId: data.studentId,
        },
      },
    });
    if (duplicate) {
      return apiError("A record with this ID already exists");
    }
  }

  try {
    const db = studentInputToDb(data);
    const student = await prisma.student.update({
      where: { id },
      data: {
        ...db,
        ...cardIssuedAtPatch(existing, db),
      },
    });
    return apiSuccess(student);
  } catch (e) {
    console.error("Student update failed:", e);
    const message =
      e instanceof Error ? e.message : "Failed to update record";
    return apiError(
      message.includes("Unknown argument")
        ? "Server database client is out of date. Stop the dev server, run npx prisma generate, then start npm run dev again."
        : "Failed to update record. Please try again.",
      500
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { schoolId, schoolYearId, error } = await requireFullContext();
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.student.findUnique({ where: { id } });

  if (!existing) {
    return apiError("Record not found", 404);
  }

  if (
    !verifyResourceSchool(existing.schoolId, schoolId!) ||
    existing.schoolYearId !== schoolYearId
  ) {
    return apiError("Access denied", 403);
  }

  await prisma.student.update({
    where: { id },
    data: { isActive: false },
  });

  return apiSuccess({ success: true });
}
