import type { Prisma } from "@prisma/client";
import { CATEGORY_LABELS, type StudentCategory } from "@/lib/categories";

export type BoardEntryLogFilters = {
  search: string;
  dateFrom?: Date;
  dateTo?: Date;
  category: string;
  section: string;
  personType: string;
};

export function parseBoardEntryLogFilters(
  searchParams: URLSearchParams
): BoardEntryLogFilters {
  return {
    search: searchParams.get("search")?.trim() || "",
    dateFrom: parseDateStart(searchParams.get("dateFrom")),
    dateTo: parseDateEnd(searchParams.get("dateTo")),
    category: searchParams.get("category")?.trim() || "",
    section: searchParams.get("section")?.trim() || "",
    personType: searchParams.get("personType")?.trim() || "",
  };
}

function parseDateStart(value: string | null): Date | undefined {
  if (!value?.trim()) return undefined;
  const d = new Date(`${value.trim()}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseDateEnd(value: string | null): Date | undefined {
  if (!value?.trim()) return undefined;
  const d = new Date(`${value.trim()}T23:59:59.999`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function buildBoardEntryLogWhere(
  schoolId: string,
  schoolYearId: string,
  filters: BoardEntryLogFilters
): Prisma.BoardEntryLogWhereInput {
  const { search, dateFrom, dateTo, category, section, personType } = filters;
  return {
    schoolId,
    schoolYearId,
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        }
      : {}),
    ...(category ? { category } : {}),
    ...(section ? { section } : {}),
    ...(personType === "STUDENT" ||
    personType === "TEACHER" ||
    personType === "UNKNOWN"
      ? { personType }
      : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" as const } },
            { displayId: { contains: search, mode: "insensitive" as const } },
            { scanCode: { contains: search, mode: "insensitive" as const } },
            { grade: { contains: search, mode: "insensitive" as const } },
            { department: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

export type BoardEntryLogDto = {
  id: string;
  createdAt: string;
  found: boolean;
  personType: string;
  displayId: string | null;
  fullName: string | null;
  category: string | null;
  categoryLabel: string | null;
  grade: string | null;
  section: string | null;
  department: string | null;
  scanCode: string | null;
};

export function mapBoardEntryLogRow(row: {
  id: string;
  createdAt: Date;
  found: boolean;
  personType: string;
  displayId: string | null;
  fullName: string | null;
  category: string | null;
  grade: string | null;
  section: string | null;
  department: string | null;
  scanCode: string | null;
}): BoardEntryLogDto {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    found: row.found,
    personType: row.personType,
    displayId: row.displayId,
    fullName: row.fullName,
    category: row.category,
    categoryLabel: row.category
      ? CATEGORY_LABELS[row.category as StudentCategory] || row.category
      : null,
    grade: row.grade,
    section: row.section,
    department: row.department,
    scanCode: row.scanCode,
  };
}

export function personTypeLabel(type: string, found: boolean): string {
  if (!found) return "Unrecognized";
  if (type === "TEACHER") return "Staff";
  if (type === "STUDENT") return "Student";
  return type;
}

export function levelLabel(row: BoardEntryLogDto): string {
  if (row.personType === "TEACHER") {
    return row.department || row.grade || "Staff";
  }
  if (!row.found) return "";
  const parts = [row.categoryLabel || row.category, row.grade].filter(Boolean);
  return parts.join(" · ");
}
