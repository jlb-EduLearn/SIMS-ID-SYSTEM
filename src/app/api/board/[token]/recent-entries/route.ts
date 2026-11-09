import { apiError, apiSuccess } from "@/lib/api-auth";
import { boardEntryLogOrThrow, prisma } from "@/lib/db";
import { resolveBoardByToken } from "@/lib/board";

const MAX_ENTRIES = 50;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const board = await resolveBoardByToken(token);
  if (!board) return apiError("Info board not found", 404);

  const year = await prisma.schoolYear.findFirst({
    where: { schoolId: board.schoolId, isActive: true, isCurrent: true },
    select: { id: true },
  });
  if (!year) {
    return apiSuccess({ entries: [] });
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const rows = await boardEntryLogOrThrow().findMany({
    where: {
      schoolId: board.schoolId,
      schoolYearId: year.id,
      found: true,
      fullName: { not: null },
      createdAt: { gte: startOfDay },
    },
    orderBy: { createdAt: "desc" },
    take: MAX_ENTRIES,
    include: {
      student: {
        select: {
          photoUrl: true,
          recordType: true,
          isActive: true,
        },
      },
    },
  });

  const entries = rows.map((row) => {
    const isStaff = row.personType === "TEACHER";
    return {
      id: row.id,
      enteredAt: row.createdAt.toISOString(),
      person: {
        id: row.studentId || row.id,
        studentId: row.displayId || "",
        fullName: row.fullName || "Unknown",
        recordType: isStaff ? "TEACHER" : "STUDENT",
        gradeLabel: row.grade || (isStaff ? row.department || "Staff" : ""),
        section: row.section || "",
        photoUrl: row.student?.photoUrl ?? null,
        schoolYearName: "",
        allowed: row.student?.isActive ?? true,
        isStaff,
      },
    };
  });

  return apiSuccess({ entries });
}
