import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import {
  apiError,
  apiSuccess,
  requireSchoolContext,
  verifyResourceSchool,
} from "@/lib/api-auth";
import { schoolUserSchema } from "@/lib/validations";
import { normalizeScannerLogin } from "@/lib/scanner-auth";

function canManageUsers(role: string) {
  return role === "ADMIN" || role === "SCHOOL_ADMIN";
}

function resolveUserEmail(role: string, login: string) {
  if (role === "SCANNER") return normalizeScannerLogin(login);
  return login.trim().toLowerCase();
}

export async function GET() {
  const { session, schoolId, error } = await requireSchoolContext();
  if (error) return error;

  if (!canManageUsers(session!.user.role)) {
    return apiError("Only admins can manage school users.", 403);
  }

  const users = await prisma.user.findMany({
    where: {
      organizationId: session!.user.organizationId,
      userSchools: { some: { schoolId: schoolId! } },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return apiSuccess({ users });
}

export async function POST(req: NextRequest) {
  const { session, schoolId, error } = await requireSchoolContext();
  if (error) return error;

  if (!canManageUsers(session!.user.role)) {
    return apiError("Only admins can create school users.", 403);
  }

  const body = await req.json();
  const parsed = schoolUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message || "Invalid data");
  }

  const data = parsed.data;
  if (!data.password) {
    return apiError("Password is required for new users.");
  }

  const email = resolveUserEmail(data.role, data.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return apiError(
      data.role === "SCANNER"
        ? "A scanner with this username already exists."
        : "A user with this email already exists."
    );
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      organizationId: session!.user.organizationId,
      email,
      name: data.name,
      role: data.role,
      passwordHash,
      isActive: true,
      userSchools: {
        create: { schoolId: schoolId! },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return apiSuccess(user, 201);
}

export async function PUT(req: NextRequest) {
  const { session, schoolId, error } = await requireSchoolContext();
  if (error) return error;

  if (!canManageUsers(session!.user.role)) {
    return apiError("Only admins can update school users.", 403);
  }

  const body = await req.json();
  const userId = body.id;
  if (!userId || typeof userId !== "string") {
    return apiError("User ID is required.");
  }

  const parsed = schoolUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message || "Invalid data");
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    include: { userSchools: true },
  });

  if (!existing || existing.organizationId !== session!.user.organizationId) {
    return apiError("User not found.", 404);
  }

  const hasCurrentSchool = existing.userSchools.some((access) =>
    verifyResourceSchool(access.schoolId, schoolId!)
  );
  if (!hasCurrentSchool || existing.role === "ADMIN") {
    return apiError("This user is not editable from this school.", 403);
  }

  const data = parsed.data;
  const email = resolveUserEmail(data.role, data.email);
  if (email !== existing.email) {
    const clash = await prisma.user.findUnique({ where: { email } });
    if (clash && clash.id !== existing.id) {
      return apiError(
        data.role === "SCANNER"
          ? "A scanner with this username already exists."
          : "A user with this email already exists."
      );
    }
  }

  const updateData = {
    name: data.name,
    email,
    role: data.role,
    isActive: data.isActive ?? existing.isActive,
    ...(data.password
      ? { passwordHash: await bcrypt.hash(data.password, 10) }
      : {}),
  };

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return apiSuccess(user);
}

export async function DELETE(req: NextRequest) {
  const { session, schoolId, error } = await requireSchoolContext();
  if (error) return error;

  if (!canManageUsers(session!.user.role)) {
    return apiError("Only admins can deactivate school users.", 403);
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("id");
  if (!userId) return apiError("User ID is required.");

  if (userId === session!.user.id) {
    return apiError("You cannot deactivate your own account.");
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    include: { userSchools: true },
  });

  if (!existing || existing.organizationId !== session!.user.organizationId) {
    return apiError("User not found.", 404);
  }

  const hasCurrentSchool = existing.userSchools.some((access) =>
    verifyResourceSchool(access.schoolId, schoolId!)
  );
  if (!hasCurrentSchool || existing.role === "ADMIN") {
    return apiError("This user is not editable from this school.", 403);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  return apiSuccess({ success: true });
}
