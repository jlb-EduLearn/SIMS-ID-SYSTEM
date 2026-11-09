import { CATEGORY_GRADES, CATEGORY_LABELS } from "@/lib/categories";
import {
  STUDENT_CSV_EXPORT_LABELS,
  escapeCsvCell,
  type StudentCsvHeader,
} from "@/lib/student-csv";

/** Core student import columns (matches registrar “important details”). */
export const STUDENT_IMPORT_STANDARD_HEADERS = [
  "studentId",
  "firstName",
  "middleName",
  "lastName",
  "suffix",
  "dateOfBirth",
  "gender",
  "learnerReferenceNumber",
  "studentNumber",
  "escNumber",
  "grade",
  "section",
  "emergencyContactPerson",
  "emergencyPhone",
  "address",
] as const satisfies readonly StudentCsvHeader[];

export type StudentImportStandardHeader =
  (typeof STUDENT_IMPORT_STANDARD_HEADERS)[number];

export type ImportTemplateDropdownKind =
  | "suffix"
  | "gender"
  | "category"
  | "grade";

export const IMPORT_TEMPLATE_SUFFIX_OPTIONS = [
  "Jr.",
  "Sr.",
  "II",
  "III",
  "IV",
] as const;

export const IMPORT_TEMPLATE_GENDER_OPTIONS = ["Male", "Female"] as const;

export const IMPORT_TEMPLATE_CATEGORY_OPTIONS = Object.values(CATEGORY_LABELS);

export const IMPORT_TEMPLATE_GRADE_OPTIONS = [
  ...new Set(Object.values(CATEGORY_GRADES).flat()),
];

/** Extra columns users can add via “Optional fields” before downloading a template. */
export const STUDENT_IMPORT_OPTIONAL_FIELDS: {
  key: StudentCsvHeader;
  label: string;
  dropdown?: ImportTemplateDropdownKind;
}[] = [
  { key: "category", label: "Category (school level)", dropdown: "category" },
  { key: "customGradeName", label: "Custom grade name (tertiary)" },
  { key: "course", label: "Course (tertiary)" },
  { key: "birthplace", label: "Birthplace" },
  { key: "citizenship", label: "Citizenship" },
  { key: "religion", label: "Religion" },
  { key: "civilStatus", label: "Civil status" },
  { key: "email", label: "Email" },
  { key: "contactPhone", label: "Student contact number" },
  { key: "landline", label: "Landline" },
  { key: "addressStreet", label: "Address street" },
  { key: "barangay", label: "Barangay" },
  { key: "municipality", label: "City / municipality" },
  { key: "province", label: "Province" },
  { key: "country", label: "Country" },
  { key: "zipCode", label: "ZIP code" },
  { key: "photoUrl", label: "Photo URL" },
];

const STANDARD_EXAMPLE: Partial<Record<StudentCsvHeader, string>> = {
  studentId: "2024-0001",
  firstName: "Juan",
  middleName: "Santos",
  lastName: "Dela Cruz",
  suffix: "Jr.",
  dateOfBirth: "2010-05-15",
  gender: "Male",
  learnerReferenceNumber: "123456789012",
  studentNumber: "2024-0001",
  escNumber: "",
  grade: "Grade 5",
  section: "",
  emergencyContactPerson: "Maria Dela Cruz",
  emergencyPhone: "09179876543",
  address: "123 Main St, Quezon City",
};

export function resolveImportTemplateHeaders(
  optionalKeys: string[] = []
): StudentCsvHeader[] {
  const optionalSet = new Set(optionalKeys);
  const extras = STUDENT_IMPORT_OPTIONAL_FIELDS.map((f) => f.key).filter((k) =>
    optionalSet.has(k)
  );
  return [...STUDENT_IMPORT_STANDARD_HEADERS, ...extras];
}

export function importTemplateHeaderLabels(
  optionalKeys: string[] = []
): string[] {
  return resolveImportTemplateHeaders(optionalKeys).map(
    (h) => STUDENT_CSV_EXPORT_LABELS[h]
  );
}

export function buildStudentImportTemplateCsv(
  optionalKeys: string[] = []
): string {
  const headers = resolveImportTemplateHeaders(optionalKeys);
  const headerLine = headers
    .map((h) => escapeCsvCell(STUDENT_CSV_EXPORT_LABELS[h]))
    .join(",");
  const exampleLine = headers
    .map((h) => escapeCsvCell(STANDARD_EXAMPLE[h] ?? ""))
    .join(",");
  return `${headerLine}\r\n${exampleLine}\r\n`;
}

/** @deprecated Use buildStudentImportTemplateCsv() */
export function buildStudentSimpleImportTemplateCsv(): string {
  return buildStudentImportTemplateCsv();
}

export async function spreadsheetFileToImportCsvText(
  data: ArrayBuffer
): Promise<string> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(data, { type: "array", cellDates: true });
  const sheetName =
    wb.SheetNames.find((n) => {
      const lower = n.toLowerCase();
      return (
        !n.startsWith("_") && lower !== "how to use" && lower !== "lists"
      );
    }) ?? wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) return "";
  return XLSX.utils.sheet_to_csv(ws, { dateNF: "yyyy-mm-dd" });
}

export function downloadBlobFile(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function dropdownKindForHeader(
  header: StudentCsvHeader,
  optionalKeys: string[]
): ImportTemplateDropdownKind | undefined {
  if (header === "suffix") return "suffix";
  if (header === "gender") return "gender";
  if (header === "grade") return "grade";
  if (header === "category") return "category";
  const opt = STUDENT_IMPORT_OPTIONAL_FIELDS.find((f) => f.key === header);
  if (opt && optionalKeys.includes(header) && opt.dropdown) {
    return opt.dropdown;
  }
  return undefined;
}
