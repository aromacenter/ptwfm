import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { reviewSchema } from "@/lib/validation/review";

export const runtime = "nodejs";

// Submit (or update) the signed-in client's review of a trainer. Gated to
// clients who have a real relationship with the trainer: either dedicated to
// them, or have booked at least one appointment with them.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ trainerId: string }> },
) {
  const { trainerId } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENT") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = reviewSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: "invalid", field: first?.path.join("."), message: first?.message },
      { status: 400 },
    );
  }
  const { rating, comment } = parsed.data;

  const client = await prisma.clientProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, trainerId: true },
  });
  if (!client) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Eligibility: dedicated to this trainer, or booked with them at least once.
  let eligible = client.trainerId === trainerId;
  if (!eligible) {
    const appointment = await prisma.appointment.findFirst({
      where: { trainerId, clientId: client.id },
      select: { id: true },
    });
    eligible = !!appointment;
  }
  if (!eligible) {
    return NextResponse.json({ error: "not_eligible" }, { status: 403 });
  }

  try {
    await prisma.review.upsert({
      where: { trainerId_clientId: { trainerId, clientId: client.id } },
      create: { trainerId, clientId: client.id, rating, comment: comment || null },
      update: { rating, comment: comment || null },
    });
  } catch (err) {
    console.error("review submit failed", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
