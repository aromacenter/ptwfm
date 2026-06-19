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
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: "invalid", field: first?.path.join("."), message: first?.message },
      { status: 400 },
    );
  }
  const {
    name,
    headline,
    bio,
    specialties,
    qualifications,
    achievements,
    city,
    online,
    inPerson,
    acceptingClients,
    hourlyRatePence,
  } = parsed.data;

  try {
    await prisma.$transaction([
      // Update the display name only when one was provided.
      ...(name
        ? [prisma.user.update({ where: { id: user.id }, data: { name } })]
        : []),
      prisma.trainerProfile.update({
        where: { userId: user.id },
        data: {
          headline: headline || null,
          bio: bio || null,
          specialties,
          qualifications,
          achievements,
          city: city || null,
          online,
          inPerson,
          acceptingClients,
          hourlyRatePence,
        },
      }),
    ]);
  } catch (err) {
    console.error("trainer profile update failed", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
