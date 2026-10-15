import { CATEGORY_LABELS, type StudentCategory } from "@/lib/categories";

/** First columns in every export (frozen in Excel); order is fixed. */
export const STUDENT_CSV_LOCKED_HEADERS = [
  "studentId",
  "firstName",
  "middleName",
  "lastName",
] as const;

export type StudentCsvLockedHeader = (typeof STUDENT_CSV_LOCKED_HEADERS)[number];

const STUDENT_CSV_REMAINING_HEADERS = [
  "recordType",
  "category",
  "suffix",
  "grade",
  "customGradeName",
  "course",
  "section",
  "learnerReferenceNumber",
  "studentNumber",
  "escNumber",
  "employeeNumber",
  "designation",
  "dateHired",
  "department",
  "position",
  "dateOfBirth",
  "birthplace",
  "gender",
  "citizenship",
  "religion",
  "civilStatus",
  "tinNumber",
  "sssNumber",
  "philhealthNumber",
  "pagIbigNumber",
  "isTeaching",
  "requiresTimeInOut",
  "email",
  "contactPhone",
  "landline",
  "contactRelationship",
  "addressStreet",
  "barangay",
  "municipality",
  "province",
  "country",
  "zipCode",
  "address",
  "fatherLastName",
  "fatherFirstName",
  "fatherMiddleName",
  "fatherSuffix",
  "motherLastName",
  "motherFirstName",
  "motherMiddleName",
  "guardianLastName",
  "guardianFirstName",
  "guardianMiddleName",
  "emergencyContactRelation",
  "emergencyContactPerson",
  "emergencyFirstName",
  "emergencyMiddleName",
  "emergencyLastName",
  "emergencyAddress",
  "emergencyPhone",
  "photoUrl",
  "signatureUrl",
  "customFields",
] as const;

/** Canonical CSV column order (matches export and import template). */
export const STUDENT_CSV_HEADERS = [
  ...STUDENT_CSV_LOCKED_HEADERS,
  ...STUDENT_CSV_REMAINING_HEADERS,
] as const;

export type StudentCsvHeader = (typeof STUDENT_CSV_HEADERS)[number];

/** Human-readable export labels (import accepts these via HEADER_ALIASES). */
export const STUDENT_CSV_EXPORT_LABELS: Record<StudentCsvHeader, string> = {
  studentId: "Student ID",
  firstName: "First Name",
  middleName: "Middle Name",
  lastName: "Last Name",
  recordType: "Record Type",
  category: "Category",
  suffix: "Suffix",
  grade: "Grade",
  customGradeName: "Custom Grade Name",
  course: "Course",
  section: "Section",
  learnerReferenceNumber: "Learner Reference Number (LRN)",
  studentNumber: "Student Number",
  escNumber: "ESC Number",
  employeeNumber: "Employee Number",
  designation: "Designation",
  dateHired: "Date Hired",
  department: "Department",
  position: "Position",
  dateOfBirth: "Date of Birth",
  birthplace: "Birthplace",
  gender: "Gender",
  citizenship: "Citizenship",
  religion: "Religion",
  civilStatus: "Civil Status",
  tinNumber: "TIN Number",
  sssNumber: "SSS Number",
  philhealthNumber: "PhilHealth Number",
  pagIbigNumber: "Pag-IBIG Number",
  isTeaching: "Is Teaching",
  requiresTimeInOut: "Requires Time In/Out",
  email: "Email",
  contactPhone: "Contact Phone",
  landline: "Landline",
  contactRelationship: "Contact Relationship",
  addressStreet: "Address Street",
  barangay: "Barangay",
  municipality: "Municipality",
  province: "Province",
  country: "Country",
  zipCode: "Zip Code",
  address: "Address",
  fatherLastName: "Father Last Name",
  fatherFirstName: "Father First Name",
  fatherMiddleName: "Father Middle Name",
  fatherSuffix: "Father Suffix",
  motherLastName: "Mother Last Name",
  motherFirstName: "Mother First Name",
  motherMiddleName: "Mother Middle Name",
  guardianLastName: "Guardian Last Name",
  guardianFirstName: "Guardian First Name",
  guardianMiddleName: "Guardian Middle Name",
  emergencyContactRelation: "Emergency Contact Relation",
  emergencyContactPerson: "Emergency Contact Person",
  emergencyFirstName: "Emergency First Name",
  emergencyMiddleName: "Emergency Middle Name",
  emergencyLastName: "Emergency Last Name",
  emergencyAddress: "Emergency Address",
  emergencyPhone: "Emergency Phone",
  photoUrl: "Photo URL",
  signatureUrl: "Signature URL",
  customFields: "Custom Fields",
};

