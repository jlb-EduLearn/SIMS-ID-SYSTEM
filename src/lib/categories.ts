export type StudentCategory =
  | "PRE_KINDER"
  | "KINDER"
  | "GRADE_SCHOOL"
  | "JUNIOR_HIGH"
  | "SENIOR_HIGH"
  | "TERTIARY";

export const CATEGORY_LABELS: Record<StudentCategory, string> = {
  PRE_KINDER: "Pre-Kinder",
  KINDER: "Kinder",
  GRADE_SCHOOL: "Grade School (Grades 1–6)",
  JUNIOR_HIGH: "Junior High (Grades 7–10)",
  SENIOR_HIGH: "Senior High (Grades 11–12)",
  TERTIARY: "Tertiary / College",
};

export const CATEGORY_GRADES: Record<StudentCategory, string[]> = {
  PRE_KINDER: ["Pre-Kinder"],
  KINDER: ["Kinder"],
  GRADE_SCHOOL: [
    "Grade 1",
    "Grade 2",
    "Grade 3",
    "Grade 4",
    "Grade 5",
    "Grade 6",
  ],
  JUNIOR_HIGH: ["Grade 7", "Grade 8", "Grade 9", "Grade 10"],
  SENIOR_HIGH: ["Grade 11", "Grade 12"],
  TERTIARY: [],
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as StudentCategory[];

export function getDisplayGrade(student: {
  category: StudentCategory;
  grade?: string | null;
  customGradeName?: string | null;
  course?: string | null;
}): string {
  if (student.category === "TERTIARY") {
    const parts = [student.customGradeName, student.course].filter(Boolean);
    return parts.join(" · ") || "Tertiary";
  }
  return student.grade || CATEGORY_LABELS[student.category];
}

export type TemplateOrientation = "PORTRAIT" | "LANDSCAPE";

export const CARD_DIMENSIONS = {
  PORTRAIT: { width: 638, height: 1011 },
  LANDSCAPE: { width: 1011, height: 638 },
} as const;

export function getDimensionsForOrientation(orientation: TemplateOrientation) {
  return CARD_DIMENSIONS[orientation];
}
