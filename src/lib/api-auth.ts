import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const user = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      organizationId: session.user.organizationId,
      isActive: true,
    },
    select: { id: true },
  });

  if (!user) {
    return {
      session: null,
      error: NextResponse.json(
        { error: "Session expired. Please sign in again." },
        { status: 401 }
      ),
    };
  }

  return { session, error: null };
}

export async function requireSchoolContext() {
  const { session, error } = await requireAuth();
  if (error) return { session: null, schoolId: null, schoolYearId: null, error };

  const schoolId = session!.user.currentSchoolId;
  if (!schoolId) {
    return {
      session,
      schoolId: null,
      schoolYearId: null,
      error: NextResponse.json(
        { error: "No school selected. Please select a school first." },
        { status: 403 }
      ),
    };
  }

  const hasAccess = await verifySchoolAccess(
    session!.user.id,
    session!.user.role,
    schoolId,
    session!.user.organizationId
  );

  if (!hasAccess) {
    return {
      session,
      schoolId: null,
      schoolYearId: null,
      error: NextResponse.json(
        { error: "Access denied to this school." },
        { status: 403 }
      ),
    };
  }

  return { session, schoolId, schoolYearId: null, error: null };
}

export async function requireFullContext() {
  const { session, schoolId, error } = await requireSchoolContext();
  if (error) return { session: null, schoolId: null, schoolYearId: null, error };

  const schoolYearId = session!.user.currentSchoolYearId;
  if (!schoolYearId) {
    return {
      session,
      schoolId,
      schoolYearId: null,
      error: NextResponse.json(
        { error: "No school year selected. Please select a school year." },
        { status: 403 }
      ),
    };
  }

  const schoolYear = await prisma.schoolYear.findFirst({
    where: { id: schoolYearId, schoolId: schoolId!, isActive: true },
  });

  if (!schoolYear) {
    return {
      session,
      schoolId,
      schoolYearId: null,
      error: NextResponse.json(
        { error: "Invalid school year for this school." },
        { status: 403 }
      ),
    };
  }

  return { session, schoolId, schoolYearId, error: null };
}

export async function verifySchoolAccess(
  userId: string,
  role: string,
  schoolId: string,
  organizationId: string
): Promise<boolean> {
  const school = await prisma.school.findFirst({
    where: { id: schoolId, organizationId, isActive: true },
  });
  if (!school) return false;
  if (role === "ADMIN") return true;

  const access = await prisma.userSchool.findUnique({
    where: { userId_schoolId: { userId, schoolId } },
  });
  return !!access;
}

export function verifyResourceSchool(
  resourceSchoolId: string,
  sessionSchoolId: string
): boolean {
  return resourceSchoolId === sessionSchoolId;
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
