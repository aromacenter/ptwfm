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
// - CONSULTATION: allowed only when the client is not yet dedicated to a
//   trainer; creates the client profile (trainer unset) and a free consultation.
// - SESSION: allowed only with the client's dedicated trainer; consumes a credit.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENT") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = bookingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const { trainerId, kind } = parsed.data;
  const start = new Date(parsed.data.start);

  const trainer = await prisma.trainerProfile.findUnique({
    where: { id: trainerId },
    select: { id: true, acceptingClients: true },
  });
  if (!trainer) {
    return NextResponse.json({ error: "trainer_not_found" }, { status: 404 });
  }

  let client = await prisma.clientProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, trainerId: true },
  });

  if (kind === "CONSULTATION") {
    if (!trainer.acceptingClients) {
      return NextResponse.json({ error: "not_accepting" }, { status: 409 });
    }
    if (client?.trainerId) {
      return NextResponse.json({ error: "already_dedicated" }, { status: 409 });
    }
  } else {
    // SESSION: requires being dedicated to this trainer.
    if (!client || client.trainerId !== trainerId) {
      return NextResponse.json({ error: "not_dedicated" }, { status: 409 });
    }
  }

  if (!(await canBook(trainerId, start))) {
    return NextResponse.json({ error: "slot_unavailable" }, { status: 409 });
  }

  try {
    const appointment = await prisma.$transaction(async (tx) => {
      if (!client) {
        // Consultations create the profile without dedicating a trainer.
        const created = await tx.clientProfile.create({
          data: { userId: user.id },
          select: { id: true, trainerId: true },
        });
        client = created;
      }

      let creditId: string | null = null;
      if (kind === "SESSION") {
        // Consume a prepaid credit if available (single-session prepay / packs).
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
      }

      return tx.appointment.create({
        data: {
          trainerId,
          clientId: client.id,
          startAt: start,
          endAt: new Date(start.getTime() + SLOT_MS),
          status: "BOOKED",
          kind,
          creditId,
        },
      });
    });
    return NextResponse.json({ appointment }, { status: 201 });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json({ error: "slot_taken" }, { status: 409 });
    }
    throw err;
  }
}
