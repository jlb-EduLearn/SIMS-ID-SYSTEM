import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess, requireFullContext } from "@/lib/api-auth";
import {
  cardIssuedAtPatch,
  pickProfileFromDb,
} from "@/lib/student-db-map";
import { sourceGradeForTargetEnrollment } from "@/lib/enrollment-promote";

const bodySchema = z.object({
  grade: z.string().min(1),
  section: z.string().min(1),
  studentIds: z.array(z.string().min(1)).min(1),
  sourceSchoolYearId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { schoolId, schoolYearId, error } = await requireFullContext();
  if (error) return error;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message || "Invalid request");
  }

  const { grade, section, studentIds, sourceSchoolYearId } = parsed.data;

  const sectionDef = await prisma.gradeSection.findFirst({
    where: {
      schoolId: schoolId!,
      schoolYearId: schoolYearId!,
      grade,
      name: section,
      isActive: true,
    },
  });

  if (!sectionDef) {
    return apiError(
      "Section not found for this grade. Add it under Students → Sections first.",
      404
    );
  }

  const fromPastYear =
    sourceSchoolYearId && sourceSchoolYearId !== schoolYearId;

  if (fromPastYear) {
    const sourceYear = await prisma.schoolYear.findFirst({
      where: {
        id: sourceSchoolYearId,
        schoolId: schoolId!,
        isActive: true,
      },
    });
    if (!sourceYear) return apiError("Source school year not found", 404);

    const expectedSource = sourceGradeForTargetEnrollment(grade);
    if (!expectedSource) {
      return apiError(
        `Cannot derive prior grade for ${grade}. Enroll from current year instead.`
      );
    }
  }

  const sourceYearId = fromPastYear ? sourceSchoolYearId! : schoolYearId!;

  const sources = await prisma.student.findMany({
    where: {
      id: { in: studentIds },
      schoolId: schoolId!,
      schoolYearId: sourceYearId,
      recordType: "STUDENT",
      isActive: true,
    },
  });

  if (sources.length !== studentIds.length) {
    return apiError("One or more students were not found for the selected year");
  }

  if (fromPastYear) {
    const expected = sourceGradeForTargetEnrollment(grade)!;
    const wrong = sources.filter((s) => s.grade !== expected.grade);
    if (wrong.length > 0) {
      return apiError(
        `Past-year students must be in ${expected.grade} to enroll into ${grade} ${section}.`
      );
    }
  } else {
    const wrongGrade = sources.filter((s) => s.grade !== grade);
    if (wrongGrade.length > 0) {
      return apiError(
        `${wrongGrade.length} student(s) are not in ${grade}.`
      );
    }
  }

  let created = 0;
  let updated = 0;

  for (const source of sources) {
    const existingCurrent = await prisma.student.findUnique({
      where: {
        schoolId_schoolYearId_studentId: {
          schoolId: schoolId!,
          schoolYearId: schoolYearId!,
          studentId: source.studentId,
        },
      },
    });

    if (existingCurrent?.isActive) {
      await prisma.student.update({
        where: { id: existingCurrent.id },
        data: {
          section,
          grade,
          category: sectionDef.category,
        },
      });
      updated++;
      continue;
    }

    const profile = pickProfileFromDb(source);
    const dbPayload = {
      ...profile,
      category: sectionDef.category,
      grade,
      section,
      customGradeName: null,
      course: null,
    };

    if (existingCurrent) {
      await prisma.student.update({
        where: { id: existingCurrent.id },
        data: {
          ...dbPayload,
          isActive: true,
          ...cardIssuedAtPatch(existingCurrent, {
            cardUid: (profile.cardUid as string | null) ?? null,
            wiegandCardNumber:
              (profile.wiegandCardNumber as string | null) ?? null,
          }),
        },
      });
      updated++;
    } else {
      await prisma.student.create({
        data: {
          schoolId: schoolId!,
          schoolYearId: schoolYearId!,
          ...dbPayload,
          ...cardIssuedAtPatch({}, {
            cardUid: (profile.cardUid as string | null) ?? null,
            wiegandCardNumber:
              (profile.wiegandCardNumber as string | null) ?? null,
          }),
        } as Parameters<typeof prisma.student.create>[0]["data"],
      });
      created++;
    }
  }

  return apiSuccess({
    assigned: studentIds.length,
    created,
    updated,
    grade,
    section,
    fromPastYear: Boolean(fromPastYear),
  });
}
