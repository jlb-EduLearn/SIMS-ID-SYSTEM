import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireAuth,
  apiSuccess,
  apiError,
  verifySchoolAccess,
} from "@/lib/api-auth";
import { schoolSchema } from "@/lib/validations";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const user = session!.user;
  const isAdmin = user.role === "ADMIN";

  const schoolsRaw = await prisma.school.findMany({
    where: {
      organizationId: user.organizationId,
      isActive: true,
      ...(isAdmin
        ? {}
        : {
            userSchools: { some: { userId: user.id } },
          }),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      address: true,
      logoUrl: true,
    },
  });

  const counts = await prisma.student.groupBy({
    by: ["schoolId"],
    where: {
      isActive: true,
      schoolId: { in: schoolsRaw.map((school) => school.id) },
    },
    _count: true,
  });
  const countMap = new Map(
    counts.map((count) => [count.schoolId, count._count])
  );
  const schools = schoolsRaw.map((school) => ({
    ...school,
    _count: { students: countMap.get(school.id) || 0 },
  }));

  return apiSuccess({ schools, currentSchoolId: user.currentSchoolId });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { action } = body;

  if (action === "create") {
    const user = session!.user;
    if (user.role !== "ADMIN") {
      return apiError("Only super admins can add schools", 403);
    }

    const parsed = schoolSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || "Invalid school data");
    }

    const data = parsed.data;
    const code = data.code.toUpperCase();
    const existing = await prisma.school.findFirst({
      where: { organizationId: user.organizationId, code },
    });

    if (existing?.isActive) {
      return apiError("A school with this code already exists");
    }

    const select = {
      id: true,
      name: true,
      code: true,
      address: true,
      logoUrl: true,
    } as const;
    const school = existing
      ? await prisma.school.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            address: data.address || null,
            isActive: true,
          },
          select,
        })
      : await prisma.school.create({
          data: {
            organizationId: user.organizationId,
            name: data.name,
            code,
            address: data.address || null,
            schoolYears: {
              create: {
                name: "2025-2026",
                isCurrent: true,
              },
            },
          },
          select,
        });

    return apiSuccess({ ...school, _count: { students: 0 } }, 201);
  }

  const { schoolId } = body;

  if (!schoolId || typeof schoolId !== "string") {
    return apiError("School ID is required");
  }

  const hasAccess = await verifySchoolAccess(
    session!.user.id,
    session!.user.role,
    schoolId,
    session!.user.organizationId
  );

  if (!hasAccess) {
    return apiError("Access denied to this school", 403);
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, name: true, code: true },
  });

  if (!school) {
    return apiError("School not found", 404);
  }

  return apiSuccess({
    schoolId: school.id,
    schoolName: school.name,
    schoolCode: school.code,
  });
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const user = session!.user;
  if (user.role !== "ADMIN") {
    return apiError("Only super admins can delete schools", 403);
  }

  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("id");
  if (!schoolId) return apiError("School ID is required");

  const school = await prisma.school.findFirst({
    where: {
      id: schoolId,
      organizationId: user.organizationId,
      isActive: true,
    },
  });

  if (!school) {
    return apiError("School not found", 404);
  }

  await prisma.school.update({
    where: { id: schoolId },
    data: { isActive: false },
  });

  return apiSuccess({ success: true });
}
