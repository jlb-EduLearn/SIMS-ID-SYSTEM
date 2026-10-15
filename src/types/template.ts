import { getDisplayGrade, CATEGORY_LABELS, type StudentCategory } from "@/lib/categories";

export type TemplateElementType =
  | "text"
  | "dynamic-field"
  | "photo"
  | "signature"
  | "logo"
  | "qr-code"
  | "barcode"
  | "shape"
  | "image";

export type DynamicFieldKey =
  | "firstName"
  | "lastName"
  | "fullName"
  | "suffix"
  | "studentId"
  | "studentNumber"
  | "learnerReferenceNumber"
  | "escNumber"
  | "employeeNumber"
  | "grade"
  | "section"
  | "schoolName"
  | "schoolCode"
  | "dateOfBirth"
  | "birthplace"
  | "gender"
  | "citizenship"
  | "religion"
  | "civilStatus"
  | "address"
  | "addressStreet"
  | "barangay"
  | "municipality"
  | "province"
  | "country"
  | "zipCode"
  | "contactPhone"
  | "landline"
  | "contactRelationship"
  | "email"
  | "middleName"
  | "course"
  | "category"
  | "recordType"
  | "department"
  | "position"
  | "designation"
  | "dateHired"
  | "tinNumber"
  | "sssNumber"
  | "philhealthNumber"
  | "pagIbigNumber"
  | "isTeaching"
  | "requiresTimeInOut"
  | "fatherFullName"
  | "motherFullName"
  | "guardianFullName"
  | "emergencyContactPerson"
  | "emergencyFullName"
  | "emergencyFirstName"
  | "emergencyMiddleName"
  | "emergencyLastName"
  | "emergencyAddress"
  | "emergencyPhone";

export interface TemplateElementStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: "left" | "center" | "right";
  color?: string;
  backgroundColor?: string;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  objectFit?: "cover" | "contain" | "fill";
  opacity?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
}

export interface TemplateElement {
  id: string;
  type: TemplateElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex: number;
  content?: string;
  fieldKey?: DynamicFieldKey;
  imageUrl?: string;
  style?: TemplateElementStyle;
  locked?: boolean;
}

export interface TemplateDesign {
  backgroundColor?: string;
  backgroundImage?: string;
  elements: TemplateElement[];
}

export interface StudentPrintData {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  suffix?: string | null;
  fullName: string;
  grade?: string | null;
  section?: string | null;
  dateOfBirth?: string | null;
  birthplace?: string | null;
  gender?: string | null;
  citizenship?: string | null;
  religion?: string | null;
  civilStatus?: string | null;
  address?: string | null;
  addressStreet?: string | null;
  barangay?: string | null;
  municipality?: string | null;
  province?: string | null;
  country?: string | null;
  zipCode?: string | null;
  contactPhone?: string | null;
  landline?: string | null;
  contactRelationship?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  signatureUrl?: string | null;
  learnerReferenceNumber?: string | null;
  escNumber?: string | null;
  studentNumber?: string | null;
  employeeNumber?: string | null;
  course?: string | null;
  recordType?: string | null;
  department?: string | null;
  position?: string | null;
  designation?: string | null;
  dateHired?: string | null;
  tinNumber?: string | null;
  sssNumber?: string | null;
  philhealthNumber?: string | null;
  pagIbigNumber?: string | null;
  isTeaching?: string | null;
  requiresTimeInOut?: string | null;
  fatherFullName?: string | null;
  motherFullName?: string | null;
  guardianFullName?: string | null;
  emergencyContactPerson?: string | null;
  emergencyFullName?: string | null;
  emergencyFirstName?: string | null;
  emergencyMiddleName?: string | null;
  emergencyLastName?: string | null;
  emergencyAddress?: string | null;
  emergencyPhone?: string | null;
  customGradeName?: string | null;
  category?: string | null;
  displayGrade?: string;
  schoolName: string;
  schoolCode: string;
  schoolLogoUrl?: string | null;
  customFields?: Record<string, string>;
}

