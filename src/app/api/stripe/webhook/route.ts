import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { handleStripeEvent } from "@/lib/payments/handle-event";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = request.headers.get("stripe-signature");
  if (!secret || !sig) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, secret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    // Return 500 so Stripe retries; never expose internals.
    console.error("stripe webhook handling failed", err);
    return NextResponse.json({ error: "handler_error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
