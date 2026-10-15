import { apiError, apiSuccess } from "@/lib/api-auth";
import { resolveBoardByToken } from "@/lib/board";
import { boardAppearanceFromConfig } from "@/lib/board-settings";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const board = await resolveBoardByToken(token);
  if (!board) return apiError("Info board not found", 404);

  return apiSuccess({
    school: {
      name: board.school.name,
      code: board.school.code,
      logoUrl: board.school.logoUrl,
    },
    appearance: boardAppearanceFromConfig(board),
  });
}