export const DYNAMIC_FIELD_LABELS: Record<DynamicFieldKey, string> = {
  firstName: "First Name",
  lastName: "Last Name",
  fullName: "Full Name",
  studentId: "Student ID",
  grade: "Grade Level",
  section: "Section",
  schoolName: "School Name",
  schoolCode: "School Code",
  dateOfBirth: "Date of Birth",
  gender: "Gender",
  address: "Address",
  contactPhone: "Contact Phone",
  email: "Email",
  middleName: "Middle Name",
  course: "Course",
  category: "Category",
  recordType: "Record Type",
  department: "Department",
  position: "Position",
  emergencyFullName: "Emergency Contact Name",
  emergencyFirstName: "Emergency First Name",
  emergencyMiddleName: "Emergency Middle Name",
  emergencyLastName: "Emergency Last Name",
  emergencyAddress: "Emergency Address",
  emergencyPhone: "Emergency Contact Number",
  suffix: "Suffix",
  birthplace: "Birthplace",
  citizenship: "Citizenship",
  religion: "Religion",
  civilStatus: "Civil Status",
  learnerReferenceNumber: "LRN",
  escNumber: "ESC Number",
  studentNumber: "Student Number",
  employeeNumber: "Employee Number",
  designation: "Designation",
  dateHired: "Date Hired",
  tinNumber: "TIN",
  sssNumber: "SSS",
  philhealthNumber: "PhilHealth",
  pagIbigNumber: "Pag-IBIG",
  isTeaching: "Is Teaching",
  requiresTimeInOut: "Time In/Out Required",
  addressStreet: "Street / Subdivision",
  barangay: "Barangay",
  municipality: "Municipality",
  province: "Province",
  country: "Country",
  zipCode: "Zip Code",
  landline: "Landline",
  contactRelationship: "Contact Relationship",
  fatherFullName: "Father's Name",
  motherFullName: "Mother's Name",
  guardianFullName: "Guardian's Name",
  emergencyContactPerson: "Emergency Contact Person",
};

function formatPersonName(parts: {
  first?: string | null;
  middle?: string | null;
  last?: string | null;
  suffix?: string | null;
}) {
  const core = [parts.first, parts.middle, parts.last]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(" ");
  return parts.suffix?.trim() ? `${core} ${parts.suffix.trim()}` : core;
}

