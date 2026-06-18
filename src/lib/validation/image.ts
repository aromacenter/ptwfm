export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type ImageValidation =
  | { ok: true }
  | { ok: false; error: "type" | "size" | "empty" };

/** Validates an uploaded image's mime type and byte size. Pure. */
export function validateImageUpload(
  type: string,
  size: number,
): ImageValidation {
  if (size <= 0) return { ok: false, error: "empty" };
  if (!ALLOWED_IMAGE_TYPES.includes(type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return { ok: false, error: "type" };
  }
  if (size > MAX_IMAGE_BYTES) return { ok: false, error: "size" };
  return { ok: true };
}
