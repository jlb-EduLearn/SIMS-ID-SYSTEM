import { prisma } from "@/lib/db";
import { cardIssuedAtPatch, pickProfileFromDb } from "@/lib/student-db-map";

/** Copy all employee records (recordType TEACHER) into another school year. */
export async function copyStaffToSchoolYear(
  schoolId: string,
  sourceSchoolYearId: string,
  targetSchoolYearId: string
) {
  if (sourceSchoolYearId === targetSchoolYearId) {
    return { created: 0, updated: 0, total: 0 };
  }

  const staff = await prisma.student.findMany({
    where: {
      schoolId,
      schoolYearId: sourceSchoolYearId,
      recordType: "TEACHER",
      isActive: true,
    },
  });

  let created = 0;
  let updated = 0;

  for (const source of staff) {
    const profile = pickProfileFromDb(source);
    const yearFields = {
      category: source.category,
      department: source.department,
      position: source.position,
      designation: source.designation,
      dateHired: source.dateHired,
      employeeNumber: source.employeeNumber,
      isTeaching: source.isTeaching,
      requiresTimeInOut: source.requiresTimeInOut,
      grade: null,
      section: null,
      customGradeName: null,
      course: null,
    };

    const existing = await prisma.student.findUnique({
      where: {
        schoolId_schoolYearId_studentId: {
          schoolId,
          schoolYearId: targetSchoolYearId,
          studentId: source.studentId,
        },
      },
    });

    const cardPatch = cardIssuedAtPatch(existing ?? {}, {
      cardUid: (profile.cardUid as string | null) ?? null,
      wiegandCardNumber:
        (profile.wiegandCardNumber as string | null) ?? null,
    });

    if (existing) {
      await prisma.student.update({
        where: { id: existing.id },
        data: {
          ...profile,
          ...yearFields,
          recordType: "TEACHER",
          isActive: true,
          ...cardPatch,
        },
      });
      updated++;
    } else {
      await prisma.student.create({
        data: {
          schoolId,
          schoolYearId: targetSchoolYearId,
          ...profile,
          ...yearFields,
          recordType: "TEACHER",
          isActive: true,
          ...cardPatch,
        } as Parameters<typeof prisma.student.create>[0]["data"],
      });
      created++;
    }
  }

  return { created, updated, total: staff.length };
}
