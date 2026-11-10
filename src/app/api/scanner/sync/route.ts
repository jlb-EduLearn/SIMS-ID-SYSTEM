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

type IncomingScan = {
  id?: string;
  code?: string;
  scannedAt?: string | number;
};

export async function POST(req: NextRequest) {
  try {
    const { session, schoolId, schoolYearId, error } =
      await requireSchoolContext();
    if (error) return error;

    if (!isScannerRole(session!.user.role)) {
      return apiError("Scanner login required.", 403);
    }

    const body = await req.json().catch(() => ({}));
    const scans = Array.isArray(body?.scans) ? (body.scans as IncomingScan[]) : [];
    if (scans.length === 0) return apiError("No scans to sync", 400);
    if (scans.length > 100) return apiError("Maximum 100 scans per sync", 400);

    await ensureBoardToken(schoolId!);
    const yearId = await resolveScannerYearId(schoolId!, schoolYearId);
    if (!yearId) {
      return apiError("No active school year for this school.", 400);
    }

    // Process oldest-first so cooldowns apply correctly for catch-up.
    const ordered = [...scans].sort((a, b) => {
      const atA = a.scannedAt ? new Date(a.scannedAt).getTime() : 0;
      const atB = b.scannedAt ? new Date(b.scannedAt).getTime() : 0;
      return atA - atB;
    });

    const results = [];
    for (const item of ordered) {
      const code = typeof item.code === "string" ? item.code.trim() : "";
      if (!code) {
        results.push({
          clientId: item.id,
          found: false,
          alreadyScanned: false,
          student: null,
          message: "Scan code required",
          scannedAt: new Date().toISOString(),
          error: true,
        });
        continue;
      }

      const scannedAt = item.scannedAt ? new Date(item.scannedAt) : new Date();
      const result = await processScannerScan({
        schoolId: schoolId!,
        schoolYearId: yearId,
        code,
        scannedAt,
        clientId: typeof item.id === "string" ? item.id : undefined,
      });
      results.push(result);
    }

    return apiSuccess({ results, synced: results.length });
  } catch (e) {
    console.error("[scanner sync]", e);
    return apiError(formatPrismaClientError(e), 500);
  }
}
