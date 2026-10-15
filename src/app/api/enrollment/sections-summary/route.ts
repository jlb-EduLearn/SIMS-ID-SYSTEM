import { prisma } from "@/lib/db";
import { apiSuccess, requireFullContext } from "@/lib/api-auth";

export async function GET() {
  const { schoolId, schoolYearId, error } = await requireFullContext();
  if (error) return error;

  const [sections, enrollmentCounts, unassignedGroups] = await Promise.all([
    prisma.gradeSection.findMany({
      where: {
        schoolId: schoolId!,
        schoolYearId: schoolYearId!,
        isActive: true,
      },
      orderBy: [{ grade: "asc" }, { name: "asc" }],
    }),
    prisma.student.groupBy({
      by: ["grade", "section"],
      where: {
        schoolId: schoolId!,
        schoolYearId: schoolYearId!,
        recordType: "STUDENT",
        isActive: true,
        section: { not: null },
        grade: { not: null },
      },
      _count: { _all: true },
    }),
    prisma.student.groupBy({
      by: ["grade"],
      where: {
        schoolId: schoolId!,
        schoolYearId: schoolYearId!,
        recordType: "STUDENT",
        isActive: true,
        OR: [{ section: null }, { section: "" }],
        grade: { not: null },
      },
      _count: { _all: true },
    }),
  ]);

  const countKey = (grade: string, section: string) => `${grade}\0${section}`;
  const countMap = new Map<string, number>();
  for (const row of enrollmentCounts) {
    if (row.grade && row.section) {
      countMap.set(countKey(row.grade, row.section), row._count._all);
    }
  }

  return apiSuccess({
    sections: sections.map((s) => ({
      id: s.id,
      category: s.category,
      grade: s.grade,
      name: s.name,
      enrolledCount: countMap.get(countKey(s.grade, s.name)) ?? 0,
    })),
    unassignedByGrade: unassignedGroups
      .map((g) => ({
        grade: g.grade!,
        count: g._count._all,
      }))
      .sort((a, b) => a.grade.localeCompare(b.grade)),
  });
}
