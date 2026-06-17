import { describe, it, expect, beforeAll } from "vitest";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

beforeAll(() => {
  process.env.SETTINGS_KEY = "test-encryption-key-for-vitest";
});

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a value", () => {
    const plain = "sk_test_supersecret_12345";
    expect(decryptSecret(encryptSecret(plain))).toBe(plain);
  });

  it("produces different ciphertext each time (random IV)", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("does not contain the plaintext", () => {
    expect(encryptSecret("plaintexttoken")).not.toContain("plaintexttoken");
  });

  it("throws on a tampered payload", () => {
    const enc = encryptSecret("value");
    const [iv, tag] = enc.split(":");
    const tampered = [iv, tag, Buffer.from("evil").toString("base64")].join(":");
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("throws on a malformed payload", () => {
    expect(() => decryptSecret("not-valid")).toThrow();
  });
});