export function studentToPrintData(
  student: {
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    suffix?: string | null;
    recordType?: string | null;
    category?: StudentCategory | string;
    grade?: string | null;
    customGradeName?: string | null;
    course?: string | null;
    department?: string | null;
    position?: string | null;
    designation?: string | null;
    dateHired?: string | null;
    employeeNumber?: string | null;
    learnerReferenceNumber?: string | null;
    escNumber?: string | null;
    studentNumber?: string | null;
    birthplace?: string | null;
    citizenship?: string | null;
    religion?: string | null;
    civilStatus?: string | null;
    tinNumber?: string | null;
    sssNumber?: string | null;
    philhealthNumber?: string | null;
    pagIbigNumber?: string | null;
    isTeaching?: boolean | null;
    requiresTimeInOut?: boolean | null;
    addressStreet?: string | null;
    barangay?: string | null;
    municipality?: string | null;
    province?: string | null;
    country?: string | null;
    zipCode?: string | null;
    landline?: string | null;
    contactRelationship?: string | null;
    fatherFirstName?: string | null;
    fatherMiddleName?: string | null;
    fatherLastName?: string | null;
    fatherSuffix?: string | null;
    motherFirstName?: string | null;
    motherMiddleName?: string | null;
    motherLastName?: string | null;
    guardianFirstName?: string | null;
    guardianMiddleName?: string | null;
    guardianLastName?: string | null;
    emergencyContactPerson?: string | null;
    emergencyFirstName?: string | null;
    emergencyMiddleName?: string | null;
    emergencyLastName?: string | null;
    emergencyAddress?: string | null;
    emergencyPhone?: string | null;
    section?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    address?: string | null;
    contactPhone?: string | null;
    email?: string | null;
    photoUrl?: string | null;
    signatureUrl?: string | null;
    customFields?: string | null;
  },
  school: {
    name: string;
    code: string;
    logoUrl?: string | null;
  }
): StudentPrintData {
  const middle = student.middleName ? ` ${student.middleName}` : "";
  let customFields: Record<string, string> = {};
  if (student.customFields) {
    try {
      customFields = JSON.parse(student.customFields);
    } catch {
      customFields = {};
    }
  }

  const emergencyMiddle = student.emergencyMiddleName
    ? ` ${student.emergencyMiddleName}`
    : "";
  const emergencyFullName = [
    `${student.emergencyFirstName || ""}${emergencyMiddle}`.trim(),
    student.emergencyLastName || "",
  ]
    .filter(Boolean)
    .join(" ");

  const suffixPart = student.suffix?.trim() ? ` ${student.suffix.trim()}` : "";

  return {
    id: student.id,
    studentId: student.studentId,
    firstName: student.firstName,
    lastName: student.lastName,
    middleName: student.middleName,
    suffix: student.suffix,
    fullName: `${student.firstName}${middle} ${student.lastName}${suffixPart}`.trim(),
    grade: student.grade,
    section: student.section,
    dateOfBirth: student.dateOfBirth,
    birthplace: student.birthplace,
    gender: student.gender,
    citizenship: student.citizenship,
    religion: student.religion,
    civilStatus: student.civilStatus,
    address: student.address,
    addressStreet: student.addressStreet,
    barangay: student.barangay,
    municipality: student.municipality,
    province: student.province,
    country: student.country,
    zipCode: student.zipCode,
    contactPhone: student.contactPhone,
    landline: student.landline,
    contactRelationship: student.contactRelationship,
    email: student.email,
    photoUrl: student.photoUrl,
    signatureUrl: student.signatureUrl,
    learnerReferenceNumber: student.learnerReferenceNumber,
    escNumber: student.escNumber,
    studentNumber: student.studentNumber || student.studentId,
    employeeNumber: student.employeeNumber || student.studentId,
    course: student.course,
    recordType: student.recordType === "TEACHER" ? "Employee" : "Student",
    department: student.department,
    position: student.position || student.designation,
    designation: student.designation || student.position,
    dateHired: student.dateHired,
    tinNumber: student.tinNumber,
    sssNumber: student.sssNumber,
    philhealthNumber: student.philhealthNumber,
    pagIbigNumber: student.pagIbigNumber,
    isTeaching:
      student.isTeaching === true
        ? "Yes"
        : student.isTeaching === false
          ? "No"
          : null,
    requiresTimeInOut:
      student.requiresTimeInOut === true
        ? "Yes"
        : student.requiresTimeInOut === false
          ? "No"
          : null,
    fatherFullName: formatPersonName({
      first: student.fatherFirstName,
      middle: student.fatherMiddleName,
      last: student.fatherLastName,
      suffix: student.fatherSuffix,
    }),
    motherFullName: formatPersonName({
      first: student.motherFirstName,
      middle: student.motherMiddleName,
      last: student.motherLastName,
    }),
    guardianFullName: formatPersonName({
      first: student.guardianFirstName,
      middle: student.guardianMiddleName,
      last: student.guardianLastName,
    }),
    emergencyContactPerson: student.emergencyContactPerson,
    emergencyFullName,
    emergencyFirstName: student.emergencyFirstName,
    emergencyMiddleName: student.emergencyMiddleName,
    emergencyLastName: student.emergencyLastName,
    emergencyAddress: student.emergencyAddress,
    emergencyPhone: student.emergencyPhone,
    customGradeName: student.customGradeName,
    category: student.category
      ? CATEGORY_LABELS[student.category as StudentCategory] || student.category
      : null,
    displayGrade: getDisplayGrade({
      category: (student.category as StudentCategory) || "GRADE_SCHOOL",
      grade: student.grade,
      customGradeName: student.customGradeName,
      course: student.course,
    }),
    schoolName: school.name,
    schoolCode: school.code,
    schoolLogoUrl: school.logoUrl,
    customFields,
  };
}

export function resolveDynamicField(
  fieldKey: DynamicFieldKey,
  data: StudentPrintData
): string {
  switch (fieldKey) {
    case "firstName":
      return data.firstName;
    case "lastName":
      return data.lastName;
    case "middleName":
      return data.middleName || "";
    case "fullName":
      return data.fullName;
    case "studentId":
      return data.studentId;
    case "grade":
      return data.displayGrade || data.grade || "";
    case "section":
      return data.section || "";
    case "schoolName":
      return data.schoolName;
    case "schoolCode":
      return data.schoolCode;
    case "dateOfBirth":
      return data.dateOfBirth || "";
    case "gender":
      return data.gender || "";
    case "address":
      return data.address || "";
    case "contactPhone":
      return data.contactPhone || "";
    case "email":
      return data.email || "";
    case "course":
      return data.course || "";
    case "category":
      return data.category || "";
    case "recordType":
      return data.recordType || "";
    case "department":
      return data.department || "";
    case "position":
      return data.position || "";
    case "emergencyFullName":
      return data.emergencyFullName || "";
    case "emergencyFirstName":
      return data.emergencyFirstName || "";
    case "emergencyMiddleName":
      return data.emergencyMiddleName || "";
    case "emergencyLastName":
      return data.emergencyLastName || "";
    case "emergencyAddress":
      return data.emergencyAddress || "";
    case "emergencyPhone":
      return data.emergencyPhone || "";
    default: {
      const value = data[fieldKey as keyof StudentPrintData];
      if (typeof value === "string") return value;
      return data.customFields?.[fieldKey] || "";
    }
  }
}

