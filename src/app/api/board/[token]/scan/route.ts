import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api-auth";
import { lookupBoardStudent, normalizeScanCode, resolveBoardByToken } from "@/lib/board";
import { publishBoardScan } from "@/lib/board-live-scan";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const board = await resolveBoardByToken(token);
  if (!board) return apiError("Info board not found", 404);

  const body = await req.json().catch(() => ({}));
  const code = typeof body?.code === "string" ? body.code : "";
  if (!code.trim()) return apiError("Scan code required", 400);

  const year = await prisma.schoolYear.findFirst({
    where: { schoolId: board.schoolId, isActive: true, isCurrent: true },
    select: { id: true },
  });

  const student = await lookupBoardStudent(board.schoolId, code);
  const scanKey = normalizeScanCode(code);

  if (year) {
    await publishBoardScan({
      schoolId: board.schoolId,
      schoolYearId: year.id,
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
}
