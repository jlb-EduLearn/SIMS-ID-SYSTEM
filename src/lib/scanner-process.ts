import { prisma, boardEntryLogOrThrow } from "@/lib/db";
import { lookupBoardStudent, normalizeScanCode } from "@/lib/board";
import { publishBoardScan } from "@/lib/board-live-scan";
import {
  SCANNER_COOLDOWN_MS,
  formatCooldownRemaining,
} from "@/lib/scanner-cooldown";

export type ScannerProcessResult = {
  clientId?: string;
  found: boolean;
  alreadyScanned: boolean;
  student: Awaited<ReturnType<typeof lookupBoardStudent>>;
  message: string;
  cooldownMs?: number;
  scannedAt: string;
};

export async function processScannerScan(input: {
  schoolId: string;
  schoolYearId: string;
  code: string;
  scannedAt?: Date;
  clientId?: string;
}): Promise<ScannerProcessResult> {
  const scannedAt =
    input.scannedAt && !Number.isNaN(input.scannedAt.getTime())
      ? input.scannedAt
      : new Date();
  const student = await lookupBoardStudent(input.schoolId, input.code);
  const scanKey = normalizeScanCode(input.code);

  if (!student) {
    await publishBoardScan({
      schoolId: input.schoolId,
      schoolYearId: input.schoolYearId,
      found: false,
      scanCode: scanKey || input.code.trim(),
      person: null,
      scannedAt,
    });
    return {
      clientId: input.clientId,
      found: false,
      alreadyScanned: false,
      student: null,
      message: "No matching student or card",
      scannedAt: scannedAt.toISOString(),
    };
  }

  const since = new Date(scannedAt.getTime() - SCANNER_COOLDOWN_MS);
  const recent = await boardEntryLogOrThrow().findFirst({
    where: {
      schoolId: input.schoolId,
      schoolYearId: input.schoolYearId,
      studentId: student.id,
      found: true,
      createdAt: { gte: since, lte: scannedAt },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (recent) {
    const remainingMs =
      SCANNER_COOLDOWN_MS - (scannedAt.getTime() - recent.createdAt.getTime());
    return {
      clientId: input.clientId,
      found: true,
      alreadyScanned: true,
      student,
      message: `Already scanned — try again in ${formatCooldownRemaining(remainingMs)}`,
      cooldownMs: Math.max(0, remainingMs),
      scannedAt: scannedAt.toISOString(),
    };
  }

  await publishBoardScan({
    schoolId: input.schoolId,
    schoolYearId: input.schoolYearId,
    found: true,
    scanCode: scanKey || input.code.trim(),
    person: student,
    scannedAt,
  });

  return {
    clientId: input.clientId,
    found: true,
    alreadyScanned: false,
    student,
    message: student.allowed ? "Welcome" : "Inactive",
    scannedAt: scannedAt.toISOString(),
  };
}

export async function resolveScannerYearId(
  schoolId: string,
  schoolYearId: string | null | undefined
) {
  if (schoolYearId) return schoolYearId;
  const year = await prisma.schoolYear.findFirst({
    where: { schoolId, isActive: true, isCurrent: true },
    select: { id: true },
  });
  return year?.id ?? null;
}
