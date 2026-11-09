import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess, requireSchoolContext } from "@/lib/api-auth";
import { hardwareConfigSchema } from "@/lib/validations";
import { PRINTER_PROFILES, SIMS_HARDWARE_DEVICES } from "@/lib/hardware/device-catalog";

function canEditSchool(role: string) {
  return role === "ADMIN" || role === "SCHOOL_ADMIN";
}

export async function GET() {
  const { session, schoolId, error } = await requireSchoolContext();
  if (error) return error;

  const config = await prisma.schoolHardwareConfig.findUnique({
    where: { schoolId: schoolId! },
  });

  return apiSuccess({
    config: config ?? {
      wiegandFormat: "26",
      accessControlPort: 4370,
      accessControlProtocol: "WG5000",
      printerProfile: "GENERIC_CR80_300DPI",
      detectedPrinterName: null,
      faceTerminalEnabled: true,
      metalDetectorEnabled: false,
    },
    devices: SIMS_HARDWARE_DEVICES,
    printerProfiles: PRINTER_PROFILES,
    canEdit: canEditSchool(session!.user.role),
  });
}

export async function PUT(req: NextRequest) {
  const { session, schoolId, error } = await requireSchoolContext();
  if (error) return error;

  if (!canEditSchool(session!.user.role)) {
    return apiError("Only admins can change hardware settings.", 403);
  }

  const parsed = hardwareConfigSchema.safeParse(await req.json());
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message || "Invalid settings");
  }

  const data = parsed.data;
  const config = await prisma.schoolHardwareConfig.upsert({
    where: { schoolId: schoolId! },
    create: {
      schoolId: schoolId!,
      ...data,
      accessControlHost: data.accessControlHost || null,
      notes: data.notes || null,
    },
    update: {
      ...data,
      accessControlHost: data.accessControlHost || null,
      notes: data.notes || null,
    },
  });

  return apiSuccess({ config });
}
