import { NextRequest } from "next/server";
import {
  apiError,
  apiSuccess,
  formatPrismaClientError,
} from "@/lib/api-auth";
import { ensureBoardToken } from "@/lib/board";
import {
  processScannerScan,
  resolveScannerYearId,
} from "@/lib/scanner-process";
import { requireScannerApi } from "@/lib/scanner-api-auth";
import { scannerOptions, withScannerCors } from "@/lib/scanner-cors";

export function OPTIONS(req: NextRequest) {
  return scannerOptions(req);
}

export async function POST(req: NextRequest) {
  try {
    const { session, schoolId, schoolYearId, error } =
      await requireScannerApi(req);
    if (error) return withScannerCors(req, error);

    const body = await req.json().catch(() => ({}));
    const code = typeof body?.code === "string" ? body.code : "";
    if (!code.trim()) {
      return withScannerCors(req, apiError("Scan code required", 400));
    }

    const scannedAtRaw =
      typeof body?.scannedAt === "string" || typeof body?.scannedAt === "number"
        ? new Date(body.scannedAt)
        : undefined;

    await ensureBoardToken(schoolId!);
    const yearId = await resolveScannerYearId(
      schoolId!,
      schoolYearId || session?.user.currentSchoolYearId
    );
    if (!yearId) {
      return withScannerCors(
        req,
        apiError("No active school year for this school.", 400)
      );
    }

    const result = await processScannerScan({
      schoolId: schoolId!,
      schoolYearId: yearId,
      code,
      scannedAt: scannedAtRaw,
      clientId: typeof body?.clientId === "string" ? body.clientId : undefined,
    });

    return withScannerCors(req, apiSuccess(result));
  } catch (e) {
    console.error("[scanner scan]", e);
    return withScannerCors(req, apiError(formatPrismaClientError(e), 500));
  }
}