const HEADER_ALIASES: Record<string, StudentCsvHeader> = {
  recordtype: "recordType",
  record_type: "recordType",
  type: "recordType",
  id: "studentId",
  student_id: "studentId",
  studentid: "studentId",
  id_number: "studentId",
  firstname: "firstName",
  first_name: "firstName",
  middlename: "middleName",
  middle_name: "middleName",
  lastname: "lastName",
  last_name: "lastName",
  customgrade: "customGradeName",
  custom_grade: "customGradeName",
  custom_grade_name: "customGradeName",
  year_level: "customGradeName",
  dateofbirth: "dateOfBirth",
  date_of_birth: "dateOfBirth",
  dob: "dateOfBirth",
  birthdate: "dateOfBirth",
  contactphone: "contactPhone",
  contact_phone: "contactPhone",
  phone: "contactPhone",
  mobile: "contactPhone",
  emergencyfirstname: "emergencyFirstName",
  emergency_first_name: "emergencyFirstName",
  emergencymiddlename: "emergencyMiddleName",
  emergency_middle_name: "emergencyMiddleName",
  emergencylastname: "emergencyLastName",
  emergency_last_name: "emergencyLastName",
  emergencyaddress: "emergencyAddress",
  emergency_address: "emergencyAddress",
  emergencyphone: "emergencyPhone",
  emergency_phone: "emergencyPhone",
  emergency_contact: "emergencyPhone",
  emergency_contact_number: "emergencyPhone",
  photourl: "photoUrl",
  photo_url: "photoUrl",
  photo: "photoUrl",
  signatureurl: "signatureUrl",
  signature_url: "signatureUrl",
  signature: "signatureUrl",
  lrn: "learnerReferenceNumber",
  learner_reference_number: "learnerReferenceNumber",
  esc_number: "escNumber",
  escnumber: "escNumber",
  student_number: "studentNumber",
  employee_number: "employeeNumber",
  date_hired: "dateHired",
  tin: "tinNumber",
  tin_number: "tinNumber",
  sss_number: "sssNumber",
  philhealth_number: "philhealthNumber",
  pagibig_number: "pagIbigNumber",
  pag_ibig_number: "pagIbigNumber",
  is_teaching: "isTeaching",
  requires_time_in_out: "requiresTimeInOut",
  address_street: "addressStreet",
  zip_code: "zipCode",
  contact_relationship: "contactRelationship",
  customfields: "customFields",
  custom_fields: "customFields",
  "student id": "studentId",
  "first name": "firstName",
  "middle name": "middleName",
  "last name": "lastName",
  "record type": "recordType",
  "custom grade name": "customGradeName",
  "learner reference number (lrn)": "learnerReferenceNumber",
  "learner reference number": "learnerReferenceNumber",
  "student number": "studentNumber",
  "esc number": "escNumber",
  "employee number": "employeeNumber",
  "date hired": "dateHired",
  "date of birth": "dateOfBirth",
  "civil status": "civilStatus",
  "tin number": "tinNumber",
  "sss number": "sssNumber",
  "philhealth number": "philhealthNumber",
  "pag-ibig number": "pagIbigNumber",
  "is teaching": "isTeaching",
  "requires time in/out": "requiresTimeInOut",
  "contact phone": "contactPhone",
  "contact relationship": "contactRelationship",
  "address street": "addressStreet",
  "zip code": "zipCode",
  "father last name": "fatherLastName",
  "father first name": "fatherFirstName",
  "father middle name": "fatherMiddleName",
  "father suffix": "fatherSuffix",
  "mother last name": "motherLastName",
  "mother first name": "motherFirstName",
  "mother middle name": "motherMiddleName",
  "guardian last name": "guardianLastName",
  "guardian first name": "guardianFirstName",
  "guardian middle name": "guardianMiddleName",
  "emergency contact relation": "emergencyContactRelation",
  "emergency contact person": "emergencyContactPerson",
  "emergency first name": "emergencyFirstName",
  "emergency middle name": "emergencyMiddleName",
  "emergency last name": "emergencyLastName",
  "emergency address": "emergencyAddress",
  "emergency phone": "emergencyPhone",
  "contact number": "emergencyPhone",
  "emergency contact number": "emergencyPhone",
  "photo url": "photoUrl",
  "signature url": "signatureUrl",
  "custom fields": "customFields",
};

for (const header of STUDENT_CSV_HEADERS) {
  const label = STUDENT_CSV_EXPORT_LABELS[header].toLowerCase();
  if (!HEADER_ALIASES[label]) {
    HEADER_ALIASES[label] = header;
  }
}

