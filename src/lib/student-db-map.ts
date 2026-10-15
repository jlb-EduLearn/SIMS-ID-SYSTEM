import type { StudentInput } from "@/lib/validations";

/** Profile fields copied when creating enrollment rows for other school years. */
export const STUDENT_PROFILE_KEYS = [
  "recordType",
  "studentId",
  "firstName",
  "lastName",
  "middleName",
  "suffix",
  "dateOfBirth",
  "birthplace",
  "gender",
  "citizenship",
  "religion",
  "civilStatus",
  "photoUrl",
  "signatureUrl",
  "learnerReferenceNumber",
  "escNumber",
  "studentNumber",
  "employeeNumber",
  "designation",
  "dateHired",
  "department",
  "position",
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
  "emergencyContactRelation",
  "emergencyContactPerson",
  "emergencyFirstName",
  "emergencyMiddleName",
  "emergencyLastName",
  "emergencyAddress",
  "emergencyPhone",
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
  "customFields",
  "cardUid",
  "wiegandFacilityCode",
  "wiegandCardNumber",
  "cardIssuedAt",
] as const;

export function formatStructuredAddress(parts: {
  addressStreet?: string | null;
  barangay?: string | null;
  municipality?: string | null;
  province?: string | null;
  country?: string | null;
  zipCode?: string | null;
}): string {
  return [
    parts.addressStreet,
    parts.barangay,
    parts.municipality,
    parts.province,
    parts.country,
    parts.zipCode,
  ]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(", ");
}

export function studentInputToDb(data: StudentInput) {
  const structured = formatStructuredAddress(data);
  const address = data.address?.trim() || structured || null;

  const designation =
    data.designation?.trim() ||
    (data.recordType === "TEACHER" ? data.position?.trim() : "") ||
    null;
  const position =
    data.position?.trim() ||
    (data.recordType === "TEACHER" ? designation : null);

  return {
    recordType: data.recordType,
    studentId: data.studentId,
    category: data.category,
    firstName: data.firstName,
    lastName: data.lastName,
    middleName: data.middleName || null,
    suffix: data.suffix || null,
    grade:
      data.recordType === "TEACHER" || data.category === "TERTIARY"
        ? null
        : data.grade || null,
    customGradeName:
      data.recordType === "STUDENT" && data.category === "TERTIARY"
        ? data.customGradeName || null
        : null,
    course:
      data.recordType === "STUDENT" && data.category === "TERTIARY"
        ? data.course || null
        : null,
    department: data.recordType === "TEACHER" ? data.department || null : null,
    position: data.recordType === "TEACHER" ? position : null,
    designation: data.recordType === "TEACHER" ? designation : null,
    dateHired: data.recordType === "TEACHER" ? data.dateHired || null : null,
    section: data.section || null,
    dateOfBirth: data.dateOfBirth || null,
    birthplace: data.birthplace || null,
    gender: data.gender || null,
    citizenship: data.citizenship || null,
    religion: data.religion || null,
    civilStatus: data.civilStatus || null,
    tinNumber: data.tinNumber || null,
    sssNumber: data.sssNumber || null,
    philhealthNumber: data.philhealthNumber || null,
    pagIbigNumber: data.pagIbigNumber || null,
    isTeaching:
      data.recordType === "TEACHER"
        ? data.isTeaching ?? null
        : null,
    requiresTimeInOut:
      data.recordType === "TEACHER"
        ? data.requiresTimeInOut ?? null
        : null,
    learnerReferenceNumber:
      data.recordType === "STUDENT" ? data.learnerReferenceNumber || null : null,
    escNumber: data.recordType === "STUDENT" ? data.escNumber || null : null,
    studentNumber:
      data.recordType === "STUDENT" ? data.studentNumber || null : null,
    employeeNumber:
      data.recordType === "TEACHER" ? data.employeeNumber || null : null,
    photoUrl: data.photoUrl || null,
    signatureUrl: data.signatureUrl || null,
    email: data.email || null,
    contactPhone: data.contactPhone || null,
    landline: data.landline || null,
    contactRelationship: data.contactRelationship || null,
    addressStreet: data.addressStreet || null,
    barangay: data.barangay || null,
    municipality: data.municipality || null,
    province: data.province || null,
    country: data.country || null,
    zipCode: data.zipCode || null,
    address,
    emergencyContactRelation: data.emergencyContactRelation || null,
    emergencyContactPerson: data.emergencyContactPerson || null,
    emergencyFirstName: data.emergencyFirstName || null,
    emergencyMiddleName: data.emergencyMiddleName || null,
    emergencyLastName: data.emergencyLastName || null,
    emergencyAddress: data.emergencyAddress || null,
    emergencyPhone: data.emergencyPhone || null,
    fatherLastName: data.fatherLastName || null,
    fatherFirstName: data.fatherFirstName || null,
    fatherMiddleName: data.fatherMiddleName || null,
    fatherSuffix: data.fatherSuffix || null,
    motherLastName: data.motherLastName || null,
    motherFirstName: data.motherFirstName || null,
    motherMiddleName: data.motherMiddleName || null,
    guardianLastName: data.guardianLastName || null,
    guardianFirstName: data.guardianFirstName || null,
    guardianMiddleName: data.guardianMiddleName || null,
    customFields: data.customFields ? JSON.stringify(data.customFields) : null,
    cardUid: data.cardUid?.trim() || null,
    wiegandFacilityCode: data.wiegandFacilityCode?.trim() || null,
    wiegandCardNumber: data.wiegandCardNumber?.trim() || null,
  };
}

export function cardIssuedAtPatch(
  existing: {
    cardUid?: string | null;
    wiegandCardNumber?: string | null;
    cardIssuedAt?: Date | null;
  },
  next: { cardUid?: string | null; wiegandCardNumber?: string | null }
) {
  const had = Boolean(existing.cardUid?.trim() || existing.wiegandCardNumber?.trim());
  const has = Boolean(next.cardUid?.trim() || next.wiegandCardNumber?.trim());
  if (has && !had) return { cardIssuedAt: new Date() };
  if (!has && had) return { cardIssuedAt: null };
  return {};
}

export function pickProfileFromDb<T extends Record<string, unknown>>(row: T) {
  const out: Record<string, unknown> = {};
  for (const key of STUDENT_PROFILE_KEYS) {
    if (key in row) out[key] = row[key];
  }
  return out;
}
