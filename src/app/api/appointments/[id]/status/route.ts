import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { trainerProfileIdForUser } from "@/lib/clients/access";
import { CURRENCY } from "@/lib/payments/pricing";

export const runtime = "nodejs";

const bodySchema = z.object({ status: z.enum(["COMPLETED", "NO_SHOW"]) });

type Ctx = { params: Promise<{ id: string }> };

// Trainer marks a past session as completed or a no-show. A no-show on a
// (paid) session forfeits the credit, or raises a fee when none was used —
// the same charge policy as a late cancellation. Consultations are never charged.
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "TRAINER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const trainerId = await trainerProfileIdForUser(user.id);
  if (!trainerId) {
    return NextResponse.json({ error: "no_profile" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const { status } = parsed.data;

  const appt = await prisma.appointment.findUnique({
    where: { id },
    include: { trainer: { select: { hourlyRatePence: true } } },
  });
  if (!appt || appt.trainerId !== trainerId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (appt.status !== "BOOKED") {
    return NextResponse.json({ error: "not_open" }, { status: 409 });
  }
  if (appt.startAt.getTime() > Date.now()) {
    return NextResponse.json({ error: "too_early" }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({ where: { id }, data: { status } });
    // No-show on a paid session with no consumed credit raises a fee.
    if (
      status === "NO_SHOW" &&
      appt.kind === "SESSION" &&
      !appt.creditId
    ) {
      await tx.payment.create({
        data: {
          clientId: appt.clientId,
          amountPence: appt.trainer.hourlyRatePence,
          currency: CURRENCY,
          type: "LATE_CANCEL_FEE",
          status: "PENDING",
        },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
