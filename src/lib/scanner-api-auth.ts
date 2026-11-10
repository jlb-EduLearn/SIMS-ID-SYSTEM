import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyScannerToken, type ScannerTokenPayload } from "@/lib/scanner-token";

export type ScannerApiSession = {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId: string;
    organizationName: string;
    currentSchoolId: string | null;
    currentSchoolName: string | null;
    currentSchoolYearId: string | null;
    currentSchoolYearName: string | null;
  };
};

function sessionFromToken(payload: ScannerTokenPayload): ScannerApiSession {
  return {
    user: {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      organizationId: payload.organizationId,
      organizationName: payload.organizationName,
      currentSchoolId: payload.currentSchoolId,
      currentSchoolName: payload.currentSchoolName,
      currentSchoolYearId: payload.currentSchoolYearId,
      currentSchoolYearName: payload.currentSchoolYearName,
    },
  };
}

/** Cookie NextAuth session or native app Bearer scanner token. */
export async function requireScannerApi(req?: NextRequest) {
  const auth = req?.headers.get("authorization") || "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearer) {
    const payload = verifyScannerToken(bearer);
    if (!payload) {
      return {
        session: null as ScannerApiSession | null,
        schoolId: null as string | null,
        schoolYearId: null as string | null,
        error: NextResponse.json({ error: "Invalid or expired scanner token" }, { status: 401 }),
      };
    }
    const user = await prisma.user.findFirst({
      where: { id: payload.sub, role: "SCANNER", isActive: true },
      select: { id: true },
    });
    if (!user) {
      return {
        session: null,
        schoolId: null,
        schoolYearId: null,
        error: NextResponse.json({ error: "Scanner account inactive" }, { status: 401 }),
      };
    }
    const session = sessionFromToken(payload);
    return {
      session,
      schoolId: payload.currentSchoolId,
      schoolYearId: payload.currentSchoolYearId,
      error: null as NextResponse | null,
    };
  }

  const nextSession = await getServerSession(authOptions);
  if (!nextSession?.user || nextSession.user.role !== "SCANNER") {
    return {
      session: null,
      schoolId: null,
      schoolYearId: null,
      error: NextResponse.json({ error: "Scanner login required." }, { status: 403 }),
    };
  }
  if (!nextSession.user.currentSchoolId) {
    return {
      session: nextSession as unknown as ScannerApiSession,
      schoolId: null,
      schoolYearId: null,
      error: NextResponse.json(
        { error: "This scanner account is not assigned to a school." },
        { status: 403 }
      ),
    };
  }
  return {
    session: nextSession as unknown as ScannerApiSession,
    schoolId: nextSession.user.currentSchoolId,
    schoolYearId: nextSession.user.currentSchoolYearId,
    error: null,
  };
}
