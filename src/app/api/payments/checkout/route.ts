import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getStripe } from "@/lib/stripe";
import { ensureStripeCustomer } from "@/lib/payments/customer";
import { CURRENCY, getPackageOption, priceForPackage } from "@/lib/payments/pricing";

export const runtime = "nodejs";

const bodySchema = z.object({ packageId: z.string().min(1) });

// Creates a Stripe Checkout session to buy a package (incl. "single" = prepay
// one session). On success the webhook credits the client's account.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENT") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const option = getPackageOption(parsed.data.packageId);
  if (!option) {
    return NextResponse.json({ error: "unknown_package" }, { status: 400 });
  }

  const client = await prisma.clientProfile.findUnique({
    where: { userId: user.id },
    include: { trainer: { select: { hourlyRatePence: true } } },
  });
  if (!client || !client.trainer) {
    return NextResponse.json({ error: "no_trainer" }, { status: 400 });
  }

  const amount = priceForPackage(client.trainer.hourlyRatePence, option);
  if (amount <= 0) {
    return NextResponse.json({ error: "trainer_rate_unset" }, { status: 400 });
  }

  const customerId = await ensureStripeCustomer(client.id);
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const session = await (await getStripe()).checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: CURRENCY,
          unit_amount: amount,
          product_data: { name: `PT Management — ${option.sessions} session(s)` },
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/billing?status=success`,
    cancel_url: `${baseUrl}/billing?status=cancelled`,
    metadata: {
      clientId: client.id,
      kind: "package",
      sessions: String(option.sessions),
      packageName: `${option.sessions} session(s)`,
    },
  });

  return NextResponse.json({ url: session.url });
}
