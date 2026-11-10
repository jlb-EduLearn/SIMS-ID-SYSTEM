import { prisma } from "@/lib/db";
import { recordBoardEntryLog, type BoardScanPerson } from "@/lib/board-entry-log";

export type BoardLivePerson = {
  id: string;
  studentId: string;
  fullName: string;
  recordType: string;
  gradeLabel: string;
  section: string;
  photoUrl: string | null;
  schoolYearName: string;
  allowed: boolean;
  isStaff: boolean;
};

export type BoardLiveScan = {
  at: string;
  student: BoardLivePerson;
};

function toLivePerson(person: BoardScanPerson & { photoUrl?: string | null; schoolYearName?: string; allowed?: boolean }): BoardLivePerson {
  return {
    id: person.id,
    studentId: person.studentId,
    fullName: person.fullName,
    recordType: person.recordType,
    gradeLabel: person.gradeLabel || person.grade || "",
    section: person.section || "",
    photoUrl: person.photoUrl ?? null,
    schoolYearName: person.schoolYearName || "",
    allowed: person.allowed ?? true,
    isStaff: Boolean(person.isStaff || person.recordType === "TEACHER"),
  };
}

/** Persist entry log + latest lobby flash payload for remote scanner stations. */
export async function publishBoardScan(input: {
  schoolId: string;
  schoolYearId: string;
  found: boolean;
  scanCode: string;
  person?: (BoardScanPerson & {
    photoUrl?: string | null;
    schoolYearName?: string;
    allowed?: boolean;
  }) | null;
  scannedAt?: Date;
}) {
  await recordBoardEntryLog({
    schoolId: input.schoolId,
    schoolYearId: input.schoolYearId,
    found: input.found,
    scanCode: input.scanCode,
    person: input.person,
    createdAt: input.scannedAt,
  });

  if (!input.found || !input.person) return null;

  const live: BoardLiveScan = {
    at: (input.scannedAt ?? new Date()).toISOString(),
    student: toLivePerson(input.person),
  };

  await prisma.schoolHardwareConfig.updateMany({
    where: { schoolId: input.schoolId },
    data: {
      boardLastScanJson: JSON.stringify(live),
      boardLastScanAt: new Date(live.at),
    },
  });

  return live;
}

export function parseBoardLiveScan(
  raw: string | null | undefined
): BoardLiveScan | null {
  if (!raw?.trim()) return null;
  try {
    const data = JSON.parse(raw) as BoardLiveScan;
    if (!data?.at || !data?.student?.fullName) return null;
    return data;
  } catch {
    return null;
  }
}
