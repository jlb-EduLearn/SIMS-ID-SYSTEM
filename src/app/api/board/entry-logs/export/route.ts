import { NextRequest } from "next/server";
import { boardEntryLogOrThrow, prisma } from "@/lib/db";
import {
  apiError,
  formatPrismaClientError,
  requireFullContext,
} from "@/lib/api-auth";
import {
  buildBoardEntryLogWhere,
  mapBoardEntryLogRow,
  parseBoardEntryLogFilters,
} from "@/lib/board-entry-log-query";
import {
  buildBoardEntryLogsCsv,
  buildBoardEntryLogsPdf,
} from "@/lib/board-entry-log-export";

const EXPORT_MAX_ROWS = 5000;

function filterSummary(filters: ReturnType<typeof parseBoardEntryLogFilters>): string {
  const parts: string[] = [];
  if (filters.dateFrom || filters.dateTo) {
    parts.push(
      `Dates: ${filters.dateFrom?.toISOString().slice(0, 10) || "…"} – ${filters.dateTo?.toISOString().slice(0, 10) || "…"}`
    );
  }
  if (filters.category) parts.push(`Level: ${filters.category}`);
  if (filters.section) parts.push(`Section: ${filters.section}`);
  if (filters.personType) parts.push(`Person: ${filters.personType}`);
  if (filters.search) parts.push(`Search: ${filters.search}`);
  return parts.length ? parts.join(" · ") : "All entries (current school year)";
}

export async function GET(req: NextRequest) {
  try {
    const { schoolId, schoolYearId, error } = await requireFullContext();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const format = (searchParams.get("format") || "csv").toLowerCase();
    if (format !== "csv" && format !== "pdf") {
      return apiError("format must be csv or pdf", 400);
    }

    const filters = parseBoardEntryLogFilters(searchParams);
    const where = buildBoardEntryLogWhere(schoolId!, schoolYearId!, filters);

    const entryLog = boardEntryLogOrThrow();

    const [school, schoolYear, total, rows] = await Promise.all([
      prisma.school.findUnique({
        where: { id: schoolId! },
        select: { name: true, code: true },
      }),
      prisma.schoolYear.findUnique({
        where: { id: schoolYearId! },
        select: { name: true },
      }),
      entryLog.count({ where }),
      entryLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: EXPORT_MAX_ROWS,
      }),
    ]);

    if (total === 0) {
      return apiError("No entry logs match the current filters.", 400);
    }

    const dtos = rows.map(mapBoardEntryLogRow);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const schoolLabel = school?.name || "School";
    const yearLabel = schoolYear?.name || "School year";
    let subtitle = filterSummary(filters);
    if (total > EXPORT_MAX_ROWS) {
      subtitle += ` · Exported first ${EXPORT_MAX_ROWS} of ${total} rows`;
    }

    if (format === "csv") {
      const csv = buildBoardEntryLogsCsv(dtos);
      const filename = `entry-logs-${school?.code || "school"}-${dateStamp}.csv`;
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const pdf = buildBoardEntryLogsPdf(dtos, {
      title: `Entry logs — ${schoolLabel}`,
      subtitle: `${yearLabel} · ${subtitle}`,
    });
    const filename = `entry-logs-${school?.code || "school"}-${dateStamp}.pdf`;
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("[board entry-logs export]", e);
    return apiError(formatPrismaClientError(e), 500);
  }
}
