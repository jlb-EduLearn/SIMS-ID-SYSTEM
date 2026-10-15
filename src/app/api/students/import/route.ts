import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireFullContext, apiSuccess, apiError } from "@/lib/api-auth";
import { studentSchema } from "@/lib/validations";
import { studentInputToDb } from "@/lib/student-db-map";

export async function POST(req: NextRequest) {
  const { schoolId, schoolYearId, error } = await requireFullContext();
  if (error) return error;

  const body = await req.json();
  const { students: rows } = body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return apiError("No students to import");
  }

  if (rows.length > 500) {
    return apiError("Maximum 500 students per import");
  }

  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (let i = 0; i < rows.length; i++) {
    const raw = { ...rows[i] } as Record<string, unknown>;
    for (const key of ["isTeaching", "requiresTimeInOut"] as const) {
      if (typeof raw[key] === "string") {
        const v = raw[key].trim().toLowerCase();
        if (["yes", "y", "true", "1"].includes(v)) raw[key] = true;
        else if (["no", "n", "false", "0"].includes(v)) raw[key] = false;
        else delete raw[key];
      }
    }

    if (raw.customFields != null && typeof raw.customFields === "string") {
      const trimmed = raw.customFields.trim();
      if (trimmed) {
        try {
          raw.customFields = JSON.parse(trimmed);
        } catch {
          /* leave as string; schema may reject */
        }
      } else {
        delete raw.customFields;
      }
    }

    const parsed = studentSchema.safeParse(raw);
    if (!parsed.success) {
      results.errors.push(`Row ${i + 1}: ${parsed.error.errors[0]?.message}`);
      results.skipped++;
      continue;
    }

    const data = parsed.data;

    try {
      const existing = await prisma.student.findUnique({
        where: {
          schoolId_schoolYearId_studentId: {
            schoolId: schoolId!,
            schoolYearId: schoolYearId!,
            studentId: data.studentId,
          },
        },
      });

      if (existing) {
        results.skipped++;
        results.errors.push(
          `Row ${i + 1}: ID ${data.studentId} already exists`
        );
        continue;
      }

      await prisma.student.create({
        data: {
          schoolId: schoolId!,
          schoolYearId: schoolYearId!,
          ...studentInputToDb(data),
        },
      });
      results.created++;
    } catch {
      results.skipped++;
      results.errors.push(`Row ${i + 1}: Failed to create record`);
    }
  }

  return apiSuccess(results);
}
