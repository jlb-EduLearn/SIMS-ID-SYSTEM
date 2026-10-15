import type { StudentCategory } from "@/lib/categories";

export type RecordFormState = {
  recordType: "STUDENT" | "TEACHER";
  studentId: string;
  category: StudentCategory;
  firstName: string;
  lastName: string;
  middleName: string;
  suffix: string;
  grade: string;
  customGradeName: string;
  course: string;
  department: string;
  position: string;
  designation: string;
  dateHired: string;
  employeeNumber: string;
  learnerReferenceNumber: string;
  escNumber: string;
  studentNumber: string;
  section: string;
  dateOfBirth: string;
  birthplace: string;
  gender: string;
  citizenship: string;
  religion: string;
  civilStatus: string;
  tinNumber: string;
  sssNumber: string;
  philhealthNumber: string;
  pagIbigNumber: string;
  isTeaching: boolean;
  requiresTimeInOut: boolean;
  addressStreet: string;
  barangay: string;
  municipality: string;
  province: string;
  country: string;
  zipCode: string;
  address: string;
  contactPhone: string;
  landline: string;
  contactRelationship: string;
  email: string;
  emergencyContactRelation: string;
  emergencyContactPerson: string;
  emergencyFirstName: string;
  emergencyMiddleName: string;
  emergencyLastName: string;
  emergencyAddress: string;
  emergencyPhone: string;
  fatherLastName: string;
  fatherFirstName: string;
  fatherMiddleName: string;
  fatherSuffix: string;
  motherLastName: string;
  motherFirstName: string;
  motherMiddleName: string;
  guardianLastName: string;
  guardianFirstName: string;
  guardianMiddleName: string;
  photoUrl: string;
  signatureUrl: string;
  cardUid: string;
  wiegandFacilityCode: string;
  wiegandCardNumber: string;
};

export const emptyRecordForm = (): RecordFormState => ({
  recordType: "STUDENT",
  studentId: "",
  category: "GRADE_SCHOOL",
  firstName: "",
  lastName: "",
  middleName: "",
  suffix: "",
  grade: "",
  customGradeName: "",
  course: "",
  department: "",
  position: "",
  designation: "",
  dateHired: "",
  employeeNumber: "",
  learnerReferenceNumber: "",
  escNumber: "",
  studentNumber: "",
  section: "",
  dateOfBirth: "",
  birthplace: "",
  gender: "",
  citizenship: "",
  religion: "",
  civilStatus: "",
  tinNumber: "",
  sssNumber: "",
  philhealthNumber: "",
  pagIbigNumber: "",
  isTeaching: false,
  requiresTimeInOut: false,
  addressStreet: "",
  barangay: "",
  municipality: "",
  province: "",
  country: "Philippines",
  zipCode: "",
  address: "",
  contactPhone: "",
  landline: "",
  contactRelationship: "",
  email: "",
  emergencyContactRelation: "",
  emergencyContactPerson: "",
  emergencyFirstName: "",
  emergencyMiddleName: "",
  emergencyLastName: "",
  emergencyAddress: "",
  emergencyPhone: "",
  fatherLastName: "",
  fatherFirstName: "",
  fatherMiddleName: "",
  fatherSuffix: "",
  motherLastName: "",
  motherFirstName: "",
  motherMiddleName: "",
  guardianLastName: "",
  guardianFirstName: "",
  guardianMiddleName: "",
  photoUrl: "",
  signatureUrl: "",
  cardUid: "",
  wiegandFacilityCode: "",
  wiegandCardNumber: "",
});

export function recordToForm(
  student: Record<string, unknown> & {
    recordType: "STUDENT" | "TEACHER";
    studentId: string;
    category: StudentCategory;
    firstName: string;
    lastName: string;
  }
): RecordFormState {
  return {
    ...emptyRecordForm(),
    recordType: student.recordType,
    studentId: student.studentId,
    category: student.category,
    firstName: student.firstName,
    lastName: student.lastName,
    middleName: (student.middleName as string) || "",
    suffix: (student.suffix as string) || "",
    grade: (student.grade as string) || "",
    customGradeName: (student.customGradeName as string) || "",
    course: (student.course as string) || "",
    department: (student.department as string) || "",
    position: (student.position as string) || "",
    designation: (student.designation as string) || "",
    dateHired: (student.dateHired as string) || "",
    employeeNumber: (student.employeeNumber as string) || "",
    learnerReferenceNumber: (student.learnerReferenceNumber as string) || "",
    escNumber: (student.escNumber as string) || "",
    studentNumber: (student.studentNumber as string) || "",
    section: (student.section as string) || "",
    dateOfBirth: (student.dateOfBirth as string) || "",
    birthplace: (student.birthplace as string) || "",
    gender: (student.gender as string) || "",
    citizenship: (student.citizenship as string) || "",
    religion: (student.religion as string) || "",
    civilStatus: (student.civilStatus as string) || "",
    tinNumber: (student.tinNumber as string) || "",
    sssNumber: (student.sssNumber as string) || "",
    philhealthNumber: (student.philhealthNumber as string) || "",
    pagIbigNumber: (student.pagIbigNumber as string) || "",
    isTeaching: Boolean(student.isTeaching),
    requiresTimeInOut: Boolean(student.requiresTimeInOut),
    addressStreet: (student.addressStreet as string) || "",
    barangay: (student.barangay as string) || "",
    municipality: (student.municipality as string) || "",
    province: (student.province as string) || "",
    country: (student.country as string) || "Philippines",
    zipCode: (student.zipCode as string) || "",
    address: (student.address as string) || "",
    contactPhone: (student.contactPhone as string) || "",
    landline: (student.landline as string) || "",
    contactRelationship: (student.contactRelationship as string) || "",
    email: (student.email as string) || "",
    emergencyContactRelation:
      (student.emergencyContactRelation as string) || "",
    emergencyContactPerson: (student.emergencyContactPerson as string) || "",
    emergencyFirstName: (student.emergencyFirstName as string) || "",
    emergencyMiddleName: (student.emergencyMiddleName as string) || "",
    emergencyLastName: (student.emergencyLastName as string) || "",
    emergencyAddress: (student.emergencyAddress as string) || "",
    emergencyPhone: (student.emergencyPhone as string) || "",
    fatherLastName: (student.fatherLastName as string) || "",
    fatherFirstName: (student.fatherFirstName as string) || "",
    fatherMiddleName: (student.fatherMiddleName as string) || "",
    fatherSuffix: (student.fatherSuffix as string) || "",
    motherLastName: (student.motherLastName as string) || "",
    motherFirstName: (student.motherFirstName as string) || "",
    motherMiddleName: (student.motherMiddleName as string) || "",
    guardianLastName: (student.guardianLastName as string) || "",
    guardianFirstName: (student.guardianFirstName as string) || "",
    guardianMiddleName: (student.guardianMiddleName as string) || "",
    photoUrl: (student.photoUrl as string) || "",
    signatureUrl: (student.signatureUrl as string) || "",
    cardUid: (student.cardUid as string) || "",
    wiegandFacilityCode: (student.wiegandFacilityCode as string) || "",
    wiegandCardNumber: (student.wiegandCardNumber as string) || "",
  };
}
