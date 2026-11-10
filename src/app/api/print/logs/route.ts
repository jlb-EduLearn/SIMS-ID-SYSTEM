import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireFullContext, apiSuccess, apiError } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
  const { schoolId, schoolYearId, error } = await requireFullContext();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
  );
  const search = searchParams.get("search")?.trim() || "";
  const batchId = searchParams.get("batchId") || "";

  const schoolYearFilter = {
    schoolId: schoolId!,
    schoolYearId: schoolYearId!,
  };

  const [totalPrintEvents, totalBatches, uniqueStudents] = await Promise.all([
    prisma.idPrintLogEntry.count({
      where: {
        batch: schoolYearFilter,
      },
    }),
    prisma.idPrintBatch.count({
      where: schoolYearFilter,
    }),
    prisma.idPrintLogEntry.groupBy({
      by: ["studentId"],
      where: { batch: schoolYearFilter },
    }),
  ]);

  if (batchId) {
    const batch = await prisma.idPrintBatch.findFirst({
      where: { id: batchId, ...schoolYearFilter },
      include: {
        printedBy: { select: { id: true, name: true, email: true } },
        entries: {
          orderBy: { studentName: "asc" },
        },
      },
    });
    return apiSuccess({
      summary: {
        totalPrintEvents,
        totalBatches,
        uniqueStudentsPrinted: uniqueStudents.length,
      },
      batch,
    });
  }

  const batchWhere = {
    ...schoolYearFilter,
    ...(search
      ? {
          OR: [
            {
              templateName: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              printedBy: {
                name: { contains: search, mode: "insensitive" as const },
              },
            },
            {
              entries: {
                some: {
                  OR: [
                    {
                      studentName: {
                        contains: search,
                        mode: "insensitive" as const,
                      },
                    },
                    {
                      studentNumber: {
                        contains: search,
                        mode: "insensitive" as const,
                      },
                    },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };

  const [batches, total] = await Promise.all([
    prisma.idPrintBatch.findMany({
      where: batchWhere,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        printedBy: { select: { id: true, name: true, email: true } },
        entries: {
          take: 5,
          orderBy: { studentName: "asc" },
          select: {
            id: true,
            studentId: true,
            studentNumber: true,
            studentName: true,
            grade: true,
            section: true,
          },
        },
        _count: { select: { entries: true } },
      },
    }),
    prisma.idPrintBatch.count({ where: batchWhere }),
  ]);

  let studentLeaderboard: Array<{
    studentId: string;
    studentNumber: string;
    studentName: string;
    printCount: number;
  }> = [];

  if (page === 1 && !search) {
    const grouped = await prisma.idPrintLogEntry.groupBy({
      by: ["studentId"],
      where: { batch: schoolYearFilter },
      _count: { studentId: true },
    });
    const topGrouped = grouped
      .sort((a, b) => b._count.studentId - a._count.studentId)
      .slice(0, 10);
    if (topGrouped.length > 0) {
      const ids = topGrouped.map((g) => g.studentId);
      const [logMeta, studentMeta] = await Promise.all([
        prisma.idPrintLogEntry.findMany({
          where: { studentId: { in: ids } },
          orderBy: { createdAt: "desc" },
          select: {
            studentId: true,
            studentNumber: true,
            studentName: true,
          },
        }),
        prisma.student.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
          },
        }),
      ]);
      const latestLog = new Map<string, (typeof logMeta)[0]>();
      for (const row of logMeta) {
        if (!latestLog.has(row.studentId)) latestLog.set(row.studentId, row);
      }
      const studentMap = new Map(studentMeta.map((s) => [s.id, s]));
      studentLeaderboard = topGrouped.map((g) => {
        const log = latestLog.get(g.studentId);
        const st = studentMap.get(g.studentId);
        return {
          studentId: g.studentId,
          studentNumber: log?.studentNumber ?? st?.studentId ?? "",
          studentName:
            log?.studentName ??
            (st ? `${st.firstName} ${st.lastName}`.trim() : ""),
          printCount: g._count.studentId,
        };
      });
    }
  }

  return apiSuccess({
    summary: {
      totalPrintEvents,
      totalBatches,
      uniqueStudentsPrinted: uniqueStudents.length,
    },
    studentLeaderboard,
    batches: batches.map((b) => ({
      id: b.id,
      createdAt: b.createdAt,
      templateName: b.templateName,
      studentCount: b.studentCount,
      printedBy: b.printedBy,
      entryPreview: b.entries,
      totalEntries: b._count.entries,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
  } catch (e) {
    console.error("GET /api/print/logs", e);
    const message =
      e instanceof Error ? e.message : "Failed to load print logs";
    return apiError(message, 500);
  }
}
