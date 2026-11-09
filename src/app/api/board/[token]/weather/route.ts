import { apiError, apiSuccess } from "@/lib/api-auth";
import { resolveBoardByToken } from "@/lib/board";
import { boardAppearanceFromConfig } from "@/lib/board-settings";
import { fetchBoardWeather } from "@/lib/board-weather";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const board = await resolveBoardByToken(token);
  if (!board) return apiError("Info board not found", 404);

  const appearance = boardAppearanceFromConfig(board);
  if (!appearance.showWeather) {
    return apiSuccess({ weather: null });
  }

  const weather = await fetchBoardWeather(appearance.weatherLocation);
  return apiSuccess({ weather });
}
