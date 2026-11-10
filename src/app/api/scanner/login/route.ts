import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess, formatPrismaClientError } from "@/lib/api-auth";
import { signScannerToken } from "@/lib/scanner-token";
import { normalizeScannerLogin } from "@/lib/scanner-auth";
import { scannerOptions, withScannerCors } from "@/lib/scanner-cors";

export function OPTIONS(req: NextRequest) {
  return scannerOptions(req);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const username =
      typeof body?.username === "string"
        ? body.username.trim()
        : typeof body?.email === "string"
          ? body.email.trim()
          : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!username || !password) {
      return withScannerCors(req, apiError("Username and password required", 400));
    }

    const email = username.includes("@")
      ? username.toLowerCase()
      : normalizeScannerLogin(username);

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { email: `${username.toLowerCase()}@scanner.local` }],
        role: "SCANNER",
        isActive: true,
      },
      include: {
        organization: true,
        userSchools: {
          include: {
            school: {
              include: {
                schoolYears: {
                  where: { isActive: true },
                  orderBy: [{ isCurrent: "desc" }, { name: "desc" }],
                  take: 1,
                },
              },
            },
          },
          take: 1,
        },
      },
    });

    if (!user) {
      return withScannerCors(
        req,
        apiError("Invalid scanner username or password", 401)
      );
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return withScannerCors(
        req,
        apiError("Invalid scanner username or password", 401)
      );
    }

    const school = user.userSchools[0]?.school;
    if (!school) {
      return withScannerCors(
        req,
        apiError("Scanner account is not assigned to a school", 403)
      );
    }
    const year = school.schoolYears[0] ?? null;

    const token = signScannerToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      organizationId: user.organizationId,
      organizationName: user.organization.name,
      currentSchoolId: school.id,
      currentSchoolName: school.name,
      currentSchoolYearId: year?.id ?? null,
      currentSchoolYearName: year?.name ?? null,
    });

    return withScannerCors(
      req,
      apiSuccess({
        token,
        stationName: user.name,
        login: user.email,
        school: {
          id: school.id,
          name: school.name,
          code: school.code,
          logoUrl: school.logoUrl,
          address: school.address,
        },
      })
    );
  } catch (e) {
    console.error("[scanner login]", e);
    return withScannerCors(req, apiError(formatPrismaClientError(e), 500));
  }
}
