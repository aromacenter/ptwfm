import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("hashes a password to an argon2id string", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it("produces different hashes for the same password (random salt)", async () => {
    const a = await hashPassword("samePassword123");
    const b = await hashPassword("samePassword123");
    expect(a).not.toBe(b);
  });

  it("verifies a correct password", async () => {
    const hash = await hashPassword("s3cret-passphrase");
    await expect(verifyPassword(hash, "s3cret-passphrase")).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("s3cret-passphrase");
    await expect(verifyPassword(hash, "wrong-password")).resolves.toBe(false);
  });
});
