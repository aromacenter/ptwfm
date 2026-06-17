import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

/** Returns the client's Stripe customer id, creating the customer on first use. */
export async function ensureStripeCustomer(clientProfileId: string): Promise<string> {
  const client = await prisma.clientProfile.findUnique({
    where: { id: clientProfileId },
    include: { user: { select: { email: true, name: true } } },
  });
  if (!client) throw new Error("client_not_found");
  if (client.stripeCustomerId) return client.stripeCustomerId;

  const customer = await (await getStripe()).customers.create({
    email: client.user.email,
    name: client.user.name,
    metadata: { clientProfileId },
  });
  await prisma.clientProfile.update({
    where: { id: clientProfileId },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}
