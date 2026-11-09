import { apiError, apiSuccess } from "@/lib/api-auth";
import { resolveBoardByToken } from "@/lib/board";
import { parseBoardLiveScan } from "@/lib/board-live-scan";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const board = await resolveBoardByToken(token);
  if (!board) return apiError("Info board not found", 404);

  const scan = parseBoardLiveScan(board.boardLastScanJson);
  return apiSuccess({
    scan,
    at: board.boardLastScanAt?.toISOString() ?? scan?.at ?? null,
  });
}
