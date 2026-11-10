import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  apiError,
  apiSuccess,
  formatPrismaClientError,
} from "@/lib/api-auth";
import { ensureBoardToken } from "@/lib/board";
import { requireScannerApi } from "@/lib/scanner-api-auth";
import { scannerOptions, withScannerCors } from "@/lib/scanner-cors";

export function OPTIONS(req: NextRequest) {
  return scannerOptions(req);
}

export async function GET(req: NextRequest) {
  try {
    const { session, schoolId, error } = await requireScannerApi(req);
    if (error) return withScannerCors(req, error);

    const school = await prisma.school.findUnique({
      where: { id: schoolId! },
      select: {
        id: true,
        name: true,
        code: true,
        logoUrl: true,
        address: true,
      },
    });

    if (!school) {
      return withScannerCors(req, apiError("School not found.", 404));
    }

    await ensureBoardToken(schoolId!);

    return withScannerCors(
      req,
      apiSuccess({
        school,
        stationName: session!.user.name,
        login: session!.user.email,
      })
    );
  } catch (e) {
    console.error("[scanner context]", e);
    return withScannerCors(req, apiError(formatPrismaClientError(e), 500));
  }
}
