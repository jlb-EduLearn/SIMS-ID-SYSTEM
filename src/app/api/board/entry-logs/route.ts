import { NextRequest } from "next/server";
import { boardEntryLogOrThrow, prisma } from "@/lib/db";
import {
  apiError,
  apiSuccess,
  formatPrismaClientError,
  requireFullContext,
} from "@/lib/api-auth";
import { CATEGORY_LABELS, type StudentCategory } from "@/lib/categories";
import {
  buildBoardEntryLogWhere,
  mapBoardEntryLogRow,
  parseBoardEntryLogFilters,
} from "@/lib/board-entry-log-query";

export async function GET(req: NextRequest) {
  try {
    const { schoolId, schoolYearId, error } = await requireFullContext();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "25", 10))
    );
    const filters = parseBoardEntryLogFilters(searchParams);
    const baseWhere = buildBoardEntryLogWhere(
      schoolId!,
      schoolYearId!,
      filters
    );

    const entryLog = boardEntryLogOrThrow();

    const [total, logs, staffToday, studentToday, sectionRows, categoryRows] =
      await Promise.all([
        entryLog.count({ where: baseWhere }),
        entryLog.findMany({
          where: baseWhere,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        entryLog.count({
          where: {
            ...baseWhere,
            personType: "TEACHER",
            found: true,
          },
        }),
        entryLog.count({
          where: {
            ...baseWhere,
            personType: "STUDENT",
            found: true,
          },
        }),
        entryLog.groupBy({
          by: ["section"],
          where: {
            schoolId: schoolId!,
            schoolYearId: schoolYearId!,
            section: { not: null },
          },
          orderBy: { section: "asc" },
          take: 200,
        }),
        entryLog.groupBy({
          by: ["category"],
          where: {
            schoolId: schoolId!,
            schoolYearId: schoolYearId!,
            category: { not: null },
          },
          orderBy: { category: "asc" },
          take: 20,
        }),
      ]);

    const sectionsFromDb = await prisma.gradeSection.findMany({
      where: { schoolId: schoolId!, schoolYearId: schoolYearId!, isActive: true },
      select: { name: true, grade: true },
      orderBy: [{ grade: "asc" }, { name: "asc" }],
    });

    const sectionSet = new Set<string>();
    for (const s of sectionsFromDb) {
      if (s.name.trim()) sectionSet.add(s.name.trim());
    }
    for (const row of sectionRows) {
      if (row.section?.trim()) sectionSet.add(row.section.trim());
    }

    const categories = Object.keys(CATEGORY_LABELS) as StudentCategory[];

    return apiSuccess({
      summary: {
        total,
        recognizedStaff: staffToday,
        recognizedStudents: studentToday,
      },
      logs: logs.map(mapBoardEntryLogRow),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      filterOptions: {
        sections: [...sectionSet].sort((a, b) => a.localeCompare(b)),
        categories: categories.map((key) => ({
          value: key,
          label: CATEGORY_LABELS[key],
        })),
        loggedCategories: categoryRows
          .map((r) => r.category)
          .filter(Boolean) as string[],
      },
    });
  } catch (e) {
    console.error("[board entry-logs GET]", e);
    return apiError(formatPrismaClientError(e), 500);
  }
}
