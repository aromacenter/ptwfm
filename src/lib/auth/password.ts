import { hash, verify } from "@node-rs/argon2";

// OWASP-recommended argon2id parameters.
const OPTIONS = {
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export function verifyPassword(
  storedHash: string,
  password: string,
): Promise<boolean> {
  return verify(storedHash, password, OPTIONS);
}
