import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  apiError,
  apiSuccess,
  formatPrismaClientError,
  requireSchoolContext,
} from "@/lib/api-auth";
import { lookupBoardStudent, normalizeScanCode } from "@/lib/board";
import { recordBoardEntryLog } from "@/lib/board-entry-log";

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

    if (yearId) {
      void recordBoardEntryLog({
        schoolId: schoolId!,
        schoolYearId: yearId,
        found: Boolean(student),
        scanCode: scanKey || code.trim(),
        person: student,
      });
    }

    if (!student) {
      return apiSuccess({
        found: false,
        student: null,
        message: "No matching student or card",
      });
    }

    return apiSuccess({
      found: true,
      student,
      message: student.allowed ? "Welcome" : "Inactive",
    });
  } catch (e) {
    console.error("[scanner scan]", e);
    return apiError(formatPrismaClientError(e), 500);
  }
}
