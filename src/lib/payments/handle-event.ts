import type Stripe from "stripe";
import { prisma } from "@/lib/db";

// Idempotently apply a Stripe event to our database. Safe to call more than
// once for the same event (e.g. Stripe retries) — already-processed events
// are skipped via the WebhookEvent table.
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  const seen = await prisma.webhookEvent.findUnique({ where: { id: event.id } });
  if (seen) return;

  switch (event.type) {
    case "checkout.session.completed":
      await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "setup_intent.succeeded":
      await onSetupIntentSucceeded(event.data.object as Stripe.SetupIntent);
      break;
    case "payment_intent.succeeded":
      await onPaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
    case "charge.refunded":
      await onChargeRefunded(event.data.object as Stripe.Charge);
      break;
    default:
      break;
  }

  await prisma.webhookEvent.create({
    data: { id: event.id, type: event.type },
  });
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  const md = session.metadata ?? {};
  const clientId = md.clientId;
  if (!clientId) return;

  const amountPence = session.amount_total ?? 0;
  const currency = session.currency ?? "gbp";
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  if (md.kind === "package") {
    const sessions = Number(md.sessions ?? 0);
    if (sessions <= 0) return;
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          clientId,
          amountPence,
          currency,
          type: "PACKAGE",
          status: "SUCCEEDED",
          stripePaymentIntentId: paymentIntentId,
        },
      });
      const pack = await tx.creditPack.create({
        data: {
          clientId,
          name: md.packageName ?? `${sessions} sessions`,
          totalSessions: sessions,
          remaining: sessions,
          paymentId: payment.id,
        },
      });
      await tx.sessionCredit.createMany({
        data: Array.from({ length: sessions }, () => ({ packId: pack.id })),
      });
    });
  } else {
    // Single-session prepay.
    await prisma.payment.create({
      data: {
        clientId,
        amountPence,
        currency,
        type: "SESSION",
        status: "SUCCEEDED",
        stripePaymentIntentId: paymentIntentId,
      },
    });
  }
}

async function onSetupIntentSucceeded(si: Stripe.SetupIntent) {
  const md = si.metadata ?? {};
  const clientId = md.clientId;
  const paymentMethodId =
    typeof si.payment_method === "string"
      ? si.payment_method
      : (si.payment_method?.id ?? null);
  if (!clientId || !paymentMethodId) return;

  const mandateRef =
    typeof si.mandate === "string" ? si.mandate : (si.mandate?.id ?? null);

  await prisma.paymentMethod.upsert({
    where: { stripePaymentMethodId: paymentMethodId },
    create: {
      clientId,
      stripePaymentMethodId: paymentMethodId,
      type: "BACS_DEBIT",
      status: "ACTIVE",
      mandateReference: mandateRef,
      isDefault: true,
    },
    update: { status: "ACTIVE", mandateReference: mandateRef },
  });
}

async function onPaymentIntentSucceeded(pi: Stripe.PaymentIntent) {
  await prisma.payment.updateMany({
    where: { stripePaymentIntentId: pi.id },
    data: { status: "SUCCEEDED" },
  });
}

async function onChargeRefunded(charge: Stripe.Charge) {
  const pi =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : (charge.payment_intent?.id ?? null);
  if (!pi) return;
  await prisma.payment.updateMany({
    where: { stripePaymentIntentId: pi },
    data: { status: "REFUNDED" },
  });
}