function parseYesNo(value: string): boolean | undefined {
  const v = value.trim().toLowerCase();
  if (["yes", "y", "true", "1"].includes(v)) return true;
  if (["no", "n", "false", "0"].includes(v)) return false;
  return undefined;
}

const CATEGORY_BY_LABEL = Object.fromEntries(
  (Object.entries(CATEGORY_LABELS) as [StudentCategory, string][]).map(
    ([key, label]) => [label.toLowerCase(), key]
  )
) as Record<string, StudentCategory>;

export interface CsvStudentRow {
  recordType?: string;
  studentId?: string;
  category?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  grade?: string;
  customGradeName?: string;
  course?: string;
  department?: string;
  position?: string;
  section?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  contactPhone?: string;
  email?: string;
  emergencyFirstName?: string;
  emergencyMiddleName?: string;
  emergencyLastName?: string;
  emergencyAddress?: string;
  emergencyPhone?: string;
  photoUrl?: string;
  isTeaching?: boolean | string;
  requiresTimeInOut?: boolean | string;
  customFields?: string | Record<string, string>;
  [key: string]: string | boolean | Record<string, string> | undefined;
}

export type StudentCsvSource = Record<string, unknown> & {
  recordType: string;
  studentId: string;
  category: string;
  firstName: string;
  lastName: string;
};

function normalizeHeader(raw: string): StudentCsvHeader | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  const labelMatch = HEADER_ALIASES[lower];
  if (labelMatch) return labelMatch;
  if ((STUDENT_CSV_HEADERS as readonly string[]).includes(trimmed)) {
    return trimmed as StudentCsvHeader;
  }
  if ((STUDENT_CSV_HEADERS as readonly string[]).includes(lower)) {
    return lower as StudentCsvHeader;
  }
  const alias = HEADER_ALIASES[lower.replace(/\s+/g, "_")];
  if (alias) return alias;
  const camel = lower.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  if ((STUDENT_CSV_HEADERS as readonly string[]).includes(camel)) {
    return camel as StudentCsvHeader;
  }
  return null;
}

export function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      if (ch === "\r") i++;
    } else if (ch !== "\r") {
      cell += ch;
    }
  }

  row.push(cell);
  if (row.some((c) => c.trim() !== "")) {
    rows.push(row);
  }

  return rows;
}

function normalizeCategory(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "GRADE_SCHOOL";
  const upper = trimmed.toUpperCase().replace(/\s+/g, "_");
  if ((Object.keys(CATEGORY_LABELS) as string[]).includes(upper)) {
    return upper;
  }
  const byLabel = CATEGORY_BY_LABEL[trimmed.toLowerCase()];
  if (byLabel) return byLabel;
  return trimmed;
}

function parseCustomFields(
  value: string | undefined
): Record<string, string> | undefined {
  if (!value?.trim()) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        out[k] = v == null ? "" : String(v);
      }
      return out;
    }
  } catch {
    /* plain key=value pairs: a=1;b=2 */
    const pairs = value.split(";").map((p) => p.trim()).filter(Boolean);
    if (pairs.length > 0) {
      const out: Record<string, string> = {};
      for (const pair of pairs) {
        const eq = pair.indexOf("=");
        if (eq > 0) {
          out[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
        }
      }
      if (Object.keys(out).length > 0) return out;
    }
  }
  return undefined;
}

export function csvRowsToStudentRecords(csvText: string): CsvStudentRow[] {
  const table = parseCsv(csvText.trim());
  if (table.length === 0) return [];

  const headerRow = table[0];
  const columnKeys = headerRow.map((h) => normalizeHeader(h));

  return table
    .slice(1)
    .map((cells) => {
      const obj: CsvStudentRow = {};
      columnKeys.forEach((key, i) => {
        if (!key) return;
        const val = (cells[i] ?? "").trim();
        if (val) (obj as Record<string, string>)[key] = val;
      });

      if (obj.category) {
        const cat = obj.category.trim();
        if (cat.toUpperCase() === "STUDENT" || cat.toUpperCase() === "TEACHER") {
          if (!obj.recordType) obj.recordType = cat.toUpperCase();
          delete obj.category;
        } else {
          obj.category = normalizeCategory(obj.category);
        }
      }
      if (!obj.recordType) obj.recordType = "STUDENT";
      else obj.recordType = obj.recordType.toUpperCase();

      if (typeof obj.customFields === "string") {
        const parsed = parseCustomFields(obj.customFields);
        if (parsed) obj.customFields = parsed;
      }
      if (typeof obj.isTeaching === "string") {
        const parsed = parseYesNo(obj.isTeaching);
        if (parsed !== undefined) obj.isTeaching = parsed;
      }
      if (typeof obj.requiresTimeInOut === "string") {
        const parsed = parseYesNo(obj.requiresTimeInOut);
        if (parsed !== undefined) obj.requiresTimeInOut = parsed;
      }

      return obj;
    })
    .filter((row) => {
      const id = row.studentId?.trim();
      const first = row.firstName?.trim();
      const last = row.lastName?.trim();
      return Boolean(id || first || last);
    });
}

