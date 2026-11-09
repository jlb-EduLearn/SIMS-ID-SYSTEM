import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireFullContext,
  apiSuccess,
  apiError,
} from "@/lib/api-auth";

function canDeletePrintLogs(role: string) {
  return role === "ADMIN" || role === "SCHOOL_ADMIN" || role === "REGISTRAR";
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { session, schoolId, schoolYearId, error } =
      await requireFullContext();
    if (error) return error;

    if (!canDeletePrintLogs(session!.user.role)) {
      return apiError("You do not have permission to delete print logs", 403);
    }

    const { batchId } = await params;
    if (!batchId) {
      return apiError("Batch ID is required");
    }

    const batch = await prisma.idPrintBatch.findFirst({
      where: {
        id: batchId,
        schoolId: schoolId!,
        schoolYearId: schoolYearId!,
      },
      select: { id: true },
    });

    if (!batch) {
      return apiError("Print log not found", 404);
    }

    await prisma.idPrintBatch.delete({
      where: { id: batchId },
    });

    return apiSuccess({ deleted: true });
  } catch (e) {
    console.error("DELETE /api/print/logs/[batchId]", e);
    const message =
      e instanceof Error ? e.message : "Failed to delete print log";
    return apiError(message, 500);
  }
}
