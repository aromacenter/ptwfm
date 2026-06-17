import { prisma } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

// Integration settings an admin can configure. Each maps 1:1 to an env var of
// the same name; a DB value (if set) takes precedence over the env var.
export const INTEGRATION_KEYS = {
  STRIPE_SECRET_KEY: { secret: true },
  STRIPE_WEBHOOK_SECRET: { secret: true },
  STRIPE_PUBLISHABLE_KEY: { secret: false },
  GEMINI_API_KEY: { secret: true },
  GEMINI_MODEL: { secret: false },
} as const;

export type IntegrationKey = keyof typeof INTEGRATION_KEYS;

export function isIntegrationKey(key: string): key is IntegrationKey {
  return key in INTEGRATION_KEYS;
}

/** Reads a stored setting, decrypting it when it was stored as a secret. */
export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) return null;
  return row.encrypted ? decryptSecret(row.value) : row.value;
}

/** Stores (or clears) a setting; secret values are encrypted at rest. */
export async function setSetting(
  key: string,
  value: string,
  secret: boolean,
): Promise<void> {
  if (value === "") {
    await prisma.setting.deleteMany({ where: { key } });
    return;
  }
  const stored = secret ? encryptSecret(value) : value;
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: stored, encrypted: secret },
    update: { value: stored, encrypted: secret },
  });
}

/** Resolves an integration value: DB setting first, then the env var. */
export async function resolveIntegration(
  key: IntegrationKey,
): Promise<string | undefined> {
  const fromDb = await getSetting(key);
  if (fromDb) return fromDb;
  return process.env[key] || undefined;
}

export type IntegrationStatus = {
  key: IntegrationKey;
  secret: boolean;
  source: "db" | "env" | "none";
  // Non-secret values are returned in full; secrets are never echoed back.
  value: string | null;
};

/** Status of every integration setting for the admin UI (secrets masked). */
export async function getIntegrationStatus(): Promise<IntegrationStatus[]> {
  const rows = await prisma.setting.findMany();
  const dbKeys = new Map(rows.map((r) => [r.key, r]));

  return (Object.keys(INTEGRATION_KEYS) as IntegrationKey[]).map((key) => {
    const meta = INTEGRATION_KEYS[key];
    const inDb = dbKeys.has(key);
    const inEnv = !!process.env[key];
    const source: IntegrationStatus["source"] = inDb
      ? "db"
      : inEnv
        ? "env"
        : "none";
    let value: string | null = null;
    if (!meta.secret) {
      const row = dbKeys.get(key);
      value = row ? row.value : (process.env[key] ?? null);
    }
    return { key, secret: meta.secret, source, value };
  });
}
