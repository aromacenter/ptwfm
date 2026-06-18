import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { trainerProfileSchema } from "@/lib/validation/trainer";

export const runtime = "nodejs";

// Update the signed-in trainer's public profile + session price.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "TRAINER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = trainerProfileSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const {
    name,
    headline,
    bio,
    specialties,
    qualifications,
    acceptingClients,
    hourlyRatePence,
  } = parsed.data;

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { name } }),
    prisma.trainerProfile.update({
      where: { userId: user.id },
      data: {
        headline: headline || null,
        bio: bio || null,
        specialties,
        qualifications,
        acceptingClients,
        hourlyRatePence,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
