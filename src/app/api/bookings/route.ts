import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { bookingSchema } from "@/lib/validation/booking";
import { canBook } from "@/lib/booking/service";
import { pickConsumableCredit } from "@/lib/payments/pricing";

export const runtime = "nodejs";

const SLOT_MS = 60 * 60 * 1000;

// Create a booking for the signed-in client.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENT") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const { trainerId } = parsed.data;
  const start = new Date(parsed.data.start);

  // The trainer must exist.
  const trainer = await prisma.trainerProfile.findUnique({
    where: { id: trainerId },
    select: { id: true },
  });
  if (!trainer) {
    return NextResponse.json({ error: "trainer_not_found" }, { status: 404 });
  }

  // Enforce 1 client ↔ 1 trainer: reuse the profile or create it bound to this
  // trainer; reject if the client is already bound to a different trainer.
  let client = await prisma.clientProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, trainerId: true },
  });
  if (client && client.trainerId !== trainerId) {
    return NextResponse.json(
      { error: "bound_to_other_trainer" },
      { status: 409 },
    );
  }

  // The slot must be offered and free.
  if (!(await canBook(trainerId, start))) {
    return NextResponse.json({ error: "slot_unavailable" }, { status: 409 });
  }

  try {
    const appointment = await prisma.$transaction(async (tx) => {
      if (!client) {
        const created = await tx.clientProfile.create({
          data: { userId: user.id, trainerId },
          select: { id: true, trainerId: true },
        });
        client = created;
      }

      // Consume a prepaid credit if the client has one (covers single-session
      // prepay and packages). Booking without credit is allowed here; payment
      // enforcement is handled separately.
      const credits = await tx.sessionCredit.findMany({
        where: { usedAt: null, pack: { clientId: client.id } },
        include: { pack: { select: { expiresAt: true } } },
      });
      const pick = pickConsumableCredit(
        credits.map((c) => ({
          id: c.id,
          usedAt: c.usedAt,
          expiresAt: c.pack.expiresAt,
          createdAt: c.createdAt,
        })),
      );
      let creditId: string | null = null;
      if (pick) {
        const original = credits.find((c) => c.id === pick.id)!;
        await tx.sessionCredit.update({
          where: { id: pick.id },
          data: { usedAt: new Date() },
        });
        await tx.creditPack.update({
          where: { id: original.packId },
          data: { remaining: { decrement: 1 } },
        });
        creditId = pick.id;
      }

      return tx.appointment.create({
        data: {
          trainerId,
          clientId: client.id,
          startAt: start,
          endAt: new Date(start.getTime() + SLOT_MS),
          status: "BOOKED",
          creditId,
        },
      });
    });
    return NextResponse.json({ appointment }, { status: 201 });
  } catch (err) {
    // Unique (trainerId, startAt) violation => the slot was taken concurrently.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json({ error: "slot_taken" }, { status: 409 });
    }
    throw err;
  }
}
