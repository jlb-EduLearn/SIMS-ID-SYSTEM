import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSchoolContext,
  apiSuccess,
  apiError,
  verifyResourceSchool,
} from "@/lib/api-auth";
import { templateSchema } from "@/lib/validations";
import { getDimensionsForOrientation } from "@/lib/categories";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = await requireSchoolContext();
  if (error) return error;

  const { id } = await params;

  const template = await prisma.idTemplate.findUnique({ where: { id } });

  if (!template || !template.isActive) {
    return apiError("Template not found", 404);
  }

  if (!verifyResourceSchool(template.schoolId, schoolId!)) {
    return apiError("Access denied", 403);
  }

  return apiSuccess(template);
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = await requireSchoolContext();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = templateSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message || "Invalid data");
  }

  const existing = await prisma.idTemplate.findUnique({ where: { id } });

  if (!existing || !existing.isActive) {
    return apiError("Template not found", 404);
  }

  if (!verifyResourceSchool(existing.schoolId, schoolId!)) {
    return apiError("Access denied", 403);
  }

  const data = parsed.data;
  const dims = getDimensionsForOrientation(data.orientation);

  if (data.isDefault) {
    await prisma.idTemplate.updateMany({
      where: { schoolId: schoolId!, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  const template = await prisma.idTemplate.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description || null,
      orientation: data.orientation,
      width: data.width || dims.width,
      height: data.height || dims.height,
      frontDesign: data.frontDesign,
      backDesign: data.backDesign || null,
      isDefault: data.isDefault ?? existing.isDefault,
    },
  });

  return apiSuccess(template);
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = await requireSchoolContext();
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.idTemplate.findUnique({ where: { id } });

  if (!existing) {
    return apiError("Template not found", 404);
  }

  if (!verifyResourceSchool(existing.schoolId, schoolId!)) {
    return apiError("Access denied", 403);
  }

  await prisma.idTemplate.update({
    where: { id },
    data: { isActive: false },
  });

  return apiSuccess({ success: true });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = await requireSchoolContext();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const action = body.action;

  const existing = await prisma.idTemplate.findUnique({ where: { id } });

  if (!existing || !existing.isActive) {
    return apiError("Template not found", 404);
  }

  if (!verifyResourceSchool(existing.schoolId, schoolId!)) {
    return apiError("Access denied", 403);
  }

  if (action === "duplicate") {
    const duplicate = await prisma.idTemplate.create({
      data: {
        schoolId: schoolId!,
        name: `${existing.name} (Copy)`,
        description: existing.description,
        orientation: existing.orientation,
        width: existing.width,
        height: existing.height,
        frontDesign: existing.frontDesign,
        backDesign: existing.backDesign,
        isDefault: false,
      },
    });
    return apiSuccess(duplicate, 201);
  }

  return apiError("Unknown action");
}
