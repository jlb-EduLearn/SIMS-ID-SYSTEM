import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSchoolContext,
  apiSuccess,
  apiError,
} from "@/lib/api-auth";
import { templateSchema } from "@/lib/validations";
import { getDimensionsForOrientation } from "@/lib/categories";

export async function GET() {
  const { schoolId, error } = await requireSchoolContext();
  if (error) return error;

  const templates = await prisma.idTemplate.findMany({
    where: { schoolId: schoolId!, isActive: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return apiSuccess({ templates });
}

export async function POST(req: NextRequest) {
  const { schoolId, error } = await requireSchoolContext();
  if (error) return error;

  const body = await req.json();
  const parsed = templateSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message || "Invalid data");
  }

  const data = parsed.data;
  const dims = getDimensionsForOrientation(data.orientation);

  if (data.isDefault) {
    await prisma.idTemplate.updateMany({
      where: { schoolId: schoolId!, isDefault: true },
      data: { isDefault: false },
    });
  }

  const template = await prisma.idTemplate.create({
    data: {
      schoolId: schoolId!,
      name: data.name,
      description: data.description || null,
      orientation: data.orientation,
      width: data.width || dims.width,
      height: data.height || dims.height,
      frontDesign: data.frontDesign,
      backDesign: data.backDesign || null,
      isDefault: data.isDefault ?? false,
    },
  });

  return apiSuccess(template, 201);
}
