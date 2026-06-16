import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getStripe } from "@/lib/stripe";
import { ensureStripeCustomer } from "@/lib/payments/customer";

export const runtime = "nodejs";

// Starts a Bacs Direct Debit mandate setup. Returns a SetupIntent client
// secret for the client to confirm in Stripe Elements. On success the webhook
// stores the PaymentMethod + mandate reference.
export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENT") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const client = await prisma.clientProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!client) {
    return NextResponse.json({ error: "no_client_profile" }, { status: 400 });
  }

  const customerId = await ensureStripeCustomer(client.id);
  const setupIntent = await getStripe().setupIntents.create({
    customer: customerId,
    payment_method_types: ["bacs_debit"],
    metadata: { clientId: client.id },
  });

  return NextResponse.json({ clientSecret: setupIntent.client_secret });
}