function csvCellFromStudent(
  student: Record<string, unknown>,
  header: StudentCsvHeader
): string {
  const raw = student[header];
  if (header === "isTeaching" || header === "requiresTimeInOut") {
    if (raw === true) return "Yes";
    if (raw === false) return "No";
    return "";
  }
  if (header === "customFields") {
    if (raw == null || raw === "") return "";
    if (typeof raw === "string") return raw;
    return JSON.stringify(raw);
  }
  return raw == null ? "" : String(raw);
}

export function studentRecordToCsvCells(student: StudentCsvSource): string[] {
  return STUDENT_CSV_HEADERS.map((h) => csvCellFromStudent(student, h));
}

export function prismaStudentToCsvSource(
  s: Record<string, unknown>
): StudentCsvSource {
  return {
    recordType: String(s.recordType || "STUDENT"),
    studentId: String(s.studentId || ""),
    category: String(s.category || "GRADE_SCHOOL"),
    firstName: String(s.firstName || ""),
    lastName: String(s.lastName || ""),
    ...s,
  };
}

export function studentCsvHeaderLabels(): string[] {
  return STUDENT_CSV_HEADERS.map((h) => STUDENT_CSV_EXPORT_LABELS[h]);
}

export function buildStudentsCsv(students: StudentCsvSource[]): string {
  const lines = [
    studentCsvHeaderLabels().map(escapeCsvCell).join(","),
    ...students.map((s) =>
      studentRecordToCsvCells(s).map(escapeCsvCell).join(",")
    ),
  ];
  return lines.join("\r\n") + "\r\n";
}

export function buildStudentImportFullTemplateCsv(): string {
  const example: StudentCsvSource = {
    recordType: "STUDENT",
    studentId: "2024-0001",
    category: "GRADE_SCHOOL",
    firstName: "Juan",
    middleName: "Santos",
    lastName: "Dela Cruz",
    suffix: "Jr.",
    grade: "Grade 10",
    section: "Section A",
    learnerReferenceNumber: "123456789012",
    studentNumber: "2024-0001",
    escNumber: "",
    dateOfBirth: "2010-05-15",
    birthplace: "Manila",
    gender: "Male",
    citizenship: "Filipino",
    religion: "",
    email: "juan@example.com",
    contactPhone: "09171234567",
    landline: "",
    contactRelationship: "Mother",
    addressStreet: "123 Main St",
    barangay: "San Roque",
    municipality: "Quezon City",
    province: "Metro Manila",
    country: "Philippines",
    zipCode: "1100",
    motherLastName: "Dela Cruz",
    motherFirstName: "Maria",
    emergencyContactPerson: "Maria Dela Cruz",
    emergencyPhone: "09179876543",
    photoUrl: "",
    signatureUrl: "",
  };

  const teacherExample: StudentCsvSource = {
    recordType: "TEACHER",
    studentId: "T-1001",
    category: "GRADE_SCHOOL",
    employeeNumber: "T-1001",
    firstName: "Ana",
    lastName: "Reyes",
    designation: "Teacher III",
    department: "Mathematics",
    dateHired: "2018-06-01",
    gender: "Female",
    isTeaching: true,
    requiresTimeInOut: true,
    email: "ana.reyes@school.edu",
    contactPhone: "09170001111",
    emergencyContactPerson: "Pedro Reyes",
    emergencyPhone: "09171112222",
  };

  return buildStudentsCsv([example, teacherExample]);
}

export const ENROLLMENT_CSV_HEADERS = [
  "studentId",
  "schoolYear",
  "category",
  "grade",
  "customGradeName",
  "course",
  "section",
] as const;

export function buildEnrollmentsCsv(
  rows: Array<Record<(typeof ENROLLMENT_CSV_HEADERS)[number], string>>
): string {
  const lines = [
    ENROLLMENT_CSV_HEADERS.join(","),
    ...rows.map((row) =>
      ENROLLMENT_CSV_HEADERS.map((h) => escapeCsvCell(row[h] || "")).join(",")
    ),
  ];
  return lines.join("\r\n") + "\r\n";
}

export function downloadCsvFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
