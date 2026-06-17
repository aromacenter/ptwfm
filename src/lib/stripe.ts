import Stripe from "stripe";
import { resolveIntegration } from "@/lib/settings";

// Server-side Stripe client. The key is resolved at call time from the admin
// settings (DB) or the env var, so it works in tests without a live key and
// can be configured from the admin UI.
let client: Stripe | null = null;
let cachedKey: string | null = null;

export async function getStripe(): Promise<Stripe> {
  const key = await resolveIntegration("STRIPE_SECRET_KEY");
  if (!key) throw new Error("Stripe secret key is not configured");
  if (!client || cachedKey !== key) {
    client = new Stripe(key);
    cachedKey = key;
  }
  return client;
}

export function getStripeWebhookSecret(): Promise<string | undefined> {
  return resolveIntegration("STRIPE_WEBHOOK_SECRET");
}
