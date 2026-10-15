import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-auth";
import { lookupBoardStudent, resolveBoardByToken } from "@/lib/board";

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

  const student = await lookupBoardStudent(board.schoolId, code);
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
