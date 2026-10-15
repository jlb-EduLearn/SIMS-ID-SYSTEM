import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireFullContext, apiError } from "@/lib/api-auth";
import { buildAccessControlCsv } from "@/lib/hardware/access-export";

export async function GET(req: NextRequest) {
  const { schoolId, schoolYearId, error } = await requireFullContext();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const includeAll = searchParams.get("includeAll") === "1";

  const [config, students] = await Promise.all([
    prisma.schoolHardwareConfig.findUnique({ where: { schoolId: schoolId! } }),
    prisma.student.findMany({
      where: {
        schoolId: schoolId!,
        schoolYearId: schoolYearId!,
        isActive: true,
      },
      select: {
        studentId: true,
        firstName: true,
        lastName: true,
        middleName: true,
        grade: true,
        section: true,
        department: true,
        cardUid: true,
        wiegandFacilityCode: true,
        wiegandCardNumber: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  const csv = buildAccessControlCsv(students, {
    wiegandFormat: (config?.wiegandFormat === "34" ? "34" : "26") as "26" | "34",
    includeWithoutCard: includeAll,
  });

  if (!csv.includes("\n") || csv.split("\n").length < 2) {
    return apiError(
      "No card numbers to export. Assign card UID or Wiegand numbers on student records, or use ?includeAll=1.",
      400
    );
  }

  const filename = `sims-access-export-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
