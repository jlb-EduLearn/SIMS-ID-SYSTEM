import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const schoolUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address").max(150),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100)
    .optional()
    .or(z.literal("")),
  role: z.enum(["SCHOOL_ADMIN", "REGISTRAR", "OPERATOR"]),
  isActive: z.boolean().optional(),
});

export const schoolSchema = z.object({
  name: z.string().min(1, "School name is required").max(150),
  code: z.string().min(1, "School code is required").max(30),
  address: z.string().max(500).optional().nullable(),
});

export const schoolLogoSchema = z.object({
  logoUrl: z
    .string()
    .regex(/^\/uploads\/[\w.-]+$/, "Invalid logo file")
    .nullable(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters")
      .max(100),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the current one",
    path: ["newPassword"],
  });

const categoryEnum = z.enum([
  "PRE_KINDER",
  "KINDER",
  "GRADE_SCHOOL",
  "JUNIOR_HIGH",
  "SENIOR_HIGH",
  "TERTIARY",
]);

const optStr = (max: number) => z.string().max(max).optional().nullable();

export const studentSchema = z
  .object({
    recordType: z.enum(["STUDENT", "TEACHER"]).default("STUDENT"),
    studentId: z.string().min(1, "ID number is required").max(50),
    category: categoryEnum.default("GRADE_SCHOOL"),
    firstName: z.string().min(1, "First name is required").max(100),
    lastName: z.string().min(1, "Last name is required").max(100),
    middleName: optStr(100),
    suffix: optStr(20),
    grade: optStr(50),
    customGradeName: optStr(100),
    course: optStr(100),
    department: optStr(100),
    position: optStr(100),
    designation: optStr(100),
    dateHired: optStr(20),
    employeeNumber: optStr(50),
    learnerReferenceNumber: optStr(50),
    escNumber: optStr(50),
    studentNumber: optStr(50),
    section: optStr(50),
    dateOfBirth: optStr(20),
    birthplace: optStr(150),
    gender: optStr(20),
    citizenship: optStr(80),
    religion: optStr(80),
    civilStatus: optStr(40),
    tinNumber: optStr(30),
    sssNumber: optStr(30),
    philhealthNumber: optStr(30),
    pagIbigNumber: optStr(30),
    isTeaching: z.boolean().optional().nullable(),
    requiresTimeInOut: z.boolean().optional().nullable(),
    addressStreet: optStr(200),
    barangay: optStr(100),
    municipality: optStr(100),
    province: optStr(100),
    country: optStr(80),
    zipCode: optStr(20),
    address: optStr(500),
    contactPhone: optStr(30),
    landline: optStr(30),
    contactRelationship: optStr(40),
    email: z.string().email().optional().nullable().or(z.literal("")),
    emergencyContactRelation: optStr(40),
    emergencyContactPerson: optStr(150),
    emergencyFirstName: optStr(100),
    emergencyMiddleName: optStr(100),
    emergencyLastName: optStr(100),
    emergencyAddress: optStr(500),
    emergencyPhone: optStr(30),
    fatherLastName: optStr(100),
    fatherFirstName: optStr(100),
    fatherMiddleName: optStr(100),
    fatherSuffix: optStr(20),
    motherLastName: optStr(100),
    motherFirstName: optStr(100),
    motherMiddleName: optStr(100),
    guardianLastName: optStr(100),
    guardianFirstName: optStr(100),
    guardianMiddleName: optStr(100),
    photoUrl: z.string().optional().nullable(),
    signatureUrl: z.string().optional().nullable(),
    customFields: z.record(z.string()).optional().nullable(),
    cardUid: optStr(32),
    wiegandFacilityCode: optStr(10),
    wiegandCardNumber: optStr(20),
  })
  .superRefine((data, ctx) => {
    if (data.recordType === "TEACHER") {
      if (!data.designation?.trim() && !data.position?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Designation is required for employees",
          path: ["designation"],
        });
      }
      return;
    }

    if (data.category === "TERTIARY") {
      if (!data.customGradeName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Grade/Year level is required for tertiary",
          path: ["customGradeName"],
        });
      }
      if (!data.course?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Course is required for tertiary",
          path: ["course"],
        });
      }
    } else if (!data.grade?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Grade is required",
        path: ["grade"],
      });
    }
  });

export const templateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(100),
  description: z.string().max(500).optional().nullable(),
  orientation: z.enum(["PORTRAIT", "LANDSCAPE"]).default("LANDSCAPE"),
  width: z.number().min(100).max(2000).default(1011),
  height: z.number().min(100).max(2000).default(638),
  frontDesign: z.string(),
  backDesign: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
});

export const schoolYearSchema = z.object({
  name: z
    .string()
    .min(4, "School year is required")
    .max(20)
    .regex(/^\d{4}-\d{4}$/, "Format: 2025-2026"),
});

export const gradeSectionSchema = z.object({
  category: categoryEnum.default("GRADE_SCHOOL"),
  grade: z.string().min(1, "Grade level is required").max(50),
  name: z.string().min(1, "Section name is required").max(50),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type StudentInput = z.infer<typeof studentSchema>;

export const hardwareConfigSchema = z.object({
  wiegandFormat: z.enum(["26", "34"]).default("26"),
  accessControlHost: z.string().max(255).optional().nullable(),
  accessControlPort: z.number().int().min(1).max(65535).default(4370),
  accessControlProtocol: z.string().max(50).default("WG5000"),
  printerProfile: z
    .enum(["ENTRUST_SIGMA_PRS10", "GENERIC_CR80_300DPI"])
    .default("ENTRUST_SIGMA_PRS10"),
  faceTerminalEnabled: z.boolean().default(true),
  metalDetectorEnabled: z.boolean().default(false),
  notes: z.string().max(2000).optional().nullable(),
});
export type TemplateInput = z.infer<typeof templateSchema>;
export type SchoolUserInput = z.infer<typeof schoolUserSchema>;
