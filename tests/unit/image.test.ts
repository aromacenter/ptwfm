import { describe, it, expect } from "vitest";
import { validateImageUpload, MAX_IMAGE_BYTES } from "@/lib/validation/image";

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
