import { boardEntryLogOrThrow } from "@/lib/db";

export type BoardScanPerson = {
  id: string;
  studentId: string;
  fullName: string;
  recordType: string;
  isStaff: boolean;
  gradeLabel: string;
  section: string;
  category: string;
  grade: string | null;
  department: string | null;
};

export async function recordBoardEntryLog(input: {
  schoolId: string;
  schoolYearId: string;
  found: boolean;
  scanCode: string;
  person?: BoardScanPerson | null;
  createdAt?: Date;
}) {
  const code = input.scanCode.trim().slice(0, 120);
  const person = input.person;

  try {
    await boardEntryLogOrThrow().create({
      data: {
        schoolId: input.schoolId,
        schoolYearId: input.schoolYearId,
        found: input.found,
        scanCode: code || null,
        studentId: person?.id ?? null,
        personType: !input.found
          ? "UNKNOWN"
          : person?.isStaff || person?.recordType === "TEACHER"
            ? "TEACHER"
            : "STUDENT",
        displayId: person?.studentId ?? null,
        fullName: person?.fullName ?? null,
        category: person?.isStaff ? null : person?.category ?? null,
        grade: person?.gradeLabel ?? person?.grade ?? null,
        section: person?.section || null,
        department: person?.department ?? null,
        ...(input.createdAt ? { createdAt: input.createdAt } : {}),
      },
    });
  } catch (e) {
    console.error("[board-entry-log]", e);
  }
}
