import { NextRequest } from "next/server";
import {
  apiError,
  apiSuccess,
  formatPrismaClientError,
  requireSchoolContext,
} from "@/lib/api-auth";
import { ensureBoardToken } from "@/lib/board";
import {
  processScannerScan,
  resolveScannerYearId,
} from "@/lib/scanner-process";

function isScannerRole(role: string) {
  return role === "SCANNER";
}

export async function POST(req: NextRequest) {
  try {
    const { session, schoolId, schoolYearId, error } =
      await requireSchoolContext();
    if (error) return error;

    if (!isScannerRole(session!.user.role)) {
      return apiError("Scanner login required.", 403);
    }

    const body = await req.json().catch(() => ({}));
    const code = typeof body?.code === "string" ? body.code : "";
    if (!code.trim()) return apiError("Scan code required", 400);

    const scannedAtRaw =
      typeof body?.scannedAt === "string" || typeof body?.scannedAt === "number"
        ? new Date(body.scannedAt)
        : undefined;

    await ensureBoardToken(schoolId!);
    const yearId = await resolveScannerYearId(schoolId!, schoolYearId);
    if (!yearId) {
      return apiError("No active school year for this school.", 400);
    }

    const result = await processScannerScan({
      schoolId: schoolId!,
      schoolYearId: yearId,
      code,
      scannedAt: scannedAtRaw,
      clientId: typeof body?.clientId === "string" ? body.clientId : undefined,
    });

    return apiSuccess(result);
  } catch (e) {
    console.error("[scanner scan]", e);
    return apiError(formatPrismaClientError(e), 500);
  }
}
