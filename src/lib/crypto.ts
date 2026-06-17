import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "node:crypto";

// AES-256-GCM encryption for secrets stored at rest (e.g. integration API keys
// in the Setting table). The 32-byte key is derived from SETTINGS_KEY, falling
// back to AUTH_SECRET so no extra env var is strictly required.
function getKey(): Buffer {
  const secret = process.env.SETTINGS_KEY || process.env.AUTH_SECRET || "";
  if (!secret) {
    throw new Error("No encryption secret set (SETTINGS_KEY or AUTH_SECRET)");
  }
  return createHash("sha256").update(secret).digest();
}

/** Encrypts plaintext to "iv:tag:ciphertext" (all base64). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    ct.toString("base64"),
  ].join(":");
}

/** Reverses encryptSecret. Throws if the payload was tampered with. */
export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, ctB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !ctB64) {
    throw new Error("Malformed encrypted payload");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
