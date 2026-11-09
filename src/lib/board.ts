import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { getDisplayGrade, type StudentCategory } from "@/lib/categories";

export function newBoardToken(): string {
  return randomBytes(18).toString("base64url");
}

/** Normalize scanner / QR payload to a lookup key. */
export function normalizeScanCode(raw: string): string {
  let code = raw.trim();
  if (!code) return "";

  try {
    if (code.startsWith("http://") || code.startsWith("https://")) {
      const url = new URL(code);
      const fromQuery =
        url.searchParams.get("id") ||
        url.searchParams.get("studentId") ||
        url.searchParams.get("card");
      if (fromQuery) return fromQuery.trim();
      const pathId = url.pathname.split("/").filter(Boolean).pop();
      if (pathId) return decodeURIComponent(pathId).trim();
    }
  } catch {
    /* plain code */
  }

  return code.replace(/\s+/g, "");
}

export async function ensureBoardToken(schoolId: string): Promise<string> {
  const existing = await prisma.schoolHardwareConfig.findUnique({
    where: { schoolId },
    select: { boardToken: true },
  });

  if (existing?.boardToken) return existing.boardToken;

  const token = newBoardToken();
  await prisma.schoolHardwareConfig.upsert({
    where: { schoolId },
    create: { schoolId, boardToken: token },
    update: { boardToken: token },
  });
  return token;
}

export async function resolveBoardByToken(token: string) {
  if (!token?.trim()) return null;
  const config = await prisma.schoolHardwareConfig.findUnique({
    where: { boardToken: token.trim() },
    include: {
      school: {
        select: {
          id: true,
          name: true,
          code: true,
          logoUrl: true,
          isActive: true,
        },
      },
    },
  });
  if (!config?.school?.isActive) return null;
  return config;
}

type BoardStudentRow = {
  id: string;
  studentId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  recordType: string;
  category: string;
  grade: string | null;
  customGradeName: string | null;
  course: string | null;
  section: string | null;
  department: string | null;
  position: string | null;
  designation: string | null;
  photoUrl: string | null;
  isActive: boolean;
  cardUid: string | null;
  wiegandCardNumber: string | null;
  studentNumber: string | null;
  employeeNumber: string | null;
};

export async function lookupBoardStudent(schoolId: string, code: string) {
  const key = normalizeScanCode(code);
  if (!key) return null;

  const year = await prisma.schoolYear.findFirst({
    where: { schoolId, isActive: true, isCurrent: true },
    select: { id: true, name: true },
  });
  if (!year) return null;

  const upper = key.toUpperCase();

  const exact = await prisma.student.findFirst({
    where: {
      schoolId,
      schoolYearId: year.id,
      isActive: true,
      OR: [
        { studentId: key },
        { studentNumber: key },
        { employeeNumber: key },
        { cardUid: key },
        { cardUid: upper },
        { wiegandCardNumber: key },
        { wiegandCardNumber: upper },
      ],
    },
    select: boardStudentSelect,
  });
  if (exact) return formatBoardStudent(exact, year.name);

  // Case-insensitive match for SQLite (common with scanners)
  const candidates = await prisma.student.findMany({
    where: {
      schoolId,
      schoolYearId: year.id,
      isActive: true,
    },
    select: boardStudentSelect,
    take: 8000,
  });

  const match = candidates.find((r) => {
    const ids = [
      r.studentId,
      r.studentNumber,
      r.employeeNumber,
      r.cardUid,
      r.wiegandCardNumber,
    ]
      .filter(Boolean)
      .map((v) => String(v).trim().toUpperCase());
    return ids.includes(upper);
  });

  return match ? formatBoardStudent(match, year.name) : null;
}

const boardStudentSelect = {
  id: true,
  studentId: true,
  firstName: true,
  middleName: true,
  lastName: true,
  suffix: true,
  recordType: true,
  category: true,
  grade: true,
  customGradeName: true,
  course: true,
  section: true,
  department: true,
  position: true,
  designation: true,
  photoUrl: true,
  isActive: true,
  cardUid: true,
  wiegandCardNumber: true,
  studentNumber: true,
  employeeNumber: true,
} as const;

function formatBoardStudent(student: BoardStudentRow, schoolYearName: string) {
  const name = [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(" ");
  const fullName = student.suffix?.trim()
    ? `${name} ${student.suffix.trim()}`
    : name;

  const isStaff = student.recordType === "TEACHER";
  const gradeLabel = isStaff
    ? student.position?.trim() ||
      student.designation?.trim() ||
      student.department?.trim() ||
      "Staff"
    : getDisplayGrade({
        category: student.category as StudentCategory,
        grade: student.grade,
        customGradeName: student.customGradeName,
        course: student.course,
      });

  const section = isStaff
    ? [student.department, student.section].filter(Boolean).join(" · ")
    : student.section || "";

  return {
    id: student.id,
    studentId: student.studentId,
    fullName,
    recordType: student.recordType,
    gradeLabel,
    section,
    photoUrl: student.photoUrl,
    schoolYearName,
    allowed: student.isActive,
    isStaff,
    category: student.category,
    grade: student.grade,
    department: student.department,
  };
}
