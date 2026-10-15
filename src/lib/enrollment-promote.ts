import type { StudentCategory } from "@/lib/categories";

/** Ordered promotion path (K–12). Tertiary is not auto-promoted. */
export const PROMOTION_LADDER: ReadonlyArray<{
  category: StudentCategory;
  grade: string;
}> = [
  { category: "PRE_KINDER", grade: "Pre-Kinder" },
  { category: "KINDER", grade: "Kinder" },
  { category: "GRADE_SCHOOL", grade: "Grade 1" },
  { category: "GRADE_SCHOOL", grade: "Grade 2" },
  { category: "GRADE_SCHOOL", grade: "Grade 3" },
  { category: "GRADE_SCHOOL", grade: "Grade 4" },
  { category: "GRADE_SCHOOL", grade: "Grade 5" },
  { category: "GRADE_SCHOOL", grade: "Grade 6" },
  { category: "JUNIOR_HIGH", grade: "Grade 7" },
  { category: "JUNIOR_HIGH", grade: "Grade 8" },
  { category: "JUNIOR_HIGH", grade: "Grade 9" },
  { category: "JUNIOR_HIGH", grade: "Grade 10" },
  { category: "SENIOR_HIGH", grade: "Grade 11" },
  { category: "SENIOR_HIGH", grade: "Grade 12" },
];

export type PromotableStudent = {
  category: StudentCategory;
  grade?: string | null;
  customGradeName?: string | null;
  course?: string | null;
};

export function nextPromotionLevel(student: PromotableStudent): {
  category: StudentCategory;
  grade: string | null;
  customGradeName: string | null;
  course: string | null;
  graduated: boolean;
} | null {
  if (student.category === "TERTIARY") {
    return null;
  }

  const currentGrade = student.grade?.trim() || null;

  if (!currentGrade) return null;

  const idx = PROMOTION_LADDER.findIndex(
    (step) => step.grade === currentGrade && step.category === student.category
  );

  if (idx === -1) {
    const byGradeOnly = PROMOTION_LADDER.findIndex(
      (step) => step.grade === currentGrade
    );
    if (byGradeOnly === -1) return null;
    if (byGradeOnly >= PROMOTION_LADDER.length - 1) {
      return {
        category: student.category,
        grade: null,
        customGradeName: null,
        course: null,
        graduated: true,
      };
    }
    const next = PROMOTION_LADDER[byGradeOnly + 1];
    return {
      category: next.category,
      grade: next.grade,
      customGradeName: null,
      course: null,
      graduated: false,
    };
  }

  if (idx >= PROMOTION_LADDER.length - 1) {
    return {
      category: student.category,
      grade: null,
      customGradeName: null,
      course: null,
      graduated: true,
    };
  }

  const next = PROMOTION_LADDER[idx + 1];
  return {
    category: next.category,
    grade: next.grade,
    customGradeName: null,
    course: null,
    graduated: false,
  };
}

/** Grade level expected in the *previous* year before enrolling into `targetGrade`. */
export function sourceGradeForTargetEnrollment(targetGrade: string): {
  category: StudentCategory;
  grade: string;
} | null {
  const idx = PROMOTION_LADDER.findIndex((step) => step.grade === targetGrade);
  if (idx <= 0) return null;
  return PROMOTION_LADDER[idx - 1];
}