export function parseTemplateDesign(json: string): TemplateDesign {
  try {
    return JSON.parse(json) as TemplateDesign;
  } catch {
    return { backgroundColor: "#ffffff", elements: [] };
  }
}

export function createDefaultFrontDesign(): TemplateDesign {
  return {
    backgroundColor: "#1e3a5f",
    elements: [
      {
        id: "logo-1",
        type: "logo",
        x: 30,
        y: 30,
        width: 80,
        height: 80,
        zIndex: 1,
        style: { objectFit: "contain" },
      },
      {
        id: "school-name",
        type: "dynamic-field",
        fieldKey: "schoolName",
        x: 130,
        y: 35,
        width: 400,
        height: 40,
        zIndex: 2,
        style: {
          fontSize: 18,
          fontWeight: "bold",
          color: "#ffffff",
          textAlign: "left",
        },
      },
      {
        id: "photo-1",
        type: "photo",
        x: 30,
        y: 130,
        width: 140,
        height: 170,
        zIndex: 3,
        style: {
          borderWidth: 3,
          borderColor: "#ffffff",
          borderRadius: 8,
          objectFit: "cover",
        },
      },
      {
        id: "fullname",
        type: "dynamic-field",
        fieldKey: "fullName",
        x: 200,
        y: 150,
        width: 400,
        height: 35,
        zIndex: 4,
        style: {
          fontSize: 22,
          fontWeight: "bold",
          color: "#ffffff",
          textTransform: "uppercase",
        },
      },
      {
        id: "student-id",
        type: "dynamic-field",
        fieldKey: "studentId",
        x: 200,
        y: 200,
        width: 300,
        height: 30,
        zIndex: 5,
        style: { fontSize: 16, color: "#e2e8f0" },
      },
      {
        id: "grade-section",
        type: "text",
        content: "{grade} - {section}",
        x: 200,
        y: 240,
        width: 300,
        height: 30,
        zIndex: 6,
        style: { fontSize: 14, color: "#cbd5e1" },
      },
      {
        id: "qr-1",
        type: "qr-code",
        x: 680,
        y: 350,
        width: 120,
        height: 120,
        zIndex: 7,
        style: { backgroundColor: "#ffffff", borderRadius: 4 },
      },
    ],
  };
}

export function createDefaultBackDesign(): TemplateDesign {
  return {
    backgroundColor: "#f8fafc",
    elements: [
      {
        id: "back-title",
        type: "text",
        content: "EMERGENCY CONTACT",
        x: 30,
        y: 30,
        width: 400,
        height: 30,
        zIndex: 1,
        style: {
          fontSize: 16,
          fontWeight: "bold",
          color: "#1e293b",
          textAlign: "left",
        },
      },
      {
        id: "back-emergency-name",
        type: "dynamic-field",
        fieldKey: "emergencyFullName",
        x: 30,
        y: 80,
        width: 500,
        height: 30,
        zIndex: 2,
        style: { fontSize: 14, fontWeight: "bold", color: "#1e293b" },
      },
      {
        id: "back-emergency-address",
        type: "dynamic-field",
        fieldKey: "emergencyAddress",
        x: 30,
        y: 125,
        width: 500,
        height: 60,
        zIndex: 3,
        style: { fontSize: 12, color: "#475569" },
      },
      {
        id: "back-emergency-phone",
        type: "dynamic-field",
        fieldKey: "emergencyPhone",
        x: 30,
        y: 200,
        width: 300,
        height: 30,
        zIndex: 4,
        style: { fontSize: 12, color: "#475569" },
      },
      {
        id: "back-barcode",
        type: "barcode",
        x: 200,
        y: 400,
        width: 400,
        height: 80,
        zIndex: 5,
        style: { backgroundColor: "#ffffff" },
      },
    ],
  };
}
