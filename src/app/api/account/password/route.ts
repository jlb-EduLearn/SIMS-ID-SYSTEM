import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess, requireAuth } from "@/lib/api-auth";
import { changePasswordSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const parsed = changePasswordSchema.safeParse(await req.json());
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message || "Invalid password");
  }

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { passwordHash: true },
  });
  if (!user) return apiError("User not found", 404);

  const valid = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash
  );
  if (!valid) return apiError("Current password is incorrect");

  await prisma.user.update({
    where: { id: session!.user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) },
  });

  return apiSuccess({ ok: true });
}
