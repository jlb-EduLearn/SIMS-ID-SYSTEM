import { NextRequest } from "next/server";
import { prisma, boardEntryLogOrThrow } from "@/lib/db";
import {
  apiError,
  apiSuccess,
  formatPrismaClientError,
  requireSchoolContext,
} from "@/lib/api-auth";
import { ensureBoardToken, lookupBoardStudent, normalizeScanCode } from "@/lib/board";
import { publishBoardScan } from "@/lib/board-live-scan";
import {
  SCANNER_COOLDOWN_MS,
  formatCooldownRemaining,
} from "@/lib/scanner-cooldown";

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

    await ensureBoardToken(schoolId!);

    const yearId =
      schoolYearId ||
      (
        await prisma.schoolYear.findFirst({
          where: { schoolId: schoolId!, isActive: true, isCurrent: true },
          select: { id: true },
        })
      )?.id;

    const student = await lookupBoardStudent(schoolId!, code);
    const scanKey = normalizeScanCode(code);

    if (!yearId) {
      return apiError("No active school year for this school.", 400);
    }

    if (!student) {
      await publishBoardScan({
        schoolId: schoolId!,
        schoolYearId: yearId,
        found: false,
        scanCode: scanKey || code.trim(),
        person: null,
      });
      return apiSuccess({
        found: false,
        alreadyScanned: false,
        student: null,
        message: "No matching student or card",
      });
    }

    const since = new Date(Date.now() - SCANNER_COOLDOWN_MS);
    const recent = await boardEntryLogOrThrow().findFirst({
      where: {
        schoolId: schoolId!,
        schoolYearId: yearId,
        studentId: student.id,
        found: true,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    if (recent) {
      const remainingMs =
        SCANNER_COOLDOWN_MS - (Date.now() - recent.createdAt.getTime());
      return apiSuccess({
        found: true,
        alreadyScanned: true,
        student,
        message: `Already scanned — try again in ${formatCooldownRemaining(remainingMs)}`,
        cooldownMs: Math.max(0, remainingMs),
      });
    }

    await publishBoardScan({
      schoolId: schoolId!,
      schoolYearId: yearId,
      found: true,
      scanCode: scanKey || code.trim(),
      person: student,
    });

    return apiSuccess({
      found: true,
      alreadyScanned: false,
      student,
      message: student.allowed ? "Welcome" : "Inactive",
    });
  } catch (e) {
    console.error("[scanner scan]", e);
    return apiError(formatPrismaClientError(e), 500);
  }
}
