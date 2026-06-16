import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import {
  cancellationOutcome,
  isCancellable,
} from "@/lib/booking/cancellation";
import { getStripe } from "@/lib/stripe";
import { CURRENCY } from "@/lib/payments/pricing";

export const runtime = "nodejs";

const bodySchema = z.object({ appointmentId: z.string().min(1) });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENT") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const appt = await prisma.appointment.findUnique({
    where: { id: parsed.data.appointmentId },
    include: {
      client: { select: { id: true, userId: true, stripeCustomerId: true } },
      trainer: { select: { hourlyRatePence: true } },
    },
  });
  if (!appt || appt.client.userId !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (appt.status !== "BOOKED") {
    return NextResponse.json({ error: "not_cancellable" }, { status: 409 });
  }
  if (!isCancellable(appt.startAt)) {
    return NextResponse.json({ error: "already_started" }, { status: 409 });
  }

  const outcome = cancellationOutcome(appt.startAt);
  const clientId = appt.client.id;

  // Apply the booking state change. The late fee (off-session charge) is
  // attempted after the transaction to avoid an external call inside it.
  let pendingFeeId: string | null = null;
  await prisma.$transaction(async (tx) => {
    if (outcome === "FREE") {
      await tx.appointment.update({
        where: { id: appt.id },
        data: { status: "CANCELLED_FREE", cancelledAt: new Date() },
      });
      // Refund: restore the consumed credit.
      if (appt.creditId) {
        const credit = await tx.sessionCredit.update({
          where: { id: appt.creditId },
          data: { usedAt: null },
        });
        await tx.creditPack.update({
          where: { id: credit.packId },
          data: { remaining: { increment: 1 } },
        });
      }
      return;
    }

    // LATE: client is charged.
    await tx.appointment.update({
      where: { id: appt.id },
      data: { status: "CANCELLED_LATE", cancelledAt: new Date() },
    });
    // Credit-based bookings: the credit is forfeited (stays consumed).
    // Otherwise raise a late-cancellation fee to be collected.
    if (!appt.creditId) {
      const fee = await tx.payment.create({
        data: {
          clientId,
          amountPence: appt.trainer.hourlyRatePence,
          currency: CURRENCY,
          type: "LATE_CANCEL_FEE",
          status: "PENDING",
        },
      });
      pendingFeeId = fee.id;
    }
  });

  // Attempt off-session collection of the late fee if we have a saved method.
  if (pendingFeeId && appt.client.stripeCustomerId) {
    const pm = await prisma.paymentMethod.findFirst({
      where: { clientId, status: "ACTIVE" },
      orderBy: { isDefault: "desc" },
    });
    if (pm) {
      try {
        const intent = await getStripe().paymentIntents.create({
          amount: appt.trainer.hourlyRatePence,
          currency: CURRENCY,
          customer: appt.client.stripeCustomerId,
          payment_method: pm.stripePaymentMethodId,
          off_session: true,
          confirm: true,
        });
        await prisma.payment.update({
          where: { id: pendingFeeId },
          data: {
            stripePaymentIntentId: intent.id,
            status: intent.status === "succeeded" ? "SUCCEEDED" : "PENDING",
          },
        });
      } catch {
        // Leave the fee PENDING for manual follow-up by the trainer.
      }
    }
  }

  return NextResponse.json({ outcome });
}
