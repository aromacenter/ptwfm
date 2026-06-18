import { describe, it, expect } from "vitest";
import {
  validateImageUpload,
  sniffImageType,
  MAX_IMAGE_BYTES,
} from "@/lib/validation/image";

describe("validateImageUpload", () => {
  it("accepts a small jpeg/png/webp", () => {
    expect(validateImageUpload("image/jpeg", 1000).ok).toBe(true);
    expect(validateImageUpload("image/png", 1000).ok).toBe(true);
    expect(validateImageUpload("image/webp", 1000).ok).toBe(true);
  });

  it("rejects a non-image type", () => {
    const r = validateImageUpload("application/pdf", 1000);
    expect(r).toEqual({ ok: false, error: "type" });
  });

  it("rejects gif (not allowed)", () => {
    expect(validateImageUpload("image/gif", 1000).ok).toBe(false);
  });

  it("rejects an empty file", () => {
    expect(validateImageUpload("image/png", 0)).toEqual({ ok: false, error: "empty" });
  });

  it("rejects a file over the size limit", () => {
    expect(validateImageUpload("image/png", MAX_IMAGE_BYTES + 1)).toEqual({
      ok: false,
      error: "size",
    });
  });

  it("accepts a file exactly at the limit", () => {
    expect(validateImageUpload("image/png", MAX_IMAGE_BYTES).ok).toBe(true);
  });
});

describe("sniffImageType", () => {
  it("detects JPEG magic bytes", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe(
      "image/jpeg",
    );
  });

  it("detects PNG magic bytes", () => {
    expect(
      sniffImageType(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe("image/png");
  });

  it("detects WebP (RIFF....WEBP)", () => {
    const webp = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(sniffImageType(webp)).toBe("image/webp");
  });

  it("returns null for a non-image (e.g. a PDF / spoofed file)", () => {
    expect(sniffImageType(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBeNull();
  });
});
